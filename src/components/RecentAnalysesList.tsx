"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getHistorySnapshot, getServerHistorySnapshot, subscribeToHistory } from "@/lib/localStorageUtils";

const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: new Date(dateString).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });

const shortUrl = (url: string) => {
    try {
        const { hostname, pathname } = new URL(url);
        return `${hostname}${pathname.length > 1 ? "..." : ""}`;
    } catch {
        return url.length > 30 ? `${url.substring(0, 30)}...` : url;
    }
};

/**
 * Analyses opened in this browser, newest first.
 */
export default function RecentAnalysesList() {
    const t = useTranslations("RecentAnalyses");
    const items = useSyncExternalStore(subscribeToHistory, getHistorySnapshot, getServerHistorySnapshot);

    if (items.length === 0) {
        return (
            <div className="text-center p-6 border border-border rounded-lg bg-card">
                <p className="text-muted-foreground">{t("noAnalyses")}</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => (
                <Link key={item.id} href={`/analysis/${item.id}`}>
                    <Card className="h-full transition-colors hover:bg-accent/5">
                        <CardContent className="p-4 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-medium text-sm truncate flex-1">{item.title}</h3>
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground mt-0.5 ml-2 flex-shrink-0" />
                            </div>
                            <div className="flex items-center justify-between mt-auto pt-2">
                                <span className="text-xs text-muted-foreground truncate">{shortUrl(item.url)}</span>
                                <span className="text-xs text-muted-foreground ml-2">{formatDate(item.date)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    );
}
