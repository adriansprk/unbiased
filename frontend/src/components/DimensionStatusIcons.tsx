"use client";

import React from "react";
import { DimensionStatus } from "@/utils/biasInterpreter";
import { CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";

interface DimensionStatusIconsProps {
    dimensionStatuses: Record<string, DimensionStatus>;
    onDimensionClick?: (dimension: string) => void;
}

const DimensionStatusIcons: React.FC<DimensionStatusIconsProps> = ({
    dimensionStatuses,
    onDimensionClick,
}) => {
    // Helper function to get appropriate icon for each status
    const getStatusIcon = (status: DimensionStatus) => {
        switch (status) {
            case "Balanced":
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case "Caution":
                return <AlertCircle className="h-5 w-5 text-yellow-500" />;
            case "Biased":
                return <AlertTriangle className="h-5 w-5 text-red-500" />;
            case "Unknown":
                return <AlertCircle className="h-5 w-5 text-gray-500" />;
            default:
                return null;
        }
    };

    // Get status color class
    const getStatusColorClass = (status: DimensionStatus) => {
        switch (status) {
            case "Balanced":
                return "bg-green-50 border-green-200 hover:bg-green-100";
            case "Caution":
                return "bg-yellow-50 border-yellow-200 hover:bg-yellow-100";
            case "Biased":
                return "bg-red-50 border-red-200 hover:bg-red-100";
            case "Unknown":
                return "bg-gray-50 border-gray-200 hover:bg-gray-100";
            default:
                return "bg-muted hover:bg-muted/80";
        }
    };

    // Format dimension name for display
    const formatDimension = (dimension: string): string => {
        return dimension.replace(/\s*\/\s*/g, "/");
    };

    return (
        <Card className="p-4">
            <h3 className="text-base font-medium mb-3">Dimension Analysis</h3>
            <div className="flex flex-wrap gap-3" data-testid="dimension-status-icons">
                <TooltipProvider>
                    {Object.entries(dimensionStatuses).map(([dimension, status]) => (
                        <Tooltip key={dimension}>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => onDimensionClick && onDimensionClick(dimension)}
                                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm 
                                    transition-colors shadow-sm ${getStatusColorClass(status)}`}
                                    data-testid={`dimension-${dimension.toLowerCase().replace(/\s+/g, "-")}`}
                                >
                                    {getStatusIcon(status)}
                                    <span className="font-medium">{formatDimension(dimension)}</span>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="font-medium">{dimension}</p>
                                <p className="text-sm">Status: <span className="font-semibold">{status}</span></p>
                                <p className="text-xs text-muted-foreground">Click to view details</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </TooltipProvider>
            </div>
        </Card>
    );
};

export default DimensionStatusIcons; 