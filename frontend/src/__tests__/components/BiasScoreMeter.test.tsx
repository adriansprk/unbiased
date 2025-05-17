import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BiasScoreMeter from '@/components/BiasScoreMeter';
import { renderWithI18n } from '../utils/test-utils';

// Add console log to debug component rendering
vi.spyOn(console, 'log').mockImplementation(() => { });

describe('BiasScoreMeter Component', () => {
    const defaultProps = {
        biasLevel: 'Moderate' as const,
        slantCategory: 'Liberal/Progressive',
        slantConfidence: 'High'
    };

    it('renders the component with correct slant category and confidence', () => {
        renderWithI18n(<BiasScoreMeter {...defaultProps} />);

        // Check for heading
        expect(screen.getByText('Bias Analysis')).toBeInTheDocument();

        // Check for slant category and confidence with prefix
        // Using regex to match text that contains the slant category 
        expect(screen.getByText(/Liberal\/Progressive/)).toBeInTheDocument();

        // Look for the confidence text which is part of the confidence display
        const confidenceElements = screen.getAllByText(/High/);
        expect(confidenceElements.length).toBeGreaterThan(0);
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