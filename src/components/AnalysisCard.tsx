"use client";

import React, { useState } from "react";
import ErrorMessageDisplay from "@/components/ErrorMessageDisplay";
import { ArticleData } from "@/components/ArticlePreview";
import type { AnalysisView } from "@/server/analysis";
import ActorsDisplay from "@/components/ActorsDisplay";
import BiasScoreMeter from "@/components/BiasScoreMeter";
import ClaimsDisplay from "@/components/ClaimsDisplay";
import UnifiedDimensionAnalysis from "@/components/UnifiedDimensionAnalysis";
import ShareableLink from "@/components/ShareableLink";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { AnalysisOnlySkeletonLoader } from "@/components/SkeletonLoader";
import { useTranslations } from "next-intl";

const hostname = (url: string) => {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return url;
    }
};

/** The article being analyzed: the page's h1, with where it comes from and the page actions */
const ArticleHeader: React.FC<{ article: ArticleData; actions?: React.ReactNode }> = ({ article, actions }) => {
    const t = useTranslations("AnalysisCard");
    const { title, author, imageUrl, url } = article;
    const [imageError, setImageError] = useState(false);

    return (
        <header className="flex gap-6">
            <div className="min-w-0 flex-1">
                {url && <p className="text-sm font-medium text-muted-foreground">{hostname(url)}</p>}
                <h1 className="mt-1 text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">{title}</h1>
                {author && <p className="mt-2 text-sm text-muted-foreground">{author}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    {url && (
                        <a
                            href={url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <ExternalLink className="h-4 w-4" aria-hidden />
                            {t("readOriginal")}
                            <span className="sr-only">{t("opensInNewTab")}</span>
                        </a>
                    )}
                    {actions}
                </div>
            </div>
            {imageUrl && !imageError && (
                <div className="relative hidden aspect-[4/3] w-44 shrink-0 overflow-hidden rounded-lg bg-muted sm:block md:w-56">
                    <Image
                        src={imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="224px"
                        onError={() => setImageError(true)}
                        priority
                    />
                </div>
            )}
        </header>
    );
};

interface AnalysisCardProps {
    jobId: string | null;
    jobStatus: string | null;
    articleData?: ArticleData | null;
    analysisData?: AnalysisView | null;
    errorMessage?: string | null;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({
    jobId,
    jobStatus,
    articleData,
    analysisData,
    errorMessage
}) => {
    const t = useTranslations('AnalysisCard');
    const tCommon = useTranslations('Common');
    const complete = jobStatus === "Complete" && analysisData;

    return (
        <div className="space-y-12" data-testid="analysis-card">
            {jobStatus === "Failed" ? (
                <ErrorMessageDisplay message={errorMessage || t('unknownError')} />
            ) : jobId && articleData ? (
                <>
                    <ArticleHeader article={articleData} actions={complete && <ShareableLink jobId={jobId} />} />
                    {complete ? (
                        <>
                            <BiasScoreMeter
                                biasLevel={analysisData.bias_level}
                                articleType={analysisData.article_type}
                                summary={analysisData.summary}
                                dimensions={analysisData.dimensions}
                            />
                            <section aria-labelledby="dimensions-title">
                                <h2 id="dimensions-title" className="text-3xl font-semibold tracking-tight">{tCommon('dimensionAnalysis')}</h2>
                                <p className="mt-2 mb-8 text-muted-foreground">{t('dimensionsIntro')}</p>
                                <UnifiedDimensionAnalysis dimensions={analysisData.dimensions} findings={analysisData.findings} />
                            </section>
                            {analysisData.actors.length > 0 && (
                                <section>
                                    <ActorsDisplay actors={analysisData.actors} />
                                </section>
                            )}
                            <section>
                                <ClaimsDisplay claims={analysisData.claims} />
                            </section>
                        </>
                    ) : (
                        <AnalysisOnlySkeletonLoader status={jobStatus || 'Loading'} />
                    )}
                </>
            ) : null}
        </div>
    );
};

export default AnalysisCard;
