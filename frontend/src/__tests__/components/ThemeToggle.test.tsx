import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ThemeProvider, useTheme } from 'next-themes';
import '@testing-library/jest-dom';

// Mock the Button component
vi.mock('@/components/ui/button', () => ({
    Button: ({ children, className, ...props }: React.PropsWithChildren<any>) => (
        <button className={className} data-testid="button" {...props}>{children}</button>
    ),
}));

// Mock the next-themes useTheme hook
vi.mock('next-themes', () => ({
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useTheme: vi.fn(),
}));

describe('ThemeToggle', () => {
    beforeEach(() => {
        // Reset the mocks before each test
        vi.clearAllMocks();
    });

    it('renders the sun icon when theme is light', () => {
        // Mock the useTheme hook to return light theme
        (useTheme as Mock).mockReturnValue({
            resolvedTheme: 'light',
            setTheme: vi.fn(),
        });

        render(
            <ThemeProvider>
                <ThemeToggle />
            </ThemeProvider>
        );

        // Check that the button has the correct accessibility attributes
        const button = screen.getByTestId('button');
        expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
        expect(button).toHaveAttribute('title', 'Switch to dark mode');
    });

    it('renders the moon icon when theme is dark', () => {
        // Mock the useTheme hook to return dark theme
        (useTheme as Mock).mockReturnValue({
            resolvedTheme: 'dark',
            setTheme: vi.fn(),
        });

        render(
            <ThemeProvider>
                <ThemeToggle />
            </ThemeProvider>
        );

        // Check that the button has the correct accessibility attributes
        const button = screen.getByTestId('button');
        expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
        expect(button).toHaveAttribute('title', 'Switch to light mode');
    });

    it('toggles the theme when clicked', () => {
        // Create a mock for setTheme
        const setThemeMock = vi.fn();

        // Mock the useTheme hook
        (useTheme as Mock).mockReturnValue({
            resolvedTheme: 'light',
            setTheme: setThemeMock,
        });

        render(
            <ThemeProvider>
                <ThemeToggle />
            </ThemeProvider>
        );

        // Click the button to toggle theme
        const button = screen.getByTestId('button');
        fireEvent.click(button);

        // Expect setTheme to be called with 'dark'
        expect(setThemeMock).toHaveBeenCalledWith('dark');
    });
}); 