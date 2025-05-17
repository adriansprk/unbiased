"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface JobStatusDisplayProps {
    status: string | null;
}

const JobStatusDisplay: React.FC<JobStatusDisplayProps> = ({ status }) => {
    if (!status) return null;

    // Don't display the status display component when analyzing
    if (status === "Analyzing") return null;

    // Define status-specific messages and styles
    const statusConfig: Record<string, { message: string; className: string; icon: React.ReactNode }> = {
        Queued: {
            message: "Your request is queued and will be processed shortly...",
            className: "text-yellow-600 dark:text-yellow-400",
            icon: (
                <div className="animate-spin w-5 h-5 border-2 border-yellow-600 border-t-transparent dark:border-yellow-400 dark:border-t-transparent rounded-full"></div>
            ),
        },
        Processing: {
            message: "Processing your request...",
            className: "text-blue-600 dark:text-blue-400",
            icon: (
                <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent dark:border-blue-400 dark:border-t-transparent rounded-full"></div>
            ),
        },
        Fetching: {
            message: "Fetching article content...",
            className: "text-blue-600 dark:text-blue-400",
            icon: (
                <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent dark:border-blue-400 dark:border-t-transparent rounded-full"></div>
            ),
        },
        Analyzing: {
            message: "Analyzing content for bias and factual claims...",
            className: "text-blue-600 dark:text-blue-400",
            icon: (
                <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent dark:border-blue-400 dark:border-t-transparent rounded-full"></div>
            ),
        },
        Complete: {
            message: "Analysis complete!",
            className: "text-green-600 dark:text-green-400",
            icon: (
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
            ),
        },
        Failed: {
            message: "Analysis failed. Please see error details below.",
            className: "text-red-600 dark:text-red-400",
            icon: (
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            ),
        },
    };

    // Get the configuration for the current status
    const config = statusConfig[status] || {
        message: `Status: ${status}`,
        className: "text-gray-600 dark:text-gray-400",
        icon: null,
    };

    return (
        <Card className="mb-6">
            <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-2">
                    <div className="flex items-center gap-3 mb-2">
                        {config.icon}
                        <h3 className={cn("text-lg font-medium", config.className)}>
                            Status: {status}
                        </h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{config.message}</p>
                </div>
            </CardContent>
        </Card>
    );
};

export default JobStatusDisplay; 