export type JobStatus = 'Queued' | 'Processing' | 'Fetching' | 'Analyzing' | 'Complete' | 'Failed';

/** A row of the Supabase `jobs` table */
export interface Job {
  id: string;
  url: string;
  normalized_url: string | null;
  language: string;
  status: JobStatus;
  error_message: string | null;
  /** An `Analysis` (src/server/analysis.ts); older rows hold the first prompt version's shape */
  analysis_results: unknown;
  /** Fetch metadata; older rows also hold the full legacy article payload */
  job_details: Record<string, unknown> | null;
  article_title: string | null;
  article_text: string | null;
  article_author: string | null;
  article_source_name: string | null;
  article_canonical_url: string | null;
  article_preview_image_url: string | null;
  article_publication_date: string | null;
  created_at: string;
  updated_at: string | null;
}

/** Article content fetched and extracted by Firecrawl */
export interface FetchedArticle {
  title: string | null;
  text: string | null;
  html: string | null;
  author: string | null;
  date: string | null;
  siteName: string | null;
  /** Final URL after redirects (the snapshot URL for archive fetches) */
  url: string;
  canonicalUrl?: string;
  language?: string;
  fetchStrategy: 'firecrawl';
  isArchiveContent: boolean;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';
export type LogArgs = unknown[];
