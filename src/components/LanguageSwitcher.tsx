"use client";

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { routing } from '@/i18n/routing';
import logger from "@/utils/logger";

type Locale = (typeof routing.locales)[number];

/**
 * LanguageSwitcher component that allows users to switch between supported languages
 */
export default function LanguageSwitcher() {
    const t = useTranslations('Languages');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    // Function to switch to the next available locale
    const switchLocale = () => {
        // Find the index of the current locale
        const currentIndex = routing.locales.indexOf(locale as Locale);

        // Get the next locale (or the first one if we're at the end)
        const nextIndex = (currentIndex + 1) % routing.locales.length;
        const nextLocale = routing.locales[nextIndex];

        logger.debug(`Switching locale from ${locale} to ${nextLocale}, current pathname: ${pathname}`);

        // Use replace instead of push to avoid adding to the history stack
        router.replace(pathname, { locale: nextLocale });
    };

    logger.debug(`Current locale: ${locale}, available locales: ${routing.locales.join(', ')}`);

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={switchLocale}
            title={t(locale === 'en' ? 'de' : 'en')}
            className="relative"
        >
            <span className="text-sm font-medium">{locale.toUpperCase()}</span>
        </Button>
    );
} 