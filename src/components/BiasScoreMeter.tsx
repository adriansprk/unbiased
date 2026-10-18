"use client";

import React from "react";
import type { AnalysisView, BiasLevel } from "@/server/analysis";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { InfoIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";

interface BiasScoreMeterProps {
    biasLevel: BiasLevel;
    articleType: AnalysisView["article_type"];
    summary?: string;
}

const LEVEL = {
    Low: { position: 25, color: "bg-green-500" },
    Moderate: { position: 50, color: "bg-yellow-500" },
    High: { position: 75, color: "bg-red-500" },
} as const;

const BiasScoreMeter: React.FC<BiasScoreMeterProps> = ({ biasLevel, articleType, summary }) => {
    const tCommon = useTranslations("Common");
    const tType = useTranslations("ArticleType");
    const { position, color } = LEVEL[biasLevel];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{tCommon("biasAnalysis")}</h3>
                {articleType && (
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">{tType(articleType.type)}</Badge>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        aria-label={tType("rationale")}
                                        className="inline-flex items-center justify-center focus:outline-none text-muted-foreground hover:text-primary"
                                    >
                                        <InfoIcon className="h-4 w-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent className="w-80 text-sm p-3">
                                    <div className="font-medium mb-1">{tType("rationale")}</div>
                                    <p className="text-xs">{articleType.rationale}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )}
            </div>

            <div className="mt-5 space-y-2">
                <div className="relative h-2 w-full rounded-full bg-gradient-to-r from-green-500/40 via-yellow-500/40 to-red-500/40 dark:from-green-500/30 dark:via-yellow-500/30 dark:to-red-500/30">
                    <div
                        className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-background shadow-lg", color)}
                        style={{ left: `calc(${position}% - 8px)` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{tCommon("low")}</span>
                    <span>{tCommon("moderate")}</span>
                    <span>{tCommon("high")}</span>
                </div>
            </div>

            {articleType?.type === "opinion" && (
                <p className="text-xs text-muted-foreground">{tType("opinionNote")}</p>
            )}

            {summary && (
                <div className="mt-6">
                    <h4 className="text-sm font-medium mb-2">{tCommon("summary")}</h4>
                    <p className="text-sm text-foreground leading-relaxed">{summary}</p>
                </div>
            )}
        </div>
    );
};

export default BiasScoreMeter;
