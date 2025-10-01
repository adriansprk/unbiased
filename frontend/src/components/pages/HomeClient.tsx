"use client";

import React, { useEffect } from "react";
import UrlInput from "@/components/UrlInput";
import ErrorMessageDisplay from "@/components/ErrorMessageDisplay";
import RecentAnalysesList from "@/components/RecentAnalysesList";
import Header from "@/components/Header";
import AnalysisCard from "@/components/AnalysisCard";
import SkeletonLoader from "@/components/SkeletonLoader";
import { Card, CardContent } from "@/components/ui/card";
import { USE_MOCK_API } from '@/lib/config';
import useAnalysisStore from '@/lib/store';
import socketClient from '@/lib/socketClient';
import { HeroSectionDemo } from "@/components/blocks/hero-section-demo";
import { useTranslations, useLocale } from "next-intl";
import logger from "@/utils/logger";

export default function HomeClient() {
    // Get translations and locale
    const recentAnalysesT = useTranslations('RecentAnalyses');
    const progressT = useTranslations('SkeletonLoader');
    const locale = useLocale();

    // Use the Zustand store instead of local state
    const {
        jobId,
        jobStatus,
        errorMessage,
        progressMessage,
        analysisData,
        articleData,
        historyItems,
        isLoading,
        hasStarted,
        isFadingIn,
        loadHistory,
        checkJobStatus
    } = useAnalysisStore();

    // Map progress messages from backend to translation keys
    const getTranslatedProgressMessage = (message: string | null): string | null => {
        if (!message) return null;

        logger.debug(`[PROGRESS TRANSLATION] Raw message: "${message}"`);

        // Map backend messages to translation keys and translate them
        switch (message) {
            case 'Looking for archived version...':
                return progressT('lookingForArchive');
            case 'Checking is...':
                return progressT('checkingIs');
            case 'Checking ph...':
                return progressT('checkingPh');
            case 'Checking today...':
                return progressT('checkingToday');
            case 'Checking md (last attempt)...':
                return progressT('checkingMd');
            case 'Reading archived article...':
                return progressT('readingArchived');
            case 'Fetching article content...':
                return progressT('fetchingContent');
            case 'Analyzing with AI...':
                return progressT('analyzingAI');
            default:
                // If no mapping found, return the raw message
                logger.debug(`[PROGRESS TRANSLATION] No mapping found, returning raw message`);
                return message;
        }
    };

    const translatedProgressMessage = getTranslatedProgressMessage(progressMessage);

    // Load history when component mounts
    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    // Set up periodic status check if stuck in intermediate states
    useEffect(() => {
        let statusCheckInterval: NodeJS.Timeout | null = null;

        if (jobId && ['Queued', 'Processing', 'Fetching', 'Analyzing'].includes(jobStatus || '')) {
            logger.debug(`Setting up status check interval for job ${jobId} in ${jobStatus} state`);
            statusCheckInterval = setInterval(() => {
                logger.debug(`Periodic status check for job ${jobId} (current status: ${jobStatus})`);
                checkJobStatus(jobId);
            }, 3000); // Check every 3 seconds
        }

        return () => {
            if (statusCheckInterval) {
                logger.debug('Clearing status check interval');
                clearInterval(statusCheckInterval);
            }
        };
    }, [jobId, jobStatus, checkJobStatus]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            socketClient.unsubscribeFromJob();
            socketClient.disconnectSocket();
        };
    }, []);

    // Log status changes for debugging
    useEffect(() => {
        logger.debug(`Job status changed to: ${jobStatus}, hasArticleData: ${!!articleData}, hasAnalysisData: ${!!analysisData}`);

        // If we're in a terminal state (Complete or Failed), ensure we've loaded the data
        if (jobId && jobStatus === 'Complete' && !analysisData) {
            logger.debug('In Complete state but missing analysis data, triggering manual check');
            checkJobStatus(jobId);
        }
    }, [jobStatus, jobId, articleData, analysisData, checkJobStatus]);

    // Function to handle successful URL submission - now just logs the URL without triggering another API call
    const handleSubmitSuccess = (url: string) => {
        logger.debug('URL submission initiated:', url, 'with locale:', locale);
        // No longer calling submitUrl here as it's directly called by UrlInput component
    };

    // URL input component to pass to the hero section
    const urlInputComponent = (
        <UrlInput
            onSubmitSuccess={handleSubmitSuccess}
            isLoading={isLoading}
            jobStatus={jobStatus}
        />
    );

    return (
        <>
            <Header />
            {/* Mock API banner at top */}
            {USE_MOCK_API && (
                <div className="text-center mb-4">
                    <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800">
                        Using Mock API
                    </span>
                </div>
            )}

            {/* Modern Hero section with URL input passed directly */}
            <HeroSectionDemo
                urlInputComponent={urlInputComponent}
                progressMessage={translatedProgressMessage}
            />

            <div className="container mx-auto px-4 py-4 max-w-6xl">
                <main>

                    {/* Analysis Section - Show skeleton when in processing states */}
                    {hasStarted && (
                        <section
                            id="results-section"
                            className="my-12 transition-all duration-500 ease-in-out"
                        >
                            {/* 
                Combined approach:
                1. When no article data, show full skeleton
                2. When article data is available but analysis is not complete, show hybrid view with real article and skeleton analysis
                3. When everything is complete, show full analysis 
              */}
                            {(() => {
                                logger.debug("Rendering based on status:", {
                                    jobStatus,
                                    hasArticle: !!articleData,
                                    articleTitle: articleData?.title,
                                    hasImage: !!articleData?.imageUrl
                                });

                                // Show error message if needed
                                if (jobStatus === "Failed" && errorMessage) {
                                    return (
                                        <Card className="overflow-hidden">
                                            <CardContent className="pt-6">
                                                <ErrorMessageDisplay message={errorMessage} />
                                            </CardContent>
                                        </Card>
                                    );
                                }

                                // Check if we have meaningful article data (not just the placeholder)
                                const hasMeaningfulArticleData = articleData &&
                                    (articleData.title !== 'Article being analyzed' || articleData.imageUrl);

                                // Show skeleton until we have meaningful article data
                                if (!hasMeaningfulArticleData) {
                                    return (
                                        <div className={`transition-opacity duration-300 ${isFadingIn ? 'opacity-0' : 'opacity-100'}`}>
                                            <SkeletonLoader />
                                        </div>
                                    );
                                }

                                // Real article data is available - show analysis card with appropriate state
                                if (articleData) {
                                    logger.debug("Rendering AnalysisCard with:", {
                                        jobId,
                                        jobStatus,
                                        hasArticleData: !!articleData,
                                        hasAnalysisData: jobStatus === 'Complete' && !!analysisData
                                    });

                                    return (
                                        <div>
                                            <AnalysisCard
                                                jobId={jobId}
                                                jobStatus={jobStatus}
                                                articleData={articleData}
                                                analysisData={jobStatus === 'Complete' ? analysisData : null}
                                                errorMessage={errorMessage}
                                            />
                                        </div>
                                    );
                                }

                                return null;
                            })()}
                        </section>
                    )}

                    {/* Recent Analyses Section */}
                    <section className="mb-12">
                        <h2 className="text-2xl font-bold mb-6">{recentAnalysesT('title')}</h2>
                        <RecentAnalysesList
                            historyItems={historyItems}
                            selectedJobId={jobId}
                        />
                    </section>
                </main>
            </div>
        </>
    );
} 