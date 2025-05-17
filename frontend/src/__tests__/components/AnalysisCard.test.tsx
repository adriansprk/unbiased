import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnalysisCard from '@/components/AnalysisCard';
import '@testing-library/jest-dom';
import { AnalysisData, DimensionSummary } from '@/types/analysis';
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
    default: ({ slantCategory, biasLevel, slantRationale }: { slantCategory: string, biasLevel: string, slantRationale?: string }) => (
        <div data-testid="bias-score-meter">
            <div>Slant: {slantCategory}</div>
            <div>Bias Level: {biasLevel}</div>
            {slantRationale && <div>Rationale: {slantRationale}</div>}
        </div>
    ),
}));

vi.mock('@/components/UnifiedDimensionAnalysis', () => ({
    __esModule: true,
    default: ({ dimensionStatuses, onDimensionClick }: { dimensionStatuses: Record<string, string>, onDimensionClick: (dimension: string) => void }) => (
        <div data-testid="dimension-analysis" onClick={() => onDimensionClick('test-dimension')}>
            Dimension Analysis Mock
            {Object.entries(dimensionStatuses || {}).map(([key, value]) => (
                <div key={key}>{key}: {String(value)}</div>
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

// Mock the utils
vi.mock('@/utils/biasInterpreter', () => ({
    interpretBiasAnalysis: () => ({
        overallBiasLevel: 'Low',
        slantCategory: 'Liberal/Progressive',
        slantConfidence: 'High',
        dimensionStatuses: {
            'Source Selection': 'Good',
            'Fairness / Balance': 'Caution',
        },
    }),
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

    const mockAnalysisData: AnalysisData = {
        slant: {
            category: 'Liberal/Progressive',
            rationale: 'Test rationale',
            confidence: 'High',
        },
        claims: {
            factual_claims: [
                { claim_statement: 'Claim 1', claim_topic: 'Topic 1' },
                { claim_statement: 'Claim 2', claim_topic: 'Topic 2' }
            ],
        },
        report: {
            bias_analysis: {
                detailed_findings: [],
                overall_assessment: 'Test assessment',
                overall_bias_level: 'Low',
                dimension_summaries: {
                    'Source Selection': {
                        summary: 'Good sources were used',
                        status: 'Good'
                    },
                    'Fairness / Balance': {
                        summary: 'Some issues with balance',
                        status: 'Caution'
                    },
                },
            },
        },
    };

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

        // Should show heading
        expect(screen.getByText('Analysis Results')).toBeInTheDocument();

        // Should show the article title in the ArticleCard
        expect(screen.getByText('Test Article')).toBeInTheDocument();
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

        // Check article data is rendered in ArticleCard
        expect(screen.getByText('Test Article')).toBeInTheDocument();
        expect(screen.getByText('Test Author')).toBeInTheDocument();

        // Check analysis components are rendered
        expect(screen.getByTestId('bias-score-meter')).toBeInTheDocument();
        expect(screen.getByTestId('dimension-analysis')).toBeInTheDocument();
        expect(screen.getByTestId('claims-display')).toBeInTheDocument();

        // Should display the bias score
        expect(screen.getByText('Slant: Liberal/Progressive')).toBeInTheDocument();
        expect(screen.getByText('Bias Level: Low')).toBeInTheDocument();

        // Should display rationale if available
        expect(screen.getByText('Rationale: Test rationale')).toBeInTheDocument();

        // Should display dimension analysis with statuses
        expect(screen.getByText('Source Selection: Good')).toBeInTheDocument();
        expect(screen.getByText('Fairness / Balance: Caution')).toBeInTheDocument();

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

        // Test error handling (image not available)
        fireEvent.error(image);
        expect(screen.getByText('Image unavailable')).toBeInTheDocument();
    });
}); 