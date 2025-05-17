// Job status types
export type JobStatus = 'Queued' | 'Processing' | 'Fetching' | 'Analyzing' | 'Complete' | 'Failed';

// Job model
export interface Job {
    id: string;
    url: string;
    status: JobStatus;
    language: string;
    job_details?: JobDetails | null;
    analysis_results?: AnalysisResults | null;
    error_message?: string | null;
    normalized_url?: string | null;
    created_at: string;
    updated_at: string;
    // New dedicated article columns
    article_title?: string | null;
    article_text?: string | null;
    article_author?: string | null;
    article_source_name?: string | null;
    article_preview_image_url?: string | null;
    article_publication_date?: string | null;
    article_canonical_url?: string | null;
}

// Fetch strategy type
export type FetchStrategy = 'direct' | 'archive.is';

// Job details (from Diffbot)
export interface JobDetails {
    title?: string | null;
    text?: string | null;
    html?: string | null;
    author?: string | null;
    date?: string | null;
    siteName?: string | null;
    images?: any[] | null;
    url?: string | null;
    fetchStrategy?: FetchStrategy;
    originalUrl?: string;
    isArchiveContent?: boolean; // Flag to indicate content was fetched from Archive.is
    [key: string]: any;
}

// Image details from Diffbot
export interface ImageDetails {
    url?: string | null;
    primary?: boolean;
    width?: number;
    height?: number;
    isArchiveImage?: boolean; // Flag to indicate this is an archive.is image
    originalUrl?: string; // Original archive.is URL
    [key: string]: any;
}

// Analysis results (from OpenAI)
export interface AnalysisResults {
    claims: string;
    report: string;
    slant: string;
}

// History item for frontend
export interface HistoryItem {
    id: string;
    url: string;
    headline?: string | null;
    slant?: string | null;
    created_at: string;
    article_preview_image_url?: string | null; // New field for history
}

// WebSocket event types
export interface SocketSubscribePayload {
    jobId: string;
}

export interface JobUpdatePayload {
    jobId: string;
    status: JobStatus;
    results?: AnalysisResults;
    error?: string;
}

// API responses
export interface JobSubmitResponse {
    jobId: string;
}

export interface JobResultsResponse {
    jobId: string;
    url: string;
    analysis: AnalysisResults;
    created_at: string;
    completed_at: string;
}

export interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: string;
    };
}

export interface JobStatusResponse extends Omit<Job, 'job_details'> {
    // Include job_details for article preview data
    job_details?: JobDetails | null;
    // Explicitly include article preview fields from Job
    article_title?: string | null;
    article_text?: string | null;
    article_author?: string | null;
    article_source_name?: string | null;
    article_preview_image_url?: string | null;
    article_publication_date?: string | null;
    article_canonical_url?: string | null;
    // Include normalized_url for sharing functionality
    normalized_url?: string | null;
}

export type HistoryResponse = HistoryItem[]; 