import { getRequestConfig } from 'next-intl/server';
import { locales } from './src/i18n/routing';

type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale: providedLocale, requestLocale }) => {
    // Use requestLocale to get the active locale from the request context
    // This is more reliable than the locale parameter which can be undefined
    let locale = await requestLocale;

    // Fall back to provided locale or default if requestLocale returns undefined
    if (!locale) {
        locale = providedLocale;
    }

    // Validate that the incoming locale is supported
    const safeLocale = locales.includes(locale as Locale) ? (locale as Locale) : 'en';

    console.log(`i18n.ts: Loading messages for locale ${safeLocale} (requested: ${locale}, from path: ${requestLocale})`);

    try {
        const messages = (await import(`./src/messages/${safeLocale}`)).default;
        console.log(`i18n.ts: Successfully loaded messages for ${safeLocale}`);

        return {
            locale: safeLocale,
            messages,
            timeZone: 'Europe/Berlin',
            now: new Date()
        };
    } catch (error) {
        console.error(`i18n.ts: Error loading messages for ${safeLocale}:`, error);
        // Fallback to English if there's an error
        const fallbackMessages = (await import('./src/messages/en')).default;
        return {
            locale: 'en',
            messages: fallbackMessages,
            timeZone: 'Europe/Berlin',
            now: new Date()
        };
    }
}); 