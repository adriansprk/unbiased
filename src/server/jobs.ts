import type { ArticleData } from '@/components/ArticlePreview';
import type { AnalysisData } from '@/types/analysis';
import { createJob, findJobsForArticle, JobState } from './db';
import { CONTENT_UNAVAILABLE } from './pipeline';
import { Job } from './types';
import { isPaywalledDomain, normalizeUrl } from './urls';

/** A job that hasn't progressed for this long was cut off (deploy, restart) and counts as failed */
const STALE_AFTER_MS = 10 * 60 * 1000;

export function isStale(job: Pick<JobState, 'status' | 'created_at' | 'updated_at'>, now = Date.now()): boolean {
  if (job.status === 'Complete' || job.status === 'Failed') return false;
  return now - Date.parse(job.updated_at ?? job.created_at) > STALE_AFTER_MS;
}

/**
 * Returns the job for this article and language: a finished analysis or one still running
 * is shared with everyone who asks; otherwise a new job is created (isNew).
 */
export async function findOrCreateJob(url: string, language: string): Promise<{ id: string; isNew: boolean }> {
  const normalizedUrl = normalizeUrl(url);

  // ponytail: check-then-insert, so two submissions within the same moment can both create a job.
  // A partial unique index on (normalized_url, language) for unfinished jobs would close that gap.
  const existing = (await findJobsForArticle(normalizedUrl, language)).find(
    job => job.status === 'Complete' || !isStale(job)
  );
  if (existing) return { id: existing.id, isNew: false };

  const job = await createJob({ url, normalized_url: normalizedUrl, language });
  return { id: job.id, isNew: true };
}

export type Failure = 'contentUnavailable' | 'timedOut' | 'failed';

export interface JobView {
  id: string;
  status: 'Queued' | 'Fetching' | 'Analyzing' | 'Complete' | 'Failed';
  /** Still running: the page keeps refreshing */
  pending: boolean;
  failure: Failure | null;
  /** Read from an archive snapshot (drives the progress message) */
  paywalled: boolean;
  startedAt: string;
  article: ArticleData | null;
  analysis: AnalysisData | null;
}

export function toJobView(job: Job, now = Date.now()): JobView {
  const legacy = (job.job_details ?? {}) as Record<string, unknown>;
  const str = (value: unknown) => (typeof value === 'string' && value ? value : undefined);

  let status: JobView['status'] = job.status === 'Processing' ? 'Fetching' : job.status;
  let failure: Failure | null = null;
  if (isStale(job, now)) {
    status = 'Failed';
    failure = 'timedOut';
  } else if (status === 'Failed') {
    failure = job.error_message?.startsWith(CONTENT_UNAVAILABLE) ? 'contentUnavailable' : 'failed';
  }

  const title = job.article_title || str(legacy.title);
  const imageUrl = unwrapLegacyProxy(job.article_preview_image_url || legacyImage(legacy.images));
  const article: ArticleData | null =
    title || imageUrl
      ? {
          title,
          imageUrl,
          author: job.article_author || str(legacy.author),
          source: job.article_source_name || str(legacy.siteName),
          url: job.article_canonical_url || str(legacy.url) || job.url,
        }
      : null;

  return {
    id: job.id,
    status,
    pending: status !== 'Complete' && status !== 'Failed',
    failure,
    paywalled: isPaywalledDomain(job.url),
    startedAt: job.created_at,
    article,
    analysis: status === 'Complete' ? (job.analysis_results as unknown as AnalysisData) : null,
  };
}

/** Older rows store images behind the retired backend proxy (/api/image-proxy?url=…) */
function unwrapLegacyProxy(imageUrl: string | null | undefined): string | undefined {
  if (!imageUrl) return undefined;
  try {
    const parsed = new URL(imageUrl);
    if (parsed.pathname === '/api/image-proxy') {
      return unwrapLegacyProxy(parsed.searchParams.get('url'));
    }
  } catch {
    return undefined;
  }
  return imageUrl;
}

/** Legacy Diffbot rows keep images as [{ url, primary, originalUrl }] */
function legacyImage(images: unknown): string | undefined {
  if (!Array.isArray(images)) return undefined;
  const list = images as Array<{ url?: string | null; originalUrl?: string; primary?: boolean }>;
  const pick = list.find(img => img?.primary) ?? list[0];
  return pick?.url || pick?.originalUrl || undefined;
}
