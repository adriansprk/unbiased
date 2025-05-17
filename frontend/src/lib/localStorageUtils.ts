import { HistoryItem } from '@/types/analysis';

// Local storage key for history items
export const HISTORY_STORAGE_KEY = 'unbias_analysis_history';

/**
 * Save history items to local storage
 * @param historyItems Array of history items to save
 */
export const saveHistoryToLocalStorage = (historyItems: HistoryItem[]): void => {
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyItems));
        } catch (error) {
            console.error('Failed to save history to local storage:', error);
        }
    }
};

/**
 * Load history items from local storage
 * @returns Array of history items or empty array if none found
 */
export const loadHistoryFromLocalStorage = (): HistoryItem[] => {
    if (typeof window !== 'undefined') {
        try {
            const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
            if (storedHistory) {
                return JSON.parse(storedHistory);
            }
        } catch (error) {
            console.error('Failed to load history from local storage:', error);
        }
    }
    return [];
}; 