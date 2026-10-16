"use client"

import { HeroSection } from "@/components/blocks/hero-section"
import { useTranslations } from "next-intl"

interface HeroSectionDemoProps {
    urlInputComponent?: React.ReactNode;
    progressMessage?: string | null;
}

export function HeroSectionDemo({ urlInputComponent, progressMessage }: HeroSectionDemoProps) {
    const t = useTranslations('HeroSection');

    return (
        <HeroSection
            badge={{
                text: t('badge'),
            }}
            title={t('title')}
            description={t('subtitle')}
            showUrlInput={true}
            urlInputComponent={urlInputComponent}
            progressMessage={progressMessage}
        />
    )
} 