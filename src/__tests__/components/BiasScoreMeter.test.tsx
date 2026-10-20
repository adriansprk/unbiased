import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BiasScoreMeter from '@/components/BiasScoreMeter';
import { analysis } from '../data/analysis';
import { renderWithI18n } from '../utils/test-utils';

describe('BiasScoreMeter Component', () => {
    const defaultProps = {
        biasLevel: 'Moderate' as const,
        articleType: { type: 'opinion' as const, rationale: 'A column arguing for the plan.' },
    };

    it('shows the article type with its rationale and, for opinion pieces, how they are judged', () => {
        renderWithI18n(<BiasScoreMeter {...defaultProps} />);

        expect(screen.getByRole('heading', { name: 'Bias Analysis' })).toBeInTheDocument();
        expect(screen.getByText('Opinion')).toBeInTheDocument();
        expect(screen.getByText('A column arguing for the plan.')).toBeInTheDocument();
        expect(screen.getByText(/judged on whether they treat facts/)).toBeInTheDocument();
    });

    it('shows no type for results from before article types', () => {
        renderWithI18n(<BiasScoreMeter biasLevel="Low" articleType={null} />);

        expect(screen.queryByText('Opinion')).not.toBeInTheDocument();
        expect(screen.queryByText(/judged on whether/)).not.toBeInTheDocument();
    });

    it.each([
        ['Low', '.bg-emerald-500', 1],
        ['Moderate', '.bg-amber-500', 2],
        ['High', '.bg-rose-500', 3],
    ] as const)('fills the scale up to %s', (biasLevel, bar, filled) => {
        const { container } = renderWithI18n(<BiasScoreMeter {...defaultProps} biasLevel={biasLevel} />);

        expect(container.querySelectorAll(bar)).toHaveLength(filled);
        expect(screen.getAllByText(biasLevel)).toHaveLength(2); // the verdict and its place on the scale
    });

    it('lists the five ratings, linked to their sections, and counts the flagged ones', () => {
        renderWithI18n(<BiasScoreMeter {...defaultProps} dimensions={analysis.dimensions} />);

        expect(screen.getByText('3 of 5 dimensions raised concerns.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Source Selection/ })).toHaveAttribute('href', '#dimension-sources');
        expect(screen.getAllByText('Caution')).toHaveLength(3);
    });
});
