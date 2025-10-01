import { Worker, Job, WorkerOptions } from 'bullmq';
// import Redis from 'ioredis';
import { validateEnv } from '../config/envValidator';
import config from '../config';
import { jobsRepository } from '../db/jobsRepository';
import { JobStatus, JobUpdatePayload, AnalysisResults, AnalysisJobData, ErrorType, JobDetails, ImageDetails, DiffbotArticleObject } from '../types';
import { redisClient, emitSocketUpdate } from '../lib';
import { fetchContentFromDiffbot } from '../lib/diffbotClient';
import { fetchContentFromFirecrawl, isArchiveUrl } from '../lib/firecrawlClient';
import { performAnalysisWithOpenAI } from '../lib/openaiClient';
import { performAnalysisWithGemini } from '../lib/geminiClient';
import logger from '../lib/logger';
import { selectPreviewImage, createMinimalMetadata } from '../lib/utils';

/**
 * BullMQ Retry Configuration Note:
 *
 * The actual retry settings (backoff strategy, delay, max attempts) should be configured
 * at the queue level when jobs are added.
 *
 * While this worker provides custom JobProcessingError with retryable flag and suggested
 * delay times, these are used primarily for:
 * 1. Deciding whether to throw the error (allowing BullMQ to retry)
 * 2. Providing useful context in error messages and logs
 *
 * The actual retry behavior is controlled by the queue's configuration in src/queues/analysisQueue.ts
 */


// Error class for job processing errors
export class JobProcessingError extends Error {
  type: ErrorType;
  jobId?: string;
  retryable: boolean;
  // Maximum number of retries for this error type
  maxRetries: number;
  // Suggested delay before retry (in ms)
  retryDelay?: number;

  constructor(
    message: string,
    type: ErrorType,
    jobId?: string,
    retryable = false,
    maxRetries = 3,
    retryDelay?: number
  ) {
    super(message);
    this.name = 'JobProcessingError';
    this.type = type;
    this.jobId = jobId;
    this.retryable = retryable;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }
}

// Validate environment variables
validateEnv();

// Initialize Redis connection for the worker
// const connection = new Redis(config.redis.url);

/**
 * Updates job status in the database and emits a socket update
 * @param jobId - The ID of the job to update
 * @param status - The new status to set
 * @param details - Optional details to include (results, error, etc.)
 */
export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  details?: JobDetails | AnalysisResults | { error: string }
): Promise<void> {
  try {
    // Update job status in database
    await jobsRepository.updateJobStatus(jobId, status, details);

    // Prepare socket update payload
    const updatePayload: JobUpdatePayload = {
      jobId,
      status,
    };

    // Add results or error if provided
    if (details) {
      if (status === 'Complete') {
        updatePayload.results = details as AnalysisResults;
      } else if (status === 'Failed') {
        const errorDetails = details as { error: string };
        updatePayload.error = errorDetails.error || 'Unknown error';
      }
    }

    // Emit socket update via Redis Pub/Sub
    await emitSocketUpdate(jobId, updatePayload);
    logger.info(`Job ${jobId} status updated to ${status}`);
  } catch (error) {
    logger.error(`Error updating job status for ${jobId}:`, error);

    // Special case for failure updates - ensure job shows as failed even if socket update fails
    if (status !== 'Failed') {
      // Attempt to mark job as failed if the status update itself failed
      try {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error during status update';
        await jobsRepository.updateJobAsFailed(jobId, `Error updating job status: ${errorMsg}`);

        // Try to emit failure via socket, but don't throw if this fails too
        try {
          await emitSocketUpdate(jobId, {
            jobId,
            status: 'Failed',
            error: `Error updating job status: ${errorMsg}`,
          });
        } catch (socketError) {
          logger.error(`Failed to emit socket update for job failure ${jobId}:`, socketError);
        }
      } catch (dbError) {
        logger.error(`Critical error: Failed to mark job ${jobId} as failed:`, dbError);
      }
    }

    throw new JobProcessingError(
      `Failed to update job status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ErrorType.DATABASE,
      jobId
    );
  }
}

/**
 * Safely marks a job as failed with proper error handling
 * Ensures the job is marked as failed in DB and socket update is sent
 */
export async function markJobAsFailed(
  jobId: string,
  error: Error | string,
  errorType: ErrorType
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : error;
  const formattedError = `${errorType}: ${errorMessage}`;

  try {
    // Update database
    await jobsRepository.updateJobAsFailed(jobId, formattedError);

    // Emit socket update
    await emitSocketUpdate(jobId, {
      jobId,
      status: 'Failed',
      error: formattedError,
    });

    logger.error(`Job ${jobId} marked as failed: ${formattedError}`);
  } catch (updateError) {
    // Log but don't throw - we're already in an error handler
    logger.error(`Critical error: Failed to mark job ${jobId} as failed:`, updateError);
  }
}

/**
 * Determines if an error is likely transient and should be retried
 * @param error The error to evaluate
 * @returns Boolean indicating if retry is appropriate
 */
export function isRetryableError(error: Error | JobProcessingError): boolean {
  if (error instanceof JobProcessingError) {
    // Custom error with explicit retry flag
    return error.retryable;
  }

  // Network/timeout errors are likely transient
  const errorMsg = error.message.toLowerCase();
  return (
    errorMsg.includes('timeout') ||
    errorMsg.includes('econnrefused') ||
    errorMsg.includes('econnreset') ||
    errorMsg.includes('network') ||
    errorMsg.includes('rate limit') ||
    errorMsg.includes('429') ||
    errorMsg.includes('temporarily unavailable')
  );
}

/**
 * Determines recommended retry delay for an error
 * @param error The error that occurred
 * @param attemptsMade How many retry attempts have been made
 * @returns Delay in ms before next retry
 */
export function getRetryDelay(error: Error | JobProcessingError, attemptsMade: number): number {
  // If it's our custom error with retryDelay specified, use that
  if (error instanceof JobProcessingError && error.retryDelay) {
    return error.retryDelay;
  }

  // Otherwise use exponential backoff: 1s, 2s, 4s, 8s, etc.
  const baseDelay = 1000;
  return baseDelay * Math.pow(2, attemptsMade);
}

// Configure worker options with retry logic
const workerOptions: WorkerOptions = {
  connection: redisClient,
  concurrency: 5, // Process up to 5 jobs concurrently
  lockDuration: 180000, // 3 minutes - allow enough time for Gemini API calls which can be slow
  removeOnComplete: {
    count: 100, // Keep only the 100 most recent completed jobs
  },
  removeOnFail: {
    count: 500, // Keep only the 500 most recent failed jobs
  },
  // BullMQ retry settings are configured at the queue level
  // and per-job rather than on the worker
};

// Create a worker that listens to the analysis queue
const worker = new Worker(
  'analysis-queue',
  async (job: Job<AnalysisJobData>) => {
    const { jobId, url, language } = job.data;

    logger.info(`Starting processing of job ${jobId} for URL: ${url} with language: ${language}`);

    // Define cleanup function for the finally block
    const cleanup = () => {
      logger.info(`Completed processing of job ${jobId}`);
      // Any resource cleanup would go here
    };

    try {
      // Validate inputs
      if (!jobId || !url) {
        throw new JobProcessingError(
          'Invalid job data: jobId and url are required',
          ErrorType.VALIDATION,
          jobId
        );
      }

      // 1. Update job status to Processing
      await updateJobStatus(jobId, 'Processing');

      // 2. Update status to Fetching before calling content extraction API
      await updateJobStatus(jobId, 'Fetching');

      // 3. Call content extraction API - Use Firecrawl only for successfully resolved archive URLs
      let extractedContent;
      let useFirecrawl = false;
      let finalUrl = url;

      try {
        // Check if this is already an archive URL
        const isArchive = isArchiveUrl(url);

        if (isArchive && config.firecrawl?.apiKey) {
          // Already an archive URL, use Firecrawl directly
          logger.info(`Using Firecrawl for archive URL: ${url}`);
          useFirecrawl = true;
          finalUrl = url;
        } else {
          // Check if domain is on proactive list and try to resolve archive URL
          const { extractDomain, isDomainOnProactiveList } = await import('../lib/utils');
          const domain = extractDomain(url);

          if (isDomainOnProactiveList(domain)) {
            logger.info(`Domain ${domain} is on proactive list. Attempting to resolve archive snapshot...`);
            const { resolveArchiveSnapshot } = await import('../lib/resolveArchive');
            // Strip query params for better archive.is compatibility
            const cleanUrl = url.replace(/[?#].*$/, '');
            const archiveUrl = await resolveArchiveSnapshot(cleanUrl);

            if (archiveUrl && config.firecrawl?.apiKey) {
              // Successfully resolved archive URL, use Firecrawl
              logger.info(`Archive snapshot resolved: ${archiveUrl}. Using Firecrawl.`);
              useFirecrawl = true;
              finalUrl = archiveUrl;
            } else {
              // Archive resolution failed, fall back to Diffbot with cleaned URL (no query params)
              logger.warn(`Archive resolution failed for ${domain}. Falling back to Diffbot with cleaned URL.`);
              useFirecrawl = false;
              finalUrl = cleanUrl;
            }
          }
        }

        // Fetch content using the determined service
        if (useFirecrawl) {
          logger.info(`Fetching content with Firecrawl from: ${finalUrl}`);
          extractedContent = await fetchContentFromFirecrawl(finalUrl);
        } else {
          logger.info(`Fetching content with Diffbot from: ${finalUrl}`);
          extractedContent = await fetchContentFromDiffbot(finalUrl);
        }

        if (!extractedContent) {
          const serviceName = useFirecrawl ? 'Firecrawl' : 'Diffbot';
          throw new JobProcessingError(
            `${serviceName} returned no content`,
            ErrorType.DIFFBOT, // Using DIFFBOT error type for content extraction failures
            jobId,
            true, // Retryable
            3, // Max retries
            2000 // Retry delay
          );
        }

        // Debug log to see the structure of the extracted content
        logger.debug(
          `Extracted content for job ${jobId}:`,
          JSON.stringify(
            {
              title: extractedContent.title,
              author: extractedContent.author,
              siteName: extractedContent.siteName,
              images: extractedContent.images,
              imageDetails: extractedContent.images
                ? extractedContent.images.map((img: ImageDetails) => ({
                    url: img.url,
                    primary: img.primary,
                    width: img.width,
                    height: img.height,
                  }))
                : [],
              hasImages:
                !!extractedContent.images &&
                Array.isArray(extractedContent.images) &&
                extractedContent.images.length > 0,
            },
            null,
            2
          )
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        const isRateLimit =
          errorMsg.toLowerCase().includes('rate limit') || errorMsg.includes('429');

        // Determine which service was used
        const serviceName = useFirecrawl ? 'Firecrawl' : 'Diffbot';

        // Categorize network errors properly
        let errorType = ErrorType.DIFFBOT; // Using DIFFBOT error type for content extraction failures
        if (isRateLimit) {
          errorType = ErrorType.RATE_LIMIT;
        } else if (errorMsg.toLowerCase().includes('timeout')) {
          errorType = ErrorType.TIMEOUT;
        } else if (errorMsg.toLowerCase().includes('network')) {
          errorType = ErrorType.NETWORK;
        }

        throw new JobProcessingError(
          `Failed to extract content with ${serviceName}: ${errorMsg}`,
          errorType,
          jobId,
          true, // Most API issues are retryable
          isRateLimit ? 5 : 3, // More retries for rate limits
          isRateLimit ? 5000 : 2000 // Longer delay for rate limits
        );
      }

      // 4. Extract and save specific fields to dedicated columns
      try {
        // Get existing job data to preserve metadata from initial extraction
        const existingJob = await jobsRepository.getJob(jobId);

        // Extract fields from content extraction, but preserve existing metadata where available
        // Priority: existing metadata > extracted content > fallback
        const articleData = {
          article_title: extractedContent.title || existingJob.article_title || null,
          article_text: extractedContent.text || null,
          // Preserve author from initial metadata extraction if available
          article_author: existingJob.article_author || extractedContent.author || null,
          // Preserve site name from initial metadata extraction if available
          article_source_name: existingJob.article_source_name || extractedContent.siteName || null,
          // IMPORTANT: Always preserve the canonical URL from initial extraction, never overwrite with archive.is URLs
          article_canonical_url: existingJob.article_canonical_url || url,
          // Preserve preview image from initial metadata extraction if available, otherwise select from extracted images
          article_preview_image_url: existingJob.article_preview_image_url || selectPreviewImage(extractedContent.images),
          article_publication_date: extractedContent.date || existingJob.article_publication_date || null,
        };

        // Create minimal metadata JSON
        const minimalMetadata = createMinimalMetadata(extractedContent as DiffbotArticleObject);

        // Save extracted content to dedicated columns and minimal metadata to job_details
        await jobsRepository.saveExtractedArticleContent(jobId, articleData, minimalMetadata);

        logger.info(
          `Saved extracted article content for job ${jobId} with title "${articleData.article_title}"`
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        throw new JobProcessingError(
          `Failed to save extracted article content: ${errorMsg}`,
          ErrorType.DATABASE,
          jobId
        );
      }

      // 5. Update status to Analyzing before calling the LLM
      await updateJobStatus(jobId, 'Analyzing');

      // 6. Get article title and text from database
      let title, text;
      try {
        // Retrieve article content from database instead of using transient extractedContent
        const jobContent = await jobsRepository.getJobTitleAndText(jobId);
        title = jobContent.article_title;
        text = jobContent.article_text;

        if (!title || !text) {
          throw new JobProcessingError(
            'Failed to retrieve article title or text from database',
            ErrorType.DATABASE,
            jobId
          );
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        throw new JobProcessingError(
          `Failed to retrieve article content from database: ${errorMsg}`,
          ErrorType.DATABASE,
          jobId
        );
      }

      // 7. Save LLM input to file for development debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        try {
          const fs = await import('fs/promises');
          const path = await import('path');

          // Create extracted-content-samples directory if it doesn't exist
          const samplesDir = path.join(process.cwd(), 'extracted-content-samples');
          await fs.mkdir(samplesDir, { recursive: true });

          // Create filename with timestamp and domain
          const domain = new URL(url).hostname.replace('www.', '');
          const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
          const filename = `llm-input_${domain}_${timestamp}.json`;
          const filepath = path.join(samplesDir, filename);

          // Prepare LLM input data
          const llmInput = {
            jobId,
            url,
            language,
            timestamp: new Date().toISOString(),
            title,
            textLength: text.length,
            textPreview: text.substring(0, 500) + '...',
            fullText: text
          };

          // Write to file
          await fs.writeFile(filepath, JSON.stringify(llmInput, null, 2));
          logger.debug(`Saved LLM input to: ${filename}`);
        } catch (fsError) {
          // Don't fail the job if logging fails
          logger.warn('Failed to save LLM input sample:', fsError);
        }
      }

      // 8. Call AI API for analysis - now using either Gemini (primary) or OpenAI (fallback)
      let analysisResults: AnalysisResults;
      try {
        // Determine which LLM provider to use based on configuration
        // Default to Gemini unless OpenAI is explicitly specified
        const useOpenAI = config.ai.analysisLlmProvider === 'openai' && config.ai.openaiApiKey;

        if (useOpenAI) {
          logger.info(`Analyzing content for job ${jobId} with OpenAI...`);

          // Use OpenAI for analysis
          analysisResults = await performAnalysisWithOpenAI(title, text, language);
        } else {
          logger.info(`Analyzing content for job ${jobId} with Gemini...`);

          // Use Gemini for analysis (default/primary)
          analysisResults = await performAnalysisWithGemini(title, text, language);
        }

        if (!analysisResults) {
          const errorType = useOpenAI ? ErrorType.OPENAI : ErrorType.GEMINI;
          throw new JobProcessingError(
            `${useOpenAI ? 'OpenAI' : 'Gemini'} returned no analysis results`,
            errorType,
            jobId,
            true, // Retryable
            3, // Max retries
            2000 // Retry delay
          );
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        const isRateLimit =
          errorMsg.toLowerCase().includes('rate limit') || errorMsg.includes('429');

        // Determine error type based on the LLM provider
        const useOpenAI = config.ai.analysisLlmProvider === 'openai';

        // Categorize AI errors properly
        let errorType = useOpenAI ? ErrorType.OPENAI : ErrorType.GEMINI;
        if (isRateLimit) {
          errorType = ErrorType.RATE_LIMIT;
        } else if (errorMsg.toLowerCase().includes('timeout')) {
          errorType = ErrorType.TIMEOUT;
        } else if (
          errorMsg.toLowerCase().includes('authenticate') ||
          errorMsg.toLowerCase().includes('auth')
        ) {
          errorType = ErrorType.AUTH;
        }

        // If Gemini fails and OpenAI API key is available, try OpenAI as a fallback
        if (!useOpenAI && config.ai.openaiApiKey) {
          try {
            logger.info(`Gemini analysis failed for job ${jobId}, falling back to OpenAI...`);

            // Try using OpenAI as fallback
            analysisResults = await performAnalysisWithOpenAI(title, text, language);

            if (!analysisResults) {
              throw new Error('OpenAI fallback returned no analysis results');
            }

            // If we get here, OpenAI fallback succeeded
            logger.info(`Successfully analyzed content for job ${jobId} with OpenAI fallback`);

            // Continue execution with the OpenAI results
          } catch (fallbackError) {
            // If fallback also fails, throw the original error
            const fallbackErrorMsg =
              fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
            logger.error(`OpenAI fallback also failed for job ${jobId}: ${fallbackErrorMsg}`);

            const provider = useOpenAI ? 'OpenAI' : 'Gemini';
            throw new JobProcessingError(
              `Failed to analyze content with ${provider} and fallback: ${errorMsg}`,
              errorType,
              jobId,
              true, // API issues are often transient
              isRateLimit ? 5 : 3, // More retries for rate limits
              isRateLimit ? 5000 : 2000 // Longer delay for rate limits
            );
          }
        } else {
          // No fallback available or explicitly using OpenAI that failed
          const provider = useOpenAI ? 'OpenAI' : 'Gemini';
          throw new JobProcessingError(
            `Failed to analyze content with ${provider}: ${errorMsg}`,
            errorType,
            jobId,
            true, // API issues are often transient
            isRateLimit ? 5 : 3, // More retries for rate limits
            isRateLimit ? 5000 : 2000 // Longer delay for rate limits
          );
        }
      }

      // 8. Update status to Complete with analysis results
      await jobsRepository.updateJobAsComplete(jobId, analysisResults);
      await emitSocketUpdate(jobId, {
        jobId,
        status: 'Complete',
        results: analysisResults,
      });

      return {
        success: true,
        jobId,
        message: 'Analysis complete',
      };
    } catch (error) {
      logger.error(`Error processing job ${jobId}:`, error);

      // Determine if error is one of our custom errors
      if (error instanceof JobProcessingError) {
        // Mark job as failed with proper categorization
        await markJobAsFailed(jobId, error.message, error.type);

        // If error is retryable and we haven't exceeded max attempts, let BullMQ retry
        const customMaxRetries = error.maxRetries;
        const attemptsLimit = Math.min(job.opts.attempts || 1, customMaxRetries);

        if (error.retryable && job.attemptsMade < attemptsLimit - 1) {
          // Add more info to the error for BullMQ
          // Note: BullMQ will use its own delay logic as configured at the queue level
          throw error;
        } else {
          // No more retries, return error result
          return {
            success: false,
            jobId,
            error: error.message,
            errorType: error.type,
          };
        }
      } else {
        // For errors that aren't JobProcessingError, categorize them using our helper functions
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        const errorType = ErrorType.INTERNAL;

        // Check if error is an Error object before checking if it's retryable
        const errorObj = error instanceof Error ? error : new Error(errorMsg);
        const shouldRetry = isRetryableError(errorObj);

        // Mark job as failed with determined error type
        await markJobAsFailed(jobId, errorMsg, errorType);

        // If it's a retryable error and we haven't exceeded max attempts, throw to let BullMQ retry
        if (shouldRetry && job.attemptsMade < (job.opts.attempts || 1) - 1) {
          throw error;
        }

        // Return error result for non-retryable errors or if max retries reached
        return {
          success: false,
          jobId,
          error: errorMsg,
          errorType,
        };
      }
    } finally {
      // Always run cleanup regardless of success or failure
      cleanup();
    }
  },
  workerOptions
);

// Register worker events
if (process.env.NODE_ENV !== 'test') {
  worker.on('completed', (job: Job, returnvalue: unknown) => {
    logger.info(`Job ${job.id} completed with result:`, returnvalue);
  });

  worker.on('failed', (job: Job | undefined, error: Error) => {
    logger.error(`Job ${job?.id || 'unknown'} failed with error:`, error);

    // Additional attempt to mark the job as failed in the database
    // This is a safety net in case the job processor didn't handle the error
    const jobData = job?.data as AnalysisJobData | undefined;
    if (jobData?.jobId) {
      markJobAsFailed(jobData.jobId, error.message, ErrorType.INTERNAL).catch(e =>
        logger.error(
          `Critical error: Failed final attempt to mark job ${jobData.jobId} as failed:`,
          e
        )
      );
    } else {
      logger.error(
        `Critical error during failure handling for job ${jobData?.jobId || 'unknown'}:`,
        error
      );
    }
  });

  worker.on('error', error => {
    logger.error('Worker error:', error);
  });

  worker.on('active', (job: Job) => {
    logger.info(`Job ${job.id} has started processing`);
  });

  worker.on('stalled', (jobId: string) => {
    logger.error(`Job ${jobId} has been stalled - possible worker crash`);
  });

  worker.on('progress', (job: Job, progress: unknown) => {
    logger.info(`Job ${job.id} reported progress: ${JSON.stringify(progress)}`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing worker gracefully...');
  void worker.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, closing worker gracefully...');
  void worker.close();
  process.exit(0);
});

process.on('uncaughtException', error => {
  logger.error('Uncaught exception in worker process:', error);
  void worker.close();
  process.exit(1);
});

// Export the worker for use in other modules
export default worker;
