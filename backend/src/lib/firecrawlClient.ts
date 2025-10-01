import Firecrawl from '@mendable/firecrawl-js';
import config from '../config';
import { JobDetails } from '../types';
import logger from '../lib/logger';
import fs from 'fs';
import path from 'path';
import { extractArticleContent } from './contentExtractor';

/**
 * Type definitions for Firecrawl API response
 */
interface FirecrawlMetadata {
  sourceURL?: string;
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
 * Archive service domains that should be handled by Firecrawl
 */
const ARCHIVE_DOMAINS = ['archive.ph', 'archive.is', 'archive.today', 'archive.md'];

/**
 * Checks if a URL is from any archive service
 */
function isArchiveUrl(url: string): boolean {
  return ARCHIVE_DOMAINS.some(domain =>
    url.includes(domain) || url.includes(`.${domain}`)
  );
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
function saveSampleExtraction(url: string, response: FirecrawlResponse, jobDetails: JobDetails): void {
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
export async function fetchContentFromFirecrawl(url: string): Promise<JobDetails> {
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

      // Log the two most important extracts: title and body text
      logger.info(`Successfully extracted content with title: "${title}"`);
      logger.info(`Body text length: ${bodyText.length} characters`);
      if (author) {
        logger.info(`Author: "${author}"`);
      }
      if (siteName) {
        logger.info(`Site name: "${siteName}"`);
      }

      // Convert to JobDetails format compatible with existing system
      const jobDetails: JobDetails = {
        title: title || null,
        text: bodyText || null,
        html: extractedContent?.bodyHtml || null,
        author: author || null,
        date: publishDate || null,
        siteName: siteName || null,
        images: [], // Archive images are problematic anyway, keeping empty for now
        url: response.metadata?.sourceURL || url,
        canonicalUrl: response.metadata?.canonicalUrl || undefined,
        publisherCountry: undefined,
        publisherRegion: undefined,
        language: response.metadata?.language || undefined,
        sentiment: undefined,
        diffbotUri: undefined,
        type: 'article',
        resolvedPageUrl: response.metadata?.sourceURL || undefined,
        pageUrl: url,
        humanLanguage: response.metadata?.language || undefined,
        numPages: undefined,
        nextPages: undefined,
        nextPage: undefined,
        tags: response.metadata?.keywords
          ? response.metadata.keywords.split(',').map((k: string, index: number) => ({
              label: k.trim(),
              count: 1,
              prevalence: 0.1,
              id: index,
              type: 'keyword',
              uri: ''
            }))
          : undefined,
        entities: undefined,
        breadcrumb: undefined,
        videos: undefined,
        links: undefined,
        fetchStrategy: 'firecrawl',
        originalUrl: url,
        isArchiveContent: isArchive,
      };

      // Save extraction sample in development mode
      saveSampleExtraction(url, response, jobDetails);

      return jobDetails;
    } catch (error) {
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

export { isArchiveUrl };

export default {
  fetchContentFromFirecrawl,
};