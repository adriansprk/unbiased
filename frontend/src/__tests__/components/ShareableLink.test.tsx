import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShareableLink from '@/components/ShareableLink';
import '@testing-library/jest-dom';
import { renderWithI18n } from '../utils/test-utils';

// Mock the clipboard API
Object.assign(navigator, {
    clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
    },
});

// Mock the toast hook
vi.mock('@/components/ui/toast-manager', () => ({
    useToast: () => ({
        showToast: vi.fn(),
    }),
}));

describe('ShareableLink Component', () => {
    const mockJobId = 'test-job-123';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the component with correct URL', () => {
        renderWithI18n(<ShareableLink jobId={mockJobId} />);

        // Test that the component renders
        expect(screen.getByText('Share this analysis')).toBeInTheDocument();

        // Test that it displays the correct URL format
        const expectedUrl = `https://unbiased.adriancares.com/en/analysis/${mockJobId}`;
        expect(screen.getByText(expectedUrl)).toBeInTheDocument();

        // Test that the copy button is present with text
        expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
        expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('changes to Copied state when button is clicked', async () => {
        renderWithI18n(<ShareableLink jobId={mockJobId} />);

        // Click the copy button
        const copyButton = screen.getByRole('button', { name: /copy/i });
        fireEvent.click(copyButton);

        // Check that the clipboard API was called with the correct URL
        await waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
                `https://unbiased.adriancares.com/en/analysis/${mockJobId}`
            );
        });

        // Button should now have a check icon and "Copied" text
        await waitFor(() => {
            expect(screen.getByText('Copied')).toBeInTheDocument();
        });
    });

    it('handles clipboard errors gracefully', async () => {
        // Mock clipboard to throw an error
        navigator.clipboard.writeText = vi.fn().mockRejectedValue(new Error('Clipboard error'));

        renderWithI18n(<ShareableLink jobId={mockJobId} />);

        // Click the copy button
        const copyButton = screen.getByRole('button', { name: /copy/i });
        fireEvent.click(copyButton);

        // Check that the clipboard API was called
        await waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
        });

        // The component should not crash
        expect(screen.getByText('Share this analysis')).toBeInTheDocument();
    });
}); 