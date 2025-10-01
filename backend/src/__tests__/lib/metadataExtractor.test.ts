import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { extractUrlMetadata } from '../../lib/metadataExtractor';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('metadataExtractor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should extract basic metadata from HTML', async () => {
        const mockHtml = `
            <html>
                <head>
                    <title>Test Article Title</title>
                    <meta property="og:title" content="OG Title Override">
                    <meta property="og:description" content="This is a test article description">
                    <meta property="og:image" content="https://example.com/image.jpg">
                    <meta name="author" content="John Doe">
                    <meta property="og:site_name" content="Test Site">
                </head>
                <body>
                    <h1>Article Content</h1>
                </body>
            </html>
        `;

        mockedAxios.get.mockResolvedValueOnce({
            data: mockHtml
        });

        const result = await extractUrlMetadata('https://example.com/article');

        expect(result).toEqual({
            url: 'https://example.com/article',
            title: 'OG Title Override',
            description: 'This is a test article description',
            image: 'http://localhost:3001/api/image-proxy?url=https%3A%2F%2Fexample.com%2Fimage.jpg',
            authors: ['John Doe'],
            siteName: 'Test Site',
            favicon: 'http://localhost:3001/api/image-proxy?url=https%3A%2F%2Fexample.com%2Ffavicon.ico'
        });

        expect(mockedAxios.get).toHaveBeenCalledWith(
            'https://example.com/article',
            expect.objectContaining({
                timeout: 10000,
                headers: expect.objectContaining({
                    'User-Agent': expect.stringContaining('UnbiasBot')
                })
            })
        );
    });

    it('should handle missing metadata gracefully', async () => {
        const mockHtml = `
            <html>
                <head>
                    <title>Basic Title</title>
                </head>
                <body>
                    <h1>Content</h1>
                </body>
            </html>
        `;

        mockedAxios.get.mockResolvedValueOnce({
            data: mockHtml
        });

        const result = await extractUrlMetadata('https://example.com/basic');

        expect(result).toEqual({
            url: 'https://example.com/basic',
            title: 'Basic Title',
            description: undefined,
            image: undefined,
            authors: [],
            siteName: undefined,
            favicon: 'http://localhost:3001/api/image-proxy?url=https%3A%2F%2Fexample.com%2Ffavicon.ico'
        });
    });

    it('should handle network errors gracefully', async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

        const result = await extractUrlMetadata('https://example.com/error');

        expect(result).toEqual({
            url: 'https://example.com/error'
        });
    });

    it('should extract multiple authors', async () => {
        const mockHtml = `
            <html>
                <head>
                    <title>Multi-Author Article</title>
                    <meta name="author" content="John Doe">
                </head>
                <body>
                    <div class="author">Jane Smith</div>
                    <span rel="author">Bob Wilson</span>
                </body>
            </html>
        `;

        mockedAxios.get.mockResolvedValueOnce({
            data: mockHtml
        });

        const result = await extractUrlMetadata('https://example.com/multi-author');

        expect(result.authors).toContain('John Doe');
        expect(result.authors).toContain('Jane Smith');
        expect(result.authors).toContain('Bob Wilson');
        expect(result.authors?.length).toBe(3);
    });

    it('should convert relative URLs to absolute', async () => {
        const mockHtml = `
            <html>
                <head>
                    <title>Relative URLs</title>
                    <meta property="og:image" content="/relative/image.jpg">
                    <link rel="icon" href="/favicon.ico">
                </head>
            </html>
        `;

        mockedAxios.get.mockResolvedValueOnce({
            data: mockHtml
        });

        const result = await extractUrlMetadata('https://example.com/article');

        expect(result.image).toBe('http://localhost:3001/api/image-proxy?url=https%3A%2F%2Fexample.com%2Frelative%2Fimage.jpg');
        expect(result.favicon).toBe('http://localhost:3001/api/image-proxy?url=https%3A%2F%2Fexample.com%2Ffavicon.ico');
    });

    it('should skip Twitter URLs and handles as authors', async () => {
        const mockHtml = `
            <html>
                <head>
                    <title>Twitter Author Test</title>
                    <meta property="cXenseParse:author" content="Susanne Vieth-Entus">
                    <meta name="twitter:creator" content="https://twitter.com/viethentus">
                </head>
            </html>
        `;

        mockedAxios.get.mockResolvedValueOnce({
            data: mockHtml
        });

        const result = await extractUrlMetadata('https://example.com/article');

        // Should extract the real author name, not the Twitter URL
        expect(result.authors).toContain('Susanne Vieth-Entus');
        expect(result.authors).not.toContain('https://twitter.com/viethentus');
        expect(result.authors?.length).toBe(1);
    });

    it('should skip author fields that are just URLs', async () => {
        const mockHtml = `
            <html>
                <head>
                    <title>URL Author Test</title>
                    <meta name="author" content="https://example.com/author-page">
                    <meta property="article:author" content="Real Author Name">
                </head>
            </html>
        `;

        mockedAxios.get.mockResolvedValueOnce({
            data: mockHtml
        });

        const result = await extractUrlMetadata('https://example.com/article');

        // Should skip the URL and only extract the real name
        expect(result.authors).toContain('Real Author Name');
        expect(result.authors).not.toContain('https://example.com/author-page');
        expect(result.authors?.length).toBe(1);
    });
});