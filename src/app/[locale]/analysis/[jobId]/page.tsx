import { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import AnalysisCard from "@/components/AnalysisCard";
import AnalysisProgress from "@/components/AnalysisProgress";
import Header from "@/components/Header";
import JobSync from "@/components/JobSync";
import SkeletonLoader from "@/components/SkeletonLoader";
import { Link } from "@/i18n/navigation";
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

    const tProgress = await getTranslations("AnalysisProgress");
    const tCard = await getTranslations("AnalysisCard");

    const errorMessage: Record<NonNullable<JobView["failure"]>, string> = {
        contentUnavailable: tCard("contentUnavailable"),
        timedOut: tCard("timedOut"),
        failed: tCard("analysisFailed"),
    };

    return (
        <>
            <Header />
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {tProgress("newAnalysis")}
                </Link>
                <main className="mt-6 mb-12 space-y-8">
                    {view.status !== "Complete" && view.status !== "Failed" && (
                        <AnalysisProgress status={view.status} paywalled={view.paywalled} startedAt={view.startedAt} />
                    )}
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
                          }
                        : null
                }
            />
        </>
    );
}
