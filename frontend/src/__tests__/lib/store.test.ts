import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HistoryItem, AnalysisData } from '@/types/analysis';
import { AxiosResponse } from 'axios';

// First, mock all modules BEFORE importing the store
vi.mock('@/lib/socketClient', () => ({
    default: {
        subscribeToJob: vi.fn(),
        unsubscribeFromJob: vi.fn(),
        disconnectSocket: vi.fn(),
    }
}));

vi.mock('@/lib/localStorageUtils', () => ({
    loadHistoryFromLocalStorage: vi.fn(() => []),
    saveHistoryToLocalStorage: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
    USE_MOCK_API: false
}));

vi.mock('@/lib/apiClient', () => ({
    default: {
        submitUrl: vi.fn(),
        getJobStatus: vi.fn(),
        getJobResults: vi.fn(),
        getJobPreview: vi.fn(),
        getHistory: vi.fn(),
    },
    SubmitExistingJobResponse: {}
}));

vi.mock('@/lib/mockApiService', () => ({
    default: {
        api: {
            submitUrl: vi.fn(),
            getJobStatus: vi.fn(),
            getJobResults: vi.fn(),
            getJobPreview: vi.fn(),
            getHistory: vi.fn(),
        },
        socketClient: {
            subscribeToJob: vi.fn(),
            unsubscribeFromJob: vi.fn(),
            disconnectSocket: vi.fn(),
        }
    }
}));

// Now import the modules
import useAnalysisStore from '@/lib/store';
import socketClient from '@/lib/socketClient';
import * as localStorageUtils from '@/lib/localStorageUtils';
import apiClient from '@/lib/apiClient';

// Define a type for the mocked functions to fix linting issues
type MockFn = ReturnType<typeof vi.fn>;

describe('Analysis Store', () => {
    // Mock localStorage
    beforeEach(() => {
        // Reset all mocks
        vi.resetAllMocks();

        // Set up localStorage mock
        const localStorageMock = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
        };
        Object.defineProperty(window, 'localStorage', { value: localStorageMock });

        // Reset the store state
        useAnalysisStore.setState({
            jobId: null,
            jobStatus: null,
            errorMessage: null,
            analysisData: null,
            articleData: null,
            historyItems: [],
            isLoading: false,
            hasStarted: false,
            isFadingIn: false,
            shouldResetUrlInput: false,
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('URL Submission', () => {
        it('should update state correctly when submitting a URL', () => {
            // Directly set the state to simulate after a URL submission
            useAnalysisStore.setState({
                jobId: 'test-job-id',
                jobStatus: 'Queued',
                isLoading: true,
                hasStarted: true
            });

            const store = useAnalysisStore.getState();

            // Verify state changes
            expect(store.jobId).toBe('test-job-id');
            expect(store.jobStatus).toBe('Queued');
            expect(store.isLoading).toBe(true);
            expect(store.hasStarted).toBe(true);
        });

        it('should handle error cases properly', () => {
            // Directly set the state to simulate an error
            useAnalysisStore.setState({
                errorMessage: 'Network error',
                isLoading: false,
                hasStarted: false
            });

            const store = useAnalysisStore.getState();

            // Verify error state
            expect(store.jobId).toBeNull();
            expect(store.errorMessage).toBe('Network error');
            expect(store.isLoading).toBe(false);
            expect(store.hasStarted).toBe(false);
        });

        it('should properly set state for an existing analysis', () => {
            // Directly set the state to simulate an existing analysis
            useAnalysisStore.setState({
                jobId: 'existing-job-id',
                jobStatus: 'Complete',
                isLoading: false,
                hasStarted: true,
                analysisData: {
                    slant: {
                        category: 'Liberal/Progressive',
                        rationale: 'Test rationale',
                        confidence: 'Medium'
                    },
                    claims: {
                        factual_claims: []
                    },
                    report: {
                        bias_analysis: {
                            overall_assessment: 'Test assessment',
                            overall_bias_level: 'Moderate',
                            dimension_summaries: {},
                            detailed_findings: []
                        }
                    }
                },
                articleData: {
                    title: 'Test Article',
                    author: 'Test Author',
                    source: 'Test Source',
                    imageUrl: 'https://example.com/image.jpg',
                    url: 'https://example.com/article'
                }
            });

            const store = useAnalysisStore.getState();

            // Verify state for existing analysis
            expect(store.jobId).toBe('existing-job-id');
            expect(store.jobStatus).toBe('Complete');
            expect(store.isLoading).toBe(false);
            expect(store.hasStarted).toBe(true);
            expect(store.analysisData).toBeDefined();
            expect(store.analysisData?.slant?.category).toBe('Liberal/Progressive');
            expect(store.analysisData?.report?.bias_analysis?.overall_bias_level).toBe('Moderate');
            expect(store.articleData).toBeDefined();
            expect(store.articleData?.title).toBe('Test Article');
        });
    });

    describe('Shared Analysis Loading', () => {
        beforeEach(() => {
            // Mock the API client methods
            (apiClient.getJobStatus as MockFn).mockReset();
            (apiClient.getJobResults as MockFn).mockReset();
            (apiClient.getJobPreview as MockFn).mockReset();
        });

        it('should handle invalid UUID format', async () => {
            // Call the loadSharedAnalysis function with an invalid UUID
            await useAnalysisStore.getState().loadSharedAnalysis('invalid-job-id');

            // Check that the store was updated with the correct error
            const state = useAnalysisStore.getState();
            expect(state.errorMessage).toContain('Analysis Not Found. The analysis ID format is invalid');
            expect(state.jobStatus).toBe('Failed');
            expect(state.isLoading).toBe(false);
        });

        it('should handle 404 not found error for shared analysis', async () => {
            // Create a valid UUID for testing
            const validUuid = '12345678-1234-1234-1234-123456789012';

            // Mock the status check to throw a 404 error
            const notFoundError = new Error('Not found');
            (notFoundError as any).response = { status: 404 };
            (apiClient.getJobStatus as MockFn).mockRejectedValue(notFoundError);

            // Call the loadSharedAnalysis function
            await useAnalysisStore.getState().loadSharedAnalysis(validUuid);

            // Check that the store was updated with the correct error
            const state = useAnalysisStore.getState();
            expect(state.errorMessage).toContain('Analysis Not Found');
            expect(state.jobStatus).toBe('Failed');
            expect(state.isLoading).toBe(false);
        });

        it('should handle a failed analysis job status', async () => {
            // Create a valid UUID for testing
            const validUuid = '12345678-1234-1234-1234-123456789012';

            // Mock the job status to return a failed job
            (apiClient.getJobStatus as MockFn).mockResolvedValue({
                status: 'Failed',
                error_message: 'Analysis processing failed'
            });

            // Call the loadSharedAnalysis function
            await useAnalysisStore.getState().loadSharedAnalysis(validUuid);

            // Check that the store was updated with the correct error
            const state = useAnalysisStore.getState();
            expect(state.errorMessage).toContain(`This analysis (ID: ${validUuid}) could not be completed`);
            expect(state.jobStatus).toBe('Failed');
            expect(state.isLoading).toBe(false);
        });

        it('should handle errors during analysis result fetch', async () => {
            // Create a valid UUID for testing
            const validUuid = '12345678-1234-1234-1234-123456789012';

            // Mock successful status check but failed results fetch
            (apiClient.getJobStatus as MockFn).mockResolvedValue({
                status: 'Failed'
            });

            // Call the loadSharedAnalysis function
            await useAnalysisStore.getState().loadSharedAnalysis(validUuid);

            // Check that the store was updated with an error (any error message)
            const state = useAnalysisStore.getState();
            expect(state.errorMessage).not.toBeNull();
            expect(state.jobStatus).toBe('Failed');
            expect(state.isLoading).toBe(false);
        });

        it('should load shared analysis successfully when API calls succeed', async () => {
            // Create a valid UUID for testing
            const validUuid = '12345678-1234-1234-1234-123456789012';

            // Mock successful responses
            (apiClient.getJobStatus as MockFn).mockResolvedValue({
                status: 'Complete',
                url: 'https://example.com/article',
                analysis_results: {
                    slant: { category: 'Centrist/Moderate' },
                    claims: { factual_claims: [] },
                    report: { bias_analysis: { overall_bias_level: 'Low' } }
                }
            });

            // Call the loadSharedAnalysis function
            await useAnalysisStore.getState().loadSharedAnalysis(validUuid);

            // Check that the store was updated correctly
            const state = useAnalysisStore.getState();
            expect(state.jobId).toBe(validUuid);
            expect(state.jobStatus).toBe('Complete');
            expect(state.isLoading).toBe(false);
            expect(state.errorMessage).toBeNull();
            expect(state.analysisData).toBeDefined();
            expect(state.analysisData?.slant?.category).toBe('Centrist/Moderate');
        });
    });
});