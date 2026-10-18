"use client";

import React from "react";
import { DIMENSIONS, type AnalysisView, type Dimension, type DimensionStatus } from "@/server/analysis";
import { Users, Scale, Frame, MessageSquareQuote, Heading } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface UnifiedDimensionAnalysisProps {
    dimensions: AnalysisView["dimensions"];
    findings: AnalysisView["findings"];
}

const ICONS: Record<Dimension, React.ReactNode> = {
    word_choice: <MessageSquareQuote className="h-5 w-5" />,
    framing: <Frame className="h-5 w-5" />,
    sources: <Users className="h-5 w-5" />,
    balance: <Scale className="h-5 w-5" />,
    headline: <Heading className="h-5 w-5" />,
};

const STATUS_COLORS: Record<DimensionStatus, string> = {
    Balanced: "bg-green-50 text-green-800 border-green-200",
    Caution: "bg-yellow-50 text-yellow-800 border-yellow-200",
    Biased: "bg-red-50 text-red-800 border-red-200",
    Unknown: "bg-gray-50 text-gray-800 border-gray-200",
};

const STATUS_LABELS: Record<DimensionStatus, "balanced" | "caution" | "biased" | "unknown"> = {
    Balanced: "balanced",
    Caution: "caution",
    Biased: "biased",
    Unknown: "unknown",
};

const UnifiedDimensionAnalysis: React.FC<UnifiedDimensionAnalysisProps> = ({ dimensions, findings }) => {
    const t = useTranslations("UnifiedDimensionAnalysis");
    const tCommon = useTranslations("Common");
    const tDimension = useTranslations("Dimension");

    return (
        <Accordion type="multiple" className="space-y-3">
            {DIMENSIONS.map(dimension => {
                const { status, summary } = dimensions[dimension];
                const dimensionFindings = findings.filter(f => f.dimension === dimension);
                return (
                    <AccordionItem
                        key={dimension}
                        value={dimension}
                        data-testid={`dimension-${dimension}`}
                        className="border rounded-lg overflow-hidden"
                    >
                        <AccordionTrigger className="hover:no-underline px-4 py-3">
                            <div className="flex items-center text-left w-full">
                                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full mr-3">
                                    {ICONS[dimension]}
                                </div>
                                <div className="flex flex-col items-start">
                                    <div className="flex items-center mb-1">
                                        <h4 className="font-semibold text-md">{tDimension(dimension)}</h4>
                                        <Badge variant="outline" className={`${STATUS_COLORS[status]} ml-2`}>
                                            {tCommon(STATUS_LABELS[status])}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{summary}</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="border-t border-border">
                            {dimensionFindings.length > 0 ? (
                                <div className="divide-y">
                                    {dimensionFindings.map((finding, idx) => (
                                        <div key={idx} className="py-4">
                                            <div className="px-6 py-2">
                                                <h5 className="font-semibold text-md mb-2">{t("observation")}</h5>
                                                <p>{finding.observation}</p>
                                            </div>
                                            <hr className="border-t border-gray-100 dark:border-gray-800 mx-12 my-2" />
                                            <div className="px-6 py-2">
                                                <h5 className="font-semibold text-md mb-2">{t("explanation")}</h5>
                                                <p className="text-muted-foreground">{finding.explanation}</p>
                                            </div>
                                            <hr className="border-t border-gray-100 dark:border-gray-800 mx-12 my-2" />
                                            <div className="px-6 py-2">
                                                <h5 className="font-semibold text-md mb-2">{t("evidence")}</h5>
                                                {finding.quote === null ? (
                                                    <p className="text-sm text-muted-foreground">{t("omission")}</p>
                                                ) : (
                                                    <blockquote className="bg-muted p-4 my-3 rounded-md border-l-4 border-slate-300 italic text-sm leading-relaxed">
                                                        {finding.quote}
                                                    </blockquote>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground italic p-4">{t("noFindings")}</p>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                );
            })}
        </Accordion>
    );
};

export default UnifiedDimensionAnalysis;
