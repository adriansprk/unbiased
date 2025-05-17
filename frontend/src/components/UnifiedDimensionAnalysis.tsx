"use client";

import React, { useEffect, useRef } from "react";
import { BiasObservation, DimensionSummary, DimensionStatus } from "@/types/analysis";
import {
    AlertCircle,
    Users,
    Scale,
    Frame,
    MessageSquareQuote,
    Heading
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import logger from "@/utils/logger";

interface UnifiedDimensionAnalysisProps {
    dimensionStatuses: Record<string, DimensionStatus>;
    dimensionSummaries: Record<string, DimensionSummary>;
    detailedFindings: BiasObservation[];
    activeDimension?: string | null;
    onDimensionClick?: (dimension: string) => void;
}

const UnifiedDimensionAnalysis: React.FC<UnifiedDimensionAnalysisProps> = ({
    dimensionStatuses,
    dimensionSummaries,
    detailedFindings,
    activeDimension,
    onDimensionClick
}) => {
    const t = useTranslations('UnifiedDimensionAnalysis');
    const tCommon = useTranslations('Common');

    // Use a stable ref object that won't change between renders
    const dimensionRefsMap = useRef<Map<string, HTMLDivElement | null>>(new Map());

    // Track mounted state to prevent updates on unmounted component
    const isMounted = useRef(true);

    useEffect(() => {
        return () => {
            // Set mounted flag to false on unmount
            isMounted.current = false;
        };
    }, []);

    // Scroll to active dimension when it changes
    useEffect(() => {
        if (!isMounted.current) return;

        if (activeDimension) {
            const element = dimensionRefsMap.current.get(activeDimension);
            if (element) {
                try {
                    element.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    });
                } catch (error) {
                    logger.error("Error scrolling to element:", error);
                }
            }
        }
    }, [activeDimension]);

    // Get dimension icon based on name
    const getDimensionIcon = (dimension: string) => {
        switch (dimension) {
            case "Source Selection":
                return <Users className="h-5 w-5" />;
            case "Fairness / Balance":
                return <Scale className="h-5 w-5" />;
            case "Framing / Emphasis":
                return <Frame className="h-5 w-5" />;
            case "Word Choice / Tone":
                return <MessageSquareQuote className="h-5 w-5" />;
            case "Headline / Title Bias":
                return <Heading className="h-5 w-5" />;
            default:
                return <AlertCircle className="h-5 w-5" />;
        }
    };

    // Get status color class based on API status
    const getStatusColorClass = (apiStatus: string): string => {
        switch (apiStatus) {
            case "Balanced":
                return "bg-green-50 text-green-800 border-green-200";
            case "Caution":
                return "bg-yellow-50 text-yellow-800 border-yellow-200";
            case "Biased":
                return "bg-red-50 text-red-800 border-red-200";
            case "Unknown":
            default:
                return "bg-gray-50 text-gray-800 border-gray-200";
        }
    };

    // Group detailed findings by dimension - with safety checks
    const findingsByDimension = React.useMemo(() => {
        if (!Array.isArray(detailedFindings)) return {};

        return detailedFindings.reduce<Record<string, BiasObservation[]>>((acc, finding) => {
            if (finding && finding.dimension) {
                if (!acc[finding.dimension]) {
                    acc[finding.dimension] = [];
                }
                acc[finding.dimension].push(finding);
            }
            return acc;
        }, {});
    }, [detailedFindings]);

    // Create combined dimension data with status, summary, and findings
    const combinedDimensions = React.useMemo(() => {
        // Safety check for dimensionStatuses
        if (!dimensionStatuses || typeof dimensionStatuses !== 'object') {
            logger.warn('DEBUG - dimensionStatuses is not an object:', dimensionStatuses);
            return [];
        }

        logger.debug('DEBUG - UnifiedDimensionAnalysis - dimensionStatuses:', dimensionStatuses);
        logger.debug('DEBUG - UnifiedDimensionAnalysis - dimensionSummaries:', JSON.stringify(dimensionSummaries, null, 2));

        return Object.entries(dimensionStatuses).map(([dimension, status]) => {
            // Ensure we have a valid summary object
            const summaryObj = dimensionSummaries?.[dimension];
            logger.debug(`DEBUG - UnifiedDimensionAnalysis - Processing dimension ${dimension}:`, JSON.stringify(summaryObj, null, 2));

            let summary = "";
            let apiStatus = status || "Unknown"; // Default to the status from dimensionStatuses

            // Handle different formats of dimension summaries
            if (summaryObj) {
                if (typeof summaryObj === 'string') {
                    // Handle case where summary is just a string
                    logger.debug(`DEBUG - UnifiedDimensionAnalysis - Dimension ${dimension} has string value:`, summaryObj);
                    summary = summaryObj;
                } else if (typeof summaryObj === 'object' && summaryObj !== null) {
                    // Handle case where summary is an object with summary and status
                    logger.debug(`DEBUG - UnifiedDimensionAnalysis - Dimension ${dimension} has object value with keys:`, Object.keys(summaryObj));
                    summary = 'summary' in summaryObj ? summaryObj.summary || "" : "";
                    // Ensure the status is one of the allowed values
                    if ('status' in summaryObj && typeof summaryObj.status === 'string' &&
                        ['Balanced', 'Caution', 'Biased', 'Unknown'].includes(summaryObj.status)) {
                        apiStatus = summaryObj.status as DimensionStatus;
                    }
                    logger.debug(`DEBUG - UnifiedDimensionAnalysis - Extracted summary: "${summary}", status: "${apiStatus}"`);
                }
            } else {
                logger.warn(`DEBUG - UnifiedDimensionAnalysis - No summary object for dimension ${dimension}`);
            }

            return {
                dimension,
                status,
                summary,
                apiStatus,
                findings: findingsByDimension[dimension] || []
            };
        });
    }, [dimensionStatuses, dimensionSummaries, findingsByDimension]);

    // Safe click handler
    const handleDimensionClick = (dimension: string) => {
        if (onDimensionClick && typeof onDimensionClick === 'function') {
            onDimensionClick(dimension);
        }
    };

    // Set ref callback
    const setDimensionRef = (dimension: string, element: HTMLDivElement | null) => {
        if (isMounted.current) {
            dimensionRefsMap.current.set(dimension, element);
        }
    };

    // If no dimensions, render a placeholder
    if (combinedDimensions.length === 0) {
        return <div className="p-4 text-center text-muted-foreground">{t('noDimensionData')}</div>;
    }

    return (
        <div>
            <Accordion type="multiple" className="space-y-3">
                {combinedDimensions.map((item, index) => (
                    <AccordionItem
                        key={`${item.dimension}-${index}`}
                        value={`dimension-${index}`}
                        ref={(el: HTMLDivElement | null) => setDimensionRef(item.dimension, el)}
                        data-testid={`dimension-${item.dimension.toLowerCase().replace(/\s+/g, "-")}`}
                        className={`border rounded-lg overflow-hidden ${activeDimension === item.dimension
                            ? "ring-2 ring-primary ring-offset-1"
                            : ""
                            }`}
                    >
                        <AccordionTrigger
                            className="hover:no-underline px-4 py-3"
                            onClick={() => handleDimensionClick(item.dimension)}
                        >
                            <div className="flex items-center text-left w-full">
                                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full mr-3">
                                    {getDimensionIcon(item.dimension)}
                                </div>
                                <div className="flex flex-col items-start">
                                    <div className="flex items-center mb-1">
                                        <h4 className="font-semibold text-md">
                                            {item.dimension === "Source Selection" ? tCommon('sourceSelection') :
                                                item.dimension === "Fairness / Balance" ? tCommon('fairnessBalance') :
                                                    item.dimension === "Framing / Emphasis" ? tCommon('framingEmphasis') :
                                                        item.dimension === "Word Choice / Tone" ? tCommon('wordChoiceTone') :
                                                            item.dimension === "Headline / Title Bias" ? tCommon('headlineTitleBias') :
                                                                item.dimension}
                                        </h4>
                                        <Badge
                                            variant="outline"
                                            className={`${getStatusColorClass(item.apiStatus)} ml-2`}
                                        >
                                            {item.apiStatus === "Balanced" ? tCommon('balanced') :
                                                item.apiStatus === "Caution" ? tCommon('caution') :
                                                    item.apiStatus === "Biased" ? tCommon('biased') :
                                                        tCommon('unknown')}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {item.summary}
                                    </p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="border-t border-border">
                            {item.findings.length > 0 ? (
                                <div className="divide-y">
                                    {item.findings.map((finding, idx) => (
                                        <div key={`finding-${index}-${idx}`} className="py-4">
                                            {/* Observation section */}
                                            {finding.observation && (
                                                <div className="px-6 py-2">
                                                    <h5 className="font-semibold text-md mb-2">{t('observation')}</h5>
                                                    <p>{finding.observation}</p>
                                                </div>
                                            )}

                                            {/* Divider - only if next section exists */}
                                            {finding.observation && (finding.explanation || finding.quote_evidence || finding.evidence || finding.impact) && (
                                                <hr className="border-t border-gray-100 dark:border-gray-800 mx-12 my-2" />
                                            )}

                                            {/* Explanation section */}
                                            {finding.explanation && (
                                                <div className="px-6 py-2">
                                                    <h5 className="font-semibold text-md mb-2">{t('explanation')}</h5>
                                                    <p className="text-muted-foreground">{finding.explanation}</p>
                                                </div>
                                            )}

                                            {/* Divider - only if next section exists */}
                                            {finding.explanation && (finding.quote_evidence || finding.evidence || finding.impact) && (
                                                <hr className="border-t border-gray-100 dark:border-gray-800 mx-12 my-2" />
                                            )}

                                            {/* Evidence section */}
                                            {finding.quote_evidence && (
                                                <div className="px-6 py-2">
                                                    <h5 className="font-semibold text-md mb-2">{t('evidence')}</h5>
                                                    <div className="bg-muted p-4 my-3 rounded-md border-l-4 border-slate-300 italic">
                                                        <p className="not-italic font-medium text-xs mb-2 text-muted-foreground">{t('source')}</p>
                                                        <p className="text-sm leading-relaxed">
                                                            {finding.quote_evidence === "N/A - Omission" ? (
                                                                <span className="text-muted-foreground not-italic">{t('omission')}</span>
                                                            ) : (
                                                                finding.quote_evidence
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {finding.evidence && !finding.quote_evidence && (
                                                <div className="px-6 py-2">
                                                    <h5 className="font-semibold text-md mb-2">{t('evidence')}</h5>
                                                    <div className="bg-muted p-4 my-3 rounded-md border-l-4 border-slate-300 italic">
                                                        <p className="not-italic font-medium text-xs mb-2 text-muted-foreground">{t('source')}</p>
                                                        <p className="text-sm leading-relaxed">
                                                            {finding.evidence === "N/A - Omission" ? (
                                                                <span className="text-muted-foreground not-italic">{t('omission')}</span>
                                                            ) : (
                                                                finding.evidence
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Divider - only if next section exists */}
                                            {(finding.quote_evidence || finding.evidence) && finding.impact && (
                                                <hr className="border-t border-gray-100 dark:border-gray-800 mx-12 my-2" />
                                            )}

                                            {/* Impact section */}
                                            {finding.impact && (
                                                <div className="px-6 py-2">
                                                    <h5 className="font-semibold text-md mb-2">{t('impact')}</h5>
                                                    <p>{finding.impact}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground italic p-4">{t('noFindings')}</p>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
};

export default UnifiedDimensionAnalysis; 