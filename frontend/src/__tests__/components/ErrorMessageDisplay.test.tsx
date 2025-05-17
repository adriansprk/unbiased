import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorMessageDisplay from '../../components/ErrorMessageDisplay';

describe('ErrorMessageDisplay', () => {
    it('renders nothing when message is null', () => {
        const { container } = render(<ErrorMessageDisplay message={null} />);
        expect(container.firstChild).toBeNull();
    });

    it('displays the error message correctly', () => {
        const errorMessage = 'This is a test error message';
        render(<ErrorMessageDisplay message={errorMessage} />);

        // Check heading
        expect(screen.getByText('Error')).toBeInTheDocument();

        // Check message content
        expect(screen.getByText(errorMessage)).toBeInTheDocument();

        // Check for error icon (SVG)
        expect(document.querySelector('svg')).toBeInTheDocument();
    });
}); 