import { Request, Response } from 'express';
import { jobsRepository } from '../../db/jobsRepository';
import { ErrorResponse, HistoryItem } from '../../types';
import logger from '../../lib/logger';
import { getProxiedImageUrl, selectPreviewImage } from '../../lib/utils';

/**
 * Get history of completed jobs
 */
export async function getHistory(req: Request, res: Response): Promise<void> {
    try {
        const history = await jobsRepository.getJobHistory();

        // Process each history item to ensure consistent data structure
        const processedHistory = history.map((item: HistoryItem) => {
            // Create a mutable copy to avoid TypeScript issues
            const processedItem = { ...item } as HistoryItem & { headline?: string };

            // Prioritize article_title over headline from job_details->title
            if (processedItem.article_title) {
                processedItem.headline = processedItem.article_title;
            }

            // Handle preview image URL
            if (processedItem.article_preview_image_url) {
                processedItem.article_preview_image_url = getProxiedImageUrl(processedItem.article_preview_image_url);
            } else if (processedItem.job_details && processedItem.job_details.images) {
                const imageUrl = selectPreviewImage(processedItem.job_details.images);
                if (imageUrl) {
                    processedItem.article_preview_image_url = getProxiedImageUrl(imageUrl);
                }
            }

            return processedItem;
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