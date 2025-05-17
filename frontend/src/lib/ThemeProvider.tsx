"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect } from "react";
import type { ReactNode } from "react";

// Define the props type
interface ThemeProviderProps {
    children: ReactNode;
    [key: string]: unknown;
}

// Re-export next-themes provider with our default configuration
export function ThemeProvider({
    children,
    ...props
}: ThemeProviderProps) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            {...props}
        >
            <ThemeScript />
            {children}
        </NextThemesProvider>
    );
}

// Script component to update theme-color meta tag when theme changes
function ThemeScript() {
    useEffect(() => {
        // Function to update theme color based on current theme
        const updateThemeColor = () => {
            // Check if document is defined (client-side only)
            if (typeof document === 'undefined') return;

            // Get the current theme by checking for the dark class
            const isDark = document.documentElement.classList.contains('dark');

            // Use OKLCH color values to match the design system
            const darkModeColor = 'oklch(0.145 0 0)';
            const lightModeColor = 'oklch(1 0 0)';

            // Set the color based on the current theme
            const themeColor = isDark ? darkModeColor : lightModeColor;

            // Find existing theme-color meta tag or create one if it doesn't exist
            let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;

            if (!meta) {
                // Create a new meta tag if none exists
                meta = document.createElement('meta');
                meta.name = 'theme-color';
                document.head.appendChild(meta);
            }

            // Update the content
            meta.content = themeColor;

            // iOS Safari specific handling for PWA
            const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
            if (statusBarMeta) {
                statusBarMeta.setAttribute('content', isDark ? 'black' : 'default');
            }
        };

        // Run once on mount
        updateThemeColor();

        // Set up a mutation observer to watch for theme changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (
                    mutation.type === 'attributes' &&
                    mutation.attributeName === 'class'
                ) {
                    updateThemeColor();
                }
            });
        });

        // Start observing the document element for class changes
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        // Clean up
        return () => observer.disconnect();
    }, []);

    return null;
}

// Re-export useTheme from next-themes for convenience
export { useTheme } from "next-themes"; 