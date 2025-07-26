import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { Request, Response } from 'express';
import submitHandler, { isValidUrl, isValidLanguage } from '../../../api/routes/submit';
import { jobsRepository } from '../../../db/jobsRepository';
import { addAnalysisJob } from '../../../queues/analysisQueue';
import * as utils from '../../../lib/utils';
import config from '../../../config';
import axios from 'axios';

// Mock dependencies
vi.mock('../../../db/jobsRepository', () => ({
    jobsRepository: {
        createJob: vi.fn(),
        findCompletedJobByNormalizedUrlAndLanguage: vi.fn(),
        getJob: vi.fn()
    }
}));

vi.mock('../../../queues/analysisQueue', () => ({
    addAnalysisJob: vi.fn()
}));

vi.mock('../../../lib/utils', () => ({
    extractDomain: vi.fn().mockReturnValue('example.com'),
    normalizeUrl: vi.fn(url => url) // Default to returning the same URL
}));

vi.mock('../../../config', () => ({
    default: {
        features: {
            reuseExistingAnalysis: false // Default to disabled
        }
    }
}));

vi.mock('axios');

// Save original env and config
const originalEnv = process.env;
const originalConfig = { ...config };

describe('URL Validation', () => {
    it('should validate correct HTTP URLs', () => {
        expect(isValidUrl('http://example.com')).toBe(true);
        expect(isValidUrl('https://example.com')).toBe(true);
        expect(isValidUrl('https://example.com/path/to/resource')).toBe(true);
        expect(isValidUrl('https://sub.example.com/resource?query=value')).toBe(true);
    });

    it('should reject invalid URLs', () => {
        expect(isValidUrl('')).toBe(false);
        expect(isValidUrl('not-a-url')).toBe(false);
        expect(isValidUrl('ftp://example.com')).toBe(false);
        expect(isValidUrl('www.example.com')).toBe(false);
    });
});

describe('Language Validation', () => {
    it('should validate supported languages', () => {
        expect(isValidLanguage('en')).toBe(true);
        expect(isValidLanguage('de')).toBe(true);
    });

    it('should reject unsupported languages', () => {
        expect(isValidLanguage('')).toBe(false);
        expect(isValidLanguage('fr')).toBe(false);
        expect(isValidLanguage('es')).toBe(false);
        expect(isValidLanguage('invalid')).toBe(false);
    });
});

describe('Submit Handler', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let jsonMock = vi.fn();
    let statusMock = vi.fn();
    const originalUrl = 'https://example.com/article?utm_source=twitter';
    const normalizedUrl = 'https://example.com/article';

    beforeEach(() => {
        // Initialize with all required properties
        mockRequest = {
            body: {
                url: originalUrl,
                language: 'en',
                'cf-turnstile-response': 'valid-token'
            },
            headers: {
                'x-forwarded-for': '127.0.0.1'
            },
            ip: '127.0.0.1'
        };

        statusMock = vi.fn().mockReturnThis();
        jsonMock = vi.fn();

        mockResponse = {
            status: statusMock,
            json: jsonMock
        };

        // Reset mocks and configure default behavior
        vi.clearAllMocks();
        (utils.normalizeUrl as any).mockImplementation(url => {
            if (url === originalUrl) return normalizedUrl;
            return url;
        });

        // Reset config to default state for each test
        config.features = {
            ...originalConfig.features,
            reuseExistingAnalysis: false,
        };

        // Configure Turnstile verification mock to succeed
        process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = 'test-secret-key';
        (axios.post as any).mockResolvedValue({
            data: {
                success: true,
                'error-codes': [],
            },
        });

        // Configure mock for createJob
        (jobsRepository.createJob as any).mockResolvedValue({
            id: 'test-job-id',
        });

        // Configure mock for addAnalysisJob
        (addAnalysisJob as any).mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    afterAll(() => {
        // Restore original environment
        process.env = originalEnv;
        // Restore original config
        Object.assign(config, originalConfig);
    });

    it('should return 400 for invalid URL', async () => {
        mockRequest.body = {
            url: 'invalid-url',
            language: 'en',
            'cf-turnstile-response': 'valid-token'
        };

        await submitHandler(mockRequest as Request, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
            error: 'Invalid request data',
            details: expect.arrayContaining([
                expect.objectContaining({
                    code: 'invalid_format',
                    format: 'url',
                    message: 'Invalid URL format'
                })
            ])
        });
        expect(jobsRepository.createJob).not.toHaveBeenCalled();
        expect(addAnalysisJob).not.toHaveBeenCalled();
    });

    it('should return 400 for missing URL', async () => {
        mockRequest.body = {
            language: 'en',
            'cf-turnstile-response': 'valid-token'
        };

        await submitHandler(mockRequest as Request, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
            error: 'Invalid request data',
            details: expect.arrayContaining([
                expect.objectContaining({
                    code: 'invalid_type',
                    message: expect.stringContaining('expected string, received undefined')
                })
            ])
        });
    });

    it('should return 400 for invalid language', async () => {
        mockRequest.body = {
            url: 'https://example.com',
            language: 'fr',
            'cf-turnstile-response': 'valid-token'
        };

        await submitHandler(mockRequest as Request, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
            error: 'Invalid request data',
            details: expect.arrayContaining([
                expect.objectContaining({
                    code: 'invalid_value',
                    message: expect.stringContaining('Invalid option')
                })
            ])
        });
        expect(jobsRepository.createJob).not.toHaveBeenCalled();
        expect(addAnalysisJob).not.toHaveBeenCalled();
    });

    it('should process valid URL submission with English language successfully', async () => {
        const mockJob = { id: 'mock-job-id', url: originalUrl, language: 'en' };
        (jobsRepository.createJob as any).mockResolvedValue(mockJob);
        (addAnalysisJob as any).mockResolvedValue('queue-job-id');

        await submitHandler(mockRequest as Request, mockResponse as Response);

        expect(utils.normalizeUrl).toHaveBeenCalledWith(originalUrl);
        expect(jobsRepository.createJob).toHaveBeenCalledWith(originalUrl, 'en', normalizedUrl);
        expect(addAnalysisJob).toHaveBeenCalledWith(mockJob.id, mockJob.url, mockJob.language);
        expect(statusMock).toHaveBeenCalledWith(201);
        expect(jsonMock).toHaveBeenCalledWith({
            message: 'Analysis job submitted successfully',
            jobId: mockJob.id
        });
    });

    it('should process valid URL submission with German language successfully', async () => {
        const mockJob = { id: 'mock-job-id', url: originalUrl, language: 'de' };
        (jobsRepository.createJob as any).mockResolvedValue(mockJob);
        (addAnalysisJob as any).mockResolvedValue('queue-job-id');

        mockRequest.body.language = 'de';
        await submitHandler(mockRequest as Request, mockResponse as Response);

        expect(utils.normalizeUrl).toHaveBeenCalledWith(originalUrl);
        expect(jobsRepository.createJob).toHaveBeenCalledWith(originalUrl, 'de', normalizedUrl);
        expect(addAnalysisJob).toHaveBeenCalledWith(mockJob.id, mockJob.url, mockJob.language);
        expect(statusMock).toHaveBeenCalledWith(201);
        expect(jsonMock).toHaveBeenCalledWith({
            message: 'Analysis job submitted successfully',
            jobId: mockJob.id
        });
    });

    it('should use English as default language when not specified', async () => {
        const mockJob = { id: 'mock-job-id', url: originalUrl, language: 'en' };
        (jobsRepository.createJob as any).mockResolvedValue(mockJob);
        (addAnalysisJob as any).mockResolvedValue('queue-job-id');

        mockRequest.body = {
            url: originalUrl,
            'cf-turnstile-response': 'valid-token'
        }; // No language specified
        await submitHandler(mockRequest as Request, mockResponse as Response);

        expect(utils.normalizeUrl).toHaveBeenCalledWith(originalUrl);
        expect(jobsRepository.createJob).toHaveBeenCalledWith(originalUrl, 'en', normalizedUrl);
        expect(addAnalysisJob).toHaveBeenCalledWith(mockJob.id, mockJob.url, mockJob.language);
        expect(statusMock).toHaveBeenCalledWith(201);
        expect(jsonMock).toHaveBeenCalledWith({
            message: 'Analysis job submitted successfully',
            jobId: mockJob.id
        });
    });

    it('should return 500 when database operation fails', async () => {
        (jobsRepository.createJob as any).mockRejectedValue(new Error('Database error'));

        await submitHandler(mockRequest as Request, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({
            error: 'Server error processing your request',
            message: 'Database error'
        });
    });

    it('should return 500 when queue operation fails', async () => {
        const mockJob = { id: 'mock-job-id', url: originalUrl, language: 'en' };
        (jobsRepository.createJob as any).mockResolvedValue(mockJob);
        (addAnalysisJob as any).mockRejectedValue(new Error('Queue error'));

        await submitHandler(mockRequest as Request, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({
            error: 'Server error processing your request',
            message: 'Queue error'
        });
    });

    describe('URL normalization and duplicate checking', () => {
        beforeEach(() => {
            // Setup for duplicate checking tests
            config.features.reuseExistingAnalysis = true;
        });

        afterEach(() => {
            // Reset the config after each test
            config.features.reuseExistingAnalysis = false;
        });

        it('should check for existing analysis when REUSE_EXISTING_ANALYSIS is true', async () => {
            const mockJob = { id: 'mock-job-id', url: originalUrl, language: 'en' };
            (jobsRepository.findCompletedJobByNormalizedUrlAndLanguage as any).mockResolvedValue(null);
            (jobsRepository.createJob as any).mockResolvedValue(mockJob);

            await submitHandler(mockRequest as Request, mockResponse as Response);

            expect(jobsRepository.findCompletedJobByNormalizedUrlAndLanguage).toHaveBeenCalledWith(
                normalizedUrl,
                'en'
            );
            expect(jobsRepository.createJob).toHaveBeenCalledWith(originalUrl, 'en', normalizedUrl);
        });

        it('should return full data when a completed analysis already exists', async () => {
            const existingJobId = 'existing-job-id';
            const existingJob = {
                id: existingJobId,
                url: originalUrl,
                language: 'en',
                status: 'Complete'
            };

            const fullJobData = {
                id: existingJobId,
                url: originalUrl,
                language: 'en',
                status: 'Complete',
                analysis_results: {
                    claims: 'Some claims here',
                    report: 'Detailed report',
                    slant: 'Neutral'
                },
                article_title: 'Article Title',
                article_author: 'John Doe',
                article_source_name: 'Example News',
                article_canonical_url: 'https://example.com/canonical',
                article_preview_image_url: 'https://example.com/image.jpg',
                article_publication_date: '2023-05-10',
                article_text: 'Article content text...'
            };

            (jobsRepository.findCompletedJobByNormalizedUrlAndLanguage as any).mockResolvedValue(existingJob);
            (jobsRepository.getJob as any).mockResolvedValue(fullJobData);

            await submitHandler(mockRequest as Request, mockResponse as Response);

            expect(jobsRepository.findCompletedJobByNormalizedUrlAndLanguage).toHaveBeenCalledWith(
                normalizedUrl,
                'en'
            );
            expect(jobsRepository.getJob).toHaveBeenCalledWith(existingJobId);
            expect(jobsRepository.createJob).not.toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                jobId: existingJobId,
                url: originalUrl,
                language: 'en',
                existingAnalysis: true,
                analysis_results: fullJobData.analysis_results,
                article_title: fullJobData.article_title,
                article_author: fullJobData.article_author,
                article_source_name: fullJobData.article_source_name,
                article_canonical_url: fullJobData.article_canonical_url,
                article_preview_image_url: fullJobData.article_preview_image_url,
                article_publication_date: fullJobData.article_publication_date,
                article_text: fullJobData.article_text
            });
        });

        it('should handle job with legacy job_details structure when dedicated columns are missing', async () => {
            const existingJobId = 'existing-job-id';
            const existingJob = {
                id: existingJobId,
                url: originalUrl,
                language: 'en',
                status: 'Complete'
            };

            const fullJobData = {
                id: existingJobId,
                url: originalUrl,
                language: 'en',
                status: 'Complete',
                analysis_results: {
                    claims: 'Some claims here',
                    report: 'Detailed report',
                    slant: 'Neutral'
                },
                // No dedicated article columns
                job_details: {
                    title: 'Legacy Title',
                    author: 'Legacy Author',
                    siteName: 'Legacy Source',
                    url: 'https://example.com/legacy',
                    imageUrl: 'https://example.com/legacy-image.jpg',
                    date: '2023-05-09',
                    text: 'Legacy article content text...'
                }
            };

            (jobsRepository.findCompletedJobByNormalizedUrlAndLanguage as any).mockResolvedValue(existingJob);
            (jobsRepository.getJob as any).mockResolvedValue(fullJobData);

            await submitHandler(mockRequest as Request, mockResponse as Response);

            expect(jobsRepository.findCompletedJobByNormalizedUrlAndLanguage).toHaveBeenCalledWith(
                normalizedUrl,
                'en'
            );
            expect(jobsRepository.getJob).toHaveBeenCalledWith(existingJobId);
            expect(jobsRepository.createJob).not.toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                jobId: existingJobId,
                url: originalUrl,
                language: 'en',
                existingAnalysis: true,
                analysis_results: fullJobData.analysis_results,
                article_title: fullJobData.job_details.title,
                article_author: fullJobData.job_details.author,
                article_source_name: fullJobData.job_details.siteName,
                article_canonical_url: fullJobData.job_details.url,
                article_preview_image_url: fullJobData.job_details.imageUrl,
                article_publication_date: fullJobData.job_details.date,
                article_text: fullJobData.job_details.text
            });
        });

        it('should handle legacy jobs with images array instead of imageUrl', async () => {
            const existingJobId = 'existing-job-id';
            const existingJob = {
                id: existingJobId,
                url: originalUrl,
                language: 'en',
                status: 'Complete'
            };

            const fullJobData = {
                id: existingJobId,
                url: originalUrl,
                language: 'en',
                status: 'Complete',
                analysis_results: {
                    claims: 'Some claims here',
                    report: 'Detailed report',
                    slant: 'Neutral'
                },
                // No dedicated article columns, no imageUrl but has images array
                job_details: {
                    title: 'Legacy Title',
                    author: 'Legacy Author',
                    siteName: 'Legacy Source',
                    url: 'https://example.com/legacy',
                    images: [
                        { url: 'https://example.com/image1.jpg' },
                        { url: 'https://example.com/image2.jpg' }
                    ],
                    date: '2023-05-09',
                    text: 'Legacy article content text...'
                }
            };

            (jobsRepository.findCompletedJobByNormalizedUrlAndLanguage as any).mockResolvedValue(existingJob);
            (jobsRepository.getJob as any).mockResolvedValue(fullJobData);

            await submitHandler(mockRequest as Request, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith({
                jobId: existingJobId,
                url: originalUrl,
                language: 'en',
                existingAnalysis: true,
                analysis_results: fullJobData.analysis_results,
                article_title: fullJobData.job_details.title,
                article_author: fullJobData.job_details.author,
                article_source_name: fullJobData.job_details.siteName,
                article_canonical_url: fullJobData.job_details.url,
                article_preview_image_url: fullJobData.job_details.images[0].url,
                article_publication_date: fullJobData.job_details.date,
                article_text: fullJobData.job_details.text
            });
        });

        it('should not check for duplicates when REUSE_EXISTING_ANALYSIS is false', async () => {
            config.features.reuseExistingAnalysis = false;
            const mockJob = { id: 'mock-job-id', url: originalUrl, language: 'en' };
            (jobsRepository.createJob as any).mockResolvedValue(mockJob);

            await submitHandler(mockRequest as Request, mockResponse as Response);

            expect(jobsRepository.findCompletedJobByNormalizedUrlAndLanguage).not.toHaveBeenCalled();
            expect(jobsRepository.createJob).toHaveBeenCalledWith(originalUrl, 'en', normalizedUrl);
        });
    });

    describe('Turnstile verification', () => {
        it('should return 400 if request body is invalid', async () => {
            mockRequest.body = {
                url: 'not-a-valid-url',
            };

            await submitHandler(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Invalid request data',
                })
            );
        });

        it('should return 400 if Turnstile token is missing', async () => {
            mockRequest.body = {
                url: 'https://example.com',
                language: 'en',
            };

            await submitHandler(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Invalid request data',
                })
            );
        });

        it('should return 403 if Turnstile verification fails', async () => {
            mockRequest.body = {
                url: 'https://example.com',
                language: 'en',
                'cf-turnstile-response': 'invalid-token',
            };

            // Mock failed Turnstile verification
            (axios.post as any).mockResolvedValueOnce({
                data: {
                    success: false,
                    'error-codes': ['invalid-token'],
                },
            });

            await submitHandler(mockRequest as Request, mockResponse as Response);

            expect(axios.post).toHaveBeenCalledWith(
                'https://challenges.cloudflare.com/turnstile/v0/siteverify',
                expect.stringContaining('invalid-token'),
                expect.any(Object)
            );
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Verification failed',
                })
            );
        });

        it('should create a new job when Turnstile verification succeeds', async () => {
            mockRequest.body = {
                url: 'https://example.com',
                language: 'en',
                'cf-turnstile-response': 'valid-token',
            };

            const mockJob = { id: 'test-job-id', url: 'https://example.com', language: 'en' };
            (jobsRepository.createJob as any).mockResolvedValue(mockJob);

            await submitHandler(mockRequest as Request, mockResponse as Response);

            // Check Turnstile verification
            expect(axios.post).toHaveBeenCalledWith(
                'https://challenges.cloudflare.com/turnstile/v0/siteverify',
                expect.stringContaining('valid-token'),
                expect.any(Object)
            );

            // Check job creation
            expect(jobsRepository.createJob).toHaveBeenCalledWith(
                'https://example.com',
                'en',
                expect.any(String) // normalized URL
            );

            // Check job queue
            expect(addAnalysisJob).toHaveBeenCalledWith(
                'test-job-id',
                'https://example.com',
                'en'
            );

            // Check response
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Analysis job submitted successfully',
                    jobId: 'test-job-id',
                })
            );
        });

        it('should return existing analysis when reuseExistingAnalysis is enabled', async () => {
            // Enable reuse existing analysis feature
            config.features.reuseExistingAnalysis = true;

            // Configure existing job mock
            const mockExistingJob = { id: 'existing-job-id' };
            const mockFullJobDetails = {
                id: 'existing-job-id',
                url: 'https://example.com',
                language: 'en',
                analysis_results: { some: 'data' },
                article_title: 'Test Article',
            };

            (jobsRepository.findCompletedJobByNormalizedUrlAndLanguage as any).mockResolvedValue(mockExistingJob);
            (jobsRepository.getJob as any).mockResolvedValue(mockFullJobDetails);

            mockRequest.body = {
                url: 'https://example.com',
                language: 'en',
                'cf-turnstile-response': 'valid-token',
            };

            await submitHandler(mockRequest as Request, mockResponse as Response);

            // Verify Turnstile verification was performed
            expect(axios.post).toHaveBeenCalled();

            // Check existing job lookup
            expect(jobsRepository.findCompletedJobByNormalizedUrlAndLanguage).toHaveBeenCalled();
            expect(jobsRepository.getJob).toHaveBeenCalledWith('existing-job-id');

            // Check response
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    jobId: 'existing-job-id',
                    existingAnalysis: true,
                })
            );

            // Ensure a new job was not created
            expect(jobsRepository.createJob).not.toHaveBeenCalled();
            expect(addAnalysisJob).not.toHaveBeenCalled();
        });

        it('should handle errors and return 403 for Turnstile network errors', async () => {
            mockRequest.body = {
                url: 'https://example.com',
                language: 'en',
                'cf-turnstile-response': 'valid-token',
            };

            // Mock an error in verification
            (axios.post as any).mockRejectedValue(new Error('Network error'));

            await submitHandler(mockRequest as Request, mockResponse as Response);

            // The submit handler catches Turnstile errors and returns 403 Forbidden
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Verification failed',
                })
            );
        });

        // Test for Turnstile verification
        it('should return 403 when Turnstile verification fails', async () => {
            // Configure Turnstile verification to fail
            (axios.post as any).mockResolvedValue({
                data: {
                    success: false,
                    'error-codes': ['invalid-input-response'],
                },
            });

            await submitHandler(mockRequest as Request, mockResponse as Response);

            // Should return 403 Forbidden
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Verification failed',
            }));

            // Critical test: ensure no job is created when verification fails
            expect(jobsRepository.createJob).not.toHaveBeenCalled();
            expect(addAnalysisJob).not.toHaveBeenCalled();
        });

        it('should not create jobs when Turnstile token is missing in production', async () => {
            // Set to production mode
            const originalNodeEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            // Remove Turnstile token
            mockRequest.body = {
                url: 'https://example.com',
                language: 'en',
                // No cf-turnstile-response
            };

            await submitHandler(mockRequest as Request, mockResponse as Response);

            // Should return 400 Bad Request
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Invalid request data',
            }));

            // Critical test: ensure no job is created when token is missing
            expect(jobsRepository.createJob).not.toHaveBeenCalled();
            expect(addAnalysisJob).not.toHaveBeenCalled();

            // Restore environment
            process.env.NODE_ENV = originalNodeEnv;
        });

        it('should handle network errors during Turnstile verification', async () => {
            // Mock a network error
            (axios.post as any).mockRejectedValue(new Error('Network error'));

            await submitHandler(mockRequest as Request, mockResponse as Response);

            // Should return 403 Forbidden
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Verification failed',
            }));

            // Critical test: ensure no job is created when verification errors
            expect(jobsRepository.createJob).not.toHaveBeenCalled();
            expect(addAnalysisJob).not.toHaveBeenCalled();
        });

        it('should create job only after successful verification in production', async () => {
            // Set to production mode
            const originalNodeEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            // Mock successful verification
            (axios.post as any).mockResolvedValue({
                data: {
                    success: true,
                    'error-codes': [],
                },
            });

            await submitHandler(mockRequest as Request, mockResponse as Response);

            // Should verify token first
            expect(axios.post).toHaveBeenCalledWith(
                'https://challenges.cloudflare.com/turnstile/v0/siteverify',
                expect.any(String),
                expect.any(Object)
            );

            // Then create job after verification
            expect(jobsRepository.createJob).toHaveBeenCalledWith(
                originalUrl,
                'en',
                normalizedUrl
            );

            expect(addAnalysisJob).toHaveBeenCalledWith(
                'test-job-id',
                originalUrl,
                'en'
            );

            // Restore environment
            process.env.NODE_ENV = originalNodeEnv;
        });
    });
}); 