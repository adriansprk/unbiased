import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RecentAnalysesList from '@/components/RecentAnalysesList';
import { addToHistory } from '@/lib/localStorageUtils';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => ({ noAnalyses: 'No recent analyses' } as Record<string, string>)[key] ?? key,
}));
vi.mock('@/i18n/navigation', () => ({
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

describe('RecentAnalysesList', () => {
    beforeEach(() => localStorage.clear());

    it('shows the empty state without history', () => {
        render(<RecentAnalysesList />);
        expect(screen.getByText('No recent analyses')).toBeInTheDocument();
    });

    it('links each stored analysis to its result page and updates when one is added', () => {
        addToHistory({ id: 'job-1', url: 'https://example.com/article-1', title: 'Test Article 1', slant: 'Neutral' });
        render(<RecentAnalysesList />);

        expect(screen.getByText('Test Article 1').closest('a')).toHaveAttribute('href', '/analysis/job-1');
        expect(screen.getByText('example.com...')).toBeInTheDocument();

        act(() => addToHistory({ id: 'job-2', url: 'https://example.com/b', title: 'Test Article 2', slant: 'Neutral' }));
        expect(screen.getByText('Test Article 2')).toBeInTheDocument();
    });
});
