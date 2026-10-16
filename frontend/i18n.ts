import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './src/i18n/routing';

export default getRequestConfig(async ({ locale, requestLocale }) => {
    const requested = locale ?? (await requestLocale);
    const safeLocale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

    return {
        locale: safeLocale,
        messages: (await import(`./src/messages/${safeLocale}`)).default,
        timeZone: 'Europe/Berlin',
        now: new Date()
    };
});
