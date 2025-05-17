import { Request, Response } from 'express';
import { jobsRepository } from '../../db/jobsRepository';
import { isValidUuid } from '../../lib';
import { ErrorResponse, JobResultsResponse } from '../../types';
import logger from '../../lib/logger';

/**
 * Handler for retrieving complete analysis results
 * GET /api/results/:jobId
 * 
 * This endpoint is designed to return the complete analysis results for a job
 * that has successfully completed processing. It should:
 * 1. Only return results for 'Complete' jobs
 * 2. Return a 404 if the job is not found
 * 3. Return a 409 (Conflict) if the job is not yet complete
 * 4. Return a 200 with full results if the job is complete
 */
export async function resultsHandler(req: Request, res: Response) {
    try {
        const { jobId } = req.params;

        logger.debug(`Results endpoint called for job ID: ${jobId}`);

        // Validate UUID format
        if (!isValidUuid(jobId)) {
            logger.warn(`Invalid job ID format received: ${jobId}`);
            const errorResponse: ErrorResponse = {
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Invalid Job ID format.'
                }
            };
            return res.status(400).json(errorResponse);
        }

        // Get job from database
        logger.debug(`Fetching job from database: ${jobId}`);
        const job = await jobsRepository.getJob(jobId);
        logger.debug(`Job status for ${jobId}: ${job.status}`);

        // Check if job is complete
        if (job.status !== 'Complete') {
            logger.info(`Job ${jobId} is not complete. Current status: ${job.status}`);
            const errorResponse: ErrorResponse = {
                success: false,
                error: {
                    code: 'JOB_NOT_COMPLETE',
                    message: `Job is not complete. Current status: ${job.status}`
                }
            };
            return res.status(409).json(errorResponse);
        }

        // Verify analysis results exist
        if (!job.analysis_results) {
            logger.error(`Job ${jobId} is marked complete but has no analysis results`);
            const errorResponse: ErrorResponse = {
                success: false,
                error: {
                    code: 'NO_RESULTS',
                    message: 'Job is marked complete but no results are available.'
                }
            };
            return res.status(500).json(errorResponse);
        }

        // Return only the analysis results
        const response: JobResultsResponse = {
            jobId: job.id,
            url: job.url,
            analysis: job.analysis_results,
            created_at: job.created_at,
            completed_at: job.updated_at
        };

        logger.info(`Successfully returning results for job ${jobId}`);

        // Add appropriate cache headers - results are cacheable for longer periods
        res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        res.status(200).json(response);

    } catch (error) {
        logger.error(`Error retrieving job results for ${req.params.jobId}:`, error);

        // Check if it's a not found error
        if (error instanceof Error && error.message.includes('not found')) {
            const errorResponse: ErrorResponse = {
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Job not found.'
                }
            };
            return res.status(404).json(errorResponse);
        }

        const errorResponse: ErrorResponse = {
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to retrieve job results.'
            }
        };
        res.status(500).json(errorResponse);
    }
}

export default resultsHandler; 