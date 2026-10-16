import { updateJob } from './db';
import { ContentUnavailableError, fetchContentFromFirecrawl, newestArchiveUrl } from './firecrawl';
import { analyzeArticle } from './llm';
import logger from './logger';
import { extractUrlMetadata, UrlMetadata } from './metadata';
import { isArchiveUrl, isPaywalledDomain } from './urls';

export const CONTENT_UNAVAILABLE = 'CONTENT_UNAVAILABLE_ERROR';
export const ANALYSIS_FAILED = 'ANALYSIS_ERROR';

/**
 * Runs one analysis end to end and records every step on the job row:
 * quick preview → fetch (archive snapshot for paywalled domains) → LLM → Complete.
 * Never throws; failures are stored on the row as `<ERROR_TYPE>: <message>`.
 */
export async function runAnalysis(job: { id: string; url: string; language: string }): Promise<void> {
  const { id, url, language } = job;

  try {
    // Preview from the publisher's meta tags so the page shows the article while we work
    const meta: UrlMetadata | null = await extractUrlMetadata(url).catch(() => null);
    await updateJob(id, {
      status: 'Fetching',
      article_title: meta?.title || null,
      article_preview_image_url: meta?.image || null,
      article_author: meta?.authors?.[0] || null,
      article_source_name: meta?.siteName || null,
    });

    // Paywalled publishers only serve a teaser, so read their newest archive.today snapshot
    const paywalled = !isArchiveUrl(url) && isPaywalledDomain(url);
    const article = await fetchContentFromFirecrawl(paywalled ? newestArchiveUrl(url) : url);

    const title = article.title || meta?.title || '';
    await updateJob(id, {
      status: 'Analyzing',
      article_title: title || null,
      article_text: article.text,
      article_author: meta?.authors?.[0] || article.author,
      article_source_name: meta?.siteName || article.siteName,
      article_publication_date: article.date,
      job_details: {
        fetchStrategy: article.fetchStrategy,
        isArchiveContent: article.isArchiveContent,
        fetchedUrl: article.url,
      },
    });

    const results = await analyzeArticle(title, article.text || '', language);
    await updateJob(id, { status: 'Complete', analysis_results: results });
    logger.info(`Job ${id} complete`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const type = error instanceof ContentUnavailableError ? CONTENT_UNAVAILABLE : ANALYSIS_FAILED;
    logger.error(`Job ${id} failed: ${type}: ${message}`);
    await updateJob(id, { status: 'Failed', error_message: `${type}: ${message}` }).catch(e =>
      logger.error(`Could not mark job ${id} as failed:`, e)
    );
  }
}
