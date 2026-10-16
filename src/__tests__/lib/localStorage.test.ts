import { describe, it, expect, beforeEach } from 'vitest';
import { HISTORY_STORAGE_KEY, addToHistory, getHistorySnapshot } from '@/lib/localStorageUtils';

const item = (id: string) => ({ id, url: `https://example.com/${id}`, title: `Article ${id}`, slant: 'Neutral' });

describe('browser history', () => {
    beforeEach(() => localStorage.clear());

    it('starts empty and returns a stable snapshot until storage changes', () => {
        expect(getHistorySnapshot()).toEqual([]);
        expect(getHistorySnapshot()).toBe(getHistorySnapshot());
    });

    it('puts the latest analysis first without duplicates', () => {
        addToHistory(item('a'));
        addToHistory(item('b'));
        addToHistory(item('a'));

        expect(getHistorySnapshot().map(i => i.id)).toEqual(['a', 'b']);
        expect(getHistorySnapshot()[0].date).toEqual(expect.any(String));
    });

    it('keeps the 9 most recent analyses', () => {
        for (let i = 0; i < 12; i++) addToHistory(item(String(i)));
        expect(getHistorySnapshot().map(i => i.id)).toEqual(['11', '10', '9', '8', '7', '6', '5', '4', '3']);
    });

    it('ignores corrupt stored data', () => {
        localStorage.setItem(HISTORY_STORAGE_KEY, '{not json');
        expect(getHistorySnapshot()).toEqual([]);
    });
});
