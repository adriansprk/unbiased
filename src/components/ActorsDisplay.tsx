"use client";

import React from "react";
import type { AnalysisView } from "@/server/analysis";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

const PORTRAYAL_COLORS = {
    favorable: "bg-green-50 text-green-800 border-green-200",
    neutral: "bg-gray-50 text-gray-800 border-gray-200",
    critical: "bg-red-50 text-red-800 border-red-200",
} as const;

/** How the article itself portrays the people and institutions it is about */
const ActorsDisplay: React.FC<{ actors: AnalysisView["actors"] }> = ({ actors }) => {
    const t = useTranslations("Actors");

    return (
        <div>
            <h3 className="text-lg font-semibold">{t("title")}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t("intro")}</p>
            <ul className="divide-y divide-border">
                {actors.map(actor => (
                    <li key={actor.name} className="py-4 first:pt-0 last:pb-0" data-testid="actor">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{actor.name}</h4>
                            <Badge variant="outline" className={PORTRAYAL_COLORS[actor.portrayal]}>
                                {t(actor.portrayal)}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{actor.rationale}</p>
                        <blockquote className="mt-2 border-l-4 border-slate-300 pl-3 text-sm italic">{actor.quote}</blockquote>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ActorsDisplay;
