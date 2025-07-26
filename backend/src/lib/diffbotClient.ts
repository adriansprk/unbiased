import axios from 'axios';
import config from '../config';
import { JobDetails } from '../types';
import { extractDomain, isDomainOnProactiveList } from './utils';
import logger from '../lib/logger';

/**
 * Maximum number of retry attempts for API calls
 */
const MAX_RETRIES = 3;

/**
 * Base delay (in ms) for exponential backoff
 */
const BASE_DELAY = 1000;

/**
 * Processes images returned from Archive.is to avoid Next.js image domain issues
 * 
 * @param images - Array of image objects from Archive.is
 * @param isArchiveIs - Whether the content was fetched via Archive.is
 * @returns Processed array of image objects
 */
function processImages(images: any[] = [], isArchiveIs: boolean): any[] {
    if (!isArchiveIs || !images || !images.length) {
        return images;
    }

    // For Archive.is URLs, we need to handle the images to avoid Next.js domain issues
    return images.map(image => {
        const img = { ...image };

        // Check if the image URL is from archive.is domain
        if (img.url && typeof img.url === 'string' &&
            (img.url.includes('archive.is') || img.url.includes('.archive.is'))) {
            // Save the original URL before nullifying it
            const originalImageUrl = img.url;

            // Either remove the image URL or replace it with a placeholder
            // Option 1: Set to null (frontend should handle null image URLs with a placeholder)
            img.url = null;

            // Option 2: Add a flag to indicate this is an Archive.is image that needs special handling
            img.isArchiveImage = true;
            img.originalUrl = originalImageUrl;
        }

        return img;
    });
}

/**
 * Ensures backward compatibility with older job details that might not have the new fields
 * 
 * @param jobDetails - The job details object
 * @returns Job details with ensured backward compatibility
 */
export function ensureBackwardCompatibility(jobDetails: JobDetails): JobDetails {
    if (!jobDetails) return jobDetails;

    // Ensure fetchStrategy has a default value if not present
    if (jobDetails.fetchStrategy === undefined) {
        jobDetails.fetchStrategy = 'direct';
    }

    // Ensure isArchiveContent has a default value if not present
    if (jobDetails.isArchiveContent === undefined) {
        // If this is an old record, we can infer from fetchStrategy
        jobDetails.isArchiveContent = jobDetails.fetchStrategy === 'archive.is';
    }

    // Process images if they exist but haven't been processed
    if (jobDetails.images && Array.isArray(jobDetails.images) && jobDetails.images.length > 0) {
        // Check if any images have Archive.is URLs but haven't been processed
        const needsProcessing = jobDetails.images.some(img =>
            img.url &&
            typeof img.url === 'string' &&
            (img.url.includes('archive.is') || img.url.includes('.archive.is')) &&
            !img.isArchiveImage
        );

        if (needsProcessing) {
            jobDetails.images = processImages(jobDetails.images, true);
        }
    }

    return jobDetails;
}

/**
 * Strips query parameters from a URL for better archive.is compatibility
 * 
 * @param url - The URL to clean
 * @returns URL without query parameters
 */
function stripQueryParams(url: string): string {
    try {
        const urlObj = new URL(url);
        return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch (error) {
        logger.warn(`Error stripping query params: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return url; // Return original URL if parsing fails
    }
}

/**
 * Fetches article content from Diffbot API
 * 
 * @param url - The URL of the article to extract content from
 * @returns Extracted content details from Diffbot
 * @throws Error if API call fails after retries
 */
export async function fetchContentFromDiffbot(url: string): Promise<JobDetails> {
    // Build Diffbot API URL
    const diffbotUrl = `https://api.diffbot.com/v3/article`;
    const apiKey = config.diffbot.apiKey;

    if (!apiKey) {
        throw new Error('Diffbot API key is not configured');
    }

    // Check if domain requires Archive.is fetching
    let fetchUrl: string;
    let originalUrl = url;
    let isArchiveIsFetch = false;

    try {
        const domain = extractDomain(url);
        const useArchiveIs = isDomainOnProactiveList(domain);

        if (useArchiveIs) {
            const cleanUrl = stripQueryParams(url);
            fetchUrl = `https://archive.is/newest/${encodeURIComponent(cleanUrl)}`;
            isArchiveIsFetch = true;
            logger.info(`Domain ${domain} is on proactive list. Using Archive.is with cleaned URL: ${fetchUrl}`);
            logger.debug(`Original URL: ${url}, Cleaned URL: ${cleanUrl}`);
        } else {
            fetchUrl = url;
            logger.info(`Using original URL: ${fetchUrl}`);
        }
    } catch (error) {
        logger.warn(`Error checking domain for Archive.is strategy: ${error instanceof Error ? error.message : 'Unknown error'}`);
        fetchUrl = url; // Fallback to original URL on error
    }

    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            logger.info(`Diffbot API call attempt ${attempt + 1}/${MAX_RETRIES}:`);
            logger.info(`- URL: ${fetchUrl}`);
            
            // Build request parameters
            const requestParams: any = {
                url: fetchUrl,
                token: apiKey,
                timeout: 30000, // 30 second timeout
            };
            
            // Make API request to Diffbot with anti-detection headers
            const response = await axios.get(diffbotUrl, {
                params: requestParams,
                headers: {
                    'X-Forward-User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'X-Forward-Referrer': 'https://www.google.com/',
                    'X-Forward-Accept-Language': 'en-US,en;q=0.9',
                    'X-Forward-Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                }
            });
            
            logger.info(`Diffbot API call successful on attempt ${attempt + 1}`);
            logger.debug(`Response status: ${response.status}`);
            logger.debug(`Response data keys: ${Object.keys(response.data || {}).join(', ')}`);
            logger.debug(`Objects count: ${response.data?.objects?.length || 0}`);

            // Check if response contains objects
            if (!response.data || !response.data.objects || !response.data.objects.length) {
                throw new Error('Invalid response from Diffbot API: No content found');
            }

            // Extract the first article object
            const article = response.data.objects[0];

            // Process images if the content was fetched via Archive.is
            const processedImages = processImages(article.images, isArchiveIsFetch);

            // Create JobDetails object with extracted content
            const jobDetails: JobDetails = {
                title: article.title || null,
                text: article.text || null,
                html: article.html || null,
                author: article.author || null,
                date: article.date || null,
                siteName: article.siteName || null,
                images: processedImages,
                url: article.url || originalUrl, // Use canonical URL if available
                fetchStrategy: isArchiveIsFetch ? 'archive.is' : 'direct',
                originalUrl: originalUrl,
                isArchiveContent: isArchiveIsFetch // Add flag for frontend to know this came from Archive.is
            };

            return jobDetails;
        } catch (error) {
            attempt++;
            
            // Enhanced error logging for proxy debugging
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = (error as any)?.response?.status;
            const responseData = (error as any)?.response?.data;
            
            logger.error(`Diffbot API call failed (attempt ${attempt}/${MAX_RETRIES}):`);
            logger.error(`- Error: ${errorMsg}`);
            if (statusCode) logger.error(`- Status: ${statusCode}`);
            if (responseData) logger.error(`- Response: ${JSON.stringify(responseData)}`);
            

            // If we've exceeded max retries, throw the error
            if (attempt >= MAX_RETRIES) {
                const statusMsg = statusCode ? ` (Status: ${statusCode})` : '';
                throw new Error(`Diffbot API error after ${MAX_RETRIES} attempts: ${errorMsg}${statusMsg}`);
            }

            // Otherwise wait with exponential backoff before retrying
            const delayMs = BASE_DELAY * Math.pow(2, attempt - 1);
            logger.info(`Retrying Diffbot API call (${attempt}/${MAX_RETRIES}) after ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    // This should never be reached due to the throw in the loop
    throw new Error('Failed to fetch content from Diffbot API after multiple attempts');
}

export default {
    fetchContentFromDiffbot,
    ensureBackwardCompatibility
}; 