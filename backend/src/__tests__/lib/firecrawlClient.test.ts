import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchContentFromFirecrawl,
  newestArchiveUrl,
  ContentUnavailableError,
} from '../../lib/firecrawlClient';

// A paragraph long enough to pass the minimum article length check
const BODY = 'This is test content about the committee and its findings. '.repeat(30).trim();

async function mockScrape(response: unknown) {
  const mockFirecrawl = { scrape: vi.fn().mockResolvedValue(response) };
  const FirecrawlMock = await import('@mendable/firecrawl-js');
  vi.mocked(FirecrawlMock.default).mockImplementation(() => mockFirecrawl as any);
  return mockFirecrawl;
}

// Mock the config
vi.mock('../../config', () => ({
  default: {
    firecrawl: {
      apiKey: 'test-api-key',
    },
  },
}));

// Mock the logger
vi.mock('../../lib/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock the Firecrawl module
vi.mock('@mendable/firecrawl-js', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      scrape: vi.fn(),
    })),
  };
});

describe('firecrawlClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchContentFromFirecrawl', () => {
    it('should throw error when API key is not configured', async () => {
      // Re-mock config without API key for this specific test
      vi.resetModules();
      vi.doMock('../../config', () => ({
        default: {
          firecrawl: {
            apiKey: '',
          },
        },
      }));

      // Re-import the function to get the new mocked config
      const { fetchContentFromFirecrawl: fetchWithoutKey } = await import('../../lib/firecrawlClient');

      await expect(fetchWithoutKey('https://example.com')).rejects.toThrow(
        'Firecrawl API key is not configured'
      );
    });

    it('should successfully extract content from archive.is URL', async () => {
      // Mock successful Firecrawl response
      const mockFirecrawl = {
        scrape: vi.fn().mockResolvedValue({
          markdown: `# Test Article\n\n${BODY}`,
          html: `<h1>Test Article</h1><p>${BODY}</p>`,
          metadata: {
            title: 'Test Article',
            sourceURL: 'https://archive.is/test',
            url: 'https://archive.ph/20261016192457/https://example.com/test',
            language: 'en',
            ogSiteName: 'Test Site',
          },
        }),
      };

      // Mock the Firecrawl constructor
      const FirecrawlMock = await import('@mendable/firecrawl-js');
      vi.mocked(FirecrawlMock.default).mockImplementation(() => mockFirecrawl as any);

      const result = await fetchContentFromFirecrawl('https://archive.is/test');

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Article');
      // Readability extracts from HTML first; markdown is only the fallback
      expect(result.text).toContain('This is test content');
      expect(result.text).not.toContain('#');
      expect(result.html).toContain('<p>This is test content');
      // The final snapshot URL, not the /newest/ redirect we requested
      expect(result.url).toBe('https://archive.ph/20261016192457/https://example.com/test');
      expect(result.fetchStrategy).toBe('firecrawl');
      expect(result.isArchiveContent).toBe(true);
      expect(mockFirecrawl.scrape).toHaveBeenCalledWith('https://archive.is/test', expect.objectContaining({
        formats: ['html', 'markdown'],
        onlyMainContent: false,
      }));
    });

    it('should handle non-archive URLs', async () => {
      // Mock successful Firecrawl response for regular URL
      const mockFirecrawl = {
        scrape: vi.fn().mockResolvedValue({
          markdown: `# Regular Article\n\n${BODY}`,
          html: `<h1>Regular Article</h1><p>${BODY}</p>`,
          metadata: {
            title: 'Regular Article',
            sourceURL: 'https://example.com/article',
            language: 'en',
          },
        }),
      };

      const FirecrawlMock = await import('@mendable/firecrawl-js');
      vi.mocked(FirecrawlMock.default).mockImplementation(() => mockFirecrawl as any);

      const result = await fetchContentFromFirecrawl('https://example.com/article');

      expect(result).toBeDefined();
      expect(result.title).toBe('Regular Article');
      expect(result.isArchiveContent).toBe(false);
      expect(result.fetchStrategy).toBe('firecrawl');
    });

    it('should fail without retrying when archive.today has no snapshot', async () => {
      const mockFirecrawl = await mockScrape({
        markdown: 'No results',
        metadata: { statusCode: 404 },
      });

      const error = await fetchContentFromFirecrawl(newestArchiveUrl('https://www.spiegel.de/a')).catch(e => e);
      expect(error).toBeInstanceOf(ContentUnavailableError);
      expect(error.message).toBe('No archived copy of this article exists yet');
      expect(mockFirecrawl.scrape).toHaveBeenCalledTimes(1);
    });

    it('should fail without retrying when only a paywall teaser is available', async () => {
      const mockFirecrawl = await mockScrape({
        html: '<article><h1>Huthis</h1><p>Short teaser.</p><p>Diesen Artikel weiterlesen mit SPIEGEL+</p></article>',
        metadata: { statusCode: 200, title: 'Huthis' },
      });

      await expect(fetchContentFromFirecrawl('https://archive.ph/abc12')).rejects.toBeInstanceOf(
        ContentUnavailableError
      );
      expect(mockFirecrawl.scrape).toHaveBeenCalledTimes(1);
    });

    it('should throw error when Firecrawl returns no content', async () => {
      const mockFirecrawl = {
        scrape: vi.fn().mockResolvedValue(null),
      };

      const FirecrawlMock = await import('@mendable/firecrawl-js');
      vi.mocked(FirecrawlMock.default).mockImplementation(() => mockFirecrawl as any);

      await expect(fetchContentFromFirecrawl('https://example.com')).rejects.toThrow(
        'Invalid response from Firecrawl API: No content found'
      );
    });
  });
});
describe('newestArchiveUrl', () => {
  it('points at the newest snapshot and drops query and fragment', () => {
    expect(newestArchiveUrl('https://www.nytimes.com/a.html?smid=x#top')).toBe(
      'https://archive.ph/newest/https://www.nytimes.com/a.html'
    );
  });
});
