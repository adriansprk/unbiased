import { HistoryItem } from '@/types/analysis';

export const HISTORY_STORAGE_KEY = 'unbias_analysis_history';
const MAX_HISTORY_ITEMS = 9;
const NO_HISTORY: HistoryItem[] = [];

function read(): string | null {
    try {
        return localStorage.getItem(HISTORY_STORAGE_KEY);
    } catch {
        return null;
    }
}

let cachedRaw: string | null = null;
let cachedItems: HistoryItem[] = NO_HISTORY;

/** Snapshot for useSyncExternalStore: the same array until storage changes */
export function getHistorySnapshot(): HistoryItem[] {
    const raw = read();
    if (raw !== cachedRaw) {
        cachedRaw = raw;
        try {
            cachedItems = raw ? (JSON.parse(raw) as HistoryItem[]) : NO_HISTORY;
        } catch {
            cachedItems = NO_HISTORY;
        }
    }
    return cachedItems;
}

export function getServerHistorySnapshot(): HistoryItem[] {
    return NO_HISTORY;
}

export function subscribeToHistory(onChange: () => void): () => void {
    window.addEventListener('storage', onChange);
    return () => window.removeEventListener('storage', onChange);
}

/** Puts an analysis at the top of this browser's history */
export function addToHistory(item: Omit<HistoryItem, 'date'>): void {
    const items = [
        { ...item, date: new Date().toISOString() },
        ...getHistorySnapshot().filter(existing => existing.id !== item.id),
    ].slice(0, MAX_HISTORY_ITEMS);
    try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
        // The storage event only fires in other tabs; notify this one too
        window.dispatchEvent(new Event('storage'));
    } catch {
        // Storage unavailable (private mode, quota): history is a convenience
    }
}
