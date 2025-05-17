"use client";

import React from "react";
import { Progress } from "@/components/ui/progress";
import { BiasLevel } from "@/types/analysis";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { InfoIcon } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";
import logger from "@/utils/logger";

interface BiasScoreMeterProps {
    biasLevel: BiasLevel;
    slantCategory: string;
    slantConfidence: string;
    slantRationale?: string;
    overallAssessment?: string;
}

const BiasScoreMeter: React.FC<BiasScoreMeterProps> = ({
    biasLevel,
    slantCategory,
    slantConfidence,
    slantRationale,
    overallAssessment
}) => {
    const t = useTranslations('BiasScoreMeter');
    const tCommon = useTranslations('Common');
    const tSlant = useTranslations('SlantCategory');
    const tConfidence = useTranslations('ConfidenceLevel');
    logger.debug('BiasScoreMeter rendering with props:', { biasLevel, slantCategory, slantConfidence });

    // Get all translations for debugging
    const allTranslations = {
        'Liberal/Progressive': tSlant('Liberal/Progressive'),
        'Conservative': tSlant('Conservative'),
        'Centrist/Moderate': tSlant('Centrist/Moderate'),
        'Libertarian': tSlant('Libertarian'),
        'Populist': tSlant('Populist'),
        'Establishment': tSlant('Establishment'),
        'Nonpartisan/Neutral': tSlant('Nonpartisan/Neutral'),
        'Business-oriented': tSlant('Business-oriented'),
        'Academic/Scientific': tSlant('Academic/Scientific'),
        'Advocacy/Issue-focused': tSlant('Advocacy/Issue-focused'),
        'Other': tSlant('Other'),
        'Unknown': tSlant('Unknown')
    };

    logger.debug('Available translations:', allTranslations);

    // Calculate progress value based on bias level
    const getProgressValue = (): number => {
        switch (biasLevel) {
            case "Low":
                return 25;
            case "Moderate":
                return 50;
            case "High":
                return 75;
            default:
                logger.warn('Unknown bias level:', biasLevel);
                return 0;
        }
    };

    // Get color for progress bar based on bias level
    const getProgressColor = (): string => {
        switch (biasLevel) {
            case "Low":
                return "bg-green-500";
            case "Moderate":
                return "bg-yellow-500";
            case "High":
                return "bg-red-500";
            default:
                return "bg-gray-500";
        }
    };

    // Get translated slant category
    const getTranslatedSlantCategory = (): string => {
        if (!slantCategory) {
            return tCommon('unknown');
        }

        logger.debug('Attempting to translate slant category:', slantCategory);

        try {
            // Try direct access with the key
            return tSlant(slantCategory as keyof typeof allTranslations) || slantCategory;
        } catch (err) {
            logger.error('Error translating slant category:', slantCategory, err);
            return slantCategory;
        }
    };

    // Get translated confidence level
    const getTranslatedConfidence = (): string => {
        if (!slantConfidence) {
            return tCommon('unknown');
        }

        logger.debug('Attempting to translate confidence level:', slantConfidence);

        try {
            // Try direct access with the key
            return tConfidence(slantConfidence as 'Low' | 'Medium' | 'High' | 'Unknown') || slantConfidence;
        } catch (err) {
            logger.error('Error translating confidence level:', slantConfidence, err);
            return slantConfidence;
        }
    };

    const progressValue = getProgressValue();
    const progressColor = getProgressColor();
    const translatedSlantCategory = getTranslatedSlantCategory();
    const translatedConfidence = getTranslatedConfidence();

    return (
        <div className="space-y-4">
            {/* Heading with right-aligned Slant Badge */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{tCommon('biasAnalysis')}</h3>
                <div className="flex items-center gap-2">
                    <Badge variant="outline">{translatedSlantCategory}</Badge>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                        ({translatedConfidence} {t('confidence')})
                    </div>

                    {slantRationale && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button className="inline-flex items-center justify-center focus:outline-none text-muted-foreground hover:text-primary">
                                        <InfoIcon className="h-4 w-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent className="w-80 text-sm p-3">
                                    <div className="font-medium mb-1">{t('slantRationale')}</div>
                                    <p className="text-xs">{slantRationale}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            </div>

            {/* Bias meter with increased top spacing */}
            <div className="mt-5 space-y-2">
                <Progress
                    value={progressValue}
                    className={cn("h-2 w-full", progressColor)}
                />

                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{tCommon('low')}</span>
                    <span>{tCommon('moderate')}</span>
                    <span>{tCommon('high')}</span>
                </div>
            </div>

            {/* Overall Assessment - with heading and increased spacing */}
            {overallAssessment && (
                <div className="mt-6">
                    <h4 className="text-sm font-medium mb-2">{tCommon('summary')}</h4>
                    <p className="text-sm text-foreground leading-relaxed">
                        {overallAssessment}
                    </p>
                </div>
            )}
        </div>
    );
};

export default BiasScoreMeter; 