import { Request, Response } from 'express';
import axios from 'axios';
import sharp from 'sharp';
import logger from '../../lib/logger';

const VALID_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
];

// Cache control header value (1 day)
const CACHE_CONTROL_VALUE = 'public, max-age=86400';

// Default timeout for fetching external images (10 seconds)
const FETCH_TIMEOUT_MS = 10000;

// Default maximum width for resizing images (maintain aspect ratio)
const MAX_WIDTH = 800;

// Default WebP quality (0-100)
const WEBP_QUALITY = 80;

/**
 * Image proxy endpoint handler
 * Fetches images from external sources, optionally optimizes them,
 * and streams them back to the client
 */
export default async function imageProxyHandler(req: Request, res: Response) {
    try {
        const { url } = req.query;

        // Validate URL parameter
        if (!url || typeof url !== 'string') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_URL',
                    message: 'URL parameter is required'
                }
            });
        }

        // Validate URL format
        try {
            new URL(url);
        } catch {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_URL',
                    message: 'The provided URL is not valid'
                }
            });
        }

        logger.debug(`Fetching image from: ${url}`);
        logger.debug(`Image request headers: ${JSON.stringify({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': new URL(url).origin,
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
        })}`);

        // Fetch the image with a timeout
        const imageResponse = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: FETCH_TIMEOUT_MS,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': new URL(url).origin,
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
            }
        });

        // Check if the response is an image
        const contentType = imageResponse.headers['content-type'] as string;
        if (!contentType || !VALID_IMAGE_TYPES.includes(contentType.toLowerCase())) {
            logger.warn(`Invalid content type: ${contentType} for URL: ${url}`);
            return res.status(400).json({
                success: false,
                error: {
                    code: 'NOT_AN_IMAGE',
                    message: 'The URL does not point to a valid image'
                }
            });
        }

        logger.debug(`Fetched image: ${contentType}, size: ${(imageResponse.data as ArrayBuffer).byteLength} bytes`);

        try {
            // Process the image with sharp
            const imageBuffer = Buffer.from(imageResponse.data);
            const processedImage = await sharp(imageBuffer)
                .resize({ width: MAX_WIDTH, withoutEnlargement: true })
                .webp({ quality: WEBP_QUALITY })
                .toBuffer();

            // Set response headers for the optimized image
            res.setHeader('Content-Type', 'image/webp');
            res.setHeader('Cache-Control', CACHE_CONTROL_VALUE);

            // Send the processed image
            return res.send(processedImage);
        } catch (sharpError) {
            logger.error('Image processing error:', sharpError);

            // If image processing fails, fall back to original image
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', CACHE_CONTROL_VALUE);
            return res.send(Buffer.from(imageResponse.data as ArrayBuffer));
        }
    } catch (error) {
        logger.error('Image proxy error:', error);

        // Handle specific error types
        if (axios.isAxiosError(error)) {
            logger.error(`Axios error details: ${JSON.stringify({
                statusCode: error.response?.status,
                statusText: error.response?.statusText,
                headers: error.response?.headers,
                code: error.code,
                message: error.message
            })}`);

            if (error.code === 'ECONNABORTED') {
                return res.status(500).json({
                    success: false,
                    error: {
                        code: 'TIMEOUT',
                        message: 'Timeout while fetching the image'
                    }
                });
            }

            if (error.response) {
                // If the external server returns a 404
                if (error.response.status === 404) {
                    return res.status(404).json({
                        success: false,
                        error: {
                            code: 'IMAGE_NOT_FOUND',
                            message: 'The requested image was not found'
                        }
                    });
                }

                // Any other response error
                return res.status(error.response.status).json({
                    success: false,
                    error: {
                        code: 'FETCH_ERROR',
                        message: `Error fetching image: ${error.message}`
                    }
                });
            }
        }

        // Generic server error for other types of errors
        return res.status(500).json({
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'An unexpected error occurred while processing the image'
            }
        });
    }
} 