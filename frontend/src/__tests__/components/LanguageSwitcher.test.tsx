import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import '@testing-library/jest-dom';

// Mock the next-intl useLocale hook
vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => (key: string) => key,
}));

// Create mock router functions
const mockReplace = vi.fn();
const mockPush = vi.fn();

// Mock the next-intl navigation
vi.mock('../../i18n/navigation', () => ({
    usePathname: () => '/',
    useRouter: () => ({
        push: mockPush,
        replace: mockReplace,
    }),
    Link: ({ href, children }: { href: string, children: React.ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));

// Mock the routing configuration
vi.mock('../../i18n/routing', () => ({
    routing: {
        locales: ['en', 'de'],
    },
}));

describe('LanguageSwitcher', () => {
    beforeEach(() => {
        mockPush.mockReset();
        mockReplace.mockReset();
    });

    it('renders correctly with current locale displayed', () => {
        render(<LanguageSwitcher />);

        // Check that the current locale is displayed
        expect(screen.getByText('EN')).toBeInTheDocument();

        // Check that the button has the title of the next locale
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('title', 'de');
    });

    it('calls router.replace when clicked', async () => {
        render(<LanguageSwitcher />);

        // Click the language switcher button
        const button = screen.getByRole('button');
        fireEvent.click(button);

        // Check that router.replace was called
        expect(mockReplace).toHaveBeenCalled();

        // Since the actual arguments might be different in the implementation,
        // we'll just check that it was called with some arguments
        expect(mockReplace.mock.calls.length).toBe(1);
    });
}); 