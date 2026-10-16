import { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AnalysisCard from "@/components/AnalysisCard";
import AnalyzeForm from "@/components/AnalyzeForm";
import Header from "@/components/Header";
import JobSync from "@/components/JobSync";
import RecentAnalysesList from "@/components/RecentAnalysesList";
import SkeletonLoader from "@/components/SkeletonLoader";
import { HeroSectionDemo } from "@/components/blocks/hero-section-demo";
import { locales } from "@/i18n/routing";
import { getJob } from "@/server/db";
import { JobView, toJobView } from "@/server/jobs";

type Params = Promise<{ jobId: string; locale: string }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadJob(jobId: string) {
    // Always read the current row: the page re-renders while the job runs
    await connection();
    return UUID.test(jobId) ? getJob(jobId) : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { jobId, locale } = await params;
    const t = await getTranslations({ locale: locale as (typeof locales)[number], namespace: "SharedAnalysis" });
    const title = (await loadJob(jobId).catch(() => null))?.article_title;
    return title
        ? { title: `${title} - Unbias`, description: `AI-powered bias analysis for "${title}"` }
        : { title: t("sharedAnalysisTitle") };
}

export default async function AnalysisPage({ params }: { params: Params }) {
    const { jobId, locale } = await params;
    setRequestLocale(locale as (typeof locales)[number]);

    const job = await loadJob(jobId);
    if (!job) notFound();
    const view = toJobView(job);

    const tProgress = await getTranslations("SkeletonLoader");
    const tCard = await getTranslations("AnalysisCard");
    const tRecent = await getTranslations("RecentAnalyses");

    const progressMessage = !view.pending
        ? null
        : view.status === "Analyzing"
            ? tProgress("analyzingAI")
            : view.status === "Fetching"
                ? tProgress(view.paywalled ? "lookingForArchive" : "fetchingContent")
                : tProgress("waitingInQueue");

    const errorMessage: Record<NonNullable<JobView["failure"]>, string> = {
        contentUnavailable: tCard("contentUnavailable"),
        timedOut: tCard("timedOut"),
        failed: tCard("analysisFailed"),
    };

    return (
        <>
            <Header />
            <HeroSectionDemo urlInputComponent={<AnalyzeForm key={jobId} />} progressMessage={progressMessage} />
            <div className="container mx-auto px-4 py-4 max-w-6xl">
                <main>
                    <section id="results-section" className="my-12">
                        {view.article || !view.pending ? (
                            <AnalysisCard
                                key={view.id}
                                jobId={view.id}
                                jobStatus={view.status}
                                articleData={view.article}
                                analysisData={view.analysis}
                                errorMessage={view.failure && errorMessage[view.failure]}
                            />
                        ) : (
                            <SkeletonLoader />
                        )}
                    </section>
                    <section className="mb-12">
                        <h2 className="text-2xl font-bold mb-6">{tRecent("title")}</h2>
                        <RecentAnalysesList />
                    </section>
                </main>
            </div>
            <JobSync
                pending={view.pending}
                historyItem={
                    view.status === "Complete"
                        ? {
                              id: view.id,
                              url: view.article?.url || job.url,
                              title: view.article?.title || job.url,
                              slant: view.analysis?.slant?.category || "Unknown",
                          }
                        : null
                }
            />
        </>
    );
}
