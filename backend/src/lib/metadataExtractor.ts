import * as cheerio from 'cheerio';
import axios from 'axios';
import logger from './logger';
import { getProxiedImageUrl } from './utils';

export interface UrlMetadata {
    title?: string;
    description?: string;
    image?: string;
    authors?: string[];
    siteName?: string;
    url: string;
    favicon?: string;
}

/**
 * Extracts metadata from a URL using Cheerio to parse HTML
 * This provides immediate feedback while the full archive/diffbot analysis runs
 */
export async function extractUrlMetadata(url: string): Promise<UrlMetadata> {
    const metadata: UrlMetadata = { url };

    try {
        logger.debug(`Extracting metadata from URL: ${url}`);

        // Fetch the HTML content
        const response = await axios.get(url, {
            timeout: 10000, // 10 second timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; UnbiasBot/1.0; +https://unbias.io)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            maxRedirects: 5,
            validateStatus: (status) => status < 400 // Accept 2xx and 3xx status codes
        });

        const html = response.data as string;
        const $ = cheerio.load(html);

        // Extract title
        metadata.title = extractTitle($);

        // Extract description
        metadata.description = extractDescription($);

        // Extract image
        metadata.image = extractImage($, url);

        // Extract authors
        metadata.authors = extractAuthors($);

        // Extract site name
        metadata.siteName = extractSiteName($);

        // Extract favicon
        metadata.favicon = extractFavicon($, url);

        logger.debug(`Successfully extracted metadata for ${url}:`, {
            title: metadata.title?.substring(0, 50),
            hasImage: !!metadata.image,
            authorsCount: metadata.authors?.length || 0,
            siteName: metadata.siteName
        });

        return metadata;

    } catch (error) {
        logger.warn(`Failed to extract metadata from ${url}:`, error instanceof Error ? error.message : 'Unknown error');

        // Return basic metadata with just the URL if extraction fails
        return metadata;
    }
}

function extractTitle($: cheerio.Root): string | undefined {
    // Try various title sources in order of preference
    const selectors = [
        'meta[property="og:title"]',
        'meta[name="twitter:title"]',
        'meta[name="title"]',
        'title',
        'h1'
    ];

    for (const selector of selectors) {
        const element = $(selector).first();
        let title: string | undefined;

        if (selector.startsWith('meta')) {
            title = element.attr('content');
        } else {
            title = element.text();
        }

        if (title && title.trim()) {
            return title.trim();
        }
    }

    return undefined;
}

function extractDescription($: cheerio.Root): string | undefined {
    const selectors = [
        'meta[property="og:description"]',
        'meta[name="twitter:description"]',
        'meta[name="description"]',
        'meta[name="Description"]'
    ];

    for (const selector of selectors) {
        const content = $(selector).attr('content');
        if (content && content.trim()) {
            return content.trim();
        }
    }

    return undefined;
}

function extractImage($: cheerio.Root, baseUrl: string): string | undefined {
    const selectors = [
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        'meta[name="twitter:image:src"]',
        'link[rel="image_src"]'
    ];

    for (const selector of selectors) {
        const element = $(selector).first();
        let imageUrl: string | undefined;

        if (selector.startsWith('link')) {
            imageUrl = element.attr('href');
        } else {
            imageUrl = element.attr('content');
        }

        if (imageUrl && imageUrl.trim()) {
            // Convert relative URLs to absolute and proxy external images
            const absoluteUrl = makeAbsoluteUrl(imageUrl.trim(), baseUrl);
            return getProxiedImageUrl(absoluteUrl);
        }
    }

    return undefined;
}

function extractAuthors($: cheerio.Root): string[] {
    const authors: Set<string> = new Set();

    // Try various author selectors (in order of preference)
    const selectors = [
        'meta[property="cXenseParse:author"]',  // Publisher-specific author fields
        'meta[name="author"]',
        'meta[name="Author"]',
        'meta[property="article:author"]',
        'meta[name="twitter:creator"]',  // Often contains Twitter handle or URL
        '[rel="author"]',
        '.author',
        '.byline',
        '.author-name',
        '[itemprop="author"]',
        '[data-testid*="author"]'
    ];

    for (const selector of selectors) {
        $(selector).each((_, element) => {
            const $el = $(element);
            let author: string | undefined;

            if (selector.startsWith('meta')) {
                author = $el.attr('content');
            } else if (selector === '[rel="author"]') {
                // For rel="author", try text content first, fallback to href
                author = $el.text().trim() || $el.attr('href');
            } else {
                author = $el.text();
            }

            if (author && author.trim()) {
                // Skip if it's a URL (common with twitter:creator)
                if (author.includes('://') || author.startsWith('http') || author.startsWith('www.')) {
                    return;
                }

                // Skip if it starts with @ (Twitter handle) - extract the name without @
                if (author.startsWith('@')) {
                    return;
                }

                // Clean up the author name
                const cleanAuthor = author.trim()
                    .replace(/^(by\s+|written\s+by\s+)/i, '')
                    .replace(/\s*\|\s*.*$/, '');  // Remove "Author | Publication" format

                if (cleanAuthor.length > 0 && cleanAuthor.length < 100) {
                    authors.add(cleanAuthor);
                }
            }
        });
    }

    return Array.from(authors);
}

function extractSiteName($: cheerio.Root): string | undefined {
    const selectors = [
        'meta[property="og:site_name"]',
        'meta[name="twitter:site"]',
        'meta[name="application-name"]',
        'meta[name="apple-mobile-web-app-title"]'
    ];

    for (const selector of selectors) {
        const content = $(selector).attr('content');
        if (content && content.trim()) {
            // Clean up site name (remove @ for Twitter handles)
            return content.trim().replace(/^@/, '');
        }
    }

    return undefined;
}

function extractFavicon($: cheerio.Root, baseUrl: string): string | undefined {
    const selectors = [
        'link[rel="icon"]',
        'link[rel="shortcut icon"]',
        'link[rel="apple-touch-icon"]'
    ];

    for (const selector of selectors) {
        const href = $(selector).first().attr('href');
        if (href && href.trim()) {
            const absoluteUrl = makeAbsoluteUrl(href.trim(), baseUrl);
            return getProxiedImageUrl(absoluteUrl);
        }
    }

    // Fallback to default favicon location
    try {
        const url = new URL(baseUrl);
        const faviconUrl = `${url.protocol}//${url.host}/favicon.ico`;
        return getProxiedImageUrl(faviconUrl);
    } catch {
        return undefined;
    }
}

function makeAbsoluteUrl(url: string, baseUrl: string): string {
    try {
        return new URL(url, baseUrl).href;
    } catch {
        return url;
    }
}