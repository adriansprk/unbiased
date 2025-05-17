// Environment variables are set in __tests__/test-setup.ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock Supabase client
vi.mock('../../db/supabaseClient', () => ({
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

import supertest from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../db/supabaseClient';
import express from 'express';
import { getStatusByJobId } from '../../api/routes/status';
import { jobsRepository } from '../../db/jobsRepository';
import * as utils from '../../lib/utils';
import logger from '../../lib/logger';

// Test data to insert and clean up
const testJobs = [
    {
        id: uuidv4(),
        url: 'http://example.com/complete-job?utm_source=email&utm_campaign=newsletter&ref=abc123',
        normalized_url: 'https://example.com/complete-job',
        status: 'Complete',
        language: 'en',
        article_title: 'Complete Job Article',
        article_text: 'This is the content of a complete job',
        article_author: 'Test Author',
        article_source_name: 'Test Source',
        article_preview_image_url: 'https://example.com/image.jpg',
        article_publication_date: new Date().toISOString(),
        article_canonical_url: 'https://example.com/canonical',
        analysis_results: {
            claims: 'Example claims',
            report: 'Example report',
            slant: 'neutral'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: uuidv4(),
        url: 'http://www.example.com/processing-job?session_id=123456',
        normalized_url: 'https://example.com/processing-job',
        status: 'Processing',
        language: 'en',
        analysis_results: null, // Explicitly set to null
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: uuidv4(),
        url: 'https://example.com/failed-job#section1?tracking=true',
        normalized_url: 'https://example.com/failed-job',
        status: 'Failed',
        language: 'en',
        error_message: 'Failed to process URL',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: uuidv4(),
        url: 'http://legacy.example.com/legacy-job?fbclid=abc123&utm_source=facebook',
        normalized_url: 'https://example.com/legacy-job',
        status: 'Complete',
        language: 'en',
        job_details: {
            title: 'Legacy Article Title',
            text: 'Legacy content',
            author: 'Legacy Author',
            siteName: 'Legacy Source',
            images: [{ url: 'https://example.com/legacy-image.jpg', primary: true }],
            date: '2022-01-01T00:00:00Z',
            url: 'https://example.com/legacy-canonical'
        } as any, // Type assertion to avoid null checks
        analysis_results: {
            claims: 'Example claims',
            report: 'Example report',
            slant: 'left-leaning'
        },
        created_at: '2022-01-01T00:00:00Z',
        updated_at: '2022-01-01T00:00:00Z'
    }
];

// Mock utils.isValidUuid to always return true for our tests
vi.mock('../../lib/utils', () => ({
    isValidUuid: vi.fn().mockReturnValue(true),
    getProxiedImageUrl: vi.fn(url => `/api/image-proxy?url=${encodeURIComponent(url)}`),
    selectPreviewImage: vi.fn(images => {
        if (!images || images.length === 0) return null;
        const primaryImage = images.find(img => img.primary);
        return primaryImage ? primaryImage.url : images[0].url;
    })
}));

// Mock jobsRepository to avoid actual database access
vi.mock('../../db/jobsRepository', () => ({
    jobsRepository: {
        getJob: vi.fn().mockImplementation(async (jobId: string) => {
            // Check if this is the test UUID for the not found test
            if (jobId === 'test-not-found-uuid') {
                throw new Error(`Job with ID ${jobId} not found`);
            }

            // For test jobs in our array, return the matching job
            const matchingJob = testJobs.find(job => job.id === jobId);
            if (matchingJob) {
                return matchingJob;
            }

            // For any other ID, throw not found error
            throw new Error(`Job with ID ${jobId} not found`);
        })
    }
}));

// Create a minimal Express app for testing
const app = express();
app.get('/api/status/:jobId', getStatusByJobId);

// Create supertest client
const request = supertest(app);

describe('GET /api/status/:jobId - Integration Tests', () => {
    // Setup: Configure mock implementation and job data
    beforeAll(async () => {
        // Mock the jobsRepository.getJob for the jobs we're inserting
        const originalMock = jobsRepository.getJob as any;
        originalMock.mockImplementation(async (jobId: string) => {
            if (testJobs.some(tj => tj.id === jobId)) {
                return testJobs.find(tj => tj.id === jobId);
            }
            if (jobId === 'test-not-found-uuid') {
                throw new Error(`Job with ID ${jobId} not found`);
            }
            throw new Error(`Job with ID ${jobId} not found`);
        });
    });

    // Cleanup: Reset mocks after tests
    afterAll(async () => {
        // Reset mock
        vi.restoreAllMocks();
    });

    it('should return data for a complete job without authentication', async () => {
        const completeJob = testJobs[0];

        const response = await request
            .get(`/api/status/${completeJob.id}`)
            .expect(200);

        expect(response.body).toMatchObject({
            id: completeJob.id,
            url: completeJob.url,
            status: 'Complete',
            language: completeJob.language,
            normalized_url: completeJob.normalized_url,
            article_title: completeJob.article_title,
            article_author: completeJob.article_author,
            article_source_name: completeJob.article_source_name,
            // The URL will be proxied, so we can't do an exact match
            analysis_results: completeJob.analysis_results
        });

        // Check that the image URL is proxied
        expect(response.body.article_preview_image_url).toContain('/api/image-proxy?url=');
    });

    it('should return data for a processing job without authentication', async () => {
        const processingJob = testJobs[1];

        const response = await request
            .get(`/api/status/${processingJob.id}`)
            .expect(200);

        expect(response.body).toMatchObject({
            id: processingJob.id,
            url: processingJob.url,
            status: 'Processing',
            language: processingJob.language,
            normalized_url: processingJob.normalized_url // Verify normalized_url for sharing
        });

        // The analysis_results should either be null or undefined
        expect(response.body.analysis_results == null).toBe(true);
    });

    it('should return data for a failed job without authentication', async () => {
        const failedJob = testJobs[2];

        const response = await request
            .get(`/api/status/${failedJob.id}`)
            .expect(200);

        expect(response.body).toMatchObject({
            id: failedJob.id,
            url: failedJob.url,
            status: 'Failed',
            language: failedJob.language,
            normalized_url: failedJob.normalized_url,
            error_message: failedJob.error_message
        });
    });

    it('should return data with fallback to job_details for older job records', async () => {
        const legacyJob = testJobs[3];
        // Make sure job_details exists (typescript check)
        if (!legacyJob.job_details) {
            throw new Error('Test data is invalid - job_details is missing');
        }

        const response = await request
            .get(`/api/status/${legacyJob.id}`)
            .expect(200);

        // Debug log to see what's coming back
        logger.debug('Legacy job response:', JSON.stringify(response.body, null, 2));

        expect(response.body).toMatchObject({
            id: legacyJob.id,
            url: legacyJob.url,
            status: 'Complete',
            language: legacyJob.language,
            normalized_url: legacyJob.normalized_url,
            article_title: legacyJob.job_details.title,
            article_author: legacyJob.job_details.author,
            article_source_name: legacyJob.job_details.siteName,
            article_publication_date: legacyJob.job_details.date,
            article_canonical_url: legacyJob.job_details.url,
            analysis_results: legacyJob.analysis_results
        });

        // Check that the image URL is proxied if it exists
        if (response.body.article_preview_image_url) {
            expect(typeof response.body.article_preview_image_url).toBe('string');
            expect(response.body.article_preview_image_url.startsWith('/api/image-proxy?url=')).toBe(true);
        }
    });

    it('should return 404 for a non-existent job ID', async () => {
        // This case will be caught by isValidUuid in a real scenario
        // but our mock ensures it returns true so it will proceed
        const nonUuidResponse = await request
            .get('/api/status/non-existent-job-id')
            .expect(404);

        expect(nonUuidResponse.body.error.code).toBe('NOT_FOUND');

        // Use our special mocked UUID that will trigger the not found error
        const notFoundResponse = await request
            .get('/api/status/test-not-found-uuid')
            .expect(404);

        expect(notFoundResponse.body.error.code).toBe('NOT_FOUND');
    });
}); 