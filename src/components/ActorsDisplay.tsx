"use client";

import React from "react";
import type { AnalysisView } from "@/server/analysis";
import { ThumbsDown, ThumbsUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const PORTRAYALS = ["critical", "neutral", "favorable"] as const;

const PORTRAYAL = {
    critical: { icon: ThumbsDown, bar: "bg-rose-500", className: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900" },
    neutral: { icon: Minus, bar: "bg-zinc-400", className: "bg-muted text-foreground border-border" },
    favorable: { icon: ThumbsUp, bar: "bg-emerald-500", className: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900" },
} as const;

/** How the article itself portrays the people and institutions it is about */
const ActorsDisplay: React.FC<{ actors: AnalysisView["actors"] }> = ({ actors }) => {
    const t = useTranslations("Actors");
    const tClaims = useTranslations("ClaimsDisplay");
    const counts = Object.fromEntries(PORTRAYALS.map(p => [p, actors.filter(a => a.portrayal === p).length]));
    const sorted = [...actors].sort((a, b) => PORTRAYALS.indexOf(a.portrayal) - PORTRAYALS.indexOf(b.portrayal));

    return (
        <div>
            <h2 className="text-xl font-semibold">{t("title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("intro")}</p>

            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                {PORTRAYALS.map(p => (
                    <div key={p} className={PORTRAYAL[p].bar} style={{ width: `${(counts[p] / actors.length) * 100}%` }} />
                ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {PORTRAYALS.map(p => (
                    <li key={p} className="inline-flex items-center gap-1.5">
                        <span className={cn("h-2 w-2 rounded-full", PORTRAYAL[p].bar)} aria-hidden />
                        {t(p)}: <span className="font-medium text-foreground">{counts[p]}</span>
                    </li>
                ))}
            </ul>

            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {sorted.map(actor => {
                    const { icon: Icon, className } = PORTRAYAL[actor.portrayal];
                    return (
                        <li key={actor.name} className="flex flex-col rounded-lg border p-4" data-testid="actor">
                            <div className="flex items-start justify-between gap-3">
                                <h3 className="font-semibold leading-snug">{actor.name}</h3>
                                <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", className)}>
                                    <Icon className="h-3.5 w-3.5" aria-hidden />
                                    {t(actor.portrayal)}
                                </span>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{actor.rationale}</p>
                            <blockquote className="mt-3 border-l-2 border-foreground/30 pl-3 text-sm italic leading-relaxed">
                                <span className="sr-only">{tClaims("inArticle")}: </span>
                                {actor.quote}
                            </blockquote>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default ActorsDisplay;

