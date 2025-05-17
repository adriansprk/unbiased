import React from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import SharedAnalysisClient from "@/components/pages/SharedAnalysisClient";
import { notFound } from "next/navigation";
import apiClient from "@/lib/apiClient";

export async function generateMetadata({
    params
}: {
    params: { jobId: string; locale: string };
}): Promise<Metadata> {
    // Ensure locale is of the correct type
    const validLocale = params.locale === "en" || params.locale === "de" ? params.locale : "en";
    const t = await getTranslations({ locale: validLocale as "en" | "de", namespace: "SharedAnalysis" });

    // Try to get the article title for SEO purposes
    let title = t("sharedAnalysisTitle");
    let description = `Analysis results for job ${params.jobId}`;

    try {
        const statusData = await apiClient.getJobStatus(params.jobId);
        if (statusData && statusData.article_title) {
            title = `${statusData.article_title} - Unbias`;
            description = `AI-powered bias analysis for "${statusData.article_title}"`;
        }
    } catch (error) {
        // If we can't get the job data, use the default title
        console.error("Error fetching job data for metadata:", error);
    }

    return {
        title,
        description
    };
}

// Server-side verification that the job exists
export async function generateStaticParams() {
    return [];
}

export default async function SharedAnalysisPage({
    params
}: {
    params: { jobId: string; locale: string };
}) {
    // Validate jobId format to prevent unnecessary API calls
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.jobId);

    if (!isValidUuid) {
        return notFound();
    }

    return (
        <SharedAnalysisClient jobId={params.jobId} locale={params.locale} />
    );
} 