import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SlantDisplay from '@/components/SlantDisplay';

describe('SlantDisplay Component', () => {
    const defaultProps = {
        category: 'Conservative',
        confidence: 'High',
        rationale: 'The article shows a strong conservative perspective on the topic.'
    };

    it('renders the component with correct information', () => {
        render(<SlantDisplay {...defaultProps} />);

        expect(screen.getByText('Article Slant')).toBeInTheDocument();
        expect(screen.getByText('Conservative')).toBeInTheDocument();
        expect(screen.getByText(/High confidence/i)).toBeInTheDocument();
        expect(screen.getByText('The article shows a strong conservative perspective on the topic.')).toBeInTheDocument();
    });

    it('displays the liberal slant with correct styling', () => {
        const liberalProps = {
            ...defaultProps,
            category: 'Liberal/Progressive'
        };

        render(<SlantDisplay {...liberalProps} />);

        const badge = screen.getByTestId('slant-badge');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveTextContent('Liberal/Progressive');
    });

    it('displays the balanced slant with correct styling', () => {
        const balancedProps = {
            ...defaultProps,
            category: 'Center/Balanced',
            confidence: 'Medium'
        };

        render(<SlantDisplay {...balancedProps} />);

        expect(screen.getByText('Center/Balanced')).toBeInTheDocument();
        expect(screen.getByText(/Medium confidence/i)).toBeInTheDocument();
    });

    it('displays academic slant correctly', () => {
        const academicProps = {
            ...defaultProps,
            category: 'Academic/Scientific'
        };

        render(<SlantDisplay {...academicProps} />);

        expect(screen.getByText('Academic/Scientific')).toBeInTheDocument();
    });
}); 