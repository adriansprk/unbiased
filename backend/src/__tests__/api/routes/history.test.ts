import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';
import { jobsRepository } from '../../../db/jobsRepository';
import * as utils from '../../../lib/utils';
import { getHistory } from '../../../api/routes/history';

// Mock dependencies
vi.mock('../../../db/jobsRepository', () => ({
    jobsRepository: {
        getJobHistory: vi.fn()
    }
}));

vi.mock('../../../lib/utils', () => ({
    getProxiedImageUrl: vi.fn(url => `proxied-${url}`),
    selectPreviewImage: vi.fn(images => images && images.length > 0 && images[0].primary ? images[0].url : (images && images.length > 0 ? images[0].url : null))
}));

vi.mock('../../../lib/logger', () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
    }
}));

// Create mock request and response
const mockRequest = () => {
    return {} as Request;
};

const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
};

describe('GET /api/history', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should return job history with correct data structure', async () => {
        // Mock job history with a mix of new and old records
        const mockHistory = [
            {
                // Job with new dedicated columns
                id: '12345678-1234-1234-1234-123456789012',
                url: 'https://example.com/article1',
                status: 'Complete',
                article_title: 'New Article 1',
                article_preview_image_url: 'https://example.com/image1.jpg',
                slant: 'Liberal',
                created_at: '2023-01-15T12:00:00Z',
                headline: null, // From job_details->title
                job_details: { otherData: 'value' }
            },
            {
                // Job with data from old job_details structure
                id: '87654321-4321-4321-4321-210987654321',
                url: 'https://example.com/article2',
                status: 'Complete',
                article_title: null,
                article_preview_image_url: null,
                slant: 'Conservative',
                created_at: '2022-12-01T12:00:00Z',
                headline: 'Old Article 2', // From job_details->title
                job_details: {
                    title: 'Old Article 2',
                    images: [
                        { url: 'https://example.com/old-image.jpg', primary: true }
                    ]
                }
            }
        ];

        (jobsRepository.getJobHistory as any).mockResolvedValueOnce(mockHistory);
        const req = mockRequest();
        const res = mockResponse();

        // Execute
        await getHistory(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);

        // Check that the response has the expected structure
        const expectedProcessedHistory = [
            {
                id: '12345678-1234-1234-1234-123456789012',
                url: 'https://example.com/article1',
                status: 'Complete',
                headline: 'New Article 1', // Should use article_title
                article_preview_image_url: 'proxied-https://example.com/image1.jpg',
                slant: 'Liberal',
                created_at: '2023-01-15T12:00:00Z',
                job_details: { otherData: 'value' },
                article_title: 'New Article 1'
            },
            {
                id: '87654321-4321-4321-4321-210987654321',
                url: 'https://example.com/article2',
                status: 'Complete',
                headline: 'Old Article 2', // Uses the existing headline from job_details->title
                article_preview_image_url: 'proxied-https://example.com/old-image.jpg',
                slant: 'Conservative',
                created_at: '2022-12-01T12:00:00Z',
                job_details: {
                    title: 'Old Article 2',
                    images: [
                        { url: 'https://example.com/old-image.jpg', primary: true }
                    ]
                },
                article_title: null
            }
        ];

        expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining(expectedProcessedHistory[0]),
            expect.objectContaining(expectedProcessedHistory[1])
        ]));

        // Verify the image URLs were proxied
        expect(utils.getProxiedImageUrl).toHaveBeenCalledWith('https://example.com/image1.jpg');
        expect(utils.getProxiedImageUrl).toHaveBeenCalledWith('https://example.com/old-image.jpg');
    });

    it('should handle server errors gracefully', async () => {
        // Mock an error in getJobHistory
        (jobsRepository.getJobHistory as any).mockRejectedValueOnce(new Error('Database error'));

        const req = mockRequest();
        const res = mockResponse();

        // Execute
        await getHistory(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            error: expect.objectContaining({
                code: 'SERVER_ERROR',
                message: 'Failed to retrieve history.'
            })
        }));
    });

    it('should return empty array when no history exists', async () => {
        // Mock empty history
        (jobsRepository.getJobHistory as any).mockResolvedValueOnce([]);

        const req = mockRequest();
        const res = mockResponse();

        // Execute
        await getHistory(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith([]);
    });
}); 