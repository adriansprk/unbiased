import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jobsRepository } from '../../db/jobsRepository';
import { supabase } from '../../db/supabaseClient';
import { JobDetails } from '../../types';
import { normalizeUrl, getProxiedImageUrl } from '../../lib/utils';

// Mock the utility functions
vi.mock('../../lib/utils', () => ({
    normalizeUrl: vi.fn(url => `normalized-${url}`),
    getProxiedImageUrl: vi.fn(url => `proxied-${url}`)
}));

// Mock Supabase client
vi.mock('../../db/supabaseClient', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

// Mock logger
vi.mock('../../lib/logger', () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
    }
}));

describe('jobsRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createJob', () => {
        it('should create a new job in the database with normalized URL', async () => {
            // Mock Supabase response
            const url = 'https://example.com';
            const normalizedUrl = 'normalized-https://example.com';
            const mockJob = {
                id: '123',
                url,
                language: 'en',
                status: 'Queued',
                normalized_url: normalizedUrl
            };

            // Set up chained mocks
            const mockInsert = vi.fn().mockReturnThis();
            const mockSelect = vi.fn().mockReturnThis();
            const mockSingle = vi.fn().mockResolvedValue({ data: mockJob, error: null });

            vi.mocked(supabase.from).mockReturnValue({
                insert: mockInsert,
                select: mockSelect,
                single: mockSingle,
            } as any);

            // Call the function
            const result = await jobsRepository.createJob(url, 'en');

            // Assertions
            expect(supabase.from).toHaveBeenCalledWith('jobs');
            expect(normalizeUrl).toHaveBeenCalledWith(url);
            expect(mockInsert).toHaveBeenCalledWith({
                url,
                language: 'en',
                normalized_url: normalizedUrl
            });
            expect(result).toEqual(mockJob);
        });

        it('should use provided normalizedUrl if passed', async () => {
            // Mock Supabase response
            const url = 'https://example.com';
            const providedNormalizedUrl = 'https://example.com/normalized';
            const mockJob = {
                id: '123',
                url,
                language: 'en',
                status: 'Queued',
                normalized_url: providedNormalizedUrl
            };

            // Set up chained mocks
            const mockInsert = vi.fn().mockReturnThis();
            const mockSelect = vi.fn().mockReturnThis();
            const mockSingle = vi.fn().mockResolvedValue({ data: mockJob, error: null });

            vi.mocked(supabase.from).mockReturnValue({
                insert: mockInsert,
                select: mockSelect,
                single: mockSingle,
            } as any);

            // Call the function with provided normalizedUrl
            const result = await jobsRepository.createJob(url, 'en', providedNormalizedUrl);

            // Assertions
            expect(supabase.from).toHaveBeenCalledWith('jobs');
            expect(normalizeUrl).not.toHaveBeenCalled();
            expect(mockInsert).toHaveBeenCalledWith({
                url,
                language: 'en',
                normalized_url: providedNormalizedUrl
            });
            expect(result).toEqual(mockJob);
        });

        it('should use English as default language when not specified', async () => {
            // Mock Supabase response
            const url = 'https://example.com';
            const normalizedUrl = 'normalized-https://example.com';
            const mockJob = {
                id: '123',
                url,
                language: 'en',
                status: 'Queued',
                normalized_url: normalizedUrl
            };

            // Set up chained mocks
            const mockInsert = vi.fn().mockReturnThis();
            const mockSelect = vi.fn().mockReturnThis();
            const mockSingle = vi.fn().mockResolvedValue({ data: mockJob, error: null });

            vi.mocked(supabase.from).mockReturnValue({
                insert: mockInsert,
                select: mockSelect,
                single: mockSingle,
            } as any);

            // Call the function without specifying language
            const result = await jobsRepository.createJob(url);

            // Assertions
            expect(supabase.from).toHaveBeenCalledWith('jobs');
            expect(normalizeUrl).toHaveBeenCalledWith(url);
            expect(mockInsert).toHaveBeenCalledWith({
                url,
                language: 'en',
                normalized_url: normalizedUrl
            });
            expect(result).toEqual(mockJob);
        });

        it('should throw an error if the database operation fails', async () => {
            // Mock Supabase error
            const mockError = new Error('Database error');

            // Set up chained mocks
            const mockInsert = vi.fn().mockReturnThis();
            const mockSelect = vi.fn().mockReturnThis();
            const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });

            vi.mocked(supabase.from).mockReturnValue({
                insert: mockInsert,
                select: mockSelect,
                single: mockSingle,
            } as any);

            // Call the function and expect it to throw
            await expect(jobsRepository.createJob('https://example.com')).rejects.toThrow('Database error');
        });
    });

    describe('findCompletedJobByNormalizedUrlAndLanguage', () => {
        it('should find a completed job by normalized URL and language', async () => {
            const normalizedUrl = 'https://example.com/normalized';
            const language = 'en';
            const mockJob = {
                id: '123',
                url: 'http://example.com',
                status: 'Complete',
                language,
                normalized_url: normalizedUrl
            };

            // Set up chained mocks
            const mockSelect = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockReturnThis();
            const mockOrder = vi.fn().mockReturnThis();
            const mockLimit = vi.fn().mockReturnThis();
            const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockJob, error: null });

            vi.mocked(supabase.from).mockReturnValue({
                select: mockSelect,
                eq: mockEq,
                order: mockOrder,
                limit: mockLimit,
                maybeSingle: mockMaybeSingle,
            } as any);

            // Call the function
            const result = await jobsRepository.findCompletedJobByNormalizedUrlAndLanguage(normalizedUrl, language);

            // Assertions
            expect(supabase.from).toHaveBeenCalledWith('jobs');
            expect(mockSelect).toHaveBeenCalledWith('*');
            expect(mockEq).toHaveBeenCalledWith('normalized_url', normalizedUrl);
            expect(mockEq).toHaveBeenCalledWith('language', language);
            expect(mockEq).toHaveBeenCalledWith('status', 'Complete');
            expect(result).toEqual(mockJob);
        });

        it('should return null if no job is found', async () => {
            // Set up chained mocks
            const mockSelect = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockReturnThis();
            const mockOrder = vi.fn().mockReturnThis();
            const mockLimit = vi.fn().mockReturnThis();
            const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

            vi.mocked(supabase.from).mockReturnValue({
                select: mockSelect,
                eq: mockEq,
                order: mockOrder,
                limit: mockLimit,
                maybeSingle: mockMaybeSingle,
            } as any);

            // Call the function
            const result = await jobsRepository.findCompletedJobByNormalizedUrlAndLanguage('https://example.com', 'en');

            // Assertions
            expect(result).toBeNull();
        });
    });

    describe('updateJobDetailsInDb', () => {
        it('should update job details without changing status', async () => {
            // Mock job details
            const jobDetails: JobDetails = {
                title: 'Test Article',
                text: 'This is the article content',
                html: '<p>This is the article content</p>',
            };

            // Mock updated job 
            const mockUpdatedJob = {
                id: '123',
                url: 'https://example.com',
                status: 'Processing',
                job_details: jobDetails,
            };

            // Set up chained mocks
            const mockUpdate = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockReturnThis();
            const mockSelect = vi.fn().mockReturnThis();
            const mockSingle = vi.fn().mockResolvedValue({ data: mockUpdatedJob, error: null });

            vi.mocked(supabase.from).mockReturnValue({
                update: mockUpdate,
                eq: mockEq,
                select: mockSelect,
                single: mockSingle,
            } as any);

            // Call the function
            const result = await jobsRepository.updateJobDetailsInDb('123', jobDetails);

            // Assertions
            expect(supabase.from).toHaveBeenCalledWith('jobs');
            expect(mockUpdate).toHaveBeenCalledWith({ job_details: jobDetails });
            expect(mockEq).toHaveBeenCalledWith('id', '123');
            expect(result).toEqual(mockUpdatedJob);
        });

        it('should throw an error if the update operation fails', async () => {
            // Mock job details
            const jobDetails: JobDetails = {
                title: 'Test Article',
                text: 'This is the article content',
            };

            // Mock Supabase error
            const mockError = new Error('Update failed');

            // Set up chained mocks
            const mockUpdate = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockReturnThis();
            const mockSelect = vi.fn().mockReturnThis();
            const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });

            vi.mocked(supabase.from).mockReturnValue({
                update: mockUpdate,
                eq: mockEq,
                select: mockSelect,
                single: mockSingle,
            } as any);

            // Call the function and expect it to throw
            await expect(jobsRepository.updateJobDetailsInDb('123', jobDetails)).rejects.toThrow('Update failed');
        });
    });

    describe('saveExtractedArticleContent', () => {
        it('should save article content to dedicated columns and minimal metadata to job_details', async () => {
            // Mock the Supabase response
            const mockData = {
                id: 'test-job-id',
                article_title: 'Test Article',
                article_text: 'This is a test article.',
                article_author: 'Test Author',
                article_source_name: 'Test Source',
                article_canonical_url: 'https://example.com/article',
                article_preview_image_url: 'proxied-https://example.com/image.jpg',
                article_publication_date: '2023-06-01T12:00:00Z',
                job_details: { type: 'article', tags: ['test'] }
            };

            const mockResponse = { data: mockData, error: null };
            vi.spyOn(supabase, 'from').mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue(mockResponse)
                        })
                    })
                })
            } as any);

            // Prepare test data
            const jobId = 'test-job-id';
            const articleData = {
                article_title: 'Test Article',
                article_text: 'This is a test article.',
                article_author: 'Test Author',
                article_source_name: 'Test Source',
                article_canonical_url: 'https://example.com/article',
                article_preview_image_url: 'https://example.com/image.jpg',
                article_publication_date: '2023-06-01T12:00:00Z'
            };
            const minimalMetadata = { type: 'article', tags: ['test'] };

            // Call the method
            const result = await jobsRepository.saveExtractedArticleContent(jobId, articleData, minimalMetadata);

            // Verify Supabase interaction
            expect(supabase.from).toHaveBeenCalledWith('jobs');

            // Verify the proxying of image URL
            expect(getProxiedImageUrl).toHaveBeenCalledWith('https://example.com/image.jpg');

            // Verify the result
            expect(result).toEqual(mockData);
        });

        it('should handle errors when saving article content', async () => {
            // Mock Supabase error response
            const mockError = new Error('Database error');
            vi.spyOn(supabase, 'from').mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockRejectedValue(mockError)
                        })
                    })
                })
            } as any);

            // Prepare test data
            const jobId = 'test-job-id';
            const articleData = {
                article_title: 'Test Article',
                article_text: 'This is a test article.',
                article_author: 'Test Author',
                article_source_name: 'Test Source',
                article_canonical_url: 'https://example.com/article',
                article_preview_image_url: 'https://example.com/image.jpg',
                article_publication_date: '2023-06-01T12:00:00Z'
            };
            const minimalMetadata = { type: 'article', tags: ['test'] };

            // Expect the method to throw an error
            await expect(jobsRepository.saveExtractedArticleContent(jobId, articleData, minimalMetadata))
                .rejects.toThrow();
        });
    });

    describe('getJobTitleAndText', () => {
        it('should retrieve article_title and article_text for a job', async () => {
            // Mock the Supabase response
            const mockData = {
                article_title: 'Test Article',
                article_text: 'This is a test article.'
            };

            const mockResponse = { data: mockData, error: null };
            vi.spyOn(supabase, 'from').mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue(mockResponse)
                    })
                })
            } as any);

            // Call the method
            const result = await jobsRepository.getJobTitleAndText('test-job-id');

            // Verify Supabase interaction
            expect(supabase.from).toHaveBeenCalledWith('jobs');

            // Verify the result
            expect(result).toEqual({
                article_title: 'Test Article',
                article_text: 'This is a test article.'
            });
        });

        it('should throw an error if article_title or article_text is missing', async () => {
            // Mock the Supabase response with missing data
            const mockData = {
                article_title: null,
                article_text: 'This is a test article.'
            };

            const mockResponse = { data: mockData, error: null };
            vi.spyOn(supabase, 'from').mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue(mockResponse)
                    })
                })
            } as any);

            // Expect the method to throw an error
            await expect(jobsRepository.getJobTitleAndText('test-job-id'))
                .rejects.toThrow('Job test-job-id missing required article content');
        });

        it('should handle database errors', async () => {
            // Mock Supabase error response
            const mockError = { message: 'Database error' };
            const mockResponse = { data: null, error: mockError };

            vi.spyOn(supabase, 'from').mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue(mockResponse)
                    })
                })
            } as any);

            // Expect the method to throw an error
            await expect(jobsRepository.getJobTitleAndText('test-job-id'))
                .rejects.toThrow('Database error retrieving job content: Database error');
        });
    });
}); 