"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { addToHistory } from "@/lib/localStorageUtils";
import { HistoryItem } from "@/types/analysis";

/**
 * Keeps an analysis page current: re-renders it from the server every 2s while
 * the job runs, and records finished analyses in this browser's history.
 */
export default function JobSync({ pending, historyItem }: { pending: boolean; historyItem: Omit<HistoryItem, "date"> | null }) {
    const router = useRouter();

    useEffect(() => {
        if (!pending) return;
        const timer = setInterval(() => router.refresh(), 2000);
        return () => clearInterval(timer);
    }, [pending, router]);

    const historyId = historyItem?.id;
    useEffect(() => {
        if (historyItem) addToHistory(historyItem);
        // historyItem is a fresh object on every server render; its id identifies it
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [historyId]);

    return null;
}
