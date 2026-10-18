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
import SkeletonLoader from "@/components/SkeletonLoader";
import { useTranslations } from "next-intl";

// Custom ArticleCard component specifically for the analysis view
const ArticleCard: React.FC<{ article: ArticleData }> = ({ article }) => {
    const t = useTranslations('AnalysisCard');
    const { title, author, imageUrl, url } = article;
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    // Function to extract domain from URL for display
    const getTruncatedUrl = (url: string) => {
        try {
            const urlObj = new URL(url);
            // Return just the hostname (domain)
            return urlObj.hostname;
        } catch {
            // Fallback: remove protocol and extract domain manually
            return url.replace(/^https?:\/\//, '').split('/')[0];
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Image section */}
            {imageUrl && !imageError ? (
                <div className="relative w-full h-48 md:rounded-tr-lg overflow-hidden">
                    <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700"></div>
                    <Image
                        src={imageUrl}
                        alt={title || t('articleTitle')}
                        fill
                        className={`object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                        sizes="(max-width: 768px) 100vw, 768px"
                        onError={() => setImageError(true)}
                        onLoad={() => setImageLoaded(true)}
                        priority
                    />
                </div>
            ) : (
                <div className="w-full h-36 bg-gray-200 dark:bg-gray-700 flex items-center justify-center md:rounded-tr-lg">
                    <span className="text-muted-foreground">{t('imageUnavailable')}</span>
                </div>
            )}

            {/* Content section */}
            <div className="p-6 flex-grow flex flex-col justify-between">
                <div>
                    {/* Title */}
                    <h3 className="text-xl font-semibold mb-3">{title}</h3>

                    {/* Author - only if available */}
                    {author && (
                        <p className="text-sm text-muted-foreground">{author}</p>
                    )}
                </div>

                {/* URL link at bottom */}
                {url && (
                    <div className="mt-4 pt-4 border-t border-border/50 flex items-center">
                        <ExternalLink className="h-3 w-3 mr-1.5 text-muted-foreground/70" />
                        <a
                            href={url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-xs text-muted-foreground/70 hover:text-primary transition-colors"
                        >
                            {getTruncatedUrl(url)}
                        </a>
                    </div>
                )}
            </div>
        </div>
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

    // Determine what to display based on the job status
    const renderContent = () => {
        if (!jobId || !jobStatus) {
            return null;
        }

        // Show error message if status is Failed
        if (jobStatus === "Failed") {
            return (
                <ErrorMessageDisplay message={errorMessage || t('unknownError')} />
            );
        }

        // Show analysis if article data is available
        if (articleData) {
            return (
                <div className="space-y-6">
                    {/* Results Heading */}
                    <h2 className="text-2xl font-bold text-center">
                        {tCommon('analysisResults')}
                    </h2>

                    {/* Top Panel with Bias Analysis and Article Preview */}
                    <div className="bg-card rounded-lg border border-border">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            {/* Left side: Bias Score Meter with Overall Assessment */}
                            <div className="md:col-span-6 p-6 space-y-4">
                                {jobStatus === "Complete" && analysisData ? (
                                    <BiasScoreMeter
                                        biasLevel={analysisData.bias_level}
                                        articleType={analysisData.article_type}
                                        summary={analysisData.summary}
                                    />
                                ) : (
                                    // Updated skeleton placeholder for bias analysis when not complete
                                    <div className="animate-pulse">
                                        {/* Header with article type */}
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold">
                                                {tCommon('biasAnalysis')}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                {/* Article type badge */}
                                                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-md w-20"></div>
                                                {/* Confidence */}
                                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-md w-24"></div>
                                                {/* Info icon */}
                                                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                                            </div>
                                        </div>

                                        {/* Bias meter with proper spacing */}
                                        <div className="mt-5 space-y-2">
                                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-md w-full"></div>
                                            <div className="flex justify-between mt-1">
                                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-md w-8"></div>
                                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-md w-16"></div>
                                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-md w-8"></div>
                                            </div>
                                        </div>

                                        {/* Summary section with heading */}
                                        <div className="mt-6">
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-16 mb-2"></div>
                                            <div className="space-y-2">
                                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-md w-full"></div>
                                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-md w-5/6"></div>
                                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-md w-4/6"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right side: Article Preview - Now using our custom ArticleCard */}
                            <div className="md:col-span-6 bg-muted/10 border-t md:border-t-0 md:border-l md:rounded-tr-lg">
                                {articleData && <ArticleCard key={articleData.imageUrl} article={articleData} />}
                            </div>
                        </div>
                    </div>

                    {/* Detailed Results Sections - only shown when analysis is complete */}
                    {jobStatus === "Complete" && analysisData ? (
                        <div className="space-y-8">
                            {analysisData.actors.length > 0 && (
                                <div className="bg-card p-6 rounded-lg border border-border">
                                    <ActorsDisplay actors={analysisData.actors} />
                                </div>
                            )}

                            <div className="bg-card p-6 rounded-lg border border-border">
                                <h3 className="text-lg font-semibold mb-4">{tCommon('dimensionAnalysis')}</h3>
                                <UnifiedDimensionAnalysis
                                    dimensions={analysisData.dimensions}
                                    findings={analysisData.findings}
                                />
                            </div>

                            <div className="bg-card p-6 rounded-lg border border-border">
                                <ClaimsDisplay claims={analysisData.claims} />
                            </div>

                            {/* Shareable Link Section */}
                            {jobId && (
                                <ShareableLink jobId={jobId} />
                            )}
                        </div>
                    ) : (
                        // Different skeleton state based on current job status
                        <AnalysisOnlySkeletonLoader
                            status={jobStatus || 'Loading'}
                        />
                    )}
                </div>
            );
        }

        // Fallback (should rarely be seen since we're conditionally rendering the card)
        return null;
    };

    return (
        <div className="transition-all duration-300 ease-in-out" data-testid="analysis-card">
            {renderContent()}
            {jobStatus && ['Queued', 'Processing', 'Fetching', 'Analyzing'].includes(jobStatus) && !articleData && (
                <div className="animate-in fade-in duration-300">
                    <SkeletonLoader />
                </div>
            )}
        </div>
    );
};

export default AnalysisCard; 