import { Request, Response } from 'express';
import { z } from 'zod';
import axios from 'axios';
import { jobsRepository } from '../../db/jobsRepository';
import { addAnalysisJob } from '../../queues/analysisQueue';
import { extractDomain, normalizeUrl } from '../../lib/utils';
import logger from '../../lib/logger';
import config from '../../config';

// Validation schema for submit endpoint
const submitSchema = z.object({
    url: z.string().url('Invalid URL format'),
    language: z.enum(['en', 'de']).default('en'),
    'cf-turnstile-response': process.env.NODE_ENV === 'development'
        ? z.string().optional() // Optional in development mode
        : z.string({
            required_error: "Turnstile verification token is required for security validation"
        }).min(10, {
            message: "Invalid Turnstile token format - token too short"
        })
});

/**
 * Validates if the provided string is a valid URL
 */
export function isValidUrl(url: string): boolean {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Validates if the provided language is supported
 */
export function isValidLanguage(language: string): boolean {
    return ['en', 'de'].includes(language);
}

/**
 * Verifies a Cloudflare Turnstile token
 * @param token The Turnstile token to verify
 * @param ip Optional IP address of the client
 * @returns Object with success status and error message if applicable
 */
async function verifyTurnstileToken(token: string, ip?: string): Promise<{ success: boolean; error?: string }> {
    try {
        logger.debug(`Verifying Turnstile token (length: ${token.length})`);

        const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

        if (!secretKey) {
            logger.error('CLOUDFLARE_TURNSTILE_SECRET_KEY is not configured');
            return { success: false, error: 'Configuration error: Missing secret key' };
        }

        if (!token || token.trim() === '') {
            logger.warn('Empty Turnstile token provided');
            return { success: false, error: 'Empty verification token' };
        }

        const formData = new URLSearchParams();
        formData.append('secret', secretKey);
        formData.append('response', token);

        // Add IP address if provided
        if (ip) {
            formData.append('remoteip', ip);
            logger.debug(`Including client IP in verification: ${ip}`);
        }

        // Log before making the verification request
        logger.debug('Sending verification request to Cloudflare Turnstile');

        const verifyResponse = await axios.post(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            formData.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 5000 // 5 second timeout for verification requests
            }
        );

        const responseData = verifyResponse.data as { success: boolean; 'error-codes'?: string[] };
        const { success, 'error-codes': errorCodes } = responseData;

        // Log the verification response
        logger.debug('Turnstile verification response:', { success, errorCodes });

        if (!success) {
            logger.warn('Turnstile verification failed', { errorCodes });
            return {
                success: false,
                error: errorCodes ? `Verification failed: ${errorCodes.join(', ')}` : 'Verification failed'
            };
        }

        logger.debug('Turnstile verification successful');
        return { success: true };
    } catch (error) {
        // Handle different types of errors (network, timeout, etc.)
        if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
            logger.error('Timeout during Turnstile verification');
            return { success: false, error: 'Verification service timeout' };
        } else if (axios.isAxiosError(error) && !error.response) {
            logger.error('Network error during Turnstile verification:', error);
            return { success: false, error: 'Could not reach verification service' };
        }

        logger.error('Error verifying Turnstile token:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error during verification'
        };
    }
}

/**
 * Handler for the submit endpoint
 * Creates a new job and adds it to the analysis queue
 */
export async function submitHandler(req: Request, res: Response) {
    try {
        // 1. STEP ONE: Input validation
        // Validate request body
        const validationResult = submitSchema.safeParse(req.body);

        if (!validationResult.success) {
            logger.warn('Validation error in submit endpoint:', validationResult.error.errors);
            return res.status(400).json({
                error: 'Invalid request data',
                details: validationResult.error.errors
            });
        }

        const { url, language, 'cf-turnstile-response': turnstileToken } = validationResult.data;

        // 2. STEP TWO: Turnstile verification (security check)
        // Only proceed if verification succeeds or we're in development mode without a token
        // This must be done BEFORE creating any jobs or database entries
        if (process.env.NODE_ENV !== 'development' || turnstileToken) {
            // Verify Turnstile token first, before any other operations
            const clientIp = req.ip || req.headers['x-forwarded-for'] as string || undefined;
            const verification = await verifyTurnstileToken(turnstileToken || '', clientIp);

            if (!verification.success) {
                logger.warn('Turnstile verification failed for URL:', { url, error: verification.error });
                return res.status(403).json({
                    error: 'Verification failed',
                    message: verification.error || 'Invalid verification token'
                });
            }

            logger.info('Turnstile verification successful for URL:', url);
        } else {
            logger.info('Skipping Turnstile verification in development mode');
        }

        // 3. STEP THREE: URL normalization
        // Normalize URL for consistency and duplicate checking
        const normalizedUrl = normalizeUrl(url);

        // Extract domain for logging
        const domain = extractDomain(url);
        logger.info(`New analysis job submitted for domain: ${domain}, language: ${language}`);

        // 4. STEP FOUR: Check for existing analysis before creating a new job
        if (config.features.reuseExistingAnalysis) {
            logger.info(`Checking for existing analysis with normalized URL: ${normalizedUrl}`);

            const existingJob = await jobsRepository.findCompletedJobByNormalizedUrlAndLanguage(
                normalizedUrl,
                language
            );

            if (existingJob) {
                logger.info(`Found existing completed analysis for URL: ${url}, returning job ID: ${existingJob.id}`);

                // Get the full job details to include all necessary data
                const fullJobDetails = await jobsRepository.getJob(existingJob.id);

                // Create a comprehensive response with all required fields
                return res.status(200).json({
                    jobId: fullJobDetails.id,
                    url: fullJobDetails.url,
                    language: fullJobDetails.language,
                    existingAnalysis: true,
                    analysis_results: fullJobDetails.analysis_results,
                    // Include article data from dedicated columns or fall back to job_details
                    article_title: fullJobDetails.article_title ||
                        (fullJobDetails.job_details?.title || null),
                    article_author: fullJobDetails.article_author ||
                        (fullJobDetails.job_details?.author || null),
                    article_source_name: fullJobDetails.article_source_name ||
                        (fullJobDetails.job_details?.siteName || null),
                    article_canonical_url: fullJobDetails.article_canonical_url ||
                        (fullJobDetails.job_details?.url || fullJobDetails.url || null),
                    article_preview_image_url: fullJobDetails.article_preview_image_url ||
                        (fullJobDetails.job_details?.images?.[0]?.url || null),
                    article_publication_date: fullJobDetails.article_publication_date ||
                        (fullJobDetails.job_details?.date || null),
                    // Optional: Include article_text only if not too large
                    article_text: fullJobDetails.article_text ||
                        (fullJobDetails.job_details?.text || null)
                });
            }
        }

        // 5. STEP FIVE: Create and queue new job (only reached if all validations pass)
        logger.info(`Creating new job for URL: ${url}, language: ${language}`);

        // Create job record in database with normalized URL
        const job = await jobsRepository.createJob(url, language, normalizedUrl);

        // Add job to the analysis queue
        await addAnalysisJob(job.id, url, language);

        // Return success response with job ID
        return res.status(201).json({
            message: 'Analysis job submitted successfully',
            jobId: job.id
        });
    } catch (error) {
        logger.error('Error in submit endpoint:', error);

        return res.status(500).json({
            error: 'Server error processing your request',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

export default submitHandler; 