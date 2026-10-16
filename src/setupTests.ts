// Setup file for Vitest tests
import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Automatically clean up after each test
afterEach(() => {
    cleanup();
});

// Browser-only shims; server tests run in the node environment
if (typeof window !== 'undefined') {
    // Node 25+ defines its own (disabled) localStorage global, which hides jsdom's
    const dom = (globalThis as { jsdom?: { window: Window } }).jsdom;
    if (dom) {
        for (const key of ['localStorage', 'sessionStorage'] as const) {
            Object.defineProperty(window, key, { value: dom.window[key], configurable: true });
        }
    }

    // Mock matchMedia for components that use media queries
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(), // Deprecated
            removeListener: vi.fn(), // Deprecated
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });

    // Mock ResizeObserver which is not available in JSDOM
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
    }));
}
