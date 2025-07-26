"use client";

import React from "react";
import { HistoryItem } from "@/types/analysis";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import useAnalysisStore from "@/lib/store";

interface RecentAnalysesListProps {
    historyItems: HistoryItem[];
    selectedJobId: string | null;
}

/**
 * Displays a list of recently analyzed articles
 */
const RecentAnalysesList: React.FC<RecentAnalysesListProps> = ({
    historyItems,
    selectedJobId: _selectedJobId,
}) => {
    // Get the selectHistoryItem action from the store
    const { selectHistoryItem } = useAnalysisStore();

    // Format date for display - use consistent format to avoid hydration mismatch
    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            // Use a simpler format that doesn't change based on time passage
            return date.toLocaleDateString(undefined, { 
                month: 'short', 
                day: 'numeric',
                year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
            });
        } catch {
            return "Unknown date";
        }
    };

    // Truncate URL for display
    const truncateUrl = (url: string) => {
        try {
            const urlObj = new URL(url);
            return `${urlObj.hostname}${urlObj.pathname.length > 1 ? '...' : ''}`;
        } catch {
            return url.length > 30 ? url.substring(0, 30) + "..." : url;
        }
    };

    // If no history items, show a message
    if (historyItems.length === 0) {
        return (
            <div className="text-center p-6 border border-border rounded-lg bg-card">
                <p className="text-muted-foreground">No recent analyses</p>
            </div>
        );
    }

    // Use the same rendering approach for both server and client
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {historyItems.map((item) => (
                    <Card
                        key={item.id}
                        className="cursor-pointer transition-colors hover:bg-accent/5"
                        onClick={() => selectHistoryItem(item.id)}
                    >
                        <CardContent
                            className="p-4 flex flex-col h-full"
                            data-item-id={item.id}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-medium text-sm truncate flex-1">{item.title}</h3>
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground mt-0.5 ml-2 flex-shrink-0" />
                            </div>

                            <div className="flex items-center justify-between mt-auto pt-2">
                                <span className="text-xs text-muted-foreground truncate">
                                    {truncateUrl(item.url)}
                                </span>
                                <span className="text-xs text-muted-foreground ml-2">
                                    {/* Always render the same content for server and client */}
                                    {formatDate(item.date)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
            ))}
        </div>
    );
};

export default RecentAnalysesList; 