import { paywalledDomains } from './config';

/**
 * Canonical form used to recognise the same article across submissions:
 * https, lowercase host without www., no query string or fragment, no trailing slash.
 */
export function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  parsed.protocol = 'https:';
  parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
  parsed.search = '';
  parsed.hash = '';
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }
  return parsed.toString();
}

const ARCHIVE_HOSTS = ['archive.ph', 'archive.is', 'archive.today', 'archive.md'];

function hostOf(url: string): string {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
}

function matchesHost(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export function isArchiveUrl(url: string): boolean {
  const host = hostOf(url);
  return ARCHIVE_HOSTS.some(d => matchesHost(host, d));
}

export function isPaywalledDomain(url: string): boolean {
  const host = hostOf(url);
  return paywalledDomains.some(d => matchesHost(host, d));
}
