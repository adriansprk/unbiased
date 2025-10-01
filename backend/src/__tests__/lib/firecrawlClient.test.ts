import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchContentFromFirecrawl } from '../../lib/firecrawlClient';

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
          markdown: '# Test Article\n\nThis is test content.',
          html: '<h1>Test Article</h1><p>This is test content.</p>',
          metadata: {
            title: 'Test Article',
            sourceURL: 'https://archive.is/test',
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
      expect(result.text).toBe('# Test Article\n\nThis is test content.');
      expect(result.html).toBe('<h1>Test Article</h1><p>This is test content.</p>');
      expect(result.fetchStrategy).toBe('firecrawl');
      expect(result.isArchiveContent).toBe(true);
      expect(mockFirecrawl.scrape).toHaveBeenCalledWith('https://archive.is/test', {
        formats: ['markdown', 'html'],
        onlyMainContent: true,
      });
    });

    it('should handle non-archive URLs', async () => {
      // Mock successful Firecrawl response for regular URL
      const mockFirecrawl = {
        scrape: vi.fn().mockResolvedValue({
          markdown: '# Regular Article\n\nThis is regular content.',
          html: '<h1>Regular Article</h1><p>This is regular content.</p>',
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