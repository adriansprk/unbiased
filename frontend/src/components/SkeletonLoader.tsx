"use client";

import React from "react";
import { useTranslations } from "next-intl";

const SkeletonLoader: React.FC = () => {
    const t = useTranslations('SkeletonLoader');

    return (
        <div className="space-y-6">
            {/* Results Heading Skeleton */}
            <h2 className="text-2xl font-bold text-center">{t('analysisResults')}</h2>

            {/* Top Panel with Bias Analysis and Article Preview */}
            <div className="bg-card rounded-lg border border-border overflow-hidden animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Left side: Bias Analysis Skeleton */}
                    <div className="md:col-span-6 p-6 space-y-4">
                        {/* Header with slant tag */}
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">{t('biasAnalysis')}</h3>
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

                    {/* Right side: Article Preview Skeleton */}
                    <div className="md:col-span-6 bg-muted/10 border-t md:border-t-0 md:border-l">
                        <div className="h-full flex flex-col">
                            {/* Image skeleton */}
                            <div className="w-full h-48 bg-gray-200 dark:bg-gray-700"></div>

                            {/* Content section */}
                            <div className="p-4 flex-grow space-y-3">
                                {/* Title skeleton */}
                                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-md w-3/4"></div>

                                {/* Author skeleton */}
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-1/2"></div>

                                {/* Source/URL link skeleton */}
                                <div className="mt-auto pt-2 flex items-center">
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-md w-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dimension Analysis Skeleton */}
            <div className="bg-card p-6 rounded-lg border border-border animate-pulse">
                <h3 className="text-lg font-semibold mb-4">{t('dimensionAnalysis')}</h3>
                <div className="space-y-4">
                    {/* Accordion-like dimension items */}
                    {Array(5).fill(0).map((_, i) => (
                        <div key={i} className="border rounded-lg p-4">
                            <div className="flex items-center space-x-3">
                                {/* Dimension icon */}
                                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0"></div>
                                <div className="flex-grow">
                                    <div className="flex items-center mb-1">
                                        {/* Dimension name */}
                                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-md w-32"></div>
                                        {/* Status badge */}
                                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-md w-16 ml-2"></div>
                                    </div>
                                    {/* Summary */}
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-md w-full"></div>
                                </div>
                                {/* Chevron icon */}
                                <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-md flex-shrink-0"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Claims Display Skeleton */}
            <div className="bg-card p-6 rounded-lg border border-border animate-pulse">
                <h3 className="text-lg font-semibold mb-4">{t('factualClaims')}</h3>
                <div className="space-y-3">
                    {Array(3).fill(0).map((_, i) => (
                        <div key={i} className="border rounded-lg overflow-hidden">
                            <div className="px-4 py-3 flex items-center">
                                {/* Number indicator */}
                                <div className="h-7 w-7 bg-gray-200 dark:bg-gray-700 rounded-full mr-3"></div>
                                <div className="flex-grow">
                                    {/* Topic */}
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-32 mb-1"></div>
                                    {/* Claim statement */}
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-md w-full"></div>
                                </div>
                                {/* Chevron icon */}
                                <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SkeletonLoader;

interface AnalysisOnlySkeletonLoaderProps {
    status?: string;
}

// Variant that only shows the analysis part (no article preview)
export const AnalysisOnlySkeletonLoader: React.FC<AnalysisOnlySkeletonLoaderProps> = ({ status = 'Loading' }) => {
    const t = useTranslations('SkeletonLoader');

    // Get descriptive status message
    const getStatusMessage = () => {
        switch (status) {
            case 'Queued':
                return t('waitingInQueue');
            case 'Processing':
                return t('preparingAnalysis');
            case 'Fetching':
                return t('retrievingContent');
            case 'Analyzing':
                return '';
            default:
                return t('loading');
        }
    };

    return (
        <div className="space-y-8">
            {/* Status message with more detail - hide when status is Analyzing or Fetching */}
            {status !== 'Analyzing' && status !== 'Fetching' && (
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted">
                        <div className="h-3 w-3 rounded-full bg-primary animate-pulse"></div>
                        <span className="text-sm font-medium">{getStatusMessage()}</span>
                    </div>
                </div>
            )}

            {/* Dimension Analysis Skeleton */}
            <div className="bg-card p-6 rounded-lg border border-border animate-pulse">
                <h3 className="text-lg font-semibold mb-4">{t('dimensionAnalysis')}</h3>
                <div className="space-y-4">
                    {/* Accordion-like dimension items */}
                    {Array(5).fill(0).map((_, i) => (
                        <div key={i} className="border rounded-lg p-4">
                            <div className="flex items-center space-x-3">
                                {/* Dimension icon */}
                                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0"></div>
                                <div className="flex-grow">
                                    <div className="flex items-center mb-1">
                                        {/* Dimension name */}
                                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-md w-32"></div>
                                        {/* Status badge */}
                                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-md w-16 ml-2"></div>
                                    </div>
                                    {/* Summary */}
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-md w-full"></div>
                                </div>
                                {/* Chevron icon */}
                                <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-md flex-shrink-0"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Claims Display Skeleton - Only shown in later stages */}
            {status === 'Analyzing' || status === 'Complete' ? (
                <div className="bg-card p-6 rounded-lg border border-border animate-pulse">
                    <h3 className="text-lg font-semibold mb-4">{t('factualClaims')}</h3>
                    <div className="space-y-3">
                        {Array(3).fill(0).map((_, i) => (
                            <div key={i} className="border rounded-lg overflow-hidden">
                                <div className="px-4 py-3 flex items-center">
                                    {/* Number indicator */}
                                    <div className="h-7 w-7 bg-gray-200 dark:bg-gray-700 rounded-full mr-3"></div>
                                    <div className="flex-grow">
                                        {/* Topic */}
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-32 mb-1"></div>
                                        {/* Claim statement */}
                                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-md w-full"></div>
                                    </div>
                                    {/* Chevron icon */}
                                    <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                // For earlier stages, show a simpler message about what's coming
                <div className="bg-card p-6 rounded-lg border border-border">
                    <div className="text-center py-4">
                        <h3 className="text-lg font-semibold mb-2">
                            {status === 'Queued' ? t('preparingAnalysisTitle') :
                                status === 'Processing' ? t('startingAnalysisTitle') :
                                    t('gatheringContentTitle')}
                        </h3>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto">
                            {status === 'Queued' ? t('preparingAnalysisDesc') :
                                status === 'Processing' ? t('startingAnalysisDesc') :
                                    t('gatheringContentDesc')}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}; 