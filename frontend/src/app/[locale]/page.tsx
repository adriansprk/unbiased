import { setRequestLocale } from 'next-intl/server';
import { locales } from '@/i18n/routing';
import HomeClient from '@/components/pages/HomeClient';

type Locale = (typeof locales)[number];

export default async function Home({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    // Enable static rendering
    setRequestLocale(locale as Locale);

    return <HomeClient />;
} 