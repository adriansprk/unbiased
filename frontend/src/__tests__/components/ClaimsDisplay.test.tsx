import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ClaimsDisplay from '@/components/ClaimsDisplay';
import { FactualClaim } from '@/types/analysis';
import { renderWithI18n } from '../utils/test-utils';

// Mock the accordion components from our UI library
vi.mock('@/components/ui/accordion', () => ({
    Accordion: ({ children, ...props }: React.PropsWithChildren) => (
        <div data-testid="mock-accordion" {...props}>{children}</div>
    ),
    AccordionContent: ({ children, ...props }: React.PropsWithChildren) => (
        <div data-testid="mock-accordion-content" {...props}>{children}</div>
    ),
    AccordionItem: ({ children, value, ...props }: React.PropsWithChildren<{ value: string }>) => (
        <div data-testid={`mock-accordion-item-${value}`} {...props}>{children}</div>
    ),
    AccordionTrigger: ({ children, ...props }: React.PropsWithChildren) => (
        <button data-testid="mock-accordion-trigger" {...props}>{children}</button>
    ),
}));

describe('ClaimsDisplay Component', () => {
    const mockClaims: FactualClaim[] = [
        {
            claim_topic: 'Economy',
            claim_statement: 'Inflation has reached a 40-year high',
            quote_from_article: 'Consumer prices have soared to levels not seen since the early 1980s.',
            significance_rationale: 'This claim is significant because it provides context on the current economic situation.'
        },
        {
            claim_topic: 'Public Health',
            claim_statement: 'COVID-19 cases are declining nationwide',
            quote_from_article: 'New infections have decreased by 30% compared to last month.',
            significance_rationale: 'This claim provides important information about the current state of the pandemic.'
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

    it('handles empty claims array gracefully', () => {
        renderWithI18n(<ClaimsDisplay claims={[]} />);

        expect(screen.getByText('No claims found')).toBeInTheDocument();
    });

    it('handles null or undefined claims gracefully', () => {
        // @ts-expect-error - Intentionally passing null for testing
        renderWithI18n(<ClaimsDisplay claims={null} />);

        expect(screen.getByText('No claims found')).toBeInTheDocument();
    });

    it('displays the correct number of claims', () => {
        renderWithI18n(<ClaimsDisplay claims={mockClaims} />);

        // Check if both claim items are rendered using the actual data-testid attributes
        expect(screen.getByTestId('claim-0')).toBeInTheDocument();
        expect(screen.getByTestId('claim-1')).toBeInTheDocument();
        expect(screen.queryByTestId('claim-2')).not.toBeInTheDocument();
    });
}); 