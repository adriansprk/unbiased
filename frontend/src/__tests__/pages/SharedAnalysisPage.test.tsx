import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SharedAnalysisClient from '@/components/pages/SharedAnalysisClient';

// Mock the store
const mockLoadSharedAnalysis = vi.fn();
const mockSubmitUrl = vi.fn();
let mockStoreState: {
    jobId: string | null;
    jobStatus: string | null;
    analysisData: any;
    articleData: any;
    errorMessage: string | null;
    isLoading: boolean;
    hasStarted: boolean;
    loadSharedAnalysis: typeof mockLoadSharedAnalysis;
    submitUrl: typeof mockSubmitUrl;
} = {
    jobId: null,
    jobStatus: null,
    analysisData: null,
    articleData: null,
    errorMessage: null,
    isLoading: false,
    hasStarted: false,
    loadSharedAnalysis: mockLoadSharedAnalysis,
    submitUrl: mockSubmitUrl
};

vi.mock('@/lib/store', () => ({
    __esModule: true,
    default: () => mockStoreState
}));

// Mock next-intl
const translations: Record<string, string> = {
    'SharedAnalysis.sharedAnalysisTitle': 'Shared Analysis Results',
    'SharedAnalysis.loadingSharedAnalysis': 'Loading Shared Analysis...',
    'SharedAnalysis.analyzeUrlTitle': 'Analyze Another URL',
    'SharedAnalysis.error': 'Failed to load shared analysis',
    'SharedAnalysis.analysisNotFound': 'Analysis Not Found',
    'SharedAnalysis.analysisNotFoundDetails': 'The analysis could not be retrieved. It may have been removed or the link is incorrect.',
    'SharedAnalysis.analysisFailed': 'Analysis Failed',
    'SharedAnalysis.analysisFailedDetails': 'This analysis could not be completed.',
    'SharedAnalysis.tryNewAnalysis': 'Start a new analysis with the form above.',
    'UrlInput.submit': 'Submit',
    'UrlInput.analyzeNew': 'Analyze New',
    'UrlInput.placeholder': 'Enter article URL',
    'UrlInput.tryAgain': 'Try Again',
    'UrlInput.analyzing': 'Analyzing',
    'Status.queued': 'Queued',
    'Status.processing': 'Processing',
    'Status.fetching': 'Fetching',
    'Status.analyzing': 'Analyzing',
    'Status.complete': 'Complete',
    'Status.failed': 'Failed',
    'title': 'Shared Analysis Results',
    'analyzeYourOwn': 'Analyze Another URL',
    'tryItYourself': 'Submit'
};

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => {
        // Return the translation directly if it matches a key
        if (key in translations) {
            return translations[key];
        }

        // Otherwise, handle namespace.key format
        const lastPart = key.split('.').pop() || '';
        const namespacedKey = `SharedAnalysis.${lastPart}`;

        // Return the translation or the key itself as fallback
        return namespacedKey in translations ? translations[namespacedKey] : key;
    },
    useLocale: () => 'en',
}));

// Mock the router
const mockRouterPush = vi.fn();
vi.mock('@/i18n/navigation', () => ({
    useRouter: () => ({
        push: mockRouterPush,
    }),
    // Add Link component to the mock
    Link: ({ href, children }: { href: string, children: React.ReactNode }) => (
        <a href={href}>{children}</a>
    ),
    // Add usePathname hook
    usePathname: () => '/'
}));

// Mock components
vi.mock('@/components/AnalysisCard', () => ({
    __esModule: true,
    default: vi.fn().mockImplementation(({ jobId, jobStatus, analysisData, articleData, errorMessage }) => (
        <div data-testid="analysis-card">
            <div>JobID: {jobId}</div>
            <div>Status: {jobStatus}</div>
            <div>Has Analysis: {analysisData ? 'Yes' : 'No'}</div>
            <div>Has Article: {articleData ? 'Yes' : 'No'}</div>
            {errorMessage && <div>Error: {errorMessage}</div>}
        </div>
    ))
}));

vi.mock('@/components/SkeletonLoader', () => ({
    __esModule: true,
    default: vi.fn().mockImplementation(() => <div data-testid="skeleton-loader">Loading...</div>)
}));

vi.mock('@/components/UrlInput', () => ({
    __esModule: true,
    default: vi.fn().mockImplementation(({ onSubmitSuccess }) => (
        <div data-testid="url-input">
            <button
                data-testid="url-submit-button"
                onClick={() => onSubmitSuccess('https://example.com')}
            >
                Submit
            </button>
        </div>
    ))
}));

vi.mock('@/components/ErrorMessageDisplay', () => ({
    __esModule: true,
    default: vi.fn().mockImplementation(({ message }) => (
        <div data-testid="error-message">{message}</div>
    ))
}));

vi.mock('@/components/ui/container', () => ({
    Container: vi.fn().mockImplementation(({ children }) => (
        <div data-testid="container">{children}</div>
    ))
}));

vi.mock('@/components/ui/button', () => ({
    Button: vi.fn().mockImplementation(({ children, onClick }) => (
        <button
            data-testid="navigate-to-main-button"
            onClick={onClick}
        >
            {children}
        </button>
    ))
}));

describe('SharedAnalysisClient', () => {
    const props = {
        jobId: 'test-job-id',
        locale: 'en'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockStoreState = {
            jobId: null,
            jobStatus: null,
            analysisData: null,
            articleData: null,
            errorMessage: null,
            isLoading: false,
            hasStarted: false,
            loadSharedAnalysis: mockLoadSharedAnalysis,
            submitUrl: mockSubmitUrl
        };
    });

    it('should call loadSharedAnalysis on mount', () => {
        render(<SharedAnalysisClient {...props} />);
        expect(mockLoadSharedAnalysis).toHaveBeenCalledWith(props.jobId);
    });

    it('should show loading state when isLoading is true', () => {
        mockStoreState.isLoading = true;
        render(<SharedAnalysisClient {...props} />);
        expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
        expect(screen.getByText('Loading Shared Analysis...')).toBeInTheDocument();
    });

    it('should show generic error message when there is an error', () => {
        mockStoreState.errorMessage = 'Test generic error message';
        render(<SharedAnalysisClient {...props} />);

        expect(screen.getByText('Failed to load shared analysis')).toBeInTheDocument();
        expect(screen.getByText('Test generic error message')).toBeInTheDocument();
        expect(screen.getByText('Start a new analysis with the form above.')).toBeInTheDocument();
    });

    it('should show "Analysis Not Found" error when appropriate', () => {
        mockStoreState.errorMessage = 'Analysis Not Found. The analysis for ID: abc123 could not be retrieved.';
        render(<SharedAnalysisClient {...props} />);

        expect(screen.getByText('Analysis Not Found')).toBeInTheDocument();
        expect(screen.getByText('The analysis could not be retrieved. It may have been removed or the link is incorrect.')).toBeInTheDocument();
        expect(screen.getByText('Start a new analysis with the form above.')).toBeInTheDocument();
    });

    it('should show "Analysis Failed" error when appropriate', () => {
        mockStoreState.errorMessage = 'This analysis (ID: abc123) could not be completed. Error: Some error';
        render(<SharedAnalysisClient {...props} />);

        expect(screen.getByText('Analysis Failed')).toBeInTheDocument();
        expect(screen.getByText('This analysis could not be completed.')).toBeInTheDocument();
        expect(screen.getByText('Start a new analysis with the form above.')).toBeInTheDocument();
    });

    it('should render the analysis when data is loaded', async () => {
        mockStoreState.jobId = 'test-job-id';
        mockStoreState.jobStatus = 'Complete';
        mockStoreState.hasStarted = true;
        mockStoreState.analysisData = { slant: {}, claims: {}, report: {} };
        mockStoreState.articleData = { title: 'Test Article' };

        render(<SharedAnalysisClient {...props} />);

        await waitFor(() => {
            expect(screen.getByTestId('analysis-card')).toBeInTheDocument();
        });
    });
}); 