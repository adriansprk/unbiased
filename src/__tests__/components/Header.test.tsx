import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Header from '@/components/Header';
import '@testing-library/jest-dom';

// Mock next-intl
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => {
        const translations: Record<string, string> = {
            'header.analyze': 'Analyze',
            'header.about': 'About',
            'header.contact': 'Contact',
        };
        return translations[key] || key;
    },
    useLocale: () => 'en',
}));

// Mock the next-intl navigation
vi.mock('@/i18n/navigation', () => ({
    usePathname: () => '/',
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
    }),
    Link: ({ href, locale, children }: { href: string, locale?: string, children: React.ReactNode }) => {
        const localePrefix = locale ? `/${locale}` : '';
        return <a href={`${localePrefix}${href}`}>{children}</a>;
    },
}));

// Mock the ThemeProvider
vi.mock('@/lib/ThemeProvider', () => ({
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Next.js Image component
vi.mock('next/image', () => {
    return {
        __esModule: true,
        default: ({ src, alt, width, height, className }: {
            src: string;
            alt: string;
            width: number;
            height: number;
            className?: string;
        }) => {
            return <img src={src} alt={alt} width={width} height={height} className={className} data-testid="logo" />;
        },
    };
});

// Mock the ThemeToggle component to avoid theme-related issues
vi.mock('@/components/ThemeToggle', () => ({
    ThemeToggle: () => <button data-testid="theme-toggle">Toggle Theme</button>,
}));

// Mock the LanguageSwitcher component
vi.mock('@/components/LanguageSwitcher', () => ({
    default: () => <div data-testid="language-switcher">EN | DE</div>,
}));

describe('Header', () => {
    it('renders the header with site title and logo', () => {
        render(<Header />);

        // Check if the site title is present
        expect(screen.getByText('Unbiased')).toBeInTheDocument();

        // Check if the logo is present
        expect(screen.getByTestId('logo')).toBeInTheDocument();
        expect(screen.getByTestId('logo').getAttribute('src')).toBe('/unbiased-icon.svg');
    });

    it('renders the language switcher and theme toggle', () => {
        render(<Header />);

        // Check if the language switcher is present
        expect(screen.getByTestId('language-switcher')).toBeInTheDocument();

        // Check if the theme toggle is present
        expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });
}); 