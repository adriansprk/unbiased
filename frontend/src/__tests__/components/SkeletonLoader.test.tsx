import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SkeletonLoader, { AnalysisOnlySkeletonLoader } from '../../components/SkeletonLoader';
import '@testing-library/jest-dom';

// Mock next-intl
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => {
        const translations: Record<string, string> = {
            'analysisResults': 'Analysis Results',
            'biasAnalysis': 'Bias Analysis',
            'dimensionAnalysis': 'Dimension Analysis',
            'factualClaims': 'Factual Claims',
            'waitingInQueue': 'Waiting in queue...',
            'preparingAnalysis': 'Preparing analysis...',
            'retrievingContent': 'Retrieving content...',
            'loading': 'Loading...',
            'preparingAnalysisTitle': 'Preparing Analysis',
            'startingAnalysisTitle': 'Starting Analysis Process',
            'gatheringContentTitle': 'Gathering Article Content',
            'preparingAnalysisDesc': 'Once processing begins, we will analyze the article for bias across multiple dimensions.',
            'startingAnalysisDesc': 'We will soon begin extracting content from the article for analysis.',
            'gatheringContentDesc': 'After content extraction, the AI will analyze the article for factual claims and bias.',
        };
        return translations[key] || key;
    }
}));

describe('SkeletonLoader Component', () => {
    it('renders the full skeleton loader with appropriate elements', () => {
        const { container } = render(<SkeletonLoader />);

        // Check for results heading
        expect(screen.getByText('Analysis Results')).toBeInTheDocument();

        // Check for the skeleton container with animation
        const skeletonContainers = container.querySelectorAll('.animate-pulse');
        expect(skeletonContainers.length).toBeGreaterThan(0);

        // Check for Bias Analysis heading
        expect(screen.getByText('Bias Analysis')).toBeInTheDocument();

        // Check for image skeleton
        const imageSkeleton = container.querySelector('.md\\:col-span-6 .h-48');
        expect(imageSkeleton).toBeInTheDocument();

        // Check for dimension analysis section
        expect(screen.getByText('Dimension Analysis')).toBeInTheDocument();

        // Check for factual claims section
        expect(screen.getByText('Factual Claims')).toBeInTheDocument();
    });

    describe('AnalysisOnlySkeletonLoader', () => {
        it('renders with Queued status correctly', () => {
            render(<AnalysisOnlySkeletonLoader status="Queued" />);

            // Check for status message
            expect(screen.getByText('Waiting in queue...')).toBeInTheDocument();

            // Check for dimension analysis
            expect(screen.getByText('Dimension Analysis')).toBeInTheDocument();

            // Should show "Preparing Analysis" for early stage
            expect(screen.getByText('Preparing Analysis')).toBeInTheDocument();

            // Should NOT show Factual Claims for early stage
            expect(screen.queryByText('Factual Claims')).not.toBeInTheDocument();
        });

        it('renders with Processing status correctly', () => {
            render(<AnalysisOnlySkeletonLoader status="Processing" />);

            // Check for status message
            expect(screen.getByText('Preparing analysis...')).toBeInTheDocument();

            // Should show "Starting Analysis Process" for this stage
            expect(screen.getByText('Starting Analysis Process')).toBeInTheDocument();
        });

        it('renders with Fetching status correctly', () => {
            render(<AnalysisOnlySkeletonLoader status="Fetching" />);

            // Status message should not be visible when Fetching
            expect(screen.queryByText('Retrieving content...')).not.toBeInTheDocument();

            // Should show "Gathering Article Content" for this stage
            expect(screen.getByText('Gathering Article Content')).toBeInTheDocument();
        });

        it('renders with Analyzing status correctly', () => {
            render(<AnalysisOnlySkeletonLoader status="Analyzing" />);

            // Status message should not be visible when Analyzing
            expect(screen.queryByText('Analyzing content...')).not.toBeInTheDocument();

            // Should show factual claims for later stage
            expect(screen.getByText('Factual Claims')).toBeInTheDocument();

            // Should show dimension analysis
            expect(screen.getByText('Dimension Analysis')).toBeInTheDocument();
        });
    });
}); 