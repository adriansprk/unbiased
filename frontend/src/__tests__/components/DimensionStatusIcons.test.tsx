import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DimensionStatusIcons from '@/components/DimensionStatusIcons';
import { DimensionStatus } from '@/utils/biasInterpreter';

// Mock the TooltipProvider since it might cause issues in tests
vi.mock('@/components/ui/tooltip', () => ({
    TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TooltipTrigger: ({ children, asChild, ...props }: unknown) => (
        <div {...props}>{children}</div>
    ),
    TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('DimensionStatusIcons Component', () => {
    const mockDimensionStatuses: Record<string, DimensionStatus> = {
        'Source Selection': 'Good',
        'Fairness / Balance': 'Caution',
        'Framing / Emphasis': 'Warning',
        'Word Choice / Tone': 'Good',
        'Headline / Title Bias': 'Caution',
    };

    const mockOnClick = vi.fn();

    it('renders all dimension status icons', () => {
        render(
            <DimensionStatusIcons
                dimensionStatuses={mockDimensionStatuses}
                onDimensionClick={mockOnClick}
            />
        );

        // Check if all dimensions are rendered using data-testid
        expect(screen.getByTestId('dimension-source-selection')).toBeInTheDocument();
        expect(screen.getByTestId('dimension-fairness-/-balance')).toBeInTheDocument();
        expect(screen.getByTestId('dimension-framing-/-emphasis')).toBeInTheDocument();
        expect(screen.getByTestId('dimension-word-choice-/-tone')).toBeInTheDocument();
        expect(screen.getByTestId('dimension-headline-/-title-bias')).toBeInTheDocument();

        // Check if the data-testid is correctly set
        expect(screen.getByTestId('dimension-status-icons')).toBeInTheDocument();
    });

    it('handles click events correctly', () => {
        render(
            <DimensionStatusIcons
                dimensionStatuses={mockDimensionStatuses}
                onDimensionClick={mockOnClick}
            />
        );

        // Click on a dimension button using data-testid
        fireEvent.click(screen.getByTestId('dimension-source-selection'));

        // Check if the onClick handler was called with the correct dimension
        expect(mockOnClick).toHaveBeenCalledWith('Source Selection');
    });

    it('handles missing onClick prop gracefully', () => {
        // This test ensures the component doesn't break when onDimensionClick is not provided
        render(
            <DimensionStatusIcons dimensionStatuses={mockDimensionStatuses} />
        );

        // Should not throw an error when clicking
        fireEvent.click(screen.getByTestId('dimension-source-selection'));

        // Component should still be intact
        expect(screen.getByTestId('dimension-status-icons')).toBeInTheDocument();
    });
}); 