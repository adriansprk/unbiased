import axios, { AxiosResponse } from 'axios';
import { AnalysisData } from '../types/analysis';
import { ArticleData } from '@/components/ArticlePreview';
import logger from '@/utils/logger';

// Create axios instance with base URL from environment variable
const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Define response types
export interface SubmitNewJobResponse {
    message: string;
    jobId: string;
    metadata?: {
        title?: string;
        description?: string;
        image?: string;
        authors?: string[];
        siteName?: string;
        url: string;
        favicon?: string;
    };
}

export interface SubmitExistingJobResponse {
    jobId: string;
    url: string;
    language: string;
    existingAnalysis: true;
    analysis_results: AnalysisData;
    article_title?: string | null;
    article_author?: string | null;
    article_source_name?: string | null;
    article_canonical_url?: string | null;
    article_preview_image_url?: string | null;
    article_publication_date?: string | null;
    article_text?: string | null;
}

export type SubmitResponse = SubmitNewJobResponse | SubmitExistingJobResponse;

// API functions
export const api = {
    // Submit a URL for analysis
    submitUrl: async (url: string, locale: string = 'en', turnstileToken?: string): Promise<AxiosResponse<SubmitResponse>> => {
        interface SubmitPayload {
            url: string;
            language: string;
            'cf-turnstile-response'?: string;
        }

        // Debug: log the incoming parameters
        logger.debug('[apiClient] submitUrl called with:', {
            url,
            locale,
            turnstileTokenLength: turnstileToken ? turnstileToken.length : 0,
            turnstileTokenPreview: turnstileToken ? `${turnstileToken.substring(0, 15)}...` : 'none',
            isDevelopment: process.env.NODE_ENV === 'development'
        });

        const payload: SubmitPayload = {
            url,
            language: locale
        };

        // In development mode, we can skip the token
        const skipToken = process.env.NODE_ENV === 'development';

        // Add turnstile token if provided and not in development mode
        if (turnstileToken && !skipToken) {
            if (turnstileToken.length < 10) {
                logger.warn(`Suspicious turnstile token length: ${turnstileToken.length}, might be invalid`);
                // Still add it so the backend can properly validate and return an error
            }

            logger.info(`Adding turnstile token to payload (length: ${turnstileToken.length})`);
            payload['cf-turnstile-response'] = turnstileToken;

            // Verify the token is not empty
            if (turnstileToken.trim() === '') {
                logger.warn('Empty turnstile token provided (whitespace only)');
            }
        } else if (!skipToken) {
            // Not in development and no token provided
            logger.warn('No turnstile token provided for URL submission in production environment');
            // Could throw an error here instead, but let the backend handle the validation
        }

        // Log the final payload for debugging
        logger.debug('Submit payload keys:', Object.keys(payload));

        try {
            // Add a custom header to track this request
            const response = await apiClient.post<SubmitResponse>('/api/submit', payload, {
                headers: {
                    'X-Client-Debug': 'true'
                }
            });

            logger.info(`Submit request successful, status: ${response.status}`);
            return response; // Return the full response object, not just data
        } catch (error) {
            logger.error('Submit request failed:', error);

            // Check for specific error responses
            if (axios.isAxiosError(error) && error.response) {
                // If we got a 403 status, it's likely a Turnstile validation error
                if (error.response.status === 403) {
                    logger.error('Turnstile verification failed on server:', error.response.data);
                }
            }

            throw error; // Re-throw to let the caller handle it
        }
    },

    // Get the status of a job
    getJobStatus: async (jobId: string) => {
        const response = await apiClient.get(`/api/status/${jobId}`);
        return response.data;
    },

    // Get preview information about an article being analyzed
    getJobPreview: async (jobId: string): Promise<ArticleData & { success: boolean }> => {
        try {
            // First try the dedicated preview endpoint
            const response = await apiClient.get(`/api/preview/${jobId}`);
            return response.data;
        } catch {
            logger.info('Preview endpoint failed, falling back to status endpoint');
            try {
                // Fall back to the status endpoint
                const statusResponse = await apiClient.get(`/api/status/${jobId}`);
                const jobDetails = statusResponse.data.job_details || {};

                // Log the detailed structure to debug
                logger.debug('STATUS ENDPOINT RESPONSE:', statusResponse.data);
                logger.debug('JOB_DETAILS FOUND:', !!statusResponse.data.job_details);

                // Log specific fields we care about
                logger.debug('DIFFBOT IMAGE DATA:', {
                    hasImages: !!jobDetails.images && Array.isArray(jobDetails.images) && jobDetails.images.length > 0,
                    firstImage: jobDetails.images && jobDetails.images.length > 0 ? jobDetails.images[0] : null,
                    title: jobDetails.title,
                    author: jobDetails.author
                });

                // Extract image URL properly according to Diffbot API documentation
                // Images is an array of objects with properties: url, title, alt, height, width, etc.
                let imageUrl = '';
                if (jobDetails.images && Array.isArray(jobDetails.images) && jobDetails.images.length > 0) {
                    // Try to find the primary image first (if marked as primary)
                    const primaryImage = jobDetails.images.find((img: { primary?: boolean, url?: string }) => img.primary === true);
                    if (primaryImage && primaryImage.url) {
                        imageUrl = primaryImage.url;
                    } else if (jobDetails.images[0].url) {
                        // Otherwise use the first image
                        imageUrl = jobDetails.images[0].url;
                    }
                }

                return {
                    success: true,
                    title: jobDetails.title || 'Article being analyzed',
                    source: jobDetails.siteName || '',
                    author: jobDetails.author || '',
                    imageUrl: imageUrl,
                    description: jobDetails.text ? jobDetails.text.substring(0, 100) + '...' : '',
                    url: statusResponse.data.url || ''
                };
            } catch (statusError) {
                logger.error('Status fallback also failed:', statusError);
                // Return a minimal object to prevent UI errors
                return {
                    success: false,
                    title: 'Article being analyzed',
                    source: '',
                    author: '',
                    imageUrl: '',
                    description: 'Analysis in progress...',
                    url: ''
                };
            }
        }
    },

    // Get the results of a completed job
    getJobResults: async (jobId: string): Promise<AnalysisData> => {
        try {
            // Validate jobId to prevent bad requests
            if (!jobId || typeof jobId !== 'string' || jobId.length < 36) {
                logger.error(`Invalid job ID format: ${jobId}`);
                throw new Error('Invalid job ID format');
            }

            // First try the dedicated results endpoint
            logger.info(`Fetching results for job ${jobId} from results endpoint`);
            const response = await apiClient.get(`/api/results/${jobId}`);
            logger.debug(`Results endpoint response for job ${jobId}:`, response.data);

            // The results endpoint returns a different structure than the status endpoint
            // It has { jobId, url, analysis, created_at, completed_at }
            if (response.data && response.data.analysis) {
                logger.info(`Successfully retrieved analysis data from results endpoint for job ${jobId}`);
                return response.data.analysis;
            } else {
                logger.error('Unexpected response format from results endpoint:', response.data);
                throw new Error('Unexpected response format from results endpoint');
            }
        } catch (error) {
            logger.info(`Results endpoint failed for job ${jobId}, falling back to status endpoint:`, error);
            try {
                // Fall back to the status endpoint
                logger.info(`Fetching results for job ${jobId} from status endpoint`);
                const statusResponse = await apiClient.get(`/api/status/${jobId}`);
                logger.debug(`Status endpoint response for job ${jobId}:`, statusResponse.data);

                if (statusResponse.data.analysis_results) {
                    logger.info(`Successfully retrieved analysis data from status endpoint for job ${jobId}`);
                    return statusResponse.data.analysis_results;
                }

                // If we get here, the job exists but doesn't have analysis results yet
                if (statusResponse.data.status === 'Complete') {
                    throw new Error('Job is complete but has no analysis results');
                } else {
                    throw new Error(`Job status is ${statusResponse.data.status} - not yet complete`);
                }
            } catch (statusError) {
                logger.error(`Both results and status endpoints failed for job ${jobId}:`, statusError);
                throw new Error('Failed to retrieve analysis results. The analysis may no longer exist on the server.');
            }
        }
    },

    // Get history of completed jobs
    getHistory: async () => {
        const response = await apiClient.get('/api/history');
        return response.data;
    },

    // Health check
    healthCheck: async () => {
        const response = await apiClient.get('/api/health');
        return response.data;
    },
};

export default api; 