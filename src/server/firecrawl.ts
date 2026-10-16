import Firecrawl from '@mendable/firecrawl-js';
import config from './config';
import { FetchedArticle } from './types';
import logger from './logger';
import { isArchiveUrl } from './urls';
import fs from 'fs';
import path from 'path';
import { extractArticleContent } from './contentExtractor';

/**
 * Type definitions for Firecrawl API response
 */
interface FirecrawlMetadata {
  sourceURL?: string;
  url?: string;
  statusCode?: number;
  canonicalUrl?: string;
  language?: string;
  keywords?: string;
  title?: string;
  ogSiteName?: string;
  publishedTime?: string;
}

interface FirecrawlExtractData {
  title?: string;
  author?: string;
  publishDate?: string;
  siteName?: string;
}

interface FirecrawlResponse {
  markdown?: string;
  html?: string;
  extract?: FirecrawlExtractData;
  metadata?: FirecrawlMetadata;
}

/**
 * Below this many words the page is a paywall teaser, bot wall or error page, not an article.
 * ponytail: word-count heuristic; add publisher-specific paywall markers if teasers slip through
 */
const MIN_ARTICLE_WORDS = 150;

/**
 * The page was fetched fine but holds no usable article (no snapshot, paywall teaser, bot wall).
 * Retrying won't help, so callers should fail the job instead.
 */
export class ContentUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentUnavailableError';
  }
}

/**
 * archive.today URL that redirects to the newest snapshot of `url` (404 when none exists)
 */
export function newestArchiveUrl(url: string): string {
  // Strip query params and fragments for better archive.today matching
  return `https://archive.ph/newest/${url.replace(/[?#].*$/, '')}`;
}

/**
 * Maximum number of retry attempts for API calls
 */
const MAX_RETRIES = 3;

/**
 * Base delay (in ms) for exponential backoff
 */
const BASE_DELAY = 1000;

/**
 * Normalizes title/subtitle by replacing newlines with colons and collapsing whitespace
 */
function normalizeLineTitle(s?: string): string {
  return (s || "").replace(/\s*\n+\s*/g, ": ").replace(/\s+/g, " ").trim();
}

/**
 * Saves extraction sample to disk for debugging (only in development)
 */
function saveSampleExtraction(url: string, response: FirecrawlResponse, jobDetails: FetchedArticle): void {
  if (process.env.NODE_ENV === 'production') {
    return; // Don't save samples in production
  }

  try {
    const outputDir = path.resolve(process.cwd(), 'extracted-content-samples');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const urlHost = new URL(url).hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Save JSON with metadata
    const jsonFilename = `${urlHost}_${timestamp}.json`;
    const jsonFilepath = path.join(outputDir, jsonFilename);

    const contentToSave = {
      url: url,
      extractedAt: new Date().toISOString(),
      rawResponse: {
        markdown: response.markdown?.substring(0, 5000), // Truncate to avoid huge files
        extract: response.extract,
        metadata: response.metadata,
      },
      processedJobDetails: {
        title: jobDetails.title,
        author: jobDetails.author,
        siteName: jobDetails.siteName,
        date: jobDetails.date,
        textLength: jobDetails.text?.length || 0,
        textPreview: jobDetails.text?.substring(0, 500),
        fetchStrategy: jobDetails.fetchStrategy,
        isArchiveContent: jobDetails.isArchiveContent,
      }
    };

    fs.writeFileSync(jsonFilepath, JSON.stringify(contentToSave, null, 2), 'utf8');
    logger.debug(`Saved extraction sample to: ${jsonFilepath}`);

    // Save raw HTML if available
    if (response.html) {
      const htmlFilename = `${urlHost}_${timestamp}.html`;
      const htmlFilepath = path.join(outputDir, htmlFilename);
      fs.writeFileSync(htmlFilepath, response.html, 'utf8');
      logger.debug(`Saved raw HTML to: ${htmlFilepath}`);
    }
  } catch (error) {
    // Don't fail the request if sample saving fails
    logger.warn(`Failed to save extraction sample: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetches article content from Firecrawl API with improved extraction for reliable title/subtitle/body extraction
 * Optimized for archive snapshots and various publication formats
 *
 * @param url - The URL of the article to extract content from
 * @returns Extracted content details from Firecrawl
 * @throws Error if API call fails after retries
 */
export async function fetchContentFromFirecrawl(url: string): Promise<FetchedArticle> {
  const apiKey = config.firecrawl?.apiKey;

  if (!apiKey) {
    throw new Error('Firecrawl API key is not configured');
  }

  // Initialize Firecrawl client
  const firecrawl = new Firecrawl({ apiKey });

  // Determine if this is an archive URL
  const isArchive = isArchiveUrl(url);

  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      logger.info(`Firecrawl API call attempt ${attempt + 1}/${MAX_RETRIES}:`);
      logger.info(`- URL: ${url}`);

      // For Archive URLs, we want the RAW HTML to pass to Readability
      // Firecrawl's filtering can interfere with Readability's algorithm
      // For non-archive URLs, we can use Firecrawl's intelligent extraction
      const isArchiveContent = isArchive;

      // Enhanced scraping configuration: request both HTML and markdown
      // HTML is used for Readability extraction, markdown as fallback
      // Note: TypeScript types for Firecrawl SDK may not include all options,
      // but they're supported by the API. We use 'any' to bypass type checking.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scrapeOptions: any = isArchiveContent ? {
        // For Archive.is: Get RAW HTML with minimal filtering
        // Let Readability do ALL the extraction work
        formats: ["html", "markdown"],
        onlyMainContent: false,
        removeBase64Images: true,
        waitFor: 800,
      } : {
        // For original URLs: Use Firecrawl's intelligent filtering
        formats: ["html", "markdown"],
        includeTags: ["article", "main", "#content", "h1", "h2", "h3", "p", "div", "section", "li", "blockquote"],
        excludeTags: ["nav", "footer", "#HEADER", "figcaption"],
        removeBase64Images: true,
        waitFor: 800,
      };

      logger.debug(`Scrape options: ${JSON.stringify(scrapeOptions)}`);

      const response = await firecrawl.scrape(url, scrapeOptions) as unknown as FirecrawlResponse;

      logger.info(`Firecrawl API call successful on attempt ${attempt + 1}`);
      logger.debug(`Response type: ${typeof response}`);

      if (response?.metadata?.statusCode === 404) {
        throw new ContentUnavailableError(
          isArchive ? 'No archived copy of this article exists yet' : 'Article page not found (404)'
        );
      }

      // Validate that we have content
      if (!response || (!response.html && !response.markdown)) {
        throw new Error('Invalid response from Firecrawl API: No content found');
      }

      // Stage 1: Try Readability extraction on HTML first (preferred - outlet-agnostic)
      let extractedContent = null;
      if (response.html) {
        logger.debug('Attempting Readability extraction from HTML');
        extractedContent = extractArticleContent(response.html, url, {
          trimTail: true,
          trimSentinels: true,
        });
      }

      // Stage 2: Fall back to markdown if Readability fails
      const bodyText = extractedContent?.bodyText || response.markdown || '';
      let title = extractedContent?.title || response.extract?.title || response.metadata?.title || '';
      const author = extractedContent?.byline || response.extract?.author || null;
      const siteName = extractedContent?.siteName || response.extract?.siteName || response.metadata?.ogSiteName || null;
      const publishDate = response.extract?.publishDate || response.metadata?.publishedTime || null;

      // Clean up the title (remove site suffix like "- DER SPIEGEL", "- Politik - SZ.de")
      // This is generic enough to apply to any publication
      if (title) {
        title = normalizeLineTitle(title);
        // Remove common site name suffixes and category prefixes
        title = title
          .replace(/^(Verteidigungspolitik|Politik|Wirtschaft|Sport|Kultur|News|Opinion)\s*:\s*/i, '') // Remove category prefix
          .replace(/\s*[-–—|]\s*(Politik|Wirtschaft|Sport|Kultur|News)\s*[-–—|]\s*\w+\.de.*$/i, '')
          .replace(/\s*[-–—|]\s*(DER SPIEGEL|SPIEGEL|archive\.ph|SZ\.de|The Guardian|CNN|BBC).*$/i, '')
          .trim();
      }

      const wordCount = (bodyText.match(/\S+/g) || []).length;
      if (wordCount < MIN_ARTICLE_WORDS) {
        throw new ContentUnavailableError(
          `Only ${wordCount} words of article text available (paywall preview or blocked page)`
        );
      }

      // Log the two most important extracts: title and body text
      logger.info(`Successfully extracted content with title: "${title}"`);
      logger.info(`Body text length: ${bodyText.length} characters`);
      if (author) {
        logger.info(`Author: "${author}"`);
      }
      if (siteName) {
        logger.info(`Site name: "${siteName}"`);
      }

      const jobDetails: FetchedArticle = {
        title: title || null,
        text: bodyText || null,
        html: extractedContent?.bodyHtml || null,
        author: author || null,
        date: publishDate || null,
        siteName: siteName || null,
        url: response.metadata?.url || response.metadata?.sourceURL || url,
        canonicalUrl: response.metadata?.canonicalUrl || undefined,
        language: response.metadata?.language || undefined,
        fetchStrategy: 'firecrawl',
        isArchiveContent: isArchive,
      };

      // Save extraction sample in development mode
      saveSampleExtraction(url, response, jobDetails);

      return jobDetails;
    } catch (error) {
      if (error instanceof ContentUnavailableError) {
        throw error;
      }

      attempt++;

      // Enhanced error logging with full details
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`Firecrawl API call failed (attempt ${attempt}/${MAX_RETRIES}):`);
      logger.error(`- Error: ${errorMsg}`);

      // Log full error object for debugging
      if (error && typeof error === 'object') {
        logger.debug(`- Full error object: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
      }

      // If we've exceeded max retries, throw the error
      if (attempt >= MAX_RETRIES) {
        throw new Error(`Firecrawl API error after ${MAX_RETRIES} attempts: ${errorMsg}`);
      }

      // Otherwise wait with exponential backoff before retrying
      const delayMs = BASE_DELAY * Math.pow(2, attempt - 1);
      logger.info(`Retrying Firecrawl API call (${attempt}/${MAX_RETRIES}) after ${delayMs}ms...`);
      await new Promise((resolve: (value: unknown) => void) => setTimeout(resolve, delayMs));
    }
  }

  // This should never be reached due to the throw in the loop
  throw new Error('Failed to fetch content from Firecrawl API after multiple attempts');
}

