"use client";

import React from "react";
import { DIMENSIONS, type AnalysisView, type Dimension, type DimensionStatus } from "@/server/analysis";
import { Users, Scale, Frame, MessageSquareQuote, Heading, CircleCheck, TriangleAlert, CircleAlert, CircleHelp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export const DIMENSION_ICONS: Record<Dimension, LucideIcon> = {
    word_choice: MessageSquareQuote,
    framing: Frame,
    sources: Users,
    balance: Scale,
    headline: Heading,
};

/** Status is always shown as icon + word, never by color alone */
export const STATUS: Record<DimensionStatus, { label: "balanced" | "caution" | "biased" | "unknown"; icon: LucideIcon; className: string }> = {
    Balanced: {
        label: "balanced",
        icon: CircleCheck,
        className: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900",
    },
    Caution: {
        label: "caution",
        icon: TriangleAlert,
        className: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
    },
    Biased: {
        label: "biased",
        icon: CircleAlert,
        className: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900",
    },
    Unknown: {
        label: "unknown",
        icon: CircleHelp,
        className: "bg-muted text-muted-foreground border-border",
    },
};

export function StatusBadge({ status, className }: { status: DimensionStatus; className?: string }) {
    const t = useTranslations("UnifiedDimensionAnalysis");
    const { label, icon: Icon, className: colors } = STATUS[status];
    return (
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", colors, className)}>
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {t(label)}
        </span>
    );
}

interface UnifiedDimensionAnalysisProps {
    dimensions: AnalysisView["dimensions"];
    findings: AnalysisView["findings"];
}

/** One section per dimension: the rating, then the evidence behind it, all visible */
const UnifiedDimensionAnalysis: React.FC<UnifiedDimensionAnalysisProps> = ({ dimensions, findings }) => {
    const t = useTranslations("UnifiedDimensionAnalysis");
    const tDimension = useTranslations("Dimension");

    return (
        <div className="space-y-6">
            {DIMENSIONS.map(dimension => {
                const { status, summary } = dimensions[dimension];
                const dimensionFindings = findings.filter(f => f.dimension === dimension);
                const Icon = DIMENSION_ICONS[dimension];
                return (
                    <section
                        key={dimension}
                        id={`dimension-${dimension}`}
                        aria-labelledby={`dimension-${dimension}-title`}
                        data-testid={`dimension-${dimension}`}
                        className="scroll-mt-24 overflow-hidden rounded-xl border bg-card"
                    >
                        <div className="p-5 sm:p-6">
                            <div className="flex items-center justify-between gap-3">
                                <h3 id={`dimension-${dimension}-title`} className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
                                    <Icon className="h-6 w-6 shrink-0 text-highlight" aria-hidden />
                                    {tDimension(dimension)}
                                </h3>
                                <StatusBadge status={status} />
                            </div>
                            {summary && <p className="mt-3 max-w-prose leading-relaxed text-foreground/80">{summary}</p>}
                        </div>

                        {dimensionFindings.length > 0 && (
                            <ol className="border-t bg-muted/20">
                                {dimensionFindings.map((finding, idx) => (
                                    <li key={idx} className="border-b p-5 last:border-b-0 sm:p-6">
                                        <div className="max-w-prose">
                                            <h4 className="text-base font-semibold leading-snug">{finding.observation}</h4>
                                            <p className="mt-1.5 text-[0.95rem] leading-relaxed text-muted-foreground">{finding.explanation}</p>
                                            {finding.quote === null ? (
                                                <p className="mt-4 inline-flex rounded-md border border-dashed px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                                    {t("omissionLabel")}
                                                </p>
                                            ) : (
                                                <figure className="mt-4">
                                                    <figcaption className="text-xs font-semibold uppercase tracking-wide text-highlight">
                                                        {t("evidence")}
                                                    </figcaption>
                                                    <blockquote className="mt-2 border-l-2 border-highlight pl-4 text-sm leading-relaxed">
                                                        {finding.quote}
                                                    </blockquote>
                                                </figure>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </section>
                );
            })}
        </div>
    );
};

export default UnifiedDimensionAnalysis;
