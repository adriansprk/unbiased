/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HISTORY_STORAGE_KEY, saveHistoryToLocalStorage, loadHistoryFromLocalStorage } from '@/lib/localStorageUtils';
import { HistoryItem } from '@/types/analysis';

// Create a mock of localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value.toString();
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
    };
})();

describe('Local Storage Utilities', () => {
    // Replace the global localStorage with our mock before tests
    beforeEach(() => {
        Object.defineProperty(window, 'localStorage', { value: localStorageMock });
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    it('should save history items to localStorage', () => {
        const historyItems: HistoryItem[] = [
            {
                id: 'test-job-1',
                url: 'https://example.com/article-1',
                date: new Date().toISOString(),
                title: 'Test Article 1',
                slant: 'Liberal/Progressive'
            },
            {
                id: 'test-job-2',
                url: 'https://example.com/article-2',
                date: new Date().toISOString(),
                title: 'Test Article 2',
                slant: 'Conservative'
            }
        ];

        // Save history items to localStorage
        saveHistoryToLocalStorage(historyItems);

        // Verify localStorage.setItem was called with the correct arguments
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
            HISTORY_STORAGE_KEY,
            JSON.stringify(historyItems)
        );
    });

    it('should load history items from localStorage', () => {
        const historyItems: HistoryItem[] = [
            {
                id: 'test-job-1',
                url: 'https://example.com/article-1',
                date: new Date().toISOString(),
                title: 'Test Article 1',
                slant: 'Liberal/Progressive'
            }
        ];

        // Setup localStorage to return our test data
        localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(historyItems));

        // Load history items from localStorage
        const result = loadHistoryFromLocalStorage();

        // Verify localStorage.getItem was called with the correct key
        expect(localStorageMock.getItem).toHaveBeenCalledWith(HISTORY_STORAGE_KEY);

        // Verify the returned data matches our test data
        expect(result).toEqual(historyItems);
    });

    it('should return an empty array when localStorage is empty', () => {
        // Setup localStorage to return null (empty)
        localStorageMock.getItem.mockReturnValueOnce(null);

        // Load history items from localStorage
        const result = loadHistoryFromLocalStorage();

        // Verify localStorage.getItem was called
        expect(localStorageMock.getItem).toHaveBeenCalledWith(HISTORY_STORAGE_KEY);

        // Verify an empty array is returned
        expect(result).toEqual([]);
    });

    it('should handle JSON parse errors gracefully', () => {
        // Setup localStorage to return invalid JSON
        localStorageMock.getItem.mockReturnValueOnce('invalid-json');

        // Load history items from localStorage
        const result = loadHistoryFromLocalStorage();

        // Verify localStorage.getItem was called
        expect(localStorageMock.getItem).toHaveBeenCalledWith(HISTORY_STORAGE_KEY);

        // Verify an empty array is returned when JSON parsing fails
        expect(result).toEqual([]);
    });
}); 