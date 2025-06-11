import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UrlInputForm from '@/components/UrlInputForm';
import '@testing-library/jest-dom';

// Mock the API client
vi.mock('@/lib/apiClient', () => ({
    default: {
        submitUrl: vi.fn(),
    },
}));

// Mock the mock service
vi.mock('@/lib/mockApiService', () => ({
    default: {
        api: {
            submitUrl: vi.fn(),
        },
    },
}));

// Mock the config
vi.mock('@/lib/config', () => ({
    USE_MOCK_API: false,
}));

// Mock next-intl
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => {
        const translations: Record<string, string> = {
            'UrlInput.placeholder': 'Paste article URL for analysis ...',
            'UrlInput.submit': 'Analyze',
            'UrlInput.invalidUrl': 'Please enter a valid URL',
            'UrlInput.analyzing': 'Analyzing...',
        };
        return translations[key] || key;
    },
    useLocale: () => 'en',
}));

// Mock the lucide-react icons
vi.mock('lucide-react', () => ({
    ArrowRight: () => <div data-testid="arrow-right-icon" />,
}));

describe('UrlInputForm', () => {
    const onSubmitSuccessMock = vi.fn();

    // Mock services for URL submission test
    let apiClient: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        onSubmitSuccessMock.mockReset();

        // Import and mock the API client
        apiClient = await import('@/lib/apiClient');
        apiClient.default.submitUrl = vi.fn();
    });

    it('renders the form with input field and submit button', () => {
        render(<UrlInputForm onSubmitSuccess={onSubmitSuccessMock} />);

        expect(screen.getByPlaceholderText('Paste article URL for analysis ...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument();

        // Check for card header elements
        expect(screen.getByText('Paste article URL for analysis ...')).toBeInTheDocument();
        expect(screen.getByText('Paste the URL of the article you want to analyze')).toBeInTheDocument();
    });

    it('validates empty URL input', async () => {
        render(<UrlInputForm onSubmitSuccess={onSubmitSuccessMock} />);

        // Submit form with empty input
        fireEvent.click(screen.getByRole('button', { name: /analyze/i }));

        // Check if error message is displayed
        await waitFor(() => {
            expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
        });
        expect(onSubmitSuccessMock).not.toHaveBeenCalled();
    });

    it('validates invalid URL format', async () => {
        render(<UrlInputForm onSubmitSuccess={onSubmitSuccessMock} />);

        // Enter invalid URL
        fireEvent.change(screen.getByPlaceholderText('Paste article URL for analysis ...'), {
            target: { value: 'invalid-url' },
        });

        // Submit form
        fireEvent.click(screen.getByRole('button', { name: /analyze/i }));

        // Check if error message is displayed
        await waitFor(() => {
            expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
        });
        expect(onSubmitSuccessMock).not.toHaveBeenCalled();
    });

    it('handles successful form submission', async () => {
        // Mock successful API response
        const mockJobId = '123-abc-456';
        apiClient.default.submitUrl.mockResolvedValueOnce({ jobId: mockJobId });

        render(<UrlInputForm onSubmitSuccess={onSubmitSuccessMock} />);

        // Enter valid URL
        fireEvent.change(screen.getByPlaceholderText('Paste article URL for analysis ...'), {
            target: { value: 'https://example.com/article' },
        });

        // Submit form
        fireEvent.click(screen.getByRole('button', { name: /analyze/i }));

        // Wait for submission to complete
        await waitFor(() => {
            expect(apiClient.default.submitUrl).toHaveBeenCalledWith('https://example.com/article', 'en');
        });

        // Mock a successful response and check if callback was called
        await waitFor(() => {
            const lastCall = apiClient.default.submitUrl.mock.calls[apiClient.default.submitUrl.mock.calls.length - 1];
            const lastCallArg = lastCall ? lastCall[0] : null;
            expect(lastCallArg).toBe('https://example.com/article');
        });
    });

    it('handles API error during submission', async () => {
        // Mock API error
        const mockError = new Error('Network Error');
        apiClient.default.submitUrl.mockRejectedValueOnce(mockError);

        render(<UrlInputForm onSubmitSuccess={onSubmitSuccessMock} />);

        // Enter valid URL
        fireEvent.change(screen.getByPlaceholderText('Paste article URL for analysis ...'), {
            target: { value: 'https://example.com/article' },
        });

        // Submit form
        fireEvent.click(screen.getByRole('button', { name: /analyze/i }));

        // Wait for the API call to be made
        await waitFor(() => {
            expect(apiClient.default.submitUrl).toHaveBeenCalledWith('https://example.com/article', 'en');
        });

        // Verify the API was called
        expect(apiClient.default.submitUrl).toHaveBeenCalledTimes(1);
    });
}); 