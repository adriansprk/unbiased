import { create } from 'zustand';
import { ArticleData } from '@/components/ArticlePreview';
import { AnalysisData, HistoryItem, JobUpdate } from '@/types/analysis';
import socketClient from '@/lib/socketClient';
import api, { SubmitExistingJobResponse, SubmitNewJobResponse } from '@/lib/apiClient';
import { USE_MOCK_API } from '@/lib/config';
import mockService from '@/lib/mockApiService';
import { loadHistoryFromLocalStorage, saveHistoryToLocalStorage } from '@/lib/localStorageUtils';
import logger from "@/utils/logger";

// Use either the real or mock services based on configuration
const apiService = USE_MOCK_API ? mockService.api : api;
const socketService = USE_MOCK_API ? mockService.socketClient : socketClient;

interface AnalysisState {
    // Current analysis data
    jobId: string | null;
    jobStatus: string | null;
    errorMessage: string | null;
    progressMessage: string | null;
    analysisData: AnalysisData | null;
    articleData: ArticleData | null;
    historyItems: HistoryItem[];
    isLoading: boolean;
    hasStarted: boolean;
    isFadingIn: boolean;

    // UI State
    shouldResetUrlInput: boolean;

    // Actions
    submitUrl: (url: string, locale?: string) => Promise<void>;
    updateWithApiResponse: (response: SubmitNewJobResponse | SubmitExistingJobResponse) => void;
    selectHistoryItem: (jobId: string) => Promise<void>;
    resetAnalysis: () => void;
    setLoadingState: (isLoading: boolean) => void;
    loadHistory: () => Promise<void>;
    clearUrlInput: () => void;
    checkJobStatus: (jobId: string) => Promise<void>;
    fetchArticlePreview: (jobId: string) => Promise<void>;
    fetchAnalysisResults: (jobId: string) => Promise<void>;
    loadSharedAnalysis: (jobId: string) => Promise<void>;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
    // State
    jobId: null,
    jobStatus: null,
    errorMessage: null,
    progressMessage: null,
    analysisData: null,
    articleData: null,
    historyItems: [], // Start empty to avoid hydration mismatch, load in useEffect
    isLoading: false,
    hasStarted: false,
    isFadingIn: false,
    shouldResetUrlInput: false,

    // UI State
    setLoadingState: (isLoading) => set({ isLoading }),

    // New method to update store state directly from an API response without making a second API call
    updateWithApiResponse: (response: SubmitNewJobResponse | SubmitExistingJobResponse) => {
        const { jobId: currentJobId, isLoading } = get();

        // Check for existing analysis (response with existingAnalysis flag)
        if ('existingAnalysis' in response && response.existingAnalysis) {
            logger.debug('Updating store with existing analysis:', response);

            // We know this is a SubmitExistingJobResponse
            const jobData = response as SubmitExistingJobResponse;

            // Log image URL from response
            logger.debug('Existing analysis image URL:', jobData.article_preview_image_url);

            // Prepare article data from the response
            const articleData: ArticleData = {
                title: jobData.article_title || 'Article',
                source: jobData.article_source_name || '',
                author: jobData.article_author || '',
                imageUrl: jobData.article_preview_image_url || '',
                description: jobData.article_text
                    ? jobData.article_text.substring(0, 100) + '...'
                    : 'No description available',
                url: jobData.article_canonical_url || jobData.url || ''
            };

            // Set state directly to Complete with all data
            set({
                jobId: jobData.jobId,
                jobStatus: 'Complete',
                analysisData: jobData.analysis_results,
                articleData: articleData,
                errorMessage: null,
                isLoading: false,
                hasStarted: true,
                isFadingIn: true,
                shouldResetUrlInput: false,
            });

            // Reset fade animation
            setTimeout(() => {
                set({ isFadingIn: false });
            }, 300);

            // Add to history immediately since we already have all the data
            const historyItem: HistoryItem = {
                id: jobData.jobId,
                url: jobData.url,
                date: new Date().toISOString(),
                title: jobData.article_title || 'Article',
                slant: jobData.analysis_results?.slant?.category || 'Unknown'
            };

            // Update history items
            const updatedHistory = [
                historyItem,
                ...get().historyItems.filter(item => item.id !== historyItem.id)
            ];
            set({ historyItems: updatedHistory });

            // Save to local storage
            saveHistoryToLocalStorage(updatedHistory);

            return;
        }

        // If we get here, it must be a SubmitNewJobResponse
        const newJobData = response as SubmitNewJobResponse;
        const newJobId = newJobData.jobId;

        if (!newJobId) {
            logger.error('Invalid response object:', response);
            set({
                errorMessage: "Invalid response from server",
                jobStatus: "Failed",
                isLoading: false
            });
            return;
        }

        // Avoid reanalyzing the same job
        if (currentJobId === newJobId && isLoading) {
            logger.debug('Already analyzing this job, ignoring duplicate submission');
            return;
        }

        // Unsubscribe from any existing job
        socketService.unsubscribeFromJob();

        // Prepare immediate article data from metadata if available
        let initialArticleData: ArticleData | null = null;
        if (newJobData.metadata) {
            logger.debug('Creating initial article data from metadata:', newJobData.metadata);
            initialArticleData = {
                title: newJobData.metadata.title || 'Article being analyzed',
                source: newJobData.metadata.siteName || '',
                author: newJobData.metadata.authors?.join(', ') || '',
                imageUrl: newJobData.metadata.image || '',
                description: newJobData.metadata.description || 'Analysis in progress...',
                url: newJobData.metadata.url
            };
        }

        // Reset state and start new analysis
        set({
            jobId: newJobId,
            jobStatus: 'Queued',
            analysisData: null,
            articleData: initialArticleData,
            errorMessage: null,
            isLoading: true,
            hasStarted: true,
            isFadingIn: true,
            shouldResetUrlInput: false,
        });

        // Reset fade animation
        setTimeout(() => {
            set({ isFadingIn: false });
        }, 300);

        // Subscribe to job updates immediately to avoid missing early progress messages
        logger.debug('Subscribing to job updates for:', newJobId);
        socketService.subscribeToJob(newJobId, (update) => handleJobUpdate(update, newJobId));

        // Setup periodic status checks as fallback
        setupPeriodicStatusCheck(newJobId);
    },

    // Actions
    submitUrl: async (url, locale = 'en') => {
        try {
            logger.debug(`Submitting URL: ${url} with locale: ${locale}`);
            // Submit URL to API with locale
            const response = await apiService.submitUrl(url, locale);
            logger.debug(`API Response:`, response);

            // Check if valid response
            if (!response || !response.data) {
                logger.error('Invalid response from server:', response);
                set({
                    errorMessage: "Invalid response from server",
                    jobStatus: "Failed",
                    isLoading: false
                });
                return;
            }

            // Determine the response type based on the properties present
            if ('existingAnalysis' in response.data && response.data.existingAnalysis === true) {
                // This is an existing analysis response
                const existingJobResponse = response.data as SubmitExistingJobResponse;
                get().updateWithApiResponse(existingJobResponse);
            } else if ('jobId' in response.data) {
                // This is a new job response
                const newJobResponse = response.data as SubmitNewJobResponse;
                get().updateWithApiResponse(newJobResponse);
            } else {
                logger.error('Unknown response format:', response.data);
                set({
                    errorMessage: "Unexpected response format from server",
                    jobStatus: "Failed",
                    isLoading: false
                });
            }
        } catch (error) {
            logger.error("Error submitting URL:", error);
            set({
                errorMessage: "Failed to submit URL for analysis",
                isLoading: false,
                jobStatus: "Failed"
            });
        }
    },

    selectHistoryItem: async (selectedJobId: string) => {
        try {
            // Reset any previous analysis data but keep loading state
            set({
                analysisData: null,
                articleData: null,
                errorMessage: null,
                isLoading: true,
                hasStarted: true,
                isFadingIn: true,
                jobId: selectedJobId,
                jobStatus: 'Loading'
            });

            // Reset fade animation after a brief delay
            setTimeout(() => {
                set({ isFadingIn: false });
            }, 300);

            // Also immediately check the job status since it might already be complete
            try {
                const statusData = await apiService.getJobStatus(selectedJobId);

                // Check if the job status is complete or has an error
                if (statusData.status === 'Failed') {
                    set({
                        jobStatus: 'Failed',
                        errorMessage: statusData.error_message || 'Analysis failed with no error details.',
                        isLoading: false
                    });
                    return;
                }

                // Set job status
                set({ jobStatus: statusData.status });

                // Set analysis data if available from status endpoint
                if (statusData.analysis_results) {
                    set({ analysisData: statusData.analysis_results });
                }

                // Use dedicated article data fields from the status endpoint if available
                if (statusData) {
                    // IMPORTANT: Use the article_preview_image_url directly from the response
                    // This is the field properly processed by the backend
                    const articleData: ArticleData = {
                        title: statusData.article_title || (statusData.job_details?.title || 'Untitled Article'),
                        source: statusData.article_source_name || (statusData.job_details?.siteName || ''),
                        author: statusData.article_author || (statusData.job_details?.author || ''),
                        imageUrl: statusData.article_preview_image_url || '',
                        description: statusData.job_details?.text
                            ? statusData.job_details.text.substring(0, 100) + '...'
                            : '',
                        url: statusData.url || ''
                    };
                    logger.debug('Setting article data from history item:', articleData);
                    set({ articleData });
                }

                // If job is complete, also mark as not loading
                if (statusData.status === 'Complete') {
                    set({ isLoading: false });
                }
            } catch (statusError) {
                logger.error('Error checking job status:', statusError);

                // If both direct fetch and status check fail, we might be dealing with a local-only history item
                // Look for it in the current history items
                const { historyItems } = get();
                const historyItem = historyItems.find(item => item.id === selectedJobId);

                if (historyItem) {
                    logger.debug('Found history item in local storage:', historyItem);
                    // We have the item metadata but not the full analysis
                    // Set a specific error message
                    set({
                        jobStatus: 'Failed',
                        errorMessage: 'This analysis is only available locally and cannot be retrieved from the server. Only basic information is available.',
                        isLoading: false
                    });
                } else {
                    // We don't have this item at all
                    set({
                        jobStatus: 'Failed',
                        errorMessage: 'Failed to load analysis. The analysis may no longer exist on the server.',
                        isLoading: false
                    });
                }
                return;
            }

            // Setup periodic status checks as fallback
            setupPeriodicStatusCheck(selectedJobId);
        } catch (error) {
            logger.error("Error selecting history item:", error);
            set({
                errorMessage: "Failed to load selected analysis",
                isLoading: false,
                jobStatus: "Failed"
            });
        }
    },

    resetAnalysis: () => {
        socketService.unsubscribeFromJob();
        set({
            isLoading: false,
            jobId: null,
            jobStatus: null,
            progressMessage: null,
            analysisData: null,
            articleData: null,
            errorMessage: null,
        });
    },

    loadHistory: async () => {
        try {
            // First try to load from API
            const response = await apiService.getHistory();
            if (response.success && response.history) {
                const apiHistory = response.history;

                // Merge with local storage history to ensure we have the most complete set
                const localHistory = loadHistoryFromLocalStorage();

                // Create a map of history items by ID for easy lookup and deduplication
                const historyMap = new Map<string, HistoryItem>();

                // Add API history items to the map
                apiHistory.forEach((item: HistoryItem) => {
                    historyMap.set(item.id, item);
                });

                // Add local history items if they don't exist in the API response
                localHistory.forEach((item: HistoryItem) => {
                    if (!historyMap.has(item.id)) {
                        historyMap.set(item.id, item);
                    }
                });

                // Convert map back to array and sort by date (newest first)
                const mergedHistory = Array.from(historyMap.values())
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                // Update state with merged history
                set({ historyItems: mergedHistory });

                // Save merged history to local storage
                saveHistoryToLocalStorage(mergedHistory);
            } else {
                // If API fails or returns no history, fall back to local storage
                const localHistory = loadHistoryFromLocalStorage();
                set({ historyItems: localHistory });
            }
        } catch (error) {
            logger.error("Failed to load history from API:", error);
            // Fall back to local storage if API fails
            const localHistory = loadHistoryFromLocalStorage();
            set({ historyItems: localHistory });
        }
    },

    clearUrlInput: () => {
        set({ shouldResetUrlInput: true });
        // Reset the flag after a short delay
        setTimeout(() => {
            set({ shouldResetUrlInput: false });
        }, 100);
    },

    // Method to check job status via API as a fallback
    checkJobStatus: async (jobId) => {
        if (!jobId) return;

        const { jobStatus } = get();
        logger.debug(`Manually checking status for job ${jobId}, current status: ${jobStatus}`);

        try {
            const statusData = await apiService.getJobStatus(jobId);
            logger.debug('Status check response (Full):', statusData);
            logger.debug('Status check article data:', {
                title: statusData.article_title,
                imageUrl: statusData.article_preview_image_url,
                author: statusData.article_author
            });

            if (statusData) {
                // Synchronize the status if it's different
                if (statusData.status && jobStatus !== statusData.status) {
                    logger.debug(`Updating status from ${jobStatus} to ${statusData.status} based on API check`);

                    // Handle status change using the same logic as WebSocket updates
                    const update: JobUpdate = {
                        jobId,
                        status: statusData.status,
                    };

                    // Process the update
                    handleJobUpdate(update, jobId);

                    // For Complete status, we also need to get the analysis data
                    if (statusData.status === 'Complete' && statusData.analysis_results) {
                        logger.debug('Setting analysis data from status endpoint');
                        set({ analysisData: statusData.analysis_results });
                    }
                }

                // Update article data during ongoing analysis, but be smart about it
                // Only update if we have better data than what we already have
                const newArticleData: ArticleData = {
                    title: statusData.article_title || (statusData.job_details?.title || 'Article being analyzed'),
                    source: statusData.article_source_name || (statusData.job_details?.siteName || ''),
                    author: statusData.article_author || (statusData.job_details?.author || ''),
                    imageUrl: statusData.article_preview_image_url || '',
                    description: statusData.job_details?.text
                        ? statusData.job_details.text.substring(0, 100) + '...'
                        : 'Analysis in progress...',
                    url: statusData.url || ''
                };

                logger.debug('New article data from status endpoint:', newArticleData);

                const currentArticleData = get().articleData;

                // Calculate "completeness score" for comparison
                const scoreArticleData = (data: ArticleData | null): number => {
                    if (!data) return 0;
                    let score = 0;
                    if (data.title && data.title !== 'Article being analyzed' && data.title !== 'Untitled Article') score += 3;
                    if (data.imageUrl) score += 2;
                    if (data.author) score += 1;
                    if (data.source) score += 1;
                    if (data.description && data.description !== 'Analysis in progress...') score += 1;
                    return score;
                };

                const currentScore = scoreArticleData(currentArticleData);
                const newScore = scoreArticleData(newArticleData);

                // Only update if the new data is actually better (higher score)
                // OR if we don't have any data yet
                const shouldUpdate = !currentArticleData || newScore > currentScore;

                if (shouldUpdate) {
                    logger.debug('Updating article data (score improved):', {
                        oldTitle: currentArticleData?.title,
                        newTitle: newArticleData.title,
                        oldScore: currentScore,
                        newScore: newScore,
                        hasImage: !!newArticleData.imageUrl
                    });
                    set({ articleData: newArticleData });
                } else {
                    logger.debug('Keeping existing article data (better quality):', {
                        currentTitle: currentArticleData?.title,
                        currentScore,
                        newScore
                    });
                }
            }
        } catch (error) {
            logger.error('Error checking job status:', error);
        }
    },

    fetchArticlePreview: async (jobId: string) => {
        try {
            logger.debug(`Fetching article preview for job ${jobId}`);
            const currentArticleData = get().articleData;

            // If we already have valid article data with a title other than the fallback, prioritize keeping it
            if (currentArticleData &&
                currentArticleData.title &&
                currentArticleData.title !== 'Article being analyzed') {
                logger.debug('Using existing valid article data instead of fetching again');
                return;
            }

            try {
                // Try to fetch from the preview endpoint
                const previewData = await apiService.getJobPreview(jobId);

                if (previewData && previewData.success) {
                    const newArticleData = {
                        title: previewData.title || 'Untitled Article',
                        source: previewData.source || '',
                        author: previewData.author || '',
                        imageUrl: previewData.imageUrl || '',
                        description: previewData.description || '',
                        url: previewData.url || ''
                    };

                    set({ articleData: newArticleData });
                    logger.debug('Article data set successfully:', newArticleData);
                }
            } catch {
                // If preview endpoint 404s, try to get data from the status endpoint instead
                logger.debug('Preview endpoint failed, falling back to status endpoint');

                try {
                    const statusData = await apiService.getJobStatus(jobId);
                    if (statusData && statusData.job_details) {
                        const details = statusData.job_details;
                        logger.debug('DEBUG - Status data job_details:', JSON.stringify(details, null, 2));

                        // Handle different possible image field structures based on Diffbot API structure
                        let imageUrl = '';
                        if (details.images && Array.isArray(details.images) && details.images.length > 0) {
                            // Try to find the primary image first (if marked as primary)
                            const primaryImage = details.images.find((img: { primary?: boolean, url?: string }) => img.primary === true);
                            if (primaryImage && primaryImage.url) {
                                imageUrl = primaryImage.url;
                            } else if (details.images[0].url) {
                                // Otherwise use the first image
                                imageUrl = details.images[0].url;
                            }
                        }

                        const newArticleData = {
                            title: details.title || 'Untitled Article',
                            source: details.siteName || '',
                            author: details.author || '',
                            imageUrl: imageUrl,
                            description: details.text ? details.text.substring(0, 100) + '...' : '',
                            url: statusData.url || ''
                        };

                        set({ articleData: newArticleData });
                        logger.debug('Article data set from status endpoint:', newArticleData);
                        return; // Exit early since we've set the data
                    } else if (statusData && statusData.url) {
                        // If we already have good article data, don't replace it with a fallback
                        if (currentArticleData &&
                            currentArticleData.title &&
                            currentArticleData.title !== 'Article being analyzed') {
                            logger.debug('Keeping existing article data instead of using URL-only fallback');
                            return;
                        }

                        const fallbackData = createFallbackArticleData(jobId, statusData.url);
                        set({ articleData: fallbackData });
                        logger.debug('Using URL-only fallback article data:', fallbackData);
                    }
                } catch (statusError) {
                    logger.error('Status fallback also failed:', statusError);
                }
            }

            // Only use a completely generic fallback if we have no article data at all
            if (!get().articleData) {
                const genericFallback = createFallbackArticleData(jobId);
                set({ articleData: genericFallback });
                logger.debug('Using generic fallback article data - no previous data existed');
            }
        } catch (error) {
            logger.error("Failed to fetch article preview:", error);

            // Only set fallback article data if we don't already have better data
            const currentArticleData = get().articleData;
            if (!currentArticleData ||
                currentArticleData.title === 'Article being analyzed') {
                const fallbackData = createFallbackArticleData(jobId);
                set({ articleData: fallbackData });
                logger.debug('Using fallback article data after error');
            }
        }
    },

    fetchAnalysisResults: async (jobId: string) => {
        try {
            logger.debug('Job complete, fetching analysis results');

            // Mark as not loading
            set({ isLoading: false });

            // Try to fetch analysis results
            try {
                const results = await apiService.getJobResults(jobId);
                logger.debug('Analysis results received:', results);

                if (results) {
                    // Update state with results
                    set({ analysisData: results });
                } else {
                    logger.warn('No analysis results returned from API');
                    // Fallback to using job status data
                    try {
                        const statusData = await apiService.getJobStatus(jobId);
                        if (statusData && statusData.analysis_results) {
                            logger.debug('Using analysis results from status endpoint');
                            set({
                                analysisData: statusData.analysis_results
                            });
                        } else {
                            throw new Error('No analysis results in status data');
                        }
                    } catch (statusError) {
                        logger.error('Failed to get results from status endpoint:', statusError);
                        set({
                            errorMessage: "Unable to fetch analysis results. Try again later.",
                            jobStatus: "Failed"
                        });
                    }
                }
            } catch (resultsError) {
                logger.error('Failed to fetch from results endpoint:', resultsError);
                // Fallback to using job status data
                try {
                    const statusData = await apiService.getJobStatus(jobId);
                    if (statusData && statusData.analysis_results) {
                        logger.debug('Using analysis results from status endpoint');
                        set({
                            analysisData: statusData.analysis_results
                        });
                    } else {
                        throw new Error('No analysis results in status data');
                    }
                } catch (statusError) {
                    logger.error('Failed to get results from status endpoint:', statusError);
                    set({
                        errorMessage: "Unable to fetch analysis results. Try again later.",
                        jobStatus: "Failed"
                    });
                }
            }

            // Clear the URL input
            get().clearUrlInput();

            // Add to history if we have article data
            if (get().articleData) {
                const { historyItems, articleData } = get();
                const analysis = get().analysisData || {};
                const newHistoryItem: HistoryItem = {
                    id: jobId,
                    url: articleData?.url || "https://example.com/article-new",
                    date: new Date().toISOString(),
                    title: articleData?.title || "Recently Analyzed Article",
                    slant: (analysis as { slant?: { category: string } }).slant?.category || "Unknown"
                };

                // Update history items (avoid duplicates)
                const updatedHistoryItems = historyItems
                    .filter(item => item.id !== jobId)
                    .slice(0, 9); // Keep last 9 items

                // Add new item at the beginning
                updatedHistoryItems.unshift(newHistoryItem);

                // Update state
                set({ historyItems: updatedHistoryItems });

                // Save to local storage
                saveHistoryToLocalStorage(updatedHistoryItems);
            }
        } catch (error) {
            logger.error("Error processing completion:", error);
            set({
                errorMessage: "Error processing analysis results",
                jobStatus: "Failed",
                isLoading: false
            });
        }
    },

    // New action for loading shared analysis
    loadSharedAnalysis: async (jobId: string) => {
        try {
            // Check if jobId is a valid UUID format before proceeding
            const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId);

            if (!isValidUuid) {
                set({
                    errorMessage: `Analysis Not Found. The analysis ID format is invalid.`,
                    jobStatus: 'Failed',
                    isLoading: false,
                    hasStarted: true
                });
                return;
            }

            // Set loading state and reset previous analysis data
            set({
                jobId,
                jobStatus: 'Loading',
                analysisData: null,
                articleData: null,
                errorMessage: null,
                isLoading: true,
                hasStarted: true,
                isFadingIn: true,
            });

            // Reset fade animation
            setTimeout(() => {
                set({ isFadingIn: false });
            }, 300);

            // Check job status first to determine if it exists and its status
            try {
                const statusData = await apiService.getJobStatus(jobId);

                // If job exists but status is 'Failed', handle it specifically
                if (statusData && statusData.status === 'Failed') {
                    const errorMsg = statusData.error_message || "This analysis could not be completed.";
                    set({
                        errorMessage: `This analysis (ID: ${jobId}) could not be completed. Error: ${errorMsg}`,
                        jobStatus: 'Failed',
                        isLoading: false
                    });
                    return;
                }

                // Job exists and is likely completed - load analysis results
                if (statusData && statusData.analysis_results) {
                    // Set analysis data from status response
                    set({
                        analysisData: statusData.analysis_results,
                        jobStatus: statusData.status || 'Complete'
                    });

                    // Set article data directly from the status response
                    if (statusData) {
                        const articleData: ArticleData = {
                            title: statusData.article_title || (statusData.job_details?.title || 'Untitled Article'),
                            source: statusData.article_source_name || (statusData.job_details?.siteName || ''),
                            author: statusData.article_author || (statusData.job_details?.author || ''),
                            imageUrl: statusData.article_preview_image_url || '',
                            description: statusData.job_details?.text
                                ? statusData.job_details.text.substring(0, 100) + '...'
                                : '',
                            url: statusData.url || ''
                        };
                        logger.debug('Setting article data for shared analysis:', articleData);
                        set({ articleData });
                    }
                }
            } catch (statusError: unknown) {
                // Handle 404 specifically for job not found
                if (typeof statusError === 'object' && statusError !== null) {
                    const err = statusError as { status?: number; response?: { status: number } };
                    if (err.status === 404 || (err.response && err.response.status === 404)) {
                        set({
                            errorMessage: `Analysis Not Found. The analysis for ID: ${jobId} could not be retrieved. It may have been removed or the link is incorrect.`,
                            jobStatus: 'Failed',
                            isLoading: false
                        });
                        return;
                    }
                }

                // Handle other status check errors
                logger.error('Error checking job status:', statusError);
                // Set a more specific error when API call fails
                set({
                    errorMessage: `Unable to load analysis. Server error or invalid analysis ID.`,
                    jobStatus: 'Failed',
                    isLoading: false
                });
                return;
            }

            // Set loading state to false after data is loaded
            set({
                jobStatus: 'Complete',
                isLoading: false
            });
        } catch (error) {
            logger.error("Error loading shared analysis:", error);
            set({
                errorMessage: "Failed to load shared analysis. Please check the link and try again.",
                jobStatus: "Failed",
                isLoading: false
            });
        }
    }
}));

// Setup periodic status checks with exponential backoff
let statusCheckInterval: NodeJS.Timeout | null = null;
let timeoutIds: NodeJS.Timeout[] = [];

const setupPeriodicStatusCheck = (jobId: string) => {
    // Clear any existing timeouts
    if (statusCheckInterval) {
        clearTimeout(statusCheckInterval);
        statusCheckInterval = null;
    }

    // Clear all existing timeouts
    timeoutIds.forEach(id => clearTimeout(id));
    timeoutIds = [];

    // Start with checking every 2 seconds, then gradually back off
    let checkCount = 0;
    const maxChecks = 10; // Maximum number of checks before giving up

    const check = () => {
        const store = useAnalysisStore.getState();
        const { jobStatus } = store;

        // Only continue checking if we're still tracking this job and it's not complete/failed
        if (store.jobId === jobId && ['Queued', 'Processing', 'Fetching', 'Analyzing'].includes(jobStatus || '')) {
            logger.debug(`Periodic status check #${checkCount + 1} for job ${jobId}`);
            store.checkJobStatus(jobId);

            checkCount++;

            // If we've reached the maximum number of checks, stop checking
            if (checkCount >= maxChecks) {
                logger.debug(`Reached maximum number of status checks (${maxChecks}) for job ${jobId}`);
                // No need to clear timeouts as they're all scheduled individually
            }
        } else {
            // Job is complete or failed, stop checking
            logger.debug(`Job ${jobId} is ${jobStatus}, stopping periodic checks`);
            // Clear all remaining timeouts
            timeoutIds.forEach(id => clearTimeout(id));
            timeoutIds = [];
        }
    };

    // Initial check after 2 seconds
    statusCheckInterval = setTimeout(() => {
        check();

        // Then set up an interval with exponential backoff
        for (let i = 0; i < maxChecks; i++) {
            // 2s, 4s, 8s, 16s, etc.
            const delay = 2000 * Math.pow(2, i);
            const id = setTimeout(() => {
                check();

                // Remove this timeout from the array
                const index = timeoutIds.indexOf(id);
                if (index > -1) {
                    timeoutIds.splice(index, 1);
                }
            }, delay);

            timeoutIds.push(id);
        }
    }, 2000);
};

// Helper function to handle job updates
const handleJobUpdate = (update: JobUpdate, jobId: string) => {
    logger.debug(`Processing job update for ${jobId}:`, update);
    const currentState = useAnalysisStore.getState();
    const { jobStatus } = currentState;

    // Only update the job status if it's for the current job
    if (jobId !== currentState.jobId) {
        logger.debug(`Update is for job ${jobId} but current job is ${currentState.jobId}, ignoring`);
        return;
    }

    // Update progress message if provided (even if status hasn't changed)
    if (update.progressMessage !== undefined) {
        logger.info(`[PROGRESS] Updating progress message: "${update.progressMessage}"`);
        useAnalysisStore.setState({ progressMessage: update.progressMessage });
        // Log the current state after update
        logger.info(`[PROGRESS] Progress message set in store: "${useAnalysisStore.getState().progressMessage}"`);
    }

    // If the status hasn't changed, ignore the rest of the update (but we already updated progressMessage above)
    if (jobStatus === update.status) {
        logger.debug(`Job status is already ${jobStatus}, ignoring status update`);
        return;
    }

    logger.debug(`Updating job status: ${jobStatus} -> ${update.status}`);

    // Handle status changes
    switch (update.status) {
        case 'Queued':
            // Initial queued state
            useAnalysisStore.setState({
                jobStatus: update.status,
                errorMessage: null,
                isLoading: true
            });
            break;

        case 'Processing':
            // Server is processing the job
            useAnalysisStore.setState({
                jobStatus: update.status,
                errorMessage: null,
                isLoading: true
            });
            break;

        case 'Fetching':
            // Article extraction is happening
            useAnalysisStore.setState({
                jobStatus: update.status,
                errorMessage: null,
                // Only update progressMessage if provided in the update
                ...(update.progressMessage !== undefined && { progressMessage: update.progressMessage }),
                isLoading: true
            });

            // Immediately check status to get article metadata as soon as possible
            setTimeout(() => {
                useAnalysisStore.getState().checkJobStatus(jobId);
            }, 500);
            break;

        case 'Analyzing':
            // LLM analysis is happening
            useAnalysisStore.setState({
                jobStatus: update.status,
                errorMessage: null,
                // Only update progressMessage if provided in the update
                ...(update.progressMessage !== undefined && { progressMessage: update.progressMessage }),
                isLoading: true
            });

            // Check status again to see if we have updated article metadata
            setTimeout(() => {
                useAnalysisStore.getState().checkJobStatus(jobId);
            }, 500);
            break;

        case 'Complete':
            // Set status and trigger data fetch
            useAnalysisStore.setState({
                jobStatus: update.status,
                progressMessage: null, // Clear progress message on completion
                isLoading: false
            });

            // Immediately do a full status check to get ALL data
            setTimeout(() => {
                useAnalysisStore.getState().checkJobStatus(jobId);
                // Also explicitly get analysis results
                useAnalysisStore.getState().fetchAnalysisResults(jobId);
            }, 100);
            break;

        case 'Failed':
            useAnalysisStore.setState({
                errorMessage: update.error || update.errorMessage || "An unknown error occurred during analysis",
                isLoading: false,
                jobStatus: update.status
            });
            break;

        default:
            logger.warn(`Unknown job status received: ${update.status}`);
            break;
    }
};

// Clean up on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        socketService.unsubscribeFromJob();
        socketService.disconnectSocket();
    });
}

// Generate article data based on job status when we don't have it from the backend
// The title is intentionally set to 'Article being analyzed' so our UI can distinguish
// between meaningful article data and placeholder data
const createFallbackArticleData = (jobId: string, url: string = ''): ArticleData => {
    return {
        title: 'Article being analyzed', // This specific title is used as a marker in the UI
        source: '',
        author: '',
        imageUrl: '', // Intentionally empty to keep showing skeleton
        description: 'Analysis in progress...',
        url: url || `https://example.com/article-${jobId.substring(0, 8)}`
    };
};

export default useAnalysisStore; 