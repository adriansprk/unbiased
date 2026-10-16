import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import logger from './logger';

/**
 * Universal "this is not article content anymore" markers (multi-language)
 * These patterns indicate the start of navigation, related articles, or footer content
 */
const SENTINELS = [
  // German
  /\b(Mehr lesen über|Lesen Sie auch|Weitere Artikel|Lesen Sie mehr zum Thema)\b/i,
  // English
  /\b(Recommended|More from|Read more|Most read|Trending|You might also like|Related articles?|More on this topic)\b/i,
  // Navigation/Footer (multi-language)
  // Note: "Kommentare" and "Comments" require specific context (standalone or with count) to avoid false positives
  /^(Kommentare|Comments)(\s*\(?\d+\)?)?$/mi, // Match only as standalone section heading with optional count
  /\b(Abonnieren|Newsletter|Services|Spiele|Games|Subscribe)\b/i,
  // Site-specific footer markers (generic enough to apply broadly)
  /\b(SPIEGEL Gruppe|Suche starten|Politik|Ausland|Panorama|Sport|Wirtschaft|Wissenschaft|Netzwelt|Kultur|Leben|Geschichte)\s+(Menü|aufklappen)/i,
  // Archive.is navigation and metadata
  /\b(webpage capture|no other snapshots|short link|long link|markdown|html code|wiki code)\b/i,
  // Partner services and calculators (SPIEGEL footer)
  /\b(Serviceangebote von SPIEGEL-Partnern|Bußgeldrechner|Firmenwagenrechner|Brutto-Netto-Rechner|Kurzarbeitergeld-Rechner)\b/i,
  /\b(Gehaltsvergleich|Versicherungen|Währungsrechner|Eurojackpot|GlücksSpirale|LOTTO 6aus49)\b/i,
];

/**
 * Editorial notes that should be preserved (e.g., transparency notices)
 */
const PRESERVE_PATTERNS = [
  /Transparenzhinweis[\s\S]*$/i,
  /Impressum[\s\S]*$/i,
  /Offenlegung[\s\S]*$/i,
];

/**
 * Result from content extraction
 */
export interface ExtractedContent {
  title: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  byline: string | null;
  excerpt: string | null;
  siteName: string | null;
}

/**
 * Extracts article content using Mozilla Readability
 * This is the same engine used by Firefox Reader View
 */
export function extractWithReadability(html: string, url: string): ExtractedContent | null {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      logger.warn('Readability could not extract article content');
      return null;
    }

    return {
      title: article.title || null,
      bodyText: article.textContent?.trim() || null,
      bodyHtml: article.content || null,
      byline: article.byline || null,
      excerpt: article.excerpt || null,
      siteName: article.siteName || null,
    };
  } catch (error) {
    logger.error(`Readability extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

/**
 * Trims content at the first sentinel pattern match
 * Preserves editorial notes like transparency notices
 * Smart detection: only trims if sentinel appears near the end (likely footer)
 */
export function trimAtSentinels(text: string): string {
  if (!text) return text;

  // First, extract and preserve any editorial notes
  const preserved: string[] = [];
  for (const pattern of PRESERVE_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[0]) {
      preserved.push(match[0]);
    }
  }

  // Find sentinel matches and check if they're likely footer sections
  // Only trim if the sentinel is in the last 20% of the text (likely a footer)
  const minFooterPosition = Math.floor(text.length * 0.8);
  let earliestIndex = text.length;

  for (const sentinel of SENTINELS) {
    const match = text.match(sentinel);
    if (match?.index !== undefined && match.index >= minFooterPosition && match.index < earliestIndex) {
      earliestIndex = match.index;
    }
  }

  // Trim at the earliest sentinel (if found in footer region)
  let trimmed = text.slice(0, earliestIndex).trim();

  // Re-append preserved editorial notes if they were removed
  for (const pattern of PRESERVE_PATTERNS) {
    if (!pattern.test(trimmed)) {
      const preserved = PRESERVE_PATTERNS
        .map(rx => text.match(rx)?.[0])
        .filter(Boolean)[0];
      if (preserved) {
        trimmed = `${trimmed}\n\n${preserved.trim()}`;
      }
    }
  }

  return trimmed;
}

/**
 * Removes trailing blocks with high link density (lists of links)
 * This catches navigation/promo blocks that don't have textual sentinels
 */
export function trimHighLinkDensityTail(html: string): string {
  if (!html) return html;

  // Split after common block-level closing tags, keeping each tag with its block
  const blocks = html.split(/(?<=<\/(?:p|div|section|article|ul|ol|aside)>)/i);
  const kept = [...blocks];

  // Walk from bottom, remove blocks with suspiciously high link density
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];

    // Count words (rough approximation)
    const textContent = block.replace(/<[^>]+>/g, ' ');
    const words = (textContent.match(/\w+/g) || []).length;

    // Count words inside links
    const linkText = (block.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || []).join(' ').replace(/<[^>]+>/g, ' ');
    const linkWords = (linkText.match(/\w+/g) || []).length;
    const hasLinks = /<a\b/i.test(block);

    // Closing wrappers and whitespace carry no signal; keep them and look further up
    if (words === 0 && !hasLinks) {
      continue;
    }

    // Share of the block's text that is link text
    const density = words > 0 ? linkWords / words : 1;

    // Heuristic: navigation/footer blocks are short and mostly link text
    if (words < 80 && density > 0.5) {
      kept[i] = '';
    } else {
      // Once we hit a block that looks like article content, stop trimming
      break;
    }
  }

  return kept.join('').trim();
}

/**
 * Converts HTML to plain text (simple strip-tags approach)
 */
export function htmlToText(html: string): string {
  if (!html) return '';

  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
    .replace(/<[^>]+>/g, ' ') // Strip all other tags
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

/**
 * Cleans up text artifacts from HTML extraction
 * Removes stray HTML tag names, excessive whitespace, and formatting issues
 */
export function cleanTextArtifacts(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Remove common social media sharing text from the beginning (multiple occurrences)
  const socialMediaPattern = /^(?:X\.com|Facebook|Twitter|LinkedIn|WhatsApp|E-Mail|Share|Teilen|Reddit|Pinterest)(?:\s+(?:X\.com|Facebook|Twitter|LinkedIn|WhatsApp|E-Mail|Share|Teilen|Reddit|Pinterest))*\s+/i;
  cleaned = cleaned.replace(socialMediaPattern, '');

  // Remove &nbsp; entities
  cleaned = cleaned.replace(/&nbsp;/g, ' ');

  // Remove other common HTML entities
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&apos;/g, "'");
  cleaned = cleaned.replace(/&#39;/g, "'");
  cleaned = cleaned.replace(/&#x27;/g, "'");

  // Collapse multiple spaces
  cleaned = cleaned.replace(/ {2,}/g, ' ');

  // Remove spaces before punctuation
  cleaned = cleaned.replace(/ +([.,!?;:])/g, '$1');

  // Collapse multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

/**
 * Main extraction pipeline: Readability + universal cleanup
 */
export function extractArticleContent(
  html: string,
  url: string,
  options: {
    trimTail?: boolean;
    trimSentinels?: boolean;
  } = {}
): ExtractedContent | null {
  const { trimTail = true, trimSentinels = true } = options;

  // Stage 1: Extract with Readability
  const extracted = extractWithReadability(html, url);
  if (!extracted) return null;

  let { bodyText, bodyHtml } = extracted;

  // Stage 2a: Trim high link-density tail from HTML
  if (trimTail && bodyHtml) {
    bodyHtml = trimHighLinkDensityTail(bodyHtml);
    bodyText = htmlToText(bodyHtml);
  }

  // Stage 2b: Trim at sentinel patterns
  if (trimSentinels && bodyText) {
    bodyText = trimAtSentinels(bodyText);
  }

  // Stage 2c: Clean up text artifacts (HTML tag names, entities, etc.)
  if (bodyText) {
    bodyText = cleanTextArtifacts(bodyText);
  }

  return {
    ...extracted,
    bodyText,
    bodyHtml,
  };
}
