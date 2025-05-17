import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractDomain, isDomainOnProactiveList, selectPreviewImage, createMinimalMetadata, normalizeUrl } from '../../lib/utils';
import * as config from '../../config';

// Mock the proactiveArchiveDomains from config
vi.mock('../../config', () => ({
    proactiveArchiveDomains: [
        'nytimes.com',
        'wsj.com',
        'washingtonpost.com'
    ]
}));

describe('URL and domain utilities', () => {
    describe('extractDomain', () => {
        it('should extract domain from a basic URL', () => {
            expect(extractDomain('https://example.com/article')).toBe('example.com');
        });

        it('should extract domain from URL with subdomain', () => {
            expect(extractDomain('https://news.example.com/article')).toBe('news.example.com');
        });

        it('should extract domain from URL with query parameters', () => {
            expect(extractDomain('https://example.com/article?id=123')).toBe('example.com');
        });

        it('should extract domain from URL with port number', () => {
            expect(extractDomain('https://example.com:8080/article')).toBe('example.com');
        });

        it('should extract domain from URL with fragment', () => {
            expect(extractDomain('https://example.com/article#section1')).toBe('example.com');
        });

        it('should extract domain from URL with username and password', () => {
            expect(extractDomain('https://user:pass@example.com/article')).toBe('example.com');
        });

        it('should throw error for invalid URL', () => {
            expect(() => extractDomain('not a url')).toThrow('Invalid URL');
        });

        it('should throw error for empty URL', () => {
            expect(() => extractDomain('')).toThrow('Invalid URL');
        });
    });

    describe('isDomainOnProactiveList', () => {
        it('should return true for domains directly on the list', () => {
            expect(isDomainOnProactiveList('nytimes.com')).toBe(true);
        });

        it('should return true for subdomains of listed domains', () => {
            expect(isDomainOnProactiveList('www.nytimes.com')).toBe(true);
        });

        it('should return true for deeper subdomains of listed domains', () => {
            expect(isDomainOnProactiveList('blog.news.nytimes.com')).toBe(true);
        });

        it('should return false for domains not on the list', () => {
            expect(isDomainOnProactiveList('example.com')).toBe(false);
        });

        it('should return false for similar but non-matching domains', () => {
            expect(isDomainOnProactiveList('fakenytimes.com')).toBe(false);
        });

        it('should return false for domains that contain listed domains as substrings', () => {
            expect(isDomainOnProactiveList('mynytimes.com.fake')).toBe(false);
        });
    });

    describe('normalizeUrl', () => {
        it('should convert http to https', () => {
            expect(normalizeUrl('http://example.com')).toBe('https://example.com/');
        });

        it('should convert hostname to lowercase', () => {
            expect(normalizeUrl('https://EXAMPLE.com')).toBe('https://example.com/');
        });

        it('should remove www. prefix', () => {
            expect(normalizeUrl('https://www.example.com')).toBe('https://example.com/');
        });

        it('should remove all query parameters', () => {
            expect(normalizeUrl('https://example.com?utm_source=twitter&a=1&b=2')).toBe('https://example.com/');
        });

        it('should remove all query parameters including non-tracking ones', () => {
            expect(normalizeUrl('https://example.com?z=3&a=1&b=2')).toBe('https://example.com/');
        });

        it('should remove trailing slash from path', () => {
            expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path');
        });

        it('should not remove trailing slash from root path', () => {
            expect(normalizeUrl('https://example.com')).toBe('https://example.com/');
        });

        it('should handle all transformations together', () => {
            const url = 'http://WWW.Example.com/path/?utm_source=twitter&b=2&a=1&utm_medium=social';
            expect(normalizeUrl(url)).toBe('https://example.com/path');
        });

        it('should remove all query parameters including non-tracking ones', () => {
            expect(normalizeUrl('https://example.com?fbclid=123&regular=param')).toBe('https://example.com/');
        });

        it('should handle URLs with no query parameters', () => {
            expect(normalizeUrl('https://example.com/path')).toBe('https://example.com/path');
        });

        it('should handle empty input', () => {
            expect(normalizeUrl('')).toBe('');
        });

        it('should return original URL if normalization fails', () => {
            expect(normalizeUrl('not-a-valid-url')).toBe('not-a-valid-url');
        });
    });
});

describe('selectPreviewImage', () => {
    it('returns null for empty or invalid input', () => {
        expect(selectPreviewImage(null)).toBeNull();
        expect(selectPreviewImage(undefined)).toBeNull();
        expect(selectPreviewImage([])).toBeNull();
        expect(selectPreviewImage('not an array' as any)).toBeNull();
    });

    it('returns the primary image URL when found', () => {
        const images = [
            { url: 'https://example.com/image1.jpg', primary: false },
            { url: 'https://example.com/image2.jpg', primary: true },
            { url: 'https://example.com/image3.jpg', primary: false }
        ];
        expect(selectPreviewImage(images)).toBe('https://example.com/image2.jpg');
    });

    it('returns the first image URL when no primary image found', () => {
        const images = [
            { url: 'https://example.com/image1.jpg' },
            { url: 'https://example.com/image2.jpg' },
            { url: 'https://example.com/image3.jpg' }
        ];
        expect(selectPreviewImage(images)).toBe('https://example.com/image1.jpg');
    });

    it('skips images without URLs and returns the first valid one', () => {
        const images = [
            { width: 100, height: 100 }, // No URL
            null, // Invalid item
            { url: 'https://example.com/image2.jpg' },
            { url: 'https://example.com/image3.jpg' }
        ];
        expect(selectPreviewImage(images)).toBe('https://example.com/image2.jpg');
    });

    it('returns null when no valid URLs are found', () => {
        const images = [
            { width: 100, height: 100 }, // No URL
            { alt: 'Some image' }, // No URL
            null, // Invalid item
            { url: null } // Null URL
        ];
        expect(selectPreviewImage(images)).toBeNull();
    });
});

describe('createMinimalMetadata', () => {
    it('returns empty object when input is null or undefined', () => {
        expect(createMinimalMetadata(null)).toEqual({});
        expect(createMinimalMetadata(undefined)).toEqual({});
    });

    it('excludes html, text, and images from the output', () => {
        const input = {
            title: 'Test Article',
            html: '<html>...</html>',
            text: 'Long article text...',
            images: [{ url: 'https://example.com/image.jpg' }],
            language: 'en',
            tags: ['news', 'politics'],
            sentiment: 0.5
        };

        const result = createMinimalMetadata(input);
        expect(result).not.toHaveProperty('html');
        expect(result).not.toHaveProperty('text');
        expect(result).not.toHaveProperty('images');
    });

    it('preserves other useful metadata fields', () => {
        const input = {
            title: 'Test Article',
            html: '<html>...</html>',
            text: 'Long article text...',
            images: [{ url: 'https://example.com/image.jpg' }],
            language: 'en',
            tags: ['news', 'politics'],
            sentiment: 0.5,
            type: 'article',
            publisherCountry: 'US',
            estimatedDate: '2023-01-01',
            humanLanguage: 'english'
        };

        const result = createMinimalMetadata(input);
        expect(result).toHaveProperty('title', 'Test Article');
        expect(result).toHaveProperty('language', 'en');
        expect(result).toHaveProperty('tags');
        expect(result).toHaveProperty('sentiment', 0.5);
        expect(result).toHaveProperty('type', 'article');
        expect(result).toHaveProperty('publisherCountry', 'US');
        expect(result).toHaveProperty('estimatedDate', '2023-01-01');
        expect(result).toHaveProperty('humanLanguage', 'english');
    });
}); 