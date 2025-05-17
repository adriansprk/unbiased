import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
    // A list of all locales that are supported
    locales: ['en', 'de'],

    // If this locale is matched, pathnames work without a prefix (e.g. `/about`)
    defaultLocale: 'en',

    // Attempt automatic language detection for first-time visitors
    localeDetection: true,

    // Prefix for locale-prefixed pathnames (e.g. `/en/about`)
    localePrefix: 'always'
});

export const config = {
    // Match all pathnames except for
    // - API routes, static files, etc.
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
}; 