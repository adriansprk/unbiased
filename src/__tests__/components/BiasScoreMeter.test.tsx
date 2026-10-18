import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BiasScoreMeter from '@/components/BiasScoreMeter';
import { renderWithI18n } from '../utils/test-utils';

describe('BiasScoreMeter Component', () => {
    const defaultProps = {
        biasLevel: 'Moderate' as const,
        articleType: { type: 'opinion' as const, rationale: 'A column arguing for the plan.' },
    };

    it('shows the article type and, for opinion pieces, how they are judged', () => {
        renderWithI18n(<BiasScoreMeter {...defaultProps} />);

        expect(screen.getByText('Bias Analysis')).toBeInTheDocument();
        expect(screen.getByText('Opinion')).toBeInTheDocument();
        expect(screen.getByText(/judged on whether they treat facts/)).toBeInTheDocument();
    });

    it('shows no type badge for results from before article types', () => {
        renderWithI18n(<BiasScoreMeter biasLevel="Low" articleType={null} />);

        expect(screen.queryByText('Opinion')).not.toBeInTheDocument();
        expect(screen.queryByText(/judged on whether/)).not.toBeInTheDocument();
    });

    it('shows correct colors for Low bias level', () => {
        const props = {
            ...defaultProps,
            biasLevel: 'Low' as const,
        };

        const { container } = renderWithI18n(<BiasScoreMeter {...props} />);

        // Check for Low label in the scale
        expect(screen.getByText('Low')).toBeInTheDocument();

        // Check for the green progress bar
        const progressBar = container.querySelector('.bg-green-500');
        expect(progressBar).toBeInTheDocument();
    });

    it('shows correct colors for High bias level', () => {
        const props = {
            ...defaultProps,
            biasLevel: 'High' as const,
        };

        const { container } = renderWithI18n(<BiasScoreMeter {...props} />);

        // Check for High label in the scale
        expect(screen.getByText('High')).toBeInTheDocument();

        // Check for the red progress bar
        const progressBar = container.querySelector('.bg-red-500');
        expect(progressBar).toBeInTheDocument();
    });

    it('displays the progress meter correctly', () => {
        const { container } = renderWithI18n(<BiasScoreMeter {...defaultProps} />);

        // Check for the Moderate bias level yellow meter
        const progressBar = container.querySelector('.bg-yellow-500');
        expect(progressBar).toBeInTheDocument();

        // Check for the scale labels
        expect(screen.getByText('Low')).toBeInTheDocument();
        expect(screen.getByText('Moderate')).toBeInTheDocument();
        expect(screen.getByText('High')).toBeInTheDocument();
    });
}); 