import { Request, Response } from 'express';
import { isValidUuid } from '../../lib';
import { jobsRepository } from '../../db/jobsRepository';
import { ErrorResponse, JobStatusResponse } from '../../types';
import logger from '../../lib/logger';
import { getProxiedImageUrl, selectPreviewImage } from '../../lib/utils';

/**
 * Get status of a specific job
 * This endpoint is public for 'Complete' status jobs to support sharing
 * Returns all necessary data including normalized_url for displaying a shared analysis page
 */
export async function getStatusByJobId(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;

        // Validate UUID format
        if (!isValidUuid(jobId)) {
            const errorResponse: ErrorResponse = {
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Invalid Job ID format.'
                }
            };
            res.status(400).json(errorResponse);
            return;
        }

        // Get job from database
        const job = await jobsRepository.getJob(jobId);

        // Create the response with consistent structure, prioritizing new columns
        // but falling back to job_details for compatibility with older records
        const response: JobStatusResponse = {
            id: job.id,
            url: job.url,
            status: job.status,
            language: job.language,
            analysis_results: job.analysis_results,
            job_details: job.job_details,
            error_message: job.error_message,
            created_at: job.created_at,
            updated_at: job.updated_at,
            normalized_url: job.normalized_url // Include normalized_url for sharing
        };

        // Add article preview data from new columns first, falling back to job_details

        // 1. Article title
        response.article_title = job.article_title ||
            (job.job_details && job.job_details.title) || null;

        // 2. Article author
        response.article_author = job.article_author ||
            (job.job_details && job.job_details.author) || null;

        // 3. Article source name
        response.article_source_name = job.article_source_name ||
            (job.job_details && job.job_details.siteName) || null;

        // 4. Article publication date
        response.article_publication_date = job.article_publication_date ||
            (job.job_details && job.job_details.date) || null;

        // 5. Article canonical URL
        response.article_canonical_url = job.article_canonical_url ||
            (job.job_details && job.job_details.url) || null;

        // 6. Article preview image URL with special handling
        let previewImageUrl: string | null = job.article_preview_image_url || null;

        // If no preview image in new column, try to extract from job_details
        if (!previewImageUrl && job.job_details && job.job_details.images) {
            previewImageUrl = selectPreviewImage(job.job_details.images);
        }

        // Proxy the image URL if it exists
        if (previewImageUrl) {
            response.article_preview_image_url = getProxiedImageUrl(previewImageUrl);
        } else {
            response.article_preview_image_url = null;
        }

        res.status(200).json(response);
        return;

    } catch (error) {
        logger.error('Error getting job status:', error);

        // Check if it's a not found error
        if (error instanceof Error && error.message.includes('not found')) {
            const errorResponse: ErrorResponse = {
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Job not found.'
                }
            };
            res.status(404).json(errorResponse);
            return;
        }

        const errorResponse: ErrorResponse = {
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to retrieve job status.'
            }
        };
        res.status(500).json(errorResponse);
        return;
    }
} 