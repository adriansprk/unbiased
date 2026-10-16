import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('@/i18n/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next-intl', () => ({
    useLocale: () => 'de',
    useTranslations: () => (key: string) => key,
}));
// Solve the challenge immediately
vi.mock('@/components/Turnstile', () => ({
    default: ({ onToken }: { onToken: (token: string) => void }) => (
        <button type="button" onClick={() => onToken('turnstile-token')}>solve</button>
    ),
}));

const fetchMock = vi.fn();

// The Turnstile requirement is decided at import time from NODE_ENV
async function renderForm(nodeEnv: 'development' | 'production') {
    vi.stubEnv('NODE_ENV', nodeEnv);
    vi.resetModules();
    const { default: AnalyzeForm } = await import('@/components/AnalyzeForm');
    render(<AnalyzeForm />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'https://example.com/a' } });
}

const respond = (status: number, body: unknown) =>
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe('AnalyzeForm', () => {
    beforeEach(() => {
        push.mockReset();
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
    });
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('opens the result page for the returned job', async () => {
        await renderForm('development');
        respond(200, { id: 'job-1' });

        fireEvent.click(screen.getByRole('button', { name: 'submit' }));

        await waitFor(() => expect(push).toHaveBeenCalledWith('/analysis/job-1'));
        expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ url: 'https://example.com/a', language: 'de' });
    });

    it('shows a translated error and stays on the page when the server rejects the URL', async () => {
        await renderForm('development');
        respond(400, { error: 'invalid_url' });

        fireEvent.click(screen.getByRole('button', { name: 'submit' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('invalidUrl');
        expect(push).not.toHaveBeenCalled();
    });

    it('requires a solved challenge in production and sends its token', async () => {
        await renderForm('production');
        respond(200, { id: 'job-2' });

        expect(screen.getByRole('button', { name: 'submit' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'solve' }));
        fireEvent.click(screen.getByRole('button', { name: 'submit' }));

        await waitFor(() => expect(push).toHaveBeenCalledWith('/analysis/job-2'));
        expect(JSON.parse(fetchMock.mock.calls[0][1].body).turnstileToken).toBe('turnstile-token');
    });
});
