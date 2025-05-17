"use client";

import React from "react";
import { Badge } from "./ui/badge";

interface SlantDisplayProps {
    category: string;
    confidence: string;
    rationale: string;
    icon?: React.ReactNode;
}

const SlantDisplay: React.FC<SlantDisplayProps> = ({
    category,
    confidence,
    rationale,
    icon
}) => {
    // Map slant categories to color variants
    const getSlantColorClass = (slantCategory: string): string => {
        const category = slantCategory.toLowerCase();

        if (category.includes("liberal") || category.includes("progressive")) {
            return "bg-blue-100 text-blue-800 border-blue-200";
        } else if (category.includes("conservative")) {
            return "bg-red-100 text-red-800 border-red-200";
        } else if (category.includes("center") || category.includes("balanced")) {
            return "bg-purple-100 text-purple-800 border-purple-200";
        } else if (category.includes("academic") || category.includes("scientific")) {
            return "bg-green-100 text-green-800 border-green-200";
        } else if (category.includes("business")) {
            return "bg-amber-100 text-amber-800 border-amber-200";
        } else {
            return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const slantColorClass = getSlantColorClass(category);

    return (
        <div className="space-y-4" data-testid="slant-display">
            <div>
                <div className="flex items-center gap-2 mb-3">
                    {icon}
                    <h3 className="text-lg font-semibold">Article Slant</h3>
                </div>
                <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge
                            className={`${slantColorClass} font-medium`}
                            variant="outline"
                            data-testid="slant-badge"
                        >
                            {category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                            {confidence} confidence
                        </span>
                    </div>
                </div>
            </div>

            <div>
                <h4 className="text-sm font-medium mb-2">Rationale:</h4>
                <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">{rationale}</p>
            </div>
        </div>
    );
};

export default SlantDisplay; 