import { getTranslations, setRequestLocale } from 'next-intl/server';
import Header from '@/components/Header';
import AnalyzeForm from '@/components/AnalyzeForm';
import RecentAnalysesList from '@/components/RecentAnalysesList';
import { HeroSectionDemo } from '@/components/blocks/hero-section-demo';
import { locales } from '@/i18n/routing';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale as (typeof locales)[number]);
    const t = await getTranslations('RecentAnalyses');

    return (
        <>
            <Header />
            <HeroSectionDemo urlInputComponent={<AnalyzeForm />} />
            <div className="container mx-auto px-4 py-4 max-w-6xl">
                <main>
                    <section className="mb-12">
                        <h2 className="text-2xl font-bold mb-6">{t('title')}</h2>
                        <RecentAnalysesList />
                    </section>
                </main>
            </div>
        </>
    );
}
