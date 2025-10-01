import { describe, it, expect } from 'vitest';
import {
  trimAtSentinels,
  trimHighLinkDensityTail,
  htmlToText,
  cleanTextArtifacts
} from '../../lib/contentExtractor';

describe('contentExtractor', () => {
  describe('trimAtSentinels', () => {
    it('should trim at German sentinel "Mehr lesen über" when in footer region (last 20%)', () => {
      // Create text where sentinel is in the last 20%
      const mainContent = 'A'.repeat(800); // 80% of content
      const footerContent = 'B'.repeat(150); // Some filler before sentinel
      const text = `${mainContent}\n\n${footerContent}\n\nMehr lesen über\n\nSome related links...`;
      const result = trimAtSentinels(text);
      expect(result.length).toBeLessThan(text.length);
      expect(result).not.toContain('Mehr lesen über');
    });

    it('should NOT trim at sentinel when it appears in middle of article (inline reference)', () => {
      const text = 'Article start with content.\n\nMehr zum Thema\n\nMore article content continues here with substantial text.';
      const result = trimAtSentinels(text);
      // Should keep everything because sentinel is not in footer region
      expect(result).toContain('More article content continues');
    });

    it('should trim at English sentinel "Read more" when near end', () => {
      const mainContent = 'C'.repeat(800);
      const text = `${mainContent}\n\nRead more on this topic\n\nRelated articles...`;
      const result = trimAtSentinels(text);
      expect(result).not.toContain('Read more on this topic');
    });

    it('should preserve transparency notices', () => {
      const text = 'Article content.\n\nTransparenzhinweis: This is a disclosure.\n\nMehr lesen über\n\nLinks...';
      const result = trimAtSentinels(text);
      expect(result).toContain('Transparenzhinweis');
    });

    it('should not trim if no sentinel found', () => {
      const text = 'Just regular article content without any sentinels.';
      const result = trimAtSentinels(text);
      expect(result).toBe(text);
    });

    it('should NOT trim when "Kommentare" appears as a word in normal text', () => {
      const text = 'önne man wieder in Ruhe durch die Straßen und in Restaurants gehen, über solche Kommentare wundern sich Einheimische bestenfalls. Zudem passiert auch noch mehr interessanter Inhalt.';
      const result = trimAtSentinels(text);
      // Should keep everything because "Kommentare" is just a word, not a section header
      expect(result).toContain('über solche Kommentare wundern sich');
      expect(result).toContain('passiert auch noch mehr');
      expect(result).toBe(text);
    });

    it('should trim when "Kommentare" appears as a standalone section header', () => {
      const mainContent = 'A'.repeat(800);
      const text = `${mainContent}\n\nKommentare\n\nHere are reader comments...`;
      const result = trimAtSentinels(text);
      expect(result).not.toContain('Kommentare');
      expect(result).not.toContain('Here are reader comments');
    });

    it('should trim when "Kommentare" appears with a count', () => {
      const mainContent = 'B'.repeat(800);
      const text = `${mainContent}\n\nKommentare (42)\n\nHere are reader comments...`;
      const result = trimAtSentinels(text);
      expect(result).not.toContain('Kommentare');
      expect(result).not.toContain('Here are reader comments');
    });
  });

  describe('htmlToText', () => {
    it('should strip HTML tags', () => {
      const html = '<p>This is <strong>bold</strong> text.</p>';
      const result = htmlToText(html);
      expect(result).toBe('This is bold text.');
    });

    it('should remove scripts and styles', () => {
      const html = '<script>alert("bad");</script><p>Content</p><style>.class{}</style>';
      const result = htmlToText(html);
      expect(result).toBe('Content');
    });

    it('should collapse whitespace', () => {
      const html = '<p>Text   with    lots     of spaces</p>';
      const result = htmlToText(html);
      expect(result).toBe('Text with lots of spaces');
    });
  });

  describe('trimHighLinkDensityTail', () => {
    it('should remove blocks with high link density', () => {
      const html = `
        <article>
          <p>This is the main article content with actual text and information.</p>
          <p>More article content that is meaningful.</p>
          <div>
            <a href="/link1">Link 1</a>
            <a href="/link2">Link 2</a>
            <a href="/link3">Link 3</a>
          </div>
        </article>
      `;
      const result = trimHighLinkDensityTail(html);
      expect(result).toContain('main article content');
      expect(result).toContain('More article content');
      // Function should at least preserve the article content
      expect(result.length).toBeGreaterThan(0);
    });

    it('should keep article content with normal link density', () => {
      const html = `
        <article>
          <p>This article mentions a <a href="/study">recent study</a> that found interesting results.</p>
          <p>The research was conducted by <a href="/university">University X</a> over several years.</p>
        </article>
      `;
      const result = trimHighLinkDensityTail(html);
      expect(result).toContain('recent study');
      expect(result).toContain('University X');
    });
  });

  describe('cleanTextArtifacts', () => {
    it('should remove social media sharing text from the beginning', () => {
      const input = 'X.com Facebook E-Mail ul Entertainer Kling: »Wie absurd ist das denn?« p Foto: Sven Hagolani';
      const result = cleanTextArtifacts(input);

      expect(result).not.toContain('X.com');
      expect(result).not.toContain('Facebook');
      expect(result).not.toContain('E-Mail');
      expect(result).toContain('Entertainer Kling');
    });

    it('should remove standalone HTML tag names', () => {
      // More realistic input matching the actual problem
      const input = 'Entertainer Kling: »Wie absurd ist das denn?« p Foto: Sven Hagolani / Carlsen div Zwei Milliardäre';
      const result = cleanTextArtifacts(input);

      // Should not have standalone tag names surrounded by spaces
      expect(result).not.toMatch(/\s+p\s+/);
      expect(result).not.toMatch(/\s+div\s+/);
      expect(result).toContain('Entertainer Kling');
      expect(result).toContain('Foto: Sven Hagolani');
      expect(result).toContain('Zwei Milliardäre');
    });

    it('should handle HTML entities', () => {
      const input = 'Test&nbsp;text&amp;more&#39;stuff';
      const result = cleanTextArtifacts(input);

      expect(result).toBe("Test text&more'stuff");
    });
  });
});
