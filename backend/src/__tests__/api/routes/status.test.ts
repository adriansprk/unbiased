import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Environment variables are set in __tests__/test-setup.ts

// Mock Supabase client
vi.mock('../../../db/supabaseClient', () => ({
    supabase: {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis()
    }
}));

import { Request, Response } from 'express';
import { jobsRepository } from '../../../db/jobsRepository';
import * as utils from '../../../lib/utils';
import logger from '../../../lib/logger';
import { getStatusByJobId } from '../../../api/routes/status';

// Mock dependencies
vi.mock('../../../db/jobsRepository', () => ({
    jobsRepository: {
        getJob: vi.fn()
    }
}));

vi.mock('../../../lib/utils', () => ({
    isValidUuid: vi.fn().mockReturnValue(true),
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
const mockRequest = (params = {}, query = {}) => {
    return {
        params,
        query
    } as unknown as Request;
};

const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
};

describe('GET /api/status/:jobId', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should validate job ID format', async () => {
        // Setup
        (utils.isValidUuid as any).mockReturnValueOnce(false);
        const req = mockRequest({ jobId: 'invalid-id' });
        const res = mockResponse();

        // Execute
        await getStatusByJobId(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            error: expect.objectContaining({
                code: 'INVALID_INPUT',
                message: expect.stringContaining('Invalid Job ID format')
            })
        }));
    });

    it('should return 404 if job is not found', async () => {
        // Setup
        (jobsRepository.getJob as any).mockRejectedValueOnce(new Error('Job with ID valid-uuid not found'));
        const req = mockRequest({ jobId: 'valid-uuid' });
        const res = mockResponse();

        // Execute
        await getStatusByJobId(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            error: expect.objectContaining({
                code: 'NOT_FOUND',
                message: expect.stringContaining('not found')
            })
        }));
    });

    it('should return job data fully from new dedicated columns', async () => {
        // Setup
        const mockJob = {
            id: 'test-job-id',
            status: 'Complete',
            url: 'http://example.com/article?utm_source=twitter&utm_medium=social&ref=123',
            normalized_url: 'https://example.com/article',
            article_title: 'Test Article',
            article_text: 'Article content',
            article_author: 'Test Author',
            article_source_name: 'Test Source',
            article_preview_image_url: 'https://example.com/image.jpg',
            article_publication_date: '2023-01-01T00:00:00Z',
            article_canonical_url: 'https://example.com/canonical',
            job_details: null,
            analysis_results: { claims: 'test claims', report: 'test report', slant: 'neutral' },
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
        };

        (jobsRepository.getJob as any).mockResolvedValueOnce(mockJob);
        const req = mockRequest({ jobId: 'test-job-id' });
        const res = mockResponse();

        // Execute
        await getStatusByJobId(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            id: 'test-job-id',
            url: 'http://example.com/article?utm_source=twitter&utm_medium=social&ref=123',
            normalized_url: 'https://example.com/article',
            article_title: 'Test Article',
            article_author: 'Test Author',
            article_source_name: 'Test Source',
            article_preview_image_url: 'proxied-https://example.com/image.jpg',
            article_publication_date: '2023-01-01T00:00:00Z',
            article_canonical_url: 'https://example.com/canonical',
            analysis_results: { claims: 'test claims', report: 'test report', slant: 'neutral' }
        }));
        expect(utils.getProxiedImageUrl).toHaveBeenCalledWith('https://example.com/image.jpg');
    });

    it('should fallback to job_details for old records without new columns', async () => {
        // Setup
        const mockJob = {
            id: 'test-job-id',
            status: 'Complete',
            url: 'https://example.com/article',
            normalized_url: 'https://example.com/article',
            article_title: null,
            article_text: null,
            article_author: null,
            article_source_name: null,
            article_preview_image_url: null,
            article_publication_date: null,
            article_canonical_url: null,
            job_details: {
                title: 'Legacy Article Title',
                text: 'Legacy content',
                author: 'Legacy Author',
                siteName: 'Legacy Source',
                images: [{ url: 'https://example.com/legacy-image.jpg', primary: true }],
                date: '2022-01-01T00:00:00Z',
                url: 'https://example.com/legacy-canonical'
            },
            analysis_results: { claims: 'test claims', report: 'test report', slant: 'neutral' },
            created_at: '2022-01-01T00:00:00Z',
            updated_at: '2022-01-01T00:00:00Z'
        };

        (jobsRepository.getJob as any).mockResolvedValueOnce(mockJob);
        const req = mockRequest({ jobId: 'test-job-id' });
        const res = mockResponse();

        // Execute
        await getStatusByJobId(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            id: 'test-job-id',
            normalized_url: 'https://example.com/article',
            article_title: 'Legacy Article Title',
            article_author: 'Legacy Author',
            article_source_name: 'Legacy Source',
            article_preview_image_url: 'proxied-https://example.com/legacy-image.jpg',
            article_publication_date: '2022-01-01T00:00:00Z',
            article_canonical_url: 'https://example.com/legacy-canonical'
        }));
        expect(utils.getProxiedImageUrl).toHaveBeenCalledWith('https://example.com/legacy-image.jpg');
        expect(utils.selectPreviewImage).toHaveBeenCalled();
    });

    it('should combine data from new columns and job_details when needed', async () => {
        // Setup
        const mockJob = {
            id: 'test-job-id',
            status: 'Complete',
            url: 'https://example.com/article',
            normalized_url: 'https://example.com/article',
            article_title: 'New Article Title',
            article_text: 'New content',
            article_author: null, // Missing, should use from job_details
            article_source_name: 'New Source',
            article_preview_image_url: null, // Missing, should use from job_details
            article_publication_date: '2023-01-01T00:00:00Z',
            article_canonical_url: null, // Missing, should use from job_details
            job_details: {
                title: 'Legacy Article Title',
                text: 'Legacy content',
                author: 'Legacy Author',
                siteName: 'Legacy Source',
                images: [{ url: 'https://example.com/legacy-image.jpg', primary: true }],
                date: '2022-01-01T00:00:00Z',
                url: 'https://example.com/legacy-canonical'
            },
            analysis_results: { claims: 'test claims', report: 'test report', slant: 'neutral' },
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
        };

        (jobsRepository.getJob as any).mockResolvedValueOnce(mockJob);
        const req = mockRequest({ jobId: 'test-job-id' });
        const res = mockResponse();

        // Execute
        await getStatusByJobId(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            id: 'test-job-id',
            normalized_url: 'https://example.com/article',
            article_title: 'New Article Title', // From new column
            article_author: 'Legacy Author', // Fallback from job_details
            article_source_name: 'New Source', // From new column
            article_preview_image_url: 'proxied-https://example.com/legacy-image.jpg', // Fallback from job_details
            article_publication_date: '2023-01-01T00:00:00Z' // From new column
        }));
        expect(utils.getProxiedImageUrl).toHaveBeenCalledWith('https://example.com/legacy-image.jpg');
        expect(utils.selectPreviewImage).toHaveBeenCalled();
    });

    it('should handle missing fields with null values', async () => {
        // Setup
        const mockJob = {
            id: 'test-job-id',
            status: 'Processing',
            url: 'https://example.com/article',
            normalized_url: 'https://example.com/article',
            article_title: null,
            article_text: null,
            article_author: null,
            article_source_name: null,
            article_preview_image_url: null,
            article_publication_date: null,
            article_canonical_url: null,
            job_details: null, // No job_details either
            analysis_results: null,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
        };

        (jobsRepository.getJob as any).mockResolvedValueOnce(mockJob);
        const req = mockRequest({ jobId: 'test-job-id' });
        const res = mockResponse();

        // Execute
        await getStatusByJobId(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            id: 'test-job-id',
            status: 'Processing',
            normalized_url: 'https://example.com/article',
            article_title: null,
            article_author: null,
            article_source_name: null,
            article_preview_image_url: null,
            article_publication_date: null
        }));
        // getProxiedImageUrl shouldn't be called with null
        expect(utils.getProxiedImageUrl).not.toHaveBeenCalled();
    });

    it('should return job data for a job with Failed status', async () => {
        // Setup
        const mockJob = {
            id: 'test-job-id',
            status: 'Failed',
            url: 'https://example.com/article',
            normalized_url: 'https://example.com/article',
            error_message: 'Failed to process URL',
            article_title: null,
            article_text: null,
            article_author: null,
            article_source_name: null,
            article_preview_image_url: null,
            article_publication_date: null,
            article_canonical_url: null,
            job_details: null,
            analysis_results: null,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
        };

        (jobsRepository.getJob as any).mockResolvedValueOnce(mockJob);
        const req = mockRequest({ jobId: 'test-job-id' });
        const res = mockResponse();

        // Execute
        await getStatusByJobId(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            id: 'test-job-id',
            status: 'Failed',
            normalized_url: 'https://example.com/article',
            error_message: 'Failed to process URL'
        }));
    });
}); 