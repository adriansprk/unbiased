import { v4 as uuidv4 } from 'uuid';
import config, { proactiveArchiveDomains } from '../config';
import { ImageDetails, DiffbotArticleObject, MinimalJobMetadata } from '../types';
import logger from './logger';

/**
 * Validates if a string is a valid UUID
 * @param {string} str - String to validate
 * @returns {boolean} - True if valid UUID
 */
export function isValidUuid(str: string): boolean {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(str);
}

/**
 * Generates a new UUID
 * @returns {string} - A new UUID
 */
export function generateUuid(): string {
  return uuidv4();
}

/**
 * Transforms an external image URL into a proxied URL
 * @param {string} externalUrl - The original external image URL
 * @returns {string} - The proxied URL
 */
export function getProxiedImageUrl(externalUrl: string): string {
  if (!externalUrl) {
    return '';
  }

  try {
    const encodedUrl = encodeURIComponent(externalUrl);
    return `${config.api.backendUrl}/api/image-proxy?url=${encodedUrl}`;
  } catch {
    // If there's any issue with the URL, return empty string
    return '';
  }
}

/**
 * Normalizes a URL for consistent comparison and storage
 * @param {string} url - The URL to normalize
 * @returns {string} - The normalized URL
 */
export function normalizeUrl(url: string): string {
  if (!url) {
    return '';
  }

  try {
    // Parse the URL
    const parsedUrl = new URL(url);

    // 1. Convert scheme to https if it's http
    if (parsedUrl.protocol === 'http:') {
      parsedUrl.protocol = 'https:';
    }

    // 2. Convert hostname to lowercase
    parsedUrl.hostname = parsedUrl.hostname.toLowerCase();

    // 3. Remove www. prefix if present
    if (parsedUrl.hostname.startsWith('www.')) {
      parsedUrl.hostname = parsedUrl.hostname.substring(4);
    }

    // 4. Remove all query parameters (?key=value) from the URL
    parsedUrl.search = '';

    // 5. Remove trailing slash from path
    if (parsedUrl.pathname.length > 1 && parsedUrl.pathname.endsWith('/')) {
      parsedUrl.pathname = parsedUrl.pathname.slice(0, -1);
    }

    return parsedUrl.toString();
  } catch (error) {
    logger.error('Error normalizing URL:', error);
    return url; // Return original URL if normalization fails
  }
}

/**
 * Generates a random ID with a given prefix
 * @param prefix - The prefix to use for the ID
 * @returns string random ID
 */
export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Formats a date string to a more readable format
 * @param dateString - ISO date string
 * @returns formatted date string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Safely parses JSON with error handling
 * @param jsonString - The JSON string to parse
 * @param fallback - Optional fallback value if parsing fails
 * @returns parsed object or fallback
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    logger.error('Error parsing JSON:', error);
    return fallback;
  }
}

/**
 * Extracts the domain from a URL
 * @param url - The URL to extract the domain from
 * @returns The domain (hostname) from the URL
 * @throws Error if the URL is invalid
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
}


/**
 * Checks if a domain is on the proactive Archive.is list
 * @param domain - The domain to check
 * @returns boolean indicating if the domain is on the proactive list
 */
export function isDomainOnProactiveList(domain: string): boolean {
  // Normalize domain by removing www. prefix for matching
  const normalizedDomain = domain.replace(/^www\./, '');
  return proactiveArchiveDomains.some((d: string) => normalizedDomain === d || normalizedDomain.endsWith(`.${d}`));
}

/**
 * Selects the best preview image URL from a Diffbot images array
 * @param imagesArray - Array of image objects from Diffbot
 * @returns The URL of the selected image, or null if no suitable image is found
 */
export function selectPreviewImage(imagesArray: ImageDetails[] | null | undefined): string | null {
  // Handle empty or invalid input
  if (!imagesArray || !Array.isArray(imagesArray) || imagesArray.length === 0) {
    return null;
  }

  // Try to find an image marked as primary
  const primaryImage = imagesArray.find(img => img && img.primary === true);
  if (primaryImage) {
    // Handle archive.is images where url is null but originalUrl exists
    if (primaryImage.url === null && primaryImage.originalUrl) {
      return primaryImage.originalUrl;
    }
    // Handle standard image URLs
    if (primaryImage.url) {
      return primaryImage.url;
    }
  }

  // If no primary image, try to find any image with a valid URL
  for (const img of imagesArray) {
    // Handle archive.is images
    if (img && img.url === null && img.originalUrl) {
      return img.originalUrl;
    }
    // Handle standard image URLs
    if (img && img.url) {
      return img.url;
    }
  }

  // If no valid images are found
  return null;
}

/**
 * Creates a minimal metadata object from Diffbot output by excluding large fields
 * @param diffbotOutput - The original Diffbot API response
 * @returns A filtered object containing only the necessary metadata
 */
export function createMinimalMetadata(diffbotOutput: DiffbotArticleObject): MinimalJobMetadata {
  if (!diffbotOutput) {
    return {};
  }

  // Create a minimal metadata object with only essential fields
  const metadata: MinimalJobMetadata = {
    type: diffbotOutput.type,
    publisherCountry: diffbotOutput.publisherCountry,
    publisherRegion: diffbotOutput.publisherRegion,
    language: diffbotOutput.language,
    sentiment: diffbotOutput.sentiment,
    humanLanguage: diffbotOutput.humanLanguage,
    numPages: diffbotOutput.numPages,
    diffbotUri: diffbotOutput.diffbotUri,
  };

  // Remove undefined values
  Object.keys(metadata).forEach(key => {
    if (metadata[key as keyof MinimalJobMetadata] === undefined) {
      delete metadata[key as keyof MinimalJobMetadata];
    }
  });

  return metadata;
}

export default {
  isValidUuid,
  generateId,
  formatDate,
  safeJsonParse,
  extractDomain,
  isDomainOnProactiveList,
  generateUuid,
  getProxiedImageUrl,
  normalizeUrl,
  selectPreviewImage,
  createMinimalMetadata,
};
