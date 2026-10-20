import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ClaimsDisplay from '@/components/ClaimsDisplay';
import { renderWithI18n } from '../utils/test-utils';

describe('ClaimsDisplay Component', () => {
    const mockClaims = [
        {
            topic: 'Economy',
            statement: 'Inflation has reached a 40-year high',
            quote: 'Consumer prices have soared to levels not seen since the early 1980s.',
            significance: 'This claim is significant because it provides context on the current economic situation.'
        },
        {
            topic: 'Public Health',
            statement: 'COVID-19 cases are declining nationwide',
            quote: 'New infections have decreased by 30% compared to last month.',
            significance: 'This claim provides important information about the current state of the pandemic.'
        }
    ];

    it('renders the component with correct claims', () => {
        renderWithI18n(<ClaimsDisplay claims={mockClaims} />);

        // Check heading
        expect(screen.getByText('Factual Claims')).toBeInTheDocument();

        // Check if all claims are rendered
        expect(screen.getByText('Economy')).toBeInTheDocument();
        expect(screen.getByText('Inflation has reached a 40-year high')).toBeInTheDocument();
        expect(screen.getByText('Public Health')).toBeInTheDocument();
        expect(screen.getByText('COVID-19 cases are declining nationwide')).toBeInTheDocument();
    });

    it('keeps the quote and significance in the collapsed details of each claim', () => {
        renderWithI18n(<ClaimsDisplay claims={mockClaims} />);

        const quote = screen.getByText(mockClaims[0].quote);
        expect(quote.closest('details')).not.toHaveAttribute('open');
        expect(screen.getByText(mockClaims[0].significance)).toBeInTheDocument();
    });

    it('handles empty claims array gracefully', () => {
        renderWithI18n(<ClaimsDisplay claims={[]} />);

        expect(screen.getByText('No factual claims were identified in this article.')).toBeInTheDocument();
    });

    it('displays the correct number of claims', () => {
        renderWithI18n(<ClaimsDisplay claims={mockClaims} />);

        // Check if both claim items are rendered using the actual data-testid attributes
        expect(screen.getByTestId('claim-0')).toBeInTheDocument();
        expect(screen.getByTestId('claim-1')).toBeInTheDocument();
        expect(screen.queryByTestId('claim-2')).not.toBeInTheDocument();
    });
}); 