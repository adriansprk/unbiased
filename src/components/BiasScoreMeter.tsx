"use client";

import React from "react";
import { DIMENSIONS, type AnalysisView, type BiasLevel } from "@/server/analysis";
import { DIMENSION_ICONS, StatusBadge } from "@/components/UnifiedDimensionAnalysis";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface BiasScoreMeterProps {
    biasLevel: BiasLevel;
    articleType: AnalysisView["article_type"];
    summary?: string;
    dimensions?: AnalysisView["dimensions"];
}

const LEVELS: BiasLevel[] = ["Low", "Moderate", "High"];

const LEVEL = {
    Low: { label: "low", bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
    Moderate: { label: "moderate", bar: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
    High: { label: "high", bar: "bg-rose-500", text: "text-rose-700 dark:text-rose-400" },
} as const;

/** The verdict: overall level, summary, article type, and the five ratings it is calculated from */
const BiasScoreMeter: React.FC<BiasScoreMeterProps> = ({ biasLevel, articleType, summary, dimensions }) => {
    const tCommon = useTranslations("Common");
    const tCard = useTranslations("AnalysisCard");
    const tType = useTranslations("ArticleType");
    const tDimension = useTranslations("Dimension");
    const level = LEVELS.indexOf(biasLevel);
    const flagged = dimensions ? Object.values(dimensions).filter(d => d.status === "Caution" || d.status === "Biased").length : 0;

    return (
        <section aria-labelledby="verdict-title" className="rounded-xl border bg-card p-5 sm:p-8">
            <h2 id="verdict-title" className="sr-only">{tCommon("biasAnalysis")}</h2>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{tCard("overallBiasLevel")}</p>
                    <p className={cn("text-4xl font-semibold tracking-tight", LEVEL[biasLevel].text)}>
                        {tCommon(LEVEL[biasLevel].label)}
                    </p>
                </div>
                <div className="w-full sm:w-64" aria-hidden>
                    <div className="grid grid-cols-3 gap-1">
                        {LEVELS.map((l, i) => (
                            <div key={l} className={cn("h-2 rounded-full", i <= level ? LEVEL[biasLevel].bar : "bg-muted")} />
                        ))}
                    </div>
                    <div className="mt-1.5 grid grid-cols-3 text-xs text-muted-foreground">
                        {LEVELS.map(l => (
                            <span key={l} className={cn(l === biasLevel && "font-semibold text-foreground")}>
                                {tCommon(LEVEL[l].label)}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {summary && <p className="mt-6 text-lg leading-relaxed">{summary}</p>}

            {articleType && (
                <div className="mt-6 rounded-lg bg-muted/60 p-4 text-sm leading-relaxed">
                    <p>
                        <span className="mr-2 inline-flex rounded-full bg-foreground px-2 py-0.5 text-xs font-semibold text-background">
                            {tType(articleType.type)}
                        </span>
                        <span className="sr-only">{tType("rationale")}: </span>
                        {articleType.rationale}
                    </p>
                    {articleType.type === "opinion" && <p className="mt-2 text-muted-foreground">{tType("opinionNote")}</p>}
                </div>
            )}

            {dimensions && (
                <div className="mt-6 border-t pt-5">
                    <p className="text-sm text-muted-foreground">{tCard("flagged", { count: flagged })}</p>
                    <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {DIMENSIONS.map(dimension => {
                            const Icon = DIMENSION_ICONS[dimension];
                            return (
                                <li key={dimension} className="last:odd:col-span-2 sm:last:odd:col-span-1">
                                    <a
                                        href={`#dimension-${dimension}`}
                                        className="flex h-full flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <span className="flex items-start gap-1.5 text-sm font-medium leading-snug">
                                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-highlight" aria-hidden />
                                            {tDimension(dimension)}
                                        </span>
                                        <StatusBadge status={dimensions[dimension].status} className="self-start" />
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </section>
    );
};

export default BiasScoreMeter;
