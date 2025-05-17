"use client";

import React, { useRef, useEffect } from "react";
import { BiasObservation } from "@/types/analysis";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Quote } from "lucide-react";

interface BiasReportDisplayProps {
    overallAssessment: string;
    dimensionSummaries: Record<string, string>;
    detailedFindings: BiasObservation[];
    activeDimension?: string | null;
    hideOverallAssessment?: boolean;
    icon?: React.ReactNode;
}

const BiasReportDisplay: React.FC<BiasReportDisplayProps> = ({
    overallAssessment,
    dimensionSummaries,
    detailedFindings,
    activeDimension,
    hideOverallAssessment = false,
    icon
}) => {
    // Create refs for each dimension section
    const dimensionRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Scroll to active dimension when it changes
    useEffect(() => {
        if (activeDimension && dimensionRefs.current[activeDimension]) {
            dimensionRefs.current[activeDimension]?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }
    }, [activeDimension]);

    return (
        <div className="space-y-8" data-testid="bias-report-display">
            {!hideOverallAssessment && overallAssessment && (
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            {icon}
                            <CardTitle>Overall Bias Assessment</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">{overallAssessment}</p>
                    </CardContent>
                </Card>
            )}

            <div>
                <div className="flex items-center gap-2 mb-4">
                    {icon && !hideOverallAssessment ? null : icon}
                    <h3 className="text-lg font-semibold">Dimension Summaries</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(dimensionSummaries).map(([dimension, summary]) => (
                        <Card
                            key={dimension}
                            id={`dimension-summary-${dimension.toLowerCase().replace(/\s+/g, "-")}`}
                            ref={(el) => {
                                dimensionRefs.current[dimension] = el;
                            }}
                            className={`transition-all ${activeDimension === dimension
                                ? "ring-2 ring-primary ring-offset-1"
                                : ""
                                }`}
                            data-testid={`dimension-summary-${dimension.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                            <CardHeader className="py-3 px-4">
                                <CardTitle className="text-base">{dimension}</CardTitle>
                            </CardHeader>
                            <CardContent className="py-3 px-4 pt-0 text-sm text-muted-foreground">
                                {summary}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-4">Detailed Findings</h3>
                <div className="space-y-5">
                    {detailedFindings.map((finding, index) => (
                        <Card
                            key={index}
                            className="overflow-hidden"
                            data-testid={`finding-${index}`}
                        >
                            <CardHeader className="py-3 px-4 bg-muted/20">
                                <div className="flex items-center mb-2">
                                    <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                                        {finding.dimension}
                                    </Badge>
                                </div>
                                {finding.observation && (
                                    <CardTitle className="text-base">{finding.observation}</CardTitle>
                                )}
                            </CardHeader>
                            <CardContent className="py-4 px-4 space-y-4">
                                {finding.explanation && (
                                    <p className="text-sm">{finding.explanation}</p>
                                )}

                                {finding.quote_evidence && (
                                    <div className="flex gap-3 bg-muted p-4 rounded-md">
                                        <Quote className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Evidence:</p>
                                            <p className="text-sm italic">
                                                {finding.quote_evidence === "N/A - Omission" ? (
                                                    <span className="text-muted-foreground">{finding.quote_evidence}</span>
                                                ) : (
                                                    finding.quote_evidence
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {finding.evidence && !finding.quote_evidence && (
                                    <div className="flex gap-3 bg-muted p-4 rounded-md">
                                        <Quote className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Evidence:</p>
                                            <p className="text-sm italic">
                                                {finding.evidence === "N/A - Omission" ? (
                                                    <span className="text-muted-foreground">{finding.evidence}</span>
                                                ) : (
                                                    finding.evidence
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {finding.impact && (
                                    <div className="mt-2">
                                        <p className="text-sm font-medium mb-1">Impact:</p>
                                        <p className="text-sm text-muted-foreground">{finding.impact}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BiasReportDisplay; 