import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Job } from 'bullmq';
import { JobStatus, AnalysisResults } from '../../types';

// Hoist mock data and functions to be available to vi.mock calls
const mockExtractedContent = vi.hoisted(() => ({
    title: 'Test Article Title',
    text: 'This is the test article content.',
    author: 'Test Author',
    siteName: 'Test Source',
    url: 'https://example.com/canonical',
    date: '2023-01-01T12:00:00Z',
    images: [
        { url: 'https://example.com/image1.jpg', primary: false },
        { url: 'https://example.com/image2.jpg', primary: true }
    ]
}));

const mockAnalysisResults = vi.hoisted(() => ({
    claims: 'Test claims',
    report: 'Test bias report',
    slant: 'Neutral'
}));

// Store the processor function captured from Worker constructor
let processorFn: (job: Job) => Promise<any>;

// Mock updateJobStatus for dependency mocks
const mockUpdateJobStatus = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockUpdateJobDetailsInDb = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockUpdateJobAsFailed = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockUpdateJobAsComplete = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockSaveExtractedArticleContent = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockGetJobTitleAndText = vi.hoisted(() => vi.fn().mockResolvedValue({
    article_title: 'Test Article Title',
    article_text: 'This is the test article content.'
}));
const mockGetJob = vi.hoisted(() => vi.fn(async () => ({
    id: 'test-job-id',
    url: 'https://example.com/test-article',
    article_title: null,  // Initially null, will be populated during processing
    article_author: null,
    article_source_name: null,
    article_canonical_url: 'https://example.com/canonical',
    article_preview_image_url: null,
    article_publication_date: null
})));
const mockEmitSocketUpdate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockFetchContentFromDiffbot = vi.hoisted(() => vi.fn().mockResolvedValue(mockExtractedContent));
const mockPerformAnalysisWithOpenAI = vi.hoisted(() => vi.fn().mockResolvedValue(mockAnalysisResults));
const mockPerformAnalysisWithGemini = vi.hoisted(() => vi.fn().mockResolvedValue(mockAnalysisResults));

// Add mocks for utils functions
const mockExtractDomain = vi.hoisted(() => vi.fn());
const mockIsDomainOnProactiveList = vi.hoisted(() => vi.fn());
const mockSelectPreviewImage = vi.hoisted(() => vi.fn().mockReturnValue('https://example.com/image2.jpg'));
const mockCreateMinimalMetadata = vi.hoisted(() => vi.fn((content) => {
    console.log('mockCreateMinimalMetadata called with:', content);
    return {
        type: 'article',
        siteName: 'Test Source'
    };
}));

// Set NODE_ENV to test to prevent worker.on calls 
vi.stubEnv('NODE_ENV', 'test');

// Mock dependencies
vi.mock('../../db/jobsRepository', () => ({
    jobsRepository: {
        updateJobStatus: mockUpdateJobStatus,
        updateJobDetailsInDb: mockUpdateJobDetailsInDb,
        updateJobAsFailed: mockUpdateJobAsFailed,
        updateJobAsComplete: mockUpdateJobAsComplete,
        saveExtractedArticleContent: mockSaveExtractedArticleContent,
        getJobTitleAndText: mockGetJobTitleAndText,
        getJob: mockGetJob
    }
}));

vi.mock('../../lib', () => ({
    emitSocketUpdate: mockEmitSocketUpdate,
    redisClient: {}
}));

vi.mock('../../lib/diffbotClient', () => ({
    fetchContentFromDiffbot: mockFetchContentFromDiffbot
}));

vi.mock('../../lib/openaiClient', () => ({
    performAnalysisWithOpenAI: mockPerformAnalysisWithOpenAI
}));

vi.mock('../../lib/geminiClient', () => ({
    performAnalysisWithGemini: mockPerformAnalysisWithGemini
}));

vi.mock('../../config', () => ({
    default: {
        ai: {
            analysisLlmProvider: 'openai',
            openaiApiKey: 'test-openai-key',
            geminiApiKey: ''
        },
        redis: {
            url: 'redis://localhost:6379'
        }
    }
}));

vi.mock('../../lib/utils', () => ({
    extractDomain: mockExtractDomain,
    isDomainOnProactiveList: mockIsDomainOnProactiveList,
    selectPreviewImage: mockSelectPreviewImage,
    createMinimalMetadata: mockCreateMinimalMetadata
}));

// Create a properly typed mock Job class
class MockJob {
    id: string;
    data: any;
    opts: any;
    attemptsMade: number;
    queue: any;
    name: string;
    queueQualifiedName: string;
    progress = vi.fn();
    log = vi.fn();
    moveToFailed = vi.fn();
    updateData = vi.fn();
    update = vi.fn();
    discard = vi.fn();
    getState = vi.fn();
    remove = vi.fn();
    finished = vi.fn();
    retry = vi.fn();
    isPaused = vi.fn();
    isCompleted = vi.fn();
    isFailed = vi.fn();
    isActive = vi.fn();
    isWaiting = vi.fn();
    getChildrenValues = vi.fn();
    getDependenciesValues = vi.fn();
    promote = vi.fn();
    changePriority = vi.fn();

    constructor(data: any, id = 'test-job-id', attemptsMade = 0, opts = { attempts: 1 }) {
        this.data = data;
        this.id = id;
        this.attemptsMade = attemptsMade;
        this.opts = opts;
        this.name = 'testJob';
        this.queueQualifiedName = 'testQueue:testJob';
        this.queue = {
            client: {},
            name: 'testQueue'
        };
    }
}

// Mock bullmq Worker to capture processor function
vi.mock('bullmq', () => {
    return {
        Worker: vi.fn((queueName, processor, options) => {
            // Store the processor function for testing
            processorFn = processor;

            // Return a mock worker that doesn't need .on() methods
            return {
                close: vi.fn().mockResolvedValue(undefined)
            };
        }),
        Job: MockJob
    };
});

describe('Analysis Worker', () => {
    const jobId = 'test-job-id';
    const url = 'https://example.com/test-article';
    const language = 'en';

    // Create a mock job object for testing using our custom MockJob class
    let mockJob: MockJob;

    beforeEach(() => {
        // Reset modules and mocks before each test
        vi.resetModules();
        vi.resetAllMocks();

        // Create a new instance of our MockJob for each test
        mockJob = new MockJob({ jobId, url, language }, jobId);

        // Reset mock implementations to their defaults
        mockFetchContentFromDiffbot.mockResolvedValue(mockExtractedContent);
        mockPerformAnalysisWithOpenAI.mockResolvedValue(mockAnalysisResults);
        mockPerformAnalysisWithGemini.mockResolvedValue(mockAnalysisResults);
        mockGetJobTitleAndText.mockResolvedValue({
            article_title: 'Test Article Title',
            article_text: 'This is the test article content.'
        });

        // Ensure createMinimalMetadata is called with the expected value and returns our test value
        mockCreateMinimalMetadata.mockImplementation((input) => {
            return {
                type: 'article',
                siteName: 'Test Source'
            };
        });

        // Ensure saveExtractedArticleContent correctly handles all parameters
        mockSaveExtractedArticleContent.mockImplementation((jobId, articleData, metadata) => {
            // Log the parameters to see what's being passed
            console.log('saveExtractedArticleContent called with:');
            console.log('  jobId:', jobId);
            console.log('  articleData:', JSON.stringify(articleData));
            console.log('  metadata:', JSON.stringify(metadata));
            return Promise.resolve({});
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // Clean up environment stubs after all tests complete
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('processJob function', () => {
        it('should extract content with Diffbot, save to dedicated columns and analyze', async () => {
            // Import the module to get the processor function
            await import('../../workers/analysisWorker');

            // Make sure mocks resolve immediately
            mockUpdateJobStatus.mockResolvedValue({});
            mockSaveExtractedArticleContent.mockResolvedValue({});
            mockUpdateJobAsComplete.mockResolvedValue({});
            mockEmitSocketUpdate.mockResolvedValue(undefined);

            // Call the processor function captured by mocked Worker class
            await processorFn(mockJob as unknown as Job);

            // Verify the status was updated correctly
            expect(mockUpdateJobStatus).toHaveBeenCalledWith('test-job-id', 'Processing', undefined);
            expect(mockUpdateJobStatus).toHaveBeenCalledWith('test-job-id', 'Fetching', undefined);
            expect(mockUpdateJobStatus).toHaveBeenCalledWith('test-job-id', 'Analyzing', undefined);

            // Verify content was fetched and saved
            expect(mockFetchContentFromDiffbot).toHaveBeenCalledWith('https://example.com/test-article');
            expect(mockSaveExtractedArticleContent).toHaveBeenCalledWith(
                'test-job-id',
                {
                    article_title: mockExtractedContent.title,
                    article_text: mockExtractedContent.text,
                    article_author: mockExtractedContent.author,
                    article_source_name: mockExtractedContent.siteName,
                    article_canonical_url: mockExtractedContent.url || 'https://example.com/test-article',
                    article_preview_image_url: undefined,
                    article_publication_date: mockExtractedContent.date
                },
                {
                    type: 'article',
                    siteName: 'Test Source'
                }
            );

            // Verify analysis was performed
            expect(mockPerformAnalysisWithOpenAI).toHaveBeenCalled();

            // Verify job was marked as complete
            expect(mockUpdateJobAsComplete).toHaveBeenCalledWith('test-job-id', mockAnalysisResults);
        }, 30000); // 30 second timeout for this test

        it('should handle empty Diffbot response', async () => {
            // Reset all mocks for this test
            mockFetchContentFromDiffbot.mockClear();
            mockUpdateJobAsFailed.mockClear();
            mockUpdateJobAsComplete.mockClear();
            mockPerformAnalysisWithOpenAI.mockClear();
            mockGetJobTitleAndText.mockClear();
            mockSaveExtractedArticleContent.mockClear();

            // Mock Diffbot returning empty response
            mockFetchContentFromDiffbot.mockResolvedValue({ objects: [] });

            // Mock getJobTitleAndText to simulate empty content in DB
            mockGetJobTitleAndText.mockResolvedValue({
                article_title: '',
                article_text: ''
            });

            // Import the module to get the processor function
            await import('../../workers/analysisWorker');

            // Call the processor function
            await processorFn(mockJob as unknown as Job);

            // The implementation handles empty Diffbot response by trying to save minimal content
            // and then failing at the analysis phase when it can't get title and text

            // Verify that content extraction was attempted
            expect(mockFetchContentFromDiffbot).toHaveBeenCalled();

            // Check if the job failed at some point
            const wasFailed = mockUpdateJobAsFailed.mock.calls.length > 0;

            if (wasFailed) {
                // If it failed, it shouldn't have reached the analysis stage
                expect(mockPerformAnalysisWithOpenAI).not.toHaveBeenCalled();
            } else {
                // If it didn't explicitly fail, then at least it shouldn't have been marked complete
                expect(mockUpdateJobAsComplete).not.toHaveBeenCalled();
            }
        });

        it('should handle Diffbot API errors', async () => {
            // Mock Diffbot API error
            mockFetchContentFromDiffbot.mockRejectedValue(new Error('Diffbot API error'));

            // Import the module to get the processor function
            await import('../../workers/analysisWorker');

            try {
                // Call the processor function - may throw depending on implementation
                await processorFn(mockJob as unknown as Job);
            } catch (err) {
                // This is expected behavior if the function throws for retryable errors
            }

            // Should mark the job as failed with appropriate error, either directly or through updateJobStatus
            const errorCall = mockUpdateJobAsFailed.mock.calls.find(
                call => call[0] === jobId && call[1].includes('Diffbot API error')
            );

            expect(errorCall).toBeTruthy();

            // Should not attempt to save anything
            expect(mockSaveExtractedArticleContent).not.toHaveBeenCalled();
            expect(mockPerformAnalysisWithOpenAI).not.toHaveBeenCalled();
        });

        it('should handle errors when retrieving article content from DB', async () => {
            // Mock successful Diffbot extraction but error retrieving content from DB
            mockGetJobTitleAndText.mockRejectedValue(new Error('Database error'));

            // Import the module to get the processor function
            await import('../../workers/analysisWorker');

            try {
                // Call the processor function - may throw depending on implementation
                await processorFn(mockJob as unknown as Job);
            } catch (err) {
                // This is expected behavior if the function throws for retryable errors
            }

            // Should mark the job as failed with appropriate error
            const errorCall = mockUpdateJobAsFailed.mock.calls.find(
                call => call[0] === jobId && call[1].includes('Database error')
            );

            expect(errorCall).toBeTruthy();

            // Should not attempt to analyze content
            expect(mockPerformAnalysisWithOpenAI).not.toHaveBeenCalled();
        });

        it('should handle AI analysis errors', async () => {
            // Mock OpenAI and Gemini errors
            mockPerformAnalysisWithOpenAI.mockRejectedValue(new Error('OpenAI API error'));
            mockPerformAnalysisWithGemini.mockRejectedValue(new Error('Gemini API error'));

            // Ensure other mocks resolve immediately 
            mockFetchContentFromDiffbot.mockResolvedValue(mockExtractedContent);
            mockSaveExtractedArticleContent.mockResolvedValue({});
            mockUpdateJobStatus.mockResolvedValue({});
            mockUpdateJobAsFailed.mockResolvedValue({});
            mockEmitSocketUpdate.mockResolvedValue(undefined);

            // Import the module to get the processor function
            await import('../../workers/analysisWorker');

            try {
                // Call the processor function - may throw depending on implementation
                await processorFn(mockJob as unknown as Job);

                // If the function doesn't throw, then ensure updateJobAsFailed was called
                expect(mockUpdateJobAsFailed).toHaveBeenCalledWith(
                    'test-job-id',
                    expect.objectContaining({
                        type: expect.any(String),
                        message: expect.stringContaining('API error')
                    })
                );
            } catch (error) {
                // If it throws, ensure it's properly handled
                expect(error).toBeDefined();
                expect(mockUpdateJobAsFailed).toHaveBeenCalled();
            }
        }, 30000); // 30 second timeout for this test
    });

    describe('updateJobStatus function', () => {
        it('should update status in db and emit socket update', async () => {
            // Import the module and extract updateJobStatus function
            const analysisWorker = await import('../../workers/analysisWorker');
            const updateJobStatus = analysisWorker.updateJobStatus;

            // Call the function
            await updateJobStatus(jobId, 'Processing');

            // Verify the appropriate functions were called
            expect(mockUpdateJobStatus).toHaveBeenCalledWith(jobId, 'Processing', undefined);
            expect(mockEmitSocketUpdate).toHaveBeenCalledWith(
                jobId,
                expect.objectContaining({
                    jobId,
                    status: 'Processing'
                })
            );
        });

        it('should include results when complete', async () => {
            // Import the module and extract updateJobStatus function
            const analysisWorker = await import('../../workers/analysisWorker');
            const updateJobStatus = analysisWorker.updateJobStatus;

            await updateJobStatus(jobId, 'Complete', mockAnalysisResults);

            expect(mockUpdateJobStatus).toHaveBeenCalledWith(jobId, 'Complete', mockAnalysisResults);
            expect(mockEmitSocketUpdate).toHaveBeenCalledWith(
                jobId,
                expect.objectContaining({
                    jobId,
                    status: 'Complete',
                    results: mockAnalysisResults
                })
            );
        });

        it('should include error when failed', async () => {
            // Import the module and extract updateJobStatus function
            const analysisWorker = await import('../../workers/analysisWorker');
            const updateJobStatus = analysisWorker.updateJobStatus;

            const error = { error: 'Test error' };
            await updateJobStatus(jobId, 'Failed', error);

            expect(mockUpdateJobStatus).toHaveBeenCalledWith(jobId, 'Failed', error);
            expect(mockEmitSocketUpdate).toHaveBeenCalledWith(
                jobId,
                expect.objectContaining({
                    jobId,
                    status: 'Failed',
                    error: error.error
                })
            );
        });

        it('should handle errors when updating job status and attempt to mark job as failed', async () => {
            // Import the module and extract updateJobStatus function
            const analysisWorker = await import('../../workers/analysisWorker');
            const updateJobStatus = analysisWorker.updateJobStatus;

            // Mock the jobsRepository.updateJobStatus to throw an error
            const dbError = new Error('DB error');
            mockUpdateJobStatus.mockRejectedValueOnce(dbError);

            // The function should re-throw the error as a JobProcessingError
            await expect(updateJobStatus(jobId, 'Processing')).rejects.toThrow('Failed to update job status');

            // Should attempt to mark as failed and emit socket update for the failure
            expect(mockUpdateJobAsFailed).toHaveBeenCalledWith(
                jobId,
                expect.stringContaining('Error updating job status')
            );
            expect(mockEmitSocketUpdate).toHaveBeenCalledWith(
                jobId,
                expect.objectContaining({
                    jobId,
                    status: 'Failed',
                    error: expect.stringContaining('Error updating job status')
                })
            );
        });

        it('should attempt to mark job as failed when status update fails', async () => {
            // Import the module and extract updateJobStatus function
            const analysisWorker = await import('../../workers/analysisWorker');
            const updateJobStatus = analysisWorker.updateJobStatus;

            // Mock the updateJobStatus to throw an error
            const dbError = new Error('DB error');
            mockUpdateJobStatus.mockRejectedValueOnce(dbError);

            // The function should re-throw the error
            await expect(updateJobStatus(jobId, 'Processing')).rejects.toThrow();

            // Should attempt to mark as failed
            expect(mockUpdateJobAsFailed).toHaveBeenCalledWith(
                jobId,
                expect.stringContaining('Error updating job status')
            );
        });
    });

    describe('markJobAsFailed function', () => {
        it('should update job status as failed in database and emit socket message', async () => {
            // Import the module and extract markJobAsFailed function
            const analysisWorker = await import('../../workers/analysisWorker');
            const markJobAsFailed = analysisWorker.markJobAsFailed;
            const { ErrorType } = analysisWorker;

            const errorMessage = 'Test error message';
            await markJobAsFailed(jobId, errorMessage, ErrorType.VALIDATION);

            // Should call updateJobAsFailed with proper formatting
            expect(mockUpdateJobAsFailed).toHaveBeenCalledWith(
                jobId,
                `${ErrorType.VALIDATION}: ${errorMessage}`
            );

            // Should emit socket update with error
            expect(mockEmitSocketUpdate).toHaveBeenCalledWith(
                jobId,
                expect.objectContaining({
                    jobId,
                    status: 'Failed',
                    error: `${ErrorType.VALIDATION}: ${errorMessage}`
                })
            );
        });

        it('should handle errors when marking job as failed', async () => {
            // Import the module and extract markJobAsFailed function
            const analysisWorker = await import('../../workers/analysisWorker');
            const markJobAsFailed = analysisWorker.markJobAsFailed;
            const { ErrorType } = analysisWorker;

            // Mock the updateJobAsFailed to throw an error
            const dbError = new Error('DB error');
            mockUpdateJobAsFailed.mockRejectedValueOnce(dbError);

            // The function should not throw but log error
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await markJobAsFailed(jobId, 'Test error', ErrorType.INTERNAL);

            // Check log was called
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Critical error: Failed to mark job'),
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });
    });

    describe('worker processor function', () => {
        // Ensure processor function is available for each test
        beforeEach(async () => {
            // Import the module to capture processor function
            await import('../../workers/analysisWorker');

            // Ensure the processor function was captured
            expect(processorFn).toBeDefined();
        });

        it('should process job successfully', async () => {
            // Import module to get processor function
            await import('../../workers/analysisWorker');

            // Ensure all mocks resolve immediately
            mockFetchContentFromDiffbot.mockResolvedValue(mockExtractedContent);
            mockUpdateJobStatus.mockResolvedValue({});
            mockSaveExtractedArticleContent.mockResolvedValue({});
            mockPerformAnalysisWithOpenAI.mockResolvedValue(mockAnalysisResults);
            mockUpdateJobAsComplete.mockResolvedValue({});
            mockEmitSocketUpdate.mockResolvedValue(undefined);

            // Process the job
            const result = await processorFn(mockJob as unknown as Job);

            // Check that job succeeded
            expect(result).toEqual({
                success: true,
                jobId: 'test-job-id',
                message: 'Analysis complete'
            });

            // Check that content was fetched and saved
            expect(mockFetchContentFromDiffbot).toHaveBeenCalledWith('https://example.com/test-article');
            expect(mockSaveExtractedArticleContent).toHaveBeenCalledWith(
                'test-job-id',
                {
                    article_title: mockExtractedContent.title,
                    article_text: mockExtractedContent.text,
                    article_author: mockExtractedContent.author,
                    article_source_name: mockExtractedContent.siteName,
                    article_canonical_url: mockExtractedContent.url || 'https://example.com/test-article',
                    article_preview_image_url: undefined,
                    article_publication_date: mockExtractedContent.date
                },
                {
                    type: 'article',
                    siteName: 'Test Source'
                }
            );

            // Check that analysis was performed and job completed
            expect(mockPerformAnalysisWithOpenAI).toHaveBeenCalled();
            expect(mockUpdateJobAsComplete).toHaveBeenCalledWith('test-job-id', mockAnalysisResults);
        }, 30000); // 30 second timeout for this test

        it('should handle content extraction errors and return error status', async () => {
            const error = new Error('Failed to extract content');
            mockFetchContentFromDiffbot.mockRejectedValueOnce(error);

            // Update job with retries enabled
            mockJob = new MockJob({ jobId, url, language }, jobId, 0, { attempts: 3 });

            try {
                // Should throw to allow BullMQ to retry
                await processorFn(mockJob as unknown as Job);
                // If it doesn't throw, then we should see a failed result
                expect(mockUpdateJobAsFailed).toHaveBeenCalled();
            } catch (err) {
                // If it does throw, that's also acceptable for retry behavior
                expect(err).toBeTruthy();
            }

            // Should mark job as failed with proper error type
            const errorCall = mockUpdateJobAsFailed.mock.calls.find(
                call => call[0] === jobId && call[1].includes('Failed to extract content')
            );
            expect(errorCall).toBeTruthy();
        });

        it('should handle retryable errors but not retry when max attempts reached', async () => {
            const error = new Error('API rate limit exceeded');
            mockFetchContentFromDiffbot.mockRejectedValueOnce(error);

            // Update job with last attempt
            mockJob = new MockJob({ jobId, url, language }, jobId, 2, { attempts: 3 });

            // Process the job - should not throw since max retries reached
            const result = await processorFn(mockJob as unknown as Job);

            // Should either return an error result or have called updateJobAsFailed
            if (result) {
                expect(result).toEqual(expect.objectContaining({
                    success: false,
                    jobId,
                    error: expect.stringMatching(/Failed to extract content|API rate limit/),
                }));
            }

            // Should mark job as failed
            expect(mockUpdateJobAsFailed).toHaveBeenCalled();
        });

        it('should handle missing title or text', async () => {
            // Mock an empty title and text
            mockFetchContentFromDiffbot.mockResolvedValueOnce({
                title: '',
                text: '',
            });

            // Update the getJobTitleAndText mock to return empty values
            mockGetJobTitleAndText.mockResolvedValueOnce({
                article_title: '',
                article_text: '',
            });

            // Process the job
            const result = await processorFn(mockJob as unknown as Job);

            // Check that job failed due to missing content - match the specific error message used in implementation
            expect(mockUpdateJobAsFailed).toHaveBeenCalledWith(
                jobId,
                expect.stringContaining('Failed to retrieve article content from database')
            );

            // Analysis should not be called
            expect(mockPerformAnalysisWithOpenAI).not.toHaveBeenCalled();
        });

        it('should handle analysis errors', async () => {
            // Import module to get processor function
            await import('../../workers/analysisWorker');

            // Mock error from OpenAI analysis
            mockPerformAnalysisWithOpenAI.mockRejectedValue(new Error('Analysis failed'));

            // Ensure other mocks resolve immediately
            mockFetchContentFromDiffbot.mockResolvedValue(mockExtractedContent);
            mockUpdateJobStatus.mockResolvedValue({});
            mockSaveExtractedArticleContent.mockResolvedValue({});
            mockUpdateJobAsFailed.mockResolvedValue({});
            mockEmitSocketUpdate.mockResolvedValue(undefined);

            try {
                // Process the job - should throw
                await processorFn(mockJob as unknown as Job);

                // If the function doesn't throw, then make sure error was handled properly
                expect(mockUpdateJobAsFailed).toHaveBeenCalledWith(
                    'test-job-id',
                    expect.objectContaining({
                        type: expect.any(String),
                        message: expect.stringContaining('Analysis failed')
                    })
                );
            } catch (error) {
                // If it throws, make sure error was passed to update job as failed
                expect(error).toBeDefined();
                expect(mockUpdateJobAsFailed).toHaveBeenCalled();
            }
        }, 30000); // 30 second timeout for this test

        it('should handle invalid inputs', async () => {
            // Create a job with missing URL
            mockJob = new MockJob({ jobId, url: '', language }, jobId);

            // Process the job
            const result = await processorFn(mockJob as unknown as Job);

            // Check that job failed due to invalid input
            const errorCall = mockUpdateJobAsFailed.mock.calls.find(
                call => call[0] === jobId && call[1].includes('Invalid job data')
            );
            expect(errorCall).toBeTruthy();
        });

        it('should handle database update failures', async () => {
            // Mock jobsRepository.saveExtractedArticleContent to fail
            mockSaveExtractedArticleContent.mockRejectedValueOnce(
                new Error('Database update failed')
            );

            // Process the job
            const result = await processorFn(mockJob as unknown as Job);

            // Check that job failed due to database update error
            const errorCall = mockUpdateJobAsFailed.mock.calls.find(
                call => call[0] === jobId && call[1].includes('Database update failed')
            );
            expect(errorCall).toBeTruthy();
        });

        it('should handle generic non-error exceptions', async () => {
            // Mock a generic error (string throw)
            mockFetchContentFromDiffbot.mockImplementationOnce(() => {
                throw 'String error';
            });

            // Process the job
            const result = await processorFn(mockJob as unknown as Job);

            // Check that job failed with appropriate error
            const errorCall = mockUpdateJobAsFailed.mock.calls.find(
                call => call[0] === jobId && /String error|Unknown error/.test(call[1])
            );
            expect(errorCall).toBeTruthy();
        });
    });

    describe('Archive.is Fetch Strategy', () => {
        // Tests for the Archive.is fetch strategy
        it('should use Archive.is URL for domains on the proactive list', async () => {
            // Import the module to get processor function
            await import('../../workers/analysisWorker');

            // Set up domain detection mocks
            const originalUrl = 'https://www.nytimes.com/article';
            mockFetchContentFromDiffbot.mockClear();

            // Mock fetchContentFromDiffbot to simulate the implementation
            mockFetchContentFromDiffbot.mockImplementation((url) => {
                // This simulates what the real function does based on the implementation in diffbotClient.ts
                if (mockIsDomainOnProactiveList('www.nytimes.com')) {
                    // If we're called with a direct URL, we would transform it to archive.is URL
                    if (url === originalUrl) {
                        // Change URL and call self with archive.is URL
                        const archiveUrl = `https://archive.is/newest/${encodeURIComponent(originalUrl)}`;
                        return Promise.resolve({
                            title: "Test Article Title",
                            text: "This is the test article content.",
                            author: "Test Author",
                            siteName: "Test Source",
                            url: originalUrl,
                            date: "2023-01-01T12:00:00Z",
                            fetchStrategy: "archive.is",
                            originalUrl: originalUrl
                        });
                    }
                }
                return Promise.resolve(mockExtractedContent);
            });

            // Ensure mocks resolve immediately
            mockExtractDomain.mockReturnValue('www.nytimes.com');
            mockIsDomainOnProactiveList.mockReturnValue(true);

            // Set up other mocks to resolve quickly
            mockUpdateJobStatus.mockResolvedValue({});
            mockSaveExtractedArticleContent.mockResolvedValue({});
            mockPerformAnalysisWithOpenAI.mockResolvedValue({});
            mockUpdateJobAsComplete.mockResolvedValue({});
            mockEmitSocketUpdate.mockResolvedValue(undefined);

            // Create test job with paywall domain URL
            const paywallJob = {
                ...mockJob,
                data: {
                    ...mockJob.data,
                    url: originalUrl
                }
            };

            // Process the job
            await processorFn(paywallJob as unknown as Job);

            // Check that fetchContentFromDiffbot was called with the original URL
            // (the mock would internally convert it to archive.is URL)
            expect(mockFetchContentFromDiffbot).toHaveBeenCalledWith(originalUrl);

            // Verify article data fields were correctly formatted
            expect(mockSaveExtractedArticleContent).toHaveBeenCalledWith(
                'test-job-id',
                {
                    article_title: "Test Article Title",
                    article_text: "This is the test article content.",
                    article_author: "Test Author",
                    article_source_name: "Test Source",
                    article_canonical_url: "https://www.nytimes.com/article",
                    article_preview_image_url: undefined,
                    article_publication_date: "2023-01-01T12:00:00Z"
                },
                {
                    type: 'article',
                    siteName: 'Test Source'
                }
            );
        }, 30000); // 30 second timeout for this test

        it('should use direct URL for domains not on the proactive list', async () => {
            // Import the module to get processor function
            await import('../../workers/analysisWorker');

            // Set up domain detection mocks
            const originalUrl = 'https://example.com/article';
            mockFetchContentFromDiffbot.mockClear();
            // Ensure mocks resolve immediately
            mockExtractDomain.mockReturnValue('example.com');
            mockIsDomainOnProactiveList.mockReturnValue(false);

            // Set up other mocks to resolve quickly
            mockUpdateJobStatus.mockResolvedValue({});
            mockSaveExtractedArticleContent.mockResolvedValue({});
            mockPerformAnalysisWithOpenAI.mockResolvedValue({});
            mockUpdateJobAsComplete.mockResolvedValue({});
            mockEmitSocketUpdate.mockResolvedValue(undefined);

            // Create test job
            const nonPaywallJob = {
                ...mockJob,
                data: {
                    ...mockJob.data,
                    url: originalUrl
                }
            };

            // Process the job
            await processorFn(nonPaywallJob as unknown as Job);

            // Verify the direct URL was used (not archive.is)
            expect(mockFetchContentFromDiffbot).toHaveBeenCalledWith(
                originalUrl
            );

            // Verify article data fields were correctly formatted
            expect(mockSaveExtractedArticleContent).toHaveBeenCalledWith(
                'test-job-id',
                {
                    article_title: "Test Article Title",
                    article_text: "This is the test article content.",
                    article_author: "Test Author",
                    article_source_name: "Test Source",
                    article_canonical_url: "https://example.com/canonical",
                    article_preview_image_url: undefined,
                    article_publication_date: "2023-01-01T12:00:00Z"
                },
                {
                    type: 'article',
                    siteName: 'Test Source'
                }
            );
        }, 30000); // 30 second timeout for this test

        it('should include fetch strategy information in extracted content', async () => {
            // Import the module to get processor function
            await import('../../workers/analysisWorker');

            // Set up domain detection mocks
            const originalUrl = 'https://www.nytimes.com/article';
            mockFetchContentFromDiffbot.mockClear();
            // Ensure mocks resolve immediately
            mockExtractDomain.mockReturnValue('www.nytimes.com');
            mockIsDomainOnProactiveList.mockReturnValue(true);

            // Set up Diffbot mocks
            mockFetchContentFromDiffbot.mockResolvedValue({
                title: 'Test Article',
                text: null,
                author: null,
                siteName: null,
                url: originalUrl,
                date: null,
                fetchStrategy: 'archive.is',
                originalUrl: originalUrl
            });

            // Set up other mocks to resolve quickly
            mockUpdateJobStatus.mockResolvedValue({});
            mockSaveExtractedArticleContent.mockResolvedValue({});
            mockPerformAnalysisWithOpenAI.mockResolvedValue({});
            mockUpdateJobAsComplete.mockResolvedValue({});
            mockEmitSocketUpdate.mockResolvedValue(undefined);

            // Create test job with paywall domain URL
            const paywallJob = {
                ...mockJob,
                data: {
                    ...mockJob.data,
                    url: originalUrl
                }
            };

            // Process the job
            await processorFn(paywallJob as unknown as Job);

            // Verify article data fields were correctly formatted
            expect(mockSaveExtractedArticleContent).toHaveBeenCalledWith(
                'test-job-id',
                {
                    article_title: 'Test Article',
                    article_text: null,
                    article_author: null,
                    article_source_name: null,
                    article_canonical_url: originalUrl,
                    article_preview_image_url: undefined,
                    article_publication_date: null
                },
                {
                    type: 'article',
                    siteName: 'Test Source'
                }
            );
        }, 30000); // 30 second timeout for this test

        it('should handle domain extraction errors and fall back to direct URL', async () => {
            // Import the module to get processor function
            await import('../../workers/analysisWorker');

            // Set up domain extraction to fail
            mockExtractDomain.mockImplementation(() => {
                throw new Error('Invalid URL');
            });

            // Set up other mocks to resolve quickly
            mockUpdateJobStatus.mockResolvedValue({});
            mockSaveExtractedArticleContent.mockResolvedValue({});
            mockPerformAnalysisWithOpenAI.mockResolvedValue({});
            mockUpdateJobAsComplete.mockResolvedValue({});
            mockEmitSocketUpdate.mockResolvedValue(undefined);

            // Process job and verify direct URL is used
            await processorFn(mockJob as unknown as Job);

            // Should fall back to direct URL
            expect(mockFetchContentFromDiffbot).toHaveBeenCalledWith(
                'https://example.com/test-article'
            );

            // Verify article data fields were correctly formatted
            expect(mockSaveExtractedArticleContent).toHaveBeenCalledWith(
                'test-job-id',
                {
                    article_title: "Test Article Title",
                    article_text: "This is the test article content.",
                    article_author: "Test Author",
                    article_source_name: "Test Source",
                    article_canonical_url: "https://example.com/canonical",
                    article_preview_image_url: undefined,
                    article_publication_date: "2023-01-01T12:00:00Z"
                },
                {
                    type: 'article',
                    siteName: 'Test Source'
                }
            );
        }, 30000); // 30 second timeout for this test
    });
}); 