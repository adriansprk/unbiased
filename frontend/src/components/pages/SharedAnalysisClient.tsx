"use client";

import React, { useEffect } from "react";
import AnalysisCard from "../AnalysisCard";
import SkeletonLoader from "../SkeletonLoader";
import useAnalysisStore from "../../lib/store";
import { useTranslations } from "next-intl";
import { useRouter } from "../../i18n/navigation";
import Header from "../Header";
import { HeroSectionDemo } from "../blocks/hero-section-demo";
import { Button } from "../ui/button";

interface SharedAnalysisClientProps {
    jobId: string;
    locale: string;
}

const SharedAnalysisClient: React.FC<SharedAnalysisClientProps> = ({
    jobId,
    locale: _locale
}) => {
    const t = useTranslations("SharedAnalysis");
    const router = useRouter();

    // Get data from store
    const {
        loadSharedAnalysis,
        jobId: currentJobId,
        jobStatus,
        analysisData,
        articleData,
        errorMessage,
        isLoading,
        hasStarted
    } = useAnalysisStore();

    // Load shared analysis data on mount
    useEffect(() => {
        // Only load if the jobId changes or isn't already loaded
        if (jobId && (!currentJobId || currentJobId !== jobId)) {
            loadSharedAnalysis(jobId);
        }
    }, [jobId, currentJobId, loadSharedAnalysis]);

    // Handle navigation to the main page
    const navigateToMainPage = () => {
        // This ensures we don't get double locale in the URL
        router.push('/');
    };

    // Custom hero section with a "Try it yourself" button instead of URL input
    const heroContent = (
        <div className="flex flex-col items-center gap-6 w-full max-w-xl mx-auto">
            <h2 className="text-xl text-center font-semibold text-muted-foreground">{t("analyzeYourOwn")}</h2>
            <Button
                onClick={navigateToMainPage}
                size="lg"
                className="px-8"
            >
                {t("tryItYourself")}
            </Button>
        </div>
    );

    return (
        <>
            <Header />

            {/* Hero Section with "Try it yourself" button instead of URL input */}
            <HeroSectionDemo urlInputComponent={heroContent} />

            <div className="container mx-auto px-4 py-4 max-w-6xl">
                <main>
                    {/* Loading state */}
                    {isLoading && (!analysisData || !articleData) ? (
                        <section id="results-section" className="my-12">
                            <h1 className="text-2xl font-bold text-center mb-6">{t("loadingSharedAnalysis")}</h1>
                            <SkeletonLoader />
                        </section>
                    ) : errorMessage ? (
                        // Error state
                        <section id="results-section" className="my-12">
                            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                                <h2 className="text-lg font-semibold text-red-700 mb-2">
                                    {errorMessage.includes("Analysis Not Found") ? t("analysisNotFound") :
                                        errorMessage.includes("could not be completed") ? t("analysisFailed") : t("error")}
                                </h2>
                                <p className="text-red-600 mb-4">
                                    {errorMessage.includes("Analysis Not Found") ? t("analysisNotFoundDetails") :
                                        errorMessage.includes("could not be completed") ? t("analysisFailedDetails") : errorMessage}
                                </p>
                                <p className="text-sm text-gray-600">{t("tryNewAnalysis")}</p>
                            </div>
                        </section>
                    ) : (
                        // Analysis results
                        <section id="results-section" className="my-12">
                            {/* Analysis Results */}
                            {hasStarted && (
                                <AnalysisCard
                                    jobId={currentJobId}
                                    jobStatus={jobStatus}
                                    analysisData={analysisData}
                                    articleData={articleData}
                                    errorMessage={errorMessage}
                                />
                            )}

                            {/* Add button at the bottom as well */}
                            <div className="mt-8 flex flex-col items-center gap-4">
                                <h2 className="text-xl font-semibold text-center">{t("analyzeYourOwn")}</h2>
                                <Button
                                    onClick={navigateToMainPage}
                                    size="lg"
                                    className="px-8"
                                >
                                    {t("tryItYourself")}
                                </Button>
                            </div>
                        </section>
                    )}
                </main>
            </div>
        </>
    );
};

export default SharedAnalysisClient; 