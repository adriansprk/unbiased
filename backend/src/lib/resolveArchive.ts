import cheerio from 'cheerio';
import { setTimeout as delay } from 'timers/promises';
import logger from './logger';

const MIRRORS = ['archive.ph', 'archive.today', 'archive.md', 'archive.is'];
const SHORT_RE = /^(?:https?:\/\/[^/]+)?\/([A-Za-z0-9]{4,6})(?:\/|$)/;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36';

function absolute(host: string, href: string): string {
  if (/^https?:\/\//i.test(href)) {
    return href;
  }
  return `https://${host}${href.startsWith('/') ? '' : '/'}${href}`;
}

/**
 * Resolves an original URL to an archive.is snapshot short code URL
 * Avoids using /newest/ to prevent bot challenges
 *
 * @param originalUrl - The original URL to find an archive snapshot for
 * @returns The short code archive URL or null if not found
 */
export async function resolveArchiveSnapshot(originalUrl: string): Promise<string | null> {
  logger.debug(`Resolving archive snapshot for: ${originalUrl}`);

  for (const host of MIRRORS) {
    const base = `https://${host}`;
    // Use the full URL as archive services expect it
    const listingUrl = `${base}/${originalUrl}`;

    try {
      logger.debug(`Trying mirror: ${host} with URL: ${listingUrl}`);

      // 1) Try manual redirect to short code
      const r1 = await fetch(listingUrl, {
        redirect: 'manual',
        headers: {
          'user-agent': UA,
          'accept-language': 'en,de;q=0.9',
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      const loc = r1.headers.get('location') || '';
      if (r1.status >= 300 && r1.status < 400 && SHORT_RE.test(loc)) {
        const resolvedUrl = absolute(host, loc);
        logger.info(`Archive snapshot resolved via redirect: ${resolvedUrl}`);
        return resolvedUrl;
      }

      // 2) Got HTML listing → parse first /<code> link (newest)
      const r2 = await fetch(listingUrl, {
        headers: {
          'user-agent': UA,
          'accept-language': 'en,de;q=0.9',
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!r2.ok) {
        logger.debug(`HTTP ${r2.status} from ${host}`);
        continue;
      }

      const html = await r2.text();
      const $ = cheerio.load(html);

      // Prefer raw short-code links
      const candidates: string[] = [];
      $('a[href]').each((index: number, element: cheerio.Element) => {
        const href = ($(element).attr('href') || '').trim();
        if (SHORT_RE.test(href)) {
          candidates.push(absolute(host, href));
        }
      });

      if (candidates.length) {
        const resolvedUrl = candidates[0]; // Get the newest (first) one
        logger.info(`Archive snapshot resolved via HTML parsing: ${resolvedUrl}`);
        return resolvedUrl;
      }

      // Meta refresh fallback
      const meta = $('meta[http-equiv="refresh"]').attr('content');
      if (meta) {
        const m = /url=(.+)$/i.exec(meta);
        if (m && SHORT_RE.test(m[1])) {
          const resolvedUrl = absolute(host, m[1]);
          logger.info(`Archive snapshot resolved via meta refresh: ${resolvedUrl}`);
          return resolvedUrl;
        }
      }

      logger.debug(`No short code found on ${host}`);
    } catch (error) {
      logger.debug(
        `Error with mirror ${host}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      // try next mirror
    }

    // Rate limiting between mirrors
    await delay(150);
  }

  logger.warn(`No archive snapshot found for: ${originalUrl}`);
  return null;
}
