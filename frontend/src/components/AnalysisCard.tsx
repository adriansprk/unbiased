"use client";

import React, { useState, useEffect } from "react";
import ErrorMessageDisplay from "@/components/ErrorMessageDisplay";
import { ArticleData } from "@/components/ArticlePreview";
import { AnalysisData } from "@/types/analysis";
import { interpretBiasAnalysis } from "@/utils/biasInterpreter";
import BiasScoreMeter from "@/components/BiasScoreMeter";
import ClaimsDisplay from "@/components/ClaimsDisplay";
import UnifiedDimensionAnalysis from "@/components/UnifiedDimensionAnalysis";
import ShareableLink from "@/components/ShareableLink";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { AnalysisOnlySkeletonLoader } from "@/components/SkeletonLoader";
import SkeletonLoader from "@/components/SkeletonLoader";
import logger from "@/utils/logger";
import { useTranslations } from "next-intl";

// Custom ArticleCard component specifically for the analysis view
const ArticleCard: React.FC<{ article: ArticleData }> = ({ article }) => {
    const t = useTranslations('AnalysisCard');
    const { title, author, imageUrl, url } = article;
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    // Store the image URL to detect external changes
    const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(imageUrl);

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

    // Only reset image states when the image URL actually changes
    useEffect(() => {
        if (imageUrl !== currentImageUrl) {
            setImageError(false);
            setImageLoaded(false);
            setCurrentImageUrl(imageUrl);
        }
    }, [imageUrl, currentImageUrl]);

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
    analysisData?: AnalysisData | null;
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
    const [isFadingIn, setIsFadingIn] = useState(true);

    // Add debug logs
    logger.debug('AnalysisCard rendered with props:', {
        jobId,
        jobStatus,
        hasArticleData: !!articleData,
        hasAnalysisData: !!analysisData,
        errorMessage
    });

    if (articleData) {
        logger.debug('Article data detailed:', {
            title: articleData.title,
            author: articleData.author,
            imageUrl: articleData.imageUrl,
            source: articleData.source,
            url: articleData.url
        });
    }

    if (analysisData) {
        logger.debug('Analysis data structure:', {
            hasSlant: !!analysisData.slant,
            hasClaims: !!analysisData.claims,
            hasReport: !!analysisData.report
        });
    }

    // State for tracking the active dimension for scrolling
    const [activeDimension, setActiveDimension] = useState<string | null>(null);

    // Reference to track job ID changes
    const prevJobId = React.useRef<string | null>(null);

    // Track mounted state to prevent updates on unmounted component
    const isMounted = React.useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Set mounted flag to false on unmount
            isMounted.current = false;
        };
    }, []);

    // Update when props change
    useEffect(() => {
        if (!isMounted.current) return;

        logger.debug('AnalysisCard props changed:', {
            jobId,
            jobStatus,
            hasArticleData: !!articleData,
            hasAnalysisData: !!analysisData
        });

        // Reset dimension state when job ID changes
        if (jobId !== prevJobId.current) {
            logger.debug(`Job ID changed from ${prevJobId.current} to ${jobId}, resetting state`);
            prevJobId.current = jobId;
            setActiveDimension(null); // Reset active dimension when job changes
        }

    }, [jobId, jobStatus, articleData, analysisData]);

    useEffect(() => {
        if (!isMounted.current) return;

        if (jobStatus && ['Queued', 'Processing', 'Fetching', 'Analyzing'].includes(jobStatus)) {
            setIsFadingIn(false);
        }
    }, [jobStatus]);

    // Handle dimension icon click to scroll to the corresponding section
    const handleDimensionClick = (dimension: string) => {
        setActiveDimension(dimension);
    };

    // Determine what to display based on the job status
    const renderContent = () => {
        if (!jobId || !jobStatus) {
            logger.debug('No job ID or status');
            return null;
        }

        logger.debug(`Rendering content for job status: ${jobStatus}, props analysisData exists: ${!!analysisData}, props articleData exists: ${!!articleData}`);

        // Show error message if status is Failed
        if (jobStatus === "Failed") {
            logger.debug('Job failed');
            return (
                <ErrorMessageDisplay message={errorMessage || t('unknownError')} />
            );
        }

        // Show analysis if article data is available
        if (articleData) {
            logger.debug('Article data is available for rendering');
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
                                    (() => {
                                        try {
                                            logger.debug('Processing analysis data from props directly');
                                            logger.trace('Raw analysis data:', analysisData);
                                            const processedData = interpretBiasAnalysis(analysisData);
                                            logger.debug('Processed data:', processedData);

                                            return (
                                                <div className="space-y-4">
                                                    <BiasScoreMeter
                                                        biasLevel={processedData.overallBiasLevel}
                                                        slantCategory={processedData.slantCategory}
                                                        slantConfidence={processedData.slantConfidence}
                                                        slantRationale={analysisData.slant?.rationale}
                                                        overallAssessment={analysisData.report?.bias_analysis?.overall_assessment}
                                                    />
                                                </div>
                                            );
                                        } catch (error) {
                                            logger.error('Error processing bias analysis:', error);
                                            return <p>{t('errorDisplayingBias')}: {String(error)}</p>;
                                        }
                                    })()
                                ) : (
                                    // Updated skeleton placeholder for bias analysis when not complete
                                    <div className="animate-pulse">
                                        {/* Header with slant tag */}
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold">
                                                {tCommon('biasAnalysis')}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                {/* Slant Badge */}
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
                                {articleData && <ArticleCard article={articleData} />}
                            </div>
                        </div>
                    </div>

                    {/* Detailed Results Sections - only shown when analysis is complete */}
                    {jobStatus === "Complete" && analysisData ? (
                        <div className="space-y-8">
                            {/* Dimension Status Icons */}
                            <div className="bg-card p-6 rounded-lg border border-border">
                                <h3 className="text-lg font-semibold mb-4">{tCommon('dimensionAnalysis')}</h3>
                                {(() => {
                                    try {
                                        // Ensure we have valid data before trying to validate it
                                        if (!analysisData || !analysisData.report || !analysisData.report.bias_analysis) {
                                            return <p className="text-muted-foreground">{t('analysisDataIncomplete')}</p>;
                                        }

                                        const processedData = interpretBiasAnalysis(analysisData);
                                        logger.debug('Dimension statuses:', processedData.dimensionStatuses);

                                        // Ensure dimension_summaries is an object
                                        const dimensionSummaries = analysisData.report.bias_analysis.dimension_summaries || {};
                                        if (typeof dimensionSummaries !== 'object' || dimensionSummaries === null) {
                                            logger.warn('Invalid dimension_summaries format:', dimensionSummaries);
                                            return <p className="text-muted-foreground">{t('dimensionDataInvalid')}</p>;
                                        }

                                        logger.debug('DEBUG - AnalysisCard - dimension_summaries:', JSON.stringify(dimensionSummaries, null, 2));
                                        logger.debug('DEBUG - AnalysisCard - dimension_summaries type:', typeof dimensionSummaries);
                                        logger.debug('DEBUG - AnalysisCard - dimension_summaries keys:', Object.keys(dimensionSummaries));

                                        // Check if dimension_summaries is an array instead of an object
                                        if (Array.isArray(dimensionSummaries)) {
                                            logger.error('DEBUG - AnalysisCard - dimension_summaries is an array, not an object!');
                                            // Convert array to object if needed
                                            const convertedSummaries: Record<string, { summary: string, status: string }> = {};
                                            dimensionSummaries.forEach((item) => {
                                                if (item && typeof item === 'object' && 'dimension' in item) {
                                                    const dimension = String(item.dimension);
                                                    convertedSummaries[dimension] = {
                                                        summary: item.summary || '',
                                                        status: item.status || 'Unknown'
                                                    };
                                                }
                                            });
                                            logger.debug('DEBUG - AnalysisCard - converted dimension_summaries:', convertedSummaries);
                                            return (
                                                <UnifiedDimensionAnalysis
                                                    dimensionStatuses={processedData.dimensionStatuses}
                                                    dimensionSummaries={convertedSummaries}
                                                    detailedFindings={analysisData.report.bias_analysis.detailed_findings}
                                                    onDimensionClick={handleDimensionClick}
                                                    activeDimension={activeDimension}
                                                />
                                            );
                                        }

                                        // Ensure detailed_findings is an array
                                        const detailedFindings = Array.isArray(analysisData.report.bias_analysis.detailed_findings)
                                            ? analysisData.report.bias_analysis.detailed_findings
                                            : [];

                                        return (
                                            <UnifiedDimensionAnalysis
                                                dimensionStatuses={processedData.dimensionStatuses}
                                                dimensionSummaries={dimensionSummaries}
                                                detailedFindings={detailedFindings}
                                                onDimensionClick={handleDimensionClick}
                                                activeDimension={activeDimension}
                                            />
                                        );
                                    } catch (error) {
                                        logger.error('Error interpreting dimension statuses:', error);
                                        return <p className="text-muted-foreground">{t('errorDisplayingDimension')}</p>;
                                    }
                                })()}
                            </div>

                            {/* Claims Display - Full Width */}
                            {analysisData.claims && analysisData.claims.factual_claims && (
                                <div className="bg-card p-6 rounded-lg border border-border">
                                    <ClaimsDisplay
                                        claims={analysisData.claims.factual_claims}
                                    />
                                </div>
                            )}

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
                <div className={`transition-opacity duration-300 ${isFadingIn ? 'opacity-0' : 'opacity-100'}`}>
                    <SkeletonLoader />
                </div>
            )}
        </div>
    );
};

export default AnalysisCard; 