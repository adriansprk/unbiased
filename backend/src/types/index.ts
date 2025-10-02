// ====== CORE TYPES ======

// Job status types
export type JobStatus = 'Queued' | 'Processing' | 'Fetching' | 'Analyzing' | 'Complete' | 'Failed';

// Fetch strategy type
export type FetchStrategy = 'direct' | 'archive.is' | 'firecrawl';

// Log level types
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';
export type LogArgs = unknown[];

// Error types for better error handling
export enum ErrorType {
  DATABASE = 'DATABASE_ERROR',
  DIFFBOT = 'DIFFBOT_ERROR',
  OPENAI = 'OPENAI_ERROR',
  GEMINI = 'GEMINI_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  SOCKET = 'SOCKET_ERROR',
  NETWORK = 'NETWORK_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
  AUTH = 'AUTHENTICATION_ERROR',
}

// ====== DATA MODELS ======

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

// Image details from Diffbot
export interface ImageDetails {
  url?: string | null;
  primary?: boolean;
  width?: number;
  height?: number;
  isArchiveImage?: boolean; // Flag to indicate this is an archive.is image
  originalUrl?: string; // Original archive.is URL
  diffbotId?: string;
  title?: string;
  anchorText?: string;
  xpath?: string;
  size?: number;
  naturalHeight?: number;
  naturalWidth?: number;
  displayHeight?: number;
  displayWidth?: number;
  thumbnail?: string;
  mediaType?: string;
  contentType?: string;
}

// Diffbot API response structure
export interface DiffbotArticleObject {
  title?: string;
  text?: string;
  html?: string;
  author?: string;
  date?: string;
  siteName?: string;
  images?: ImageDetails[];
  url?: string;
  canonicalUrl?: string;
  publisherCountry?: string;
  publisherRegion?: string;
  language?: string;
  sentiment?: number;
  diffbotUri?: string;
  type?: string;
  resolvedPageUrl?: string;
  pageUrl?: string;
  humanLanguage?: string;
  numPages?: number;
  nextPages?: string[];
  nextPage?: string;
  tags?: Array<{
    label: string;
    count: number;
    prevalence: number;
    id: number;
    type: string;
    uri: string;
  }>;
  entities?: Array<{
    name: string;
    type: string;
    sentiment: number;
    salience: number;
    entityId: string;
    summary: string;
  }>;
  breadcrumb?: Array<{
    name: string;
    link: string;
  }>;
  videos?: Array<{
    url: string;
    title: string;
    primary: boolean;
    duration: number;
    size: number;
    naturalHeight: number;
    naturalWidth: number;
    diffbotId: string;
  }>;
  links?: Array<{
    url: string;
    text: string;
    linkType: string;
  }>;
}

export interface DiffbotResponse {
  objects: DiffbotArticleObject[];
  request: {
    pageUrl: string;
    api: string;
    version: number;
    options: Record<string, unknown>;
  };
  humanLanguage?: string;
  objects_on_page?: number;
}

// Job details (from Diffbot) - more strictly typed
export interface JobDetails {
  title?: string | null;
  text?: string | null;
  html?: string | null;
  author?: string | null;
  date?: string | null;
  siteName?: string | null;
  images?: ImageDetails[] | null;
  url?: string | null;
  fetchStrategy?: FetchStrategy;
  originalUrl?: string;
  isArchiveContent?: boolean; // Flag to indicate content was fetched from Archive.is
  canonicalUrl?: string;
  publisherCountry?: string;
  publisherRegion?: string;
  language?: string;
  sentiment?: number;
  diffbotUri?: string;
  type?: string;
  resolvedPageUrl?: string;
  pageUrl?: string;
  humanLanguage?: string;
  numPages?: number;
  nextPages?: string[];
  nextPage?: string;
  tags?: Array<{
    label: string;
    count: number;
    prevalence: number;
    id: number;
    type: string;
    uri: string;
  }>;
  entities?: Array<{
    name: string;
    type: string;
    sentiment: number;
    salience: number;
    entityId: string;
    summary: string;
  }>;
  breadcrumb?: Array<{
    name: string;
    link: string;
  }>;
  videos?: Array<{
    url: string;
    title: string;
    primary: boolean;
    duration: number;
    size: number;
    naturalHeight: number;
    naturalWidth: number;
    diffbotId: string;
  }>;
  links?: Array<{
    url: string;
    text: string;
    linkType: string;
  }>;
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
  status?: JobStatus;
  headline?: string | null;
  slant?: string | null;
  created_at: string;
  article_preview_image_url?: string | null;
  article_title?: string | null;
  job_details?: JobDetails | null;
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
  progressMessage?: string | null; // Optional detailed progress message for user visibility (null clears the message)
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

// ====== OPENAI TYPES ======

// OpenAI API response types
export interface OpenAIChoiceMessage {
  role: 'assistant' | 'user' | 'system';
  content: string | null;
}

export interface OpenAIChoice {
  index: number;
  message: OpenAIChoiceMessage;
  finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter' | 'tool_calls' | null;
}

export interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage?: OpenAIUsage;
  system_fingerprint?: string;
}

// ====== SOCKET.IO TYPES ======

// Socket.IO event data types
export interface SocketEventData {
  roomId?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface JobSubscriptionData extends SocketEventData {
  jobId: string;
}

export interface JobUpdateData extends SocketEventData {
  jobId: string;
  status: JobStatus;
  results?: AnalysisResults;
  error?: string;
}

// ====== WORKER TYPES ======

// Background worker job data
export interface WorkerJobData {
  jobId: string;
  url: string;
  language: string;
  attempt?: number;
}

// Worker job processing options
export interface WorkerJobOptions {
  attempts?: number;
  delay?: number;
  removeOnComplete?: number;
  removeOnFail?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
}

// ====== UTILITY TYPES ======

// Generic API response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

// Database query result type
export interface DatabaseQueryResult<T = unknown> {
  data: T | null;
  error: Error | null;
  count?: number;
}

// Supabase response type
export interface SupabaseResponse<T = unknown> {
  data: T | null;
  error: {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
  } | null;
  count?: number;
  status?: number;
  statusText?: string;
}

// Extracted content from Diffbot for optimized storage
export interface ExtractedArticleData {
  article_title: string | null;
  article_text: string | null;
  article_author: string | null;
  article_source_name: string | null;
  article_canonical_url: string | null;
  article_preview_image_url: string | null;
  article_publication_date: string | null;
}

// Minimal metadata for job_details after optimization
export interface MinimalJobMetadata {
  fetchStrategy?: FetchStrategy;
  originalUrl?: string;
  isArchiveContent?: boolean;
  diffbotUri?: string;
  type?: string;
  publisherCountry?: string;
  publisherRegion?: string;
  language?: string;
  sentiment?: number;
  humanLanguage?: string;
  numPages?: number;
  [key: string]: unknown;
}

// ====== QUEUE TYPES ======

// Interface for analysis job data
export interface AnalysisJobData {
  jobId: string;
  url: string;
  language: string;
}

// ====== CONFIGURATION TYPES ======

// Environment configuration
export interface DatabaseConfig {
  url: string;
  serviceRoleKey: string;
}

export interface RedisConfig {
  url: string;
}

export interface ApiConfig {
  port: number;
  frontendUrl: string;
  backendUrl: string;
}

export interface AppConfig {
  features: {
    reuseExistingAnalysis: boolean;
  };
  api: ApiConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
}
