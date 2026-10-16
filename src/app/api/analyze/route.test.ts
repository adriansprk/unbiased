// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const mocks = vi.hoisted(() => ({
    after: vi.fn(),
    findOrCreateJob: vi.fn(),
    verifyTurnstile: vi.fn(),
    runAnalysis: vi.fn(),
}));
vi.mock('next/server', () => ({ after: mocks.after }));
vi.mock('@/server/jobs', () => ({ findOrCreateJob: mocks.findOrCreateJob }));
vi.mock('@/server/turnstile', () => ({ verifyTurnstile: mocks.verifyTurnstile }));
vi.mock('@/server/pipeline', () => ({ runAnalysis: mocks.runAnalysis }));

const post = (body: unknown) =>
    POST(new Request('http://localhost/api/analyze', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
        body: JSON.stringify(body),
    }));

describe('POST /api/analyze', () => {
    beforeEach(() => {
        Object.values(mocks).forEach(mock => mock.mockReset());
        mocks.verifyTurnstile.mockResolvedValue(true);
    });

    it('rejects anything but http(s) URLs', async () => {
        expect((await post({ url: 'javascript:alert(1)' })).status).toBe(400);
        expect((await post({ url: 'not a url' })).status).toBe(400);
        expect(mocks.findOrCreateJob).not.toHaveBeenCalled();
    });

    it('rejects failed verification before touching the database', async () => {
        mocks.verifyTurnstile.mockResolvedValue(false);
        const res = await post({ url: 'https://example.com/a', turnstileToken: 'tok' });
        expect(res.status).toBe(403);
        expect(mocks.verifyTurnstile).toHaveBeenCalledWith('tok', '203.0.113.7');
        expect(mocks.findOrCreateJob).not.toHaveBeenCalled();
    });

    it('starts the analysis after responding for new jobs', async () => {
        mocks.findOrCreateJob.mockResolvedValue({ id: 'new', isNew: true });
        const res = await post({ url: 'https://example.com/a', language: 'de' });

        expect(await res.json()).toEqual({ id: 'new' });
        expect(mocks.findOrCreateJob).toHaveBeenCalledWith('https://example.com/a', 'de');
        expect(mocks.after).toHaveBeenCalledTimes(1);
        mocks.after.mock.calls[0][0]();
        expect(mocks.runAnalysis).toHaveBeenCalledWith({ id: 'new', url: 'https://example.com/a', language: 'de' });
    });

    it('returns an existing job without re-running it', async () => {
        mocks.findOrCreateJob.mockResolvedValue({ id: 'existing', isNew: false });
        const res = await post({ url: 'https://example.com/a' });

        expect(await res.json()).toEqual({ id: 'existing' });
        expect(mocks.findOrCreateJob).toHaveBeenCalledWith('https://example.com/a', 'en');
        expect(mocks.after).not.toHaveBeenCalled();
    });
});
