// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runAnalysis } from '../pipeline';

const mocks = vi.hoisted(() => ({
    updateJob: vi.fn(),
    extractUrlMetadata: vi.fn(),
    fetchContentFromFirecrawl: vi.fn(),
    analyzeArticle: vi.fn(),
}));
vi.mock('../db', () => ({ updateJob: mocks.updateJob }));
vi.mock('../metadata', () => ({ extractUrlMetadata: mocks.extractUrlMetadata }));
vi.mock('../llm', () => ({ analyzeArticle: mocks.analyzeArticle }));
vi.mock('../firecrawl', async importOriginal => ({
    ...(await importOriginal<typeof import('../firecrawl')>()),
    fetchContentFromFirecrawl: mocks.fetchContentFromFirecrawl,
}));

const article = {
    title: 'Fetched title',
    text: 'Body text',
    html: '<p>Body text</p>',
    author: 'Fetched author',
    date: '2026-10-15',
    siteName: 'Fetched site',
    url: 'https://archive.ph/20261015/https://www.nytimes.com/a',
    fetchStrategy: 'firecrawl' as const,
    isArchiveContent: true,
};
const results = { claims: 'c', report: 'r', slant: 's' };

describe('runAnalysis', () => {
    beforeEach(() => {
        Object.values(mocks).forEach(mock => mock.mockReset());
        mocks.updateJob.mockResolvedValue(undefined);
        mocks.extractUrlMetadata.mockResolvedValue({ title: 'Meta title', image: 'https://cdn/x.jpg', authors: ['Meta author'] });
        mocks.fetchContentFromFirecrawl.mockResolvedValue(article);
        mocks.analyzeArticle.mockResolvedValue(results);
    });

    it('reads paywalled articles from the newest archive snapshot and completes', async () => {
        await runAnalysis({ id: 'j1', url: 'https://www.nytimes.com/a?smid=share', language: 'en' });

        expect(mocks.fetchContentFromFirecrawl).toHaveBeenCalledWith('https://archive.ph/newest/https://www.nytimes.com/a');
        expect(mocks.analyzeArticle).toHaveBeenCalledWith('Fetched title', 'Body text', 'en');
        expect(mocks.updateJob.mock.calls.map(([, fields]) => fields.status)).toEqual(['Fetching', 'Analyzing', 'Complete']);
        expect(mocks.updateJob).toHaveBeenCalledWith('j1', expect.objectContaining({
            article_preview_image_url: 'https://cdn/x.jpg',
            article_author: 'Meta author',
        }));
        expect(mocks.updateJob).toHaveBeenLastCalledWith('j1', { status: 'Complete', analysis_results: results });
    });

    it('fetches other sites directly', async () => {
        await runAnalysis({ id: 'j1', url: 'https://example.com/a', language: 'de' });
        expect(mocks.fetchContentFromFirecrawl).toHaveBeenCalledWith('https://example.com/a');
    });

    it('records a missing snapshot as content unavailable without analyzing', async () => {
        const { ContentUnavailableError } = await import('../firecrawl');
        mocks.fetchContentFromFirecrawl.mockRejectedValue(new ContentUnavailableError('No archived copy of this article exists yet'));

        await runAnalysis({ id: 'j1', url: 'https://www.spiegel.de/a', language: 'de' });

        expect(mocks.analyzeArticle).not.toHaveBeenCalled();
        expect(mocks.updateJob).toHaveBeenLastCalledWith('j1', {
            status: 'Failed',
            error_message: 'CONTENT_UNAVAILABLE_ERROR: No archived copy of this article exists yet',
        });
    });

    it('records other errors and keeps going without the preview when meta tags fail', async () => {
        mocks.extractUrlMetadata.mockRejectedValue(new Error('timeout'));
        mocks.analyzeArticle.mockRejectedValue(new Error('LLM down'));

        await expect(runAnalysis({ id: 'j1', url: 'https://example.com/a', language: 'en' })).resolves.toBeUndefined();

        expect(mocks.updateJob).toHaveBeenLastCalledWith('j1', { status: 'Failed', error_message: 'ANALYSIS_ERROR: LLM down' });
    });
});
