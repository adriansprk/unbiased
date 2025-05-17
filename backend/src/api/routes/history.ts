import { Request, Response } from 'express';
import { jobsRepository } from '../../db/jobsRepository';
import { ErrorResponse } from '../../types';
import logger from '../../lib/logger';
import { getProxiedImageUrl, selectPreviewImage } from '../../lib/utils';

/**
 * Get history of completed jobs
 */
export async function getHistory(req: Request, res: Response): Promise<void> {
    try {
        const history = await jobsRepository.getJobHistory();

        // Process each history item to ensure consistent data structure
        const processedHistory = history.map(item => {
            // Prioritize article_title over headline from job_details->title
            if (item.article_title) {
                item.headline = item.article_title;
            }

            // Handle preview image URL
            if (item.article_preview_image_url) {
                item.article_preview_image_url = getProxiedImageUrl(item.article_preview_image_url);
            } else if (item.job_details && item.job_details.images) {
                const imageUrl = selectPreviewImage(item.job_details.images);
                if (imageUrl) {
                    item.article_preview_image_url = getProxiedImageUrl(imageUrl);
                }
            }

            return item;
        });

        res.status(200).json(processedHistory);
        return;

    } catch (error) {
        logger.error('Error getting job history:', error);

        const errorResponse: ErrorResponse = {
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to retrieve history.'
            }
        };
        res.status(500).json(errorResponse);
        return;
    }
} 