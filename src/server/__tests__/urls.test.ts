// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { isArchiveUrl, isPaywalledDomain, normalizeUrl } from '../urls';

describe('normalizeUrl', () => {
    it.each([
        ['http://example.com', 'https://example.com/'],
        ['https://EXAMPLE.com', 'https://example.com/'],
        ['https://www.example.com', 'https://example.com/'],
        ['https://example.com?utm_source=twitter&a=1', 'https://example.com/'],
        ['https://example.com/path/', 'https://example.com/path'],
        ['https://example.com/path#section', 'https://example.com/path'],
        ['http://WWW.Example.com/path/?fbclid=123#top', 'https://example.com/path'],
    ])('%s -> %s', (input, expected) => {
        expect(normalizeUrl(input)).toBe(expected);
    });

    it('throws for invalid URLs (callers validate first)', () => {
        expect(() => normalizeUrl('not-a-url')).toThrow();
    });
});

describe('isPaywalledDomain', () => {
    it('matches listed domains and their subdomains', () => {
        expect(isPaywalledDomain('https://www.nytimes.com/a')).toBe(true);
        expect(isPaywalledDomain('https://cooking.nytimes.com/a')).toBe(true);
        expect(isPaywalledDomain('https://www.spiegel.de/a')).toBe(true);
    });

    it('does not match other or look-alike domains', () => {
        expect(isPaywalledDomain('https://example.com/a')).toBe(false);
        expect(isPaywalledDomain('https://notnytimes.com/a')).toBe(false);
        expect(isPaywalledDomain('https://example.com/nytimes.com')).toBe(false);
    });
});

describe('isArchiveUrl', () => {
    it('matches archive.today mirrors by host only', () => {
        expect(isArchiveUrl('https://archive.ph/abc12')).toBe(true);
        expect(isArchiveUrl('https://archive.is/newest/https://x.com/a')).toBe(true);
        expect(isArchiveUrl('https://example.com/archive.ph/a')).toBe(false);
    });
});
