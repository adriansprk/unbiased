import { supabase } from './supabaseClient';
import { Job, JobStatus, JobDetails, AnalysisResults, ImageDetails, ExtractedArticleData, MinimalJobMetadata, HistoryItem } from '../types';
import { getProxiedImageUrl, normalizeUrl } from '../lib/utils';
import logger from '../lib/logger';

// Helper function to transform external image URLs to proxied URLs in job details
function transformToProxiedImageUrls(details: JobDetails): JobDetails {
  if (!details) {
    return details;
  }

  const updatedDetails = { ...details };

  // Transform image URLs in the images array
  if (updatedDetails.images && Array.isArray(updatedDetails.images)) {
    updatedDetails.images = updatedDetails.images.map((image: ImageDetails) => {
      // Handle Archive.is images (where url is null but originalUrl contains the Archive.is URL)
      if (image && image.isArchiveImage && image.originalUrl) {
        return {
          ...image,
          url: getProxiedImageUrl(image.originalUrl),
        };
      }
      // Handle regular images
      else if (image && image.url) {
        return {
          ...image,
          url: getProxiedImageUrl(image.url),
        };
      }
      return image;
    });
  }

  // Transform the main image URL if present
  if ('imageUrl' in updatedDetails && typeof updatedDetails.imageUrl === 'string') {
    updatedDetails.imageUrl = getProxiedImageUrl(updatedDetails.imageUrl);
  }

  // Transform image URLs in the HTML content if present (simple regex-based approach)
  if (updatedDetails.html) {
    // This is a simple approach and may not catch all image URLs
    // A more robust approach would be to use a proper HTML parser
    updatedDetails.html = updatedDetails.html.replace(
      /<img[^>]+src="([^"]+)"/g,
      (match: string, imgUrl: string) => {
        const proxiedUrl = getProxiedImageUrl(imgUrl);
        return match.replace(imgUrl, proxiedUrl);
      }
    );
  }

  return updatedDetails;
}

/**
 * Repository for job-related database operations
 */
export const jobsRepository = {
  /**
   * Create a new job in the database
   * @param url The original URL for the job
   * @param language The language for analysis (default: 'en')
   * @param normalizedUrl Optional pre-normalized URL, if not provided will use normalizeUrl utility
   * @param metadata Optional metadata extracted from the URL (title, image, author, etc.)
   * @returns The created job object
   */
  async createJob(
    url: string,
    language: string = 'en',
    normalizedUrl?: string,
    metadata?: {
      title?: string;
      image?: string;
      authors?: string[];
      siteName?: string;
      canonicalUrl?: string;
    }
  ): Promise<Job> {
    try {
      // Validate language parameter
      const validLanguage = ['en', 'de'].includes(language) ? language : 'en';

      // If normalizedUrl is not provided, normalize the URL
      const normalized = normalizedUrl || normalizeUrl(url);

      const result = await supabase
        .from('jobs')
        .insert({
          url,
          language: validLanguage,
          normalized_url: normalized,
          // Add metadata fields if provided
          article_title: metadata?.title || null,
          article_preview_image_url: metadata?.image || null,
          article_author: metadata?.authors?.[0] || null, // Use first author
          article_source_name: metadata?.siteName || null,
          article_canonical_url: metadata?.canonicalUrl || url,
        })
        .select()
        .single();

      const data = result.data as Job | null;
      const error = result.error;

      if (error) {
        throw new Error(`Database error creating job: ${error.message}`);
      }
      if (!data) {
        throw new Error('No data returned after creating job');
      }

      return data;
    } catch (error) {
      logger.error('Error creating job:', error);
      throw error;
    }
  },

  /**
   * Get a job by ID
   */
  async getJob(jobId: string): Promise<Job> {
    try {
      // First check if the job exists
      const { count, error: countError } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('id', jobId);

      // If there's an error or count is 0, job doesn't exist
      if (countError || count === 0) {
        throw new Error(`Job with ID ${jobId} not found`);
      }

      // Now retrieve the job data
      const { data, error } = await supabase
        .from('jobs')
        .select(
          `
                    id, 
                    url, 
                    status, 
                    language,
                    job_details,
                    analysis_results,
                    error_message,
                    created_at,
                    updated_at,
                    normalized_url,
                    article_title,
                    article_text,
                    article_author,
                    article_source_name,
                    article_preview_image_url,
                    article_publication_date,
                    article_canonical_url
                `
        )
        .eq('id', jobId)
        .single();

      if (error) {
        throw new Error(`Database error retrieving job: ${error.message}`);
      }

      // If job not found, throw a specific error (should not happen after our check)
      if (!data) {
        throw new Error(`Job with ID ${jobId} not found`);
      }

      // Transform image URLs in job_details to use the proxy
      if (data.job_details) {
        data.job_details = transformToProxiedImageUrls(data.job_details as JobDetails);
      }

      return data;
    } catch (error) {
      logger.error(`Error retrieving job ${jobId}:`, error);
      throw error;
    }
  },

  /**
   * Update job status in the database
   */
  async updateJobStatus(jobId: string, status: JobStatus, details?: JobDetails | AnalysisResults | { error: string }): Promise<Job> {
    try {
      const updateData: Partial<Job> = { status };

      if (details) {
        if (status === 'Complete') {
          updateData.analysis_results = details as AnalysisResults;
        } else if (status === 'Failed') {
          const errorDetails = details as { error: string };
          updateData.error_message = errorDetails.error || 'Unknown error';
        } else {
          // Transform image URLs in job_details to use the proxy before storing
          updateData.job_details = transformToProxiedImageUrls(details as JobDetails);
        }
      }

      const result = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId)
        .select()
        .single();

      const { data, error } = result as { data: Job | null; error: { message: string } | null };

      if (error) {
        throw new Error(`Database error updating job status: ${error.message}`);
      }
      if (!data) {
        throw new Error(`Job with ID ${jobId} not found for status update`);
      }

      return data;
    } catch (error) {
      logger.error(`Error updating job status for ${jobId}:`, error);
      throw error;
    }
  },

  /**
   * Specifically mark a job as failed with an error message
   * @param jobId ID of the job to mark as failed
   * @param errorMessage Detailed error message describing the failure
   * @returns Updated job record
   * @throws Database error if update fails
   */
  async updateJobAsFailed(jobId: string, errorMessage: string): Promise<Job> {
    if (!jobId) {
      throw new Error('Invalid job ID: cannot mark job as failed');
    }

    if (!errorMessage) {
      errorMessage = 'Unknown error occurred (no error message provided)';
    }

    try {
      logger.warn(`Marking job ${jobId} as failed with error: ${errorMessage}`);

      const result = await supabase
        .from('jobs')
        .update({
          status: 'Failed',
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .select()
        .single();

      const { data, error } = result as { data: Job | null; error: { message: string } | null };

      if (error) {
        throw new Error(`Database error marking job as failed: ${error.message}`);
      }
      if (!data) {
        throw new Error(`Job with ID ${jobId} not found for failure update`);
      }

      return data;
    } catch (error) {
      logger.error(`Error marking job ${jobId} as failed:`, error);
      // Rethrow with improved error message for debugging
      if (error instanceof Error) {
        throw new Error(`Failed to mark job as failed: ${error.message}`);
      } else {
        throw new Error(`Failed to mark job as failed: ${String(error)}`);
      }
    }
  },

  /**
   * Mark a job as complete with analysis results
   * @param jobId ID of the job to mark as complete
   * @param results Analysis results to store with the job
   * @returns Updated job record
   * @throws Database error if update fails
   */
  async updateJobAsComplete(jobId: string, results: AnalysisResults): Promise<Job> {
    if (!jobId) {
      throw new Error('Invalid job ID: cannot mark job as complete');
    }

    if (!results) {
      throw new Error('Invalid results: cannot mark job as complete without results');
    }

    try {
      logger.info(`Marking job ${jobId} as complete with results`);

      const result = await supabase
        .from('jobs')
        .update({
          status: 'Complete',
          analysis_results: results,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .select()
        .single();

      const { data, error } = result as { data: Job | null; error: { message: string } | null };

      if (error) {
        throw new Error(`Database error marking job as complete: ${error.message}`);
      }
      if (!data) {
        throw new Error(`Job with ID ${jobId} not found for completion update`);
      }

      return data;
    } catch (error) {
      logger.error(`Error marking job ${jobId} as complete:`, error);
      // Rethrow with improved error message for debugging
      if (error instanceof Error) {
        throw new Error(`Failed to mark job as complete: ${error.message}`);
      } else {
        throw new Error(`Failed to mark job as complete: ${String(error)}`);
      }
    }
  },

  /**
   * Update job details in the database without changing status
   * @param jobId ID of the job to update
   * @param details JobDetails object containing extracted content
   * @returns Updated job record
   */
  async updateJobDetailsInDb(jobId: string, details: JobDetails): Promise<Job> {
    try {
      // Transform image URLs in job_details to use the proxy before storing
      const transformedDetails = transformToProxiedImageUrls(details);

      const result = await supabase
        .from('jobs')
        .update({ job_details: transformedDetails })
        .eq('id', jobId)
        .select()
        .single();

      const { data, error } = result as { data: Job | null; error: { message: string } | null };

      if (error) {
        throw new Error(`Database error updating job details: ${error.message}`);
      }
      if (!data) {
        throw new Error(`Job with ID ${jobId} not found for details update`);
      }

      return data;
    } catch (error) {
      logger.error(`Error updating job details for ${jobId}:`, error);
      throw error;
    }
  },

  /**
   * Save extracted article content from Diffbot to dedicated database columns
   * and store minimal metadata in job_details
   *
   * @param jobId ID of the job to update
   * @param articleData Object containing the extracted article fields
   * @param minimalMetadata Minimal metadata object for the job_details column
   * @returns Updated job record
   */
  async saveExtractedArticleContent(
    jobId: string,
    articleData: ExtractedArticleData,
    minimalMetadata: MinimalJobMetadata
  ): Promise<Job> {
    try {
      logger.info(`Saving extracted article content for job ${jobId}`);

      // Transform image URL to use the proxy before storing
      if (articleData.article_preview_image_url) {
        articleData.article_preview_image_url = getProxiedImageUrl(
          articleData.article_preview_image_url
        );
      }

      const result = await supabase
        .from('jobs')
        .update({
          // Dedicated columns for article data
          article_title: articleData.article_title,
          article_text: articleData.article_text,
          article_author: articleData.article_author,
          article_source_name: articleData.article_source_name,
          article_canonical_url: articleData.article_canonical_url,
          article_preview_image_url: articleData.article_preview_image_url,
          article_publication_date: articleData.article_publication_date,

          // Minimal metadata in job_details
          job_details: minimalMetadata,

          // Update timestamp
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .select()
        .single();

      const { data, error } = result as { data: Job | null; error: { message: string } | null };

      if (error) {
        throw new Error(`Database error saving article content: ${error.message}`);
      }
      if (!data) {
        throw new Error(`Job with ID ${jobId} not found for article content update`);
      }

      return data;
    } catch (error) {
      logger.error(`Error saving article content for ${jobId}:`, error);
      throw error;
    }
  },

  /**
   * Retrieve article title and text for a job (used for passing to OpenAI)
   * @param jobId ID of the job to retrieve content for
   * @returns Object containing article_title and article_text
   * @throws Database error if retrieval fails
   */
  async getJobTitleAndText(
    jobId: string
  ): Promise<{ article_title: string; article_text: string }> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('article_title, article_text')
        .eq('id', jobId)
        .single();

      if (error) {
        throw new Error(`Database error retrieving job content: ${error.message}`);
      }
      if (!data) {
        throw new Error(`Job with ID ${jobId} not found`);
      }

      // Check if we have the content in the new columns
      if (!data.article_title || !data.article_text) {
        throw new Error(`Job ${jobId} missing required article content`);
      }

      return {
        article_title: data.article_title as string,
        article_text: data.article_text as string,
      };
    } catch (error) {
      logger.error(`Error retrieving article content for job ${jobId}:`, error);
      throw error;
    }
  },

  /**
   * Get recent job history
   */
  async getJobHistory(limit = 50): Promise<HistoryItem[]> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(
          `
                    id,
                    url,
                    status,
                    job_details->title as headline,
                    analysis_results->slant as slant,
                    article_title,
                    article_preview_image_url,
                    job_details,
                    created_at
                `
        )
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Database error retrieving job history: ${error.message}`);
      }
      return (data as unknown as HistoryItem[]) || [];
    } catch (error) {
      logger.error('Error retrieving job history:', error);
      throw error;
    }
  },

  /**
   * Find a completed job by normalized URL and language
   * @param normalizedUrl The normalized URL to search for
   * @param language The language to search for
   * @returns The found job or null if none exists
   */
  async findCompletedJobByNormalizedUrlAndLanguage(
    normalizedUrl: string,
    language: string
  ): Promise<Job | null> {
    try {
      const result = await supabase
        .from('jobs')
        .select('*')
        .eq('normalized_url', normalizedUrl)
        .eq('language', language)
        .eq('status', 'Complete')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data, error } = result as { data: Job | null; error: { message: string } | null };

      if (error) {
        throw new Error(`Database error finding job: ${error.message}`);
      }

      // Transform image URLs in job_details if job exists
      if (data && data.job_details) {
        data.job_details = transformToProxiedImageUrls(data.job_details);
      }

      return data;
    } catch (error) {
      logger.error(`Error finding job by normalized URL ${normalizedUrl}:`, error);
      throw error;
    }
  },
};

export default jobsRepository;
