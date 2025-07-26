import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchContentFromDiffbot, ensureBackwardCompatibility } from '../../lib/diffbotClient';
import axios from 'axios';
import * as utils from '../../lib/utils';
import { JobDetails } from '../../types';

// Mock dependencies
vi.mock('axios');
vi.mock('../../lib/utils');
vi.mock('../../config', () => ({
    default: {
        diffbot: {
            apiKey: 'test-api-key'
        }
    },
    proactiveArchiveDomains: [
        'nytimes.com',
        'wsj.com'
    ]
}));

describe('Diffbot Client', () => {
    const mockAxiosGet = vi.mocked(axios.get);
    const mockExtractDomain = vi.mocked(utils.extractDomain);
    const mockIsDomainOnProactiveList = vi.mocked(utils.isDomainOnProactiveList);

    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock responses
        mockAxiosGet.mockResolvedValue({
            data: {
                objects: [{
                    title: 'Test Article',
                    text: 'Article content',
                    html: '<p>Article content</p>',
                    author: 'Test Author',
                    date: '2023-05-01',
                    siteName: 'Test Site',
                    images: [],
                    url: 'https://example.com/article'
                }]
            }
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('fetchContentFromDiffbot', () => {
        it('should use Archive.is URL for domains on the proactive list', async () => {
            // Set up mocks
            const originalUrl = 'https://www.nytimes.com/article?param=value';
            mockExtractDomain.mockReturnValue('www.nytimes.com');
            mockIsDomainOnProactiveList.mockReturnValue(true);

            // Call function
            await fetchContentFromDiffbot(originalUrl);

            // Verify Archive.is URL was constructed correctly with cleaned URL (no query params)
            expect(mockAxiosGet).toHaveBeenCalledWith(
                'https://api.diffbot.com/v3/article',
                {
                    params: {
                        url: `https://archive.is/newest/${encodeURIComponent('https://www.nytimes.com/article')}`,
                        token: 'test-api-key',
                        timeout: 30000,
                    },
                    headers: {
                        'X-Forward-User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'X-Forward-Referrer': 'https://www.google.com/',
                        'X-Forward-Accept-Language': 'en-US,en;q=0.9',
                        'X-Forward-Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                    }
                }
            );

            // Verify domain extraction and checking were called
            expect(mockExtractDomain).toHaveBeenCalledWith(originalUrl);
            expect(mockIsDomainOnProactiveList).toHaveBeenCalledWith('www.nytimes.com');
        });

        it('should use original URL for domains not on the proactive list', async () => {
            // Set up mocks
            const originalUrl = 'https://example.com/article';
            mockExtractDomain.mockReturnValue('example.com');
            mockIsDomainOnProactiveList.mockReturnValue(false);

            // Call function
            await fetchContentFromDiffbot(originalUrl);

            // Verify original URL was used
            expect(mockAxiosGet).toHaveBeenCalledWith(
                'https://api.diffbot.com/v3/article',
                {
                    params: {
                        url: originalUrl,
                        token: 'test-api-key',
                        timeout: 30000,
                    },
                    headers: {
                        'X-Forward-User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'X-Forward-Referrer': 'https://www.google.com/',
                        'X-Forward-Accept-Language': 'en-US,en;q=0.9',
                        'X-Forward-Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                    }
                }
            );

            // Verify domain extraction and checking were called
            expect(mockExtractDomain).toHaveBeenCalledWith(originalUrl);
            expect(mockIsDomainOnProactiveList).toHaveBeenCalledWith('example.com');
        });

        it('should set fetchStrategy to "archive.is" when using Archive.is', async () => {
            // Set up mocks
            mockExtractDomain.mockReturnValue('www.nytimes.com');
            mockIsDomainOnProactiveList.mockReturnValue(true);

            // Call function
            const result = await fetchContentFromDiffbot('https://www.nytimes.com/article');

            // Verify fetchStrategy flag
            expect(result.fetchStrategy).toBe('archive.is');
            expect(result.isArchiveContent).toBe(true);
        });

        it('should set fetchStrategy to "direct" when using original URL', async () => {
            // Set up mocks
            mockExtractDomain.mockReturnValue('example.com');
            mockIsDomainOnProactiveList.mockReturnValue(false);

            // Call function
            const result = await fetchContentFromDiffbot('https://example.com/article');

            // Verify fetchStrategy flag
            expect(result.fetchStrategy).toBe('direct');
            expect(result.isArchiveContent).toBe(false);
        });

        it('should fall back to original URL if domain extraction fails', async () => {
            // Set up mocks
            const originalUrl = 'https://example.com/article';
            mockExtractDomain.mockImplementation(() => {
                throw new Error('Invalid URL');
            });

            // Call function
            await fetchContentFromDiffbot(originalUrl);

            // Verify original URL was used
            expect(mockAxiosGet).toHaveBeenCalledWith(
                'https://api.diffbot.com/v3/article',
                {
                    params: {
                        url: originalUrl,
                        token: 'test-api-key',
                        timeout: 30000,
                    },
                    headers: {
                        'X-Forward-User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'X-Forward-Referrer': 'https://www.google.com/',
                        'X-Forward-Accept-Language': 'en-US,en;q=0.9',
                        'X-Forward-Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                    }
                }
            );
        });

        it('should retry API calls on failure', async () => {
            // Set up mocks
            mockExtractDomain.mockReturnValue('example.com');
            mockIsDomainOnProactiveList.mockReturnValue(false);

            // Make the first call fail, then succeed
            mockAxiosGet
                .mockRejectedValueOnce(new Error('API error'))
                .mockResolvedValueOnce({
                    data: {
                        objects: [{
                            title: 'Test Article',
                            text: 'Article content'
                        }]
                    }
                });

            // Mock setTimeout to avoid waiting
            vi.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
                cb();
                return 0 as any;
            });

            // Call function
            const result = await fetchContentFromDiffbot('https://example.com/article');

            // Verify axios was called twice
            expect(mockAxiosGet).toHaveBeenCalledTimes(2);
            expect(result.title).toBe('Test Article');
        });

        it('should throw error after max retries', async () => {
            // Set up mocks
            mockExtractDomain.mockReturnValue('example.com');
            mockIsDomainOnProactiveList.mockReturnValue(false);

            // Make all calls fail
            mockAxiosGet.mockRejectedValue(new Error('API error'));

            // Mock setTimeout to avoid waiting
            vi.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
                cb();
                return 0 as any;
            });

            // Call function should throw
            await expect(fetchContentFromDiffbot('https://example.com/article'))
                .rejects.toThrow('Diffbot API error after 3 attempts: API error');

            // Verify axios was called MAX_RETRIES times (3)
            expect(mockAxiosGet).toHaveBeenCalledTimes(3);
        });
    });

    describe('Image processing for Archive.is content', () => {
        it('should process Archive.is images by nullifying URLs', async () => {
            // Set up mocks
            mockExtractDomain.mockReturnValue('www.nytimes.com');
            mockIsDomainOnProactiveList.mockReturnValue(true);

            // Add archive.is images to response
            mockAxiosGet.mockResolvedValue({
                data: {
                    objects: [{
                        title: 'Test Article',
                        text: 'Article content',
                        images: [
                            { url: 'https://d9vql2c4p0d2hy.archive.is/abc123.jpg', alt: 'Image 1' },
                            { url: 'https://archive.is/xyz789.jpg', alt: 'Image 2' },
                            { url: 'https://example.com/normal-image.jpg', alt: 'Image 3' }
                        ]
                    }]
                }
            });

            // Call function
            const result = await fetchContentFromDiffbot('https://www.nytimes.com/article');

            // Verify image processing
            expect(result.images).toHaveLength(3);

            // Archive.is images should be nullified with metadata
            expect(result.images?.[0].url).toBeNull();
            expect(result.images?.[0].isArchiveImage).toBe(true);
            expect(result.images?.[0].originalUrl).toBe('https://d9vql2c4p0d2hy.archive.is/abc123.jpg');

            expect(result.images?.[1].url).toBeNull();
            expect(result.images?.[1].isArchiveImage).toBe(true);
            expect(result.images?.[1].originalUrl).toBe('https://archive.is/xyz789.jpg');

            // Normal image should be unchanged
            expect(result.images?.[2].url).toBe('https://example.com/normal-image.jpg');
            expect(result.images?.[2].isArchiveImage).toBeUndefined();
            expect(result.images?.[2].originalUrl).toBeUndefined();
        });

        it('should not process images when not using Archive.is', async () => {
            // Set up mocks
            mockExtractDomain.mockReturnValue('example.com');
            mockIsDomainOnProactiveList.mockReturnValue(false);

            // Add normal images to response
            mockAxiosGet.mockResolvedValue({
                data: {
                    objects: [{
                        title: 'Test Article',
                        text: 'Article content',
                        images: [
                            { url: 'https://example.com/image1.jpg', alt: 'Image 1' },
                            { url: 'https://example.com/image2.jpg', alt: 'Image 2' }
                        ]
                    }]
                }
            });

            // Call function
            const result = await fetchContentFromDiffbot('https://example.com/article');

            // Verify images are unchanged
            expect(result.images).toHaveLength(2);
            expect(result.images?.[0].url).toBe('https://example.com/image1.jpg');
            expect(result.images?.[0].isArchiveImage).toBeUndefined();
            expect(result.images?.[1].url).toBe('https://example.com/image2.jpg');
            expect(result.images?.[1].isArchiveImage).toBeUndefined();
        });
    });

    describe('ensureBackwardCompatibility', () => {
        it('should add missing fetchStrategy with default value', () => {
            const oldJobDetails: JobDetails = {
                title: 'Test Article',
                text: 'Content',
                url: 'https://example.com'
            };

            const result = ensureBackwardCompatibility(oldJobDetails);

            expect(result.fetchStrategy).toBe('direct');
        });

        it('should add missing isArchiveContent based on fetchStrategy', () => {
            const jobDetails: JobDetails = {
                title: 'Test Article',
                text: 'Content',
                url: 'https://example.com',
                fetchStrategy: 'archive.is'
            };

            const result = ensureBackwardCompatibility(jobDetails);

            expect(result.isArchiveContent).toBe(true);
        });

        it('should process unprocessed Archive.is images', () => {
            const jobDetails: JobDetails = {
                title: 'Test Article',
                text: 'Content',
                url: 'https://example.com',
                fetchStrategy: 'archive.is',
                isArchiveContent: true,
                images: [
                    { url: 'https://archive.is/image.jpg', alt: 'Image' }
                ]
            };

            const result = ensureBackwardCompatibility(jobDetails);

            expect(result.images?.[0].url).toBeNull();
            expect(result.images?.[0].isArchiveImage).toBe(true);
            expect(result.images?.[0].originalUrl).toBe('https://archive.is/image.jpg');
        });

        it('should handle null or undefined jobDetails', () => {
            expect(ensureBackwardCompatibility(null as any)).toBeNull();
            expect(ensureBackwardCompatibility(undefined as any)).toBeUndefined();
        });
    });
}); 