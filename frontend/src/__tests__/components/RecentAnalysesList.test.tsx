import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RecentAnalysesList from '@/components/RecentAnalysesList';
import { HistoryItem } from '@/types/analysis';
import '@testing-library/jest-dom';

// Mock the store with a mock implementation of selectHistoryItem
const selectHistoryItemMock = vi.fn();
vi.mock('@/lib/store', () => ({
    __esModule: true,
    default: () => ({
        selectHistoryItem: selectHistoryItemMock,
    }),
}));

describe('RecentAnalysesList', () => {
    // Mock history items
    const mockHistoryItems: HistoryItem[] = [
        {
            id: 'job-1',
            url: 'https://example.com/article-1',
            date: new Date().toISOString(),
            title: 'Test Article 1',
            slant: 'Neutral'
        },
        {
            id: 'job-2',
            url: 'https://example.com/article-2',
            date: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            title: 'Test Article 2',
            slant: 'Left-Leaning'
        }
    ];

    beforeEach(() => {
        // Reset the mock before each test
        selectHistoryItemMock.mockReset();
    });

    it('renders empty state when no history items', () => {
        render(
            <RecentAnalysesList
                historyItems={[]}
                selectedJobId={null}
            />
        );

        expect(screen.getByText(/no recent analyses/i)).toBeInTheDocument();
    });

    it('renders history items with correct information', () => {
        render(
            <RecentAnalysesList
                historyItems={mockHistoryItems}
                selectedJobId={null}
            />
        );

        // Check if article titles are displayed
        expect(screen.getByText('Test Article 1')).toBeInTheDocument();
        expect(screen.getByText('Test Article 2')).toBeInTheDocument();

        // Check if URLs are displayed correctly
        expect(screen.getAllByText(/example.com/)).toHaveLength(2);

        // Check if relative time is displayed
        expect(screen.getByText(/less than a minute ago/i)).toBeInTheDocument();
        expect(screen.getByText(/about 1 hour ago/i)).toBeInTheDocument();
    });

    it('applies selection styling to the selected item', () => {
        // Mock the useEffect hook to set mounted to true immediately
        vi.mock('react', async () => {
            const actual = await vi.importActual('react');
            return {
                ...actual,
                useState: (initial: unknown) => [true, vi.fn()], // Always return mounted as true
            };
        });

        const { container } = render(
            <RecentAnalysesList
                historyItems={mockHistoryItems}
                selectedJobId="job-1"
            />
        );

        // Check that the first item has the data-item-id attribute with the correct value
        const firstItemElement = container.querySelector('[data-item-id="job-1"]');
        expect(firstItemElement).toBeInTheDocument();

        // Check that the second item has a different data-item-id
        const secondItemElement = container.querySelector('[data-item-id="job-2"]');
        expect(secondItemElement).toBeInTheDocument();
    });

    it('calls selectHistoryItem from store when clicking an item', () => {
        render(
            <RecentAnalysesList
                historyItems={mockHistoryItems}
                selectedJobId={null}
            />
        );

        // Click on the first item
        fireEvent.click(screen.getByText('Test Article 1'));

        // Check that selectHistoryItem was called with the correct job ID
        expect(selectHistoryItemMock).toHaveBeenCalledWith('job-1');
    });
}); 