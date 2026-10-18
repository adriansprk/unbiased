"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const AI_HINTS = ["hintSlant", "hintClaims", "hintTone", "hintSources", "hintHeadline"] as const;

interface AnalysisProgressProps {
    status: "Queued" | "Fetching" | "Analyzing";
    /** Read from an archive snapshot */
    paywalled: boolean;
    startedAt: string;
}

/**
 * What a running analysis is doing right now: the steps, which one is active and how long it has been running.
 * The AI step can't report progress, so it cycles through what the model is looking at.
 */
export default function AnalysisProgress({ status, paywalled, startedAt }: AnalysisProgressProps) {
    const t = useTranslations("AnalysisProgress");
    const [now, setNow] = useState<number | null>(null);

    // Set only on the client (the server's clock would cause a hydration mismatch); the timer shows from the first tick
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const elapsed = now === null ? 0 : Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
    const current = status === "Analyzing" ? 1 : 0;
    const steps = [
        {
            label: t(paywalled ? "fetchArchive" : "fetch"),
            detail: status === "Queued" ? t("queued") : t(paywalled ? "fetchArchiveDetail" : "fetchDetail"),
        },
        { label: t("analyze"), detail: t(AI_HINTS[Math.floor(elapsed / 4) % AI_HINTS.length]) },
        { label: t("results"), detail: null },
    ];

    return (
        <div className="bg-card rounded-lg border border-border p-6" role="status" aria-live="polite">
            <div className="flex items-baseline justify-between gap-4 mb-5">
                <h2 className="text-lg font-semibold">{t("title")}</h2>
                {now !== null && (
                    <span className="text-sm tabular-nums text-muted-foreground">
                        {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
                    </span>
                )}
            </div>
            <ol className="space-y-4">
                {steps.map((step, i) => (
                    <li key={step.label} className="flex gap-3">
                        <span
                            className={cn(
                                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs",
                                i < current && "border-primary bg-primary text-primary-foreground",
                                i === current && "border-primary text-primary",
                                i > current && "text-muted-foreground"
                            )}
                        >
                            {i < current ? (
                                <Check className="h-3.5 w-3.5" />
                            ) : i === current ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                i + 1
                            )}
                        </span>
                        <div>
                            <p className={cn("font-medium", i > current && "text-muted-foreground")}>{step.label}</p>
                            {i === current && step.detail && (
                                <p key={step.detail} aria-hidden="true" className="text-sm text-muted-foreground animate-in fade-in duration-500">
                                    {step.detail}
                                </p>
                            )}
                        </div>
                    </li>
                ))}
            </ol>
        </div>
    );
}
