import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnalysisCard from '@/components/AnalysisCard';
import '@testing-library/jest-dom';
import { toAnalysisView } from '@/server/analysis';
import { analysis } from '../data/analysis';
import { ArticleData } from '@/components/ArticlePreview';
import { renderWithI18n } from '../utils/test-utils';

// Mock the console to prevent noise
beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });
});

// Mock the child components
vi.mock('@/components/ErrorMessageDisplay', () => ({
    __esModule: true,
    default: ({ message }: { message: string | null }) => <div data-testid="error-message">{message}</div>,
}));

vi.mock('@/components/BiasScoreMeter', () => ({
    __esModule: true,
    default: ({ biasLevel, articleType }: { biasLevel: string, articleType: { type: string } | null }) => (
        <div data-testid="bias-score-meter">
            <div>Type: {articleType?.type}</div>
            <div>Bias Level: {biasLevel}</div>
        </div>
    ),
}));

vi.mock('@/components/UnifiedDimensionAnalysis', () => ({
    __esModule: true,
    default: ({ dimensions }: { dimensions: Record<string, { status: string }> }) => (
        <div data-testid="dimension-analysis">
            {Object.entries(dimensions).map(([key, value]) => (
                <div key={key}>{key}: {value.status}</div>
            ))}
        </div>
    ),
}));

vi.mock('@/components/ClaimsDisplay', () => ({
    __esModule: true,
    default: ({ claims }: { claims: any[] }) => (
        <div data-testid="claims-display">
            Claims Display Mock
            {claims && `(${claims.length} claims)`}
        </div>
    ),
}));

vi.mock('@/components/SkeletonLoader', () => ({
    __esModule: true,
    default: () => <div data-testid="skeleton-loader">Full Skeleton</div>,
    AnalysisOnlySkeletonLoader: ({ status }: { status: string }) => (
        <div data-testid="analysis-only-skeleton">Skeleton: {status}</div>
    ),
}));

vi.mock('next/image', () => ({
    __esModule: true,
    default: ({ src, alt, onError, onLoad }: { src: string, alt: string, onError?: () => void, onLoad?: () => void }) => (
        <img
            src={src}
            alt={alt}
            data-testid="next-image"
            onError={onError}
            onLoad={onLoad}
        />
    ),
}));

// Mock the ShareableLink component
vi.mock('@/components/ShareableLink', () => ({
    __esModule: true,
    default: ({ jobId }: { jobId: string }) => (
        <div data-testid="shareable-link" data-job-id={jobId}>
            Shareable Link Mock
        </div>
    ),
}));

describe('AnalysisCard Component', () => {
    const mockArticleData: ArticleData = {
        title: 'Test Article',
        source: 'Test Source',
        author: 'Test Author',
        imageUrl: 'https://example.com/image.jpg',
        url: 'https://example.com/article',
    };

    const mockAnalysisData = toAnalysisView(analysis);

    it('renders nothing when no job is provided', () => {
        const { getByTestId } = renderWithI18n(<AnalysisCard jobId={null} jobStatus={null} />);
        // Check that the card renders but is empty
        expect(getByTestId('analysis-card')).toBeInTheDocument();
    });

    it('renders error message for Failed status', () => {
        const errorMessage = 'An error occurred during analysis';

        renderWithI18n(
            <AnalysisCard
                jobId="job-123"
                jobStatus="Failed"
                errorMessage={errorMessage}
            />
        );

        expect(screen.getByTestId('error-message')).toHaveTextContent(errorMessage);
    });

    it('renders loading skeleton when jobStatus is not Complete', () => {
        renderWithI18n(
            <AnalysisCard
                jobId="job-123"
                jobStatus="Fetching"
                articleData={mockArticleData}
            />
        );

        // Should show the skeleton with status
        expect(screen.getByTestId('analysis-only-skeleton')).toHaveTextContent('Skeleton: Fetching');

        // The article is the page heading while the analysis runs
        expect(screen.getByRole('heading', { level: 1, name: 'Test Article' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Read the original/ })).toHaveAttribute('href', 'https://example.com/article');
    });

    it('renders complete state with article preview and analysis data', () => {
        renderWithI18n(
            <AnalysisCard
                jobId="job-123"
                jobStatus="Complete"
                articleData={mockArticleData}
                analysisData={mockAnalysisData}
            />
        );

        // Check article data is rendered in the header
        expect(screen.getByRole('heading', { level: 1, name: 'Test Article' })).toBeInTheDocument();
        expect(screen.getByText('example.com')).toBeInTheDocument();
        expect(screen.getByText('Test Author')).toBeInTheDocument();

        // Check analysis components are rendered
        expect(screen.getByTestId('bias-score-meter')).toBeInTheDocument();
        expect(screen.getByTestId('dimension-analysis')).toBeInTheDocument();
        expect(screen.getByTestId('claims-display')).toBeInTheDocument();

        // Level calculated from the ratings: three times Caution
        expect(screen.getByText('Type: news')).toBeInTheDocument();
        expect(screen.getByText('Bias Level: Moderate')).toBeInTheDocument();
        expect(screen.getByText('sources: Caution')).toBeInTheDocument();

        // Actors are rendered for current results
        expect(screen.getByText('Jane Roe')).toBeInTheDocument();

        // Should display shareable link component
        expect(screen.getByTestId('shareable-link')).toBeInTheDocument();
        expect(screen.getByTestId('shareable-link').getAttribute('data-job-id')).toBe('job-123');
    });

    it('does not display shareable link when job is not complete', () => {
        renderWithI18n(
            <AnalysisCard
                jobId="job-123"
                jobStatus="Processing"
                articleData={mockArticleData}
            />
        );

        // Shareable link should not be rendered when job is still processing
        expect(screen.queryByTestId('shareable-link')).not.toBeInTheDocument();
    });

    it('handles image loading and errors', () => {
        renderWithI18n(
            <AnalysisCard
                jobId="job-123"
                jobStatus="Complete"
                articleData={mockArticleData}
                analysisData={mockAnalysisData}
            />
        );

        // Find the image
        const image = screen.getByTestId('next-image');
        expect(image).toBeInTheDocument();

        // A broken image is dropped rather than replaced by a placeholder
        fireEvent.error(image);
        expect(screen.queryByTestId('next-image')).not.toBeInTheDocument();
    });
}); 