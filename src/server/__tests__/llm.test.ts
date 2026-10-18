// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OpenAI from 'openai';
import { analyzeArticle, INSTRUCTIONS } from '../llm';
import config from '../config';
import { analysis, ARTICLE_TEXT, ARTICLE_TITLE } from '@/__tests__/data/analysis';

const mockParse = vi.hoisted(() => vi.fn());

vi.mock('openai', () => ({
    default: vi.fn().mockImplementation(() => ({ beta: { chat: { completions: { parse: mockParse } } } })),
}));

vi.mock('../config', () => ({
    default: { ai: { apiKey: 'test-api-key', baseUrl: 'https://llm.example/v1', model: 'test-model' } },
}));

vi.spyOn(console, 'error').mockImplementation(() => { });
vi.spyOn(console, 'warn').mockImplementation(() => { });
vi.spyOn(console, 'info').mockImplementation(() => { });
vi.spyOn(console, 'log').mockImplementation(() => { });

// The client is created when the module loads, before beforeEach resets the mocks
const clientOptions = vi.mocked(OpenAI).mock.calls[0]?.[0];

const respond = (parsed: unknown, extra: object = {}) =>
    mockParse.mockResolvedValue({ choices: [{ message: { parsed, refusal: null, ...extra } }], usage: {} });

describe('analyzeArticle', () => {
    beforeEach(() => {
        mockParse.mockReset();
        vi.mocked(config.ai).apiKey = 'test-api-key';
        respond(analysis);
    });

    it('talks to the configured OpenAI-compatible endpoint', () => {
        expect(clientOptions).toMatchObject({ apiKey: 'test-api-key', baseURL: 'https://llm.example/v1' });
    });

    it('sends static instructions, the article as data and a JSON schema', async () => {
        const result = await analyzeArticle(ARTICLE_TITLE, ARTICLE_TEXT, 'de');

        const request = mockParse.mock.calls[0][0];
        expect(request.model).toBe('test-model');
        expect(request.messages[0]).toEqual({ role: 'system', content: INSTRUCTIONS });
        expect(request.messages[1].role).toBe('user');
        expect(request.messages[1].content).toContain('Write the analysis in German.');
        expect(request.messages[1].content).toContain(`<headline>${ARTICLE_TITLE}</headline>`);
        expect(request.messages[1].content).toContain(ARTICLE_TEXT);
        expect(request.response_format).toMatchObject({ type: 'json_schema', json_schema: { name: 'analysis', strict: true } });
        expect(result).toEqual(analysis);
    });

    it('drops items whose quote is not in the article', async () => {
        respond({ ...analysis, claims: [...analysis.claims, { ...analysis.claims[0], quote: 'Not in the article.' }] });

        const result = await analyzeArticle(ARTICLE_TITLE, ARTICLE_TEXT);

        expect(result.claims).toEqual(analysis.claims);
    });

    it('truncates very long articles', async () => {
        await analyzeArticle('Title', 'a'.repeat(200000));

        const content: string = mockParse.mock.calls[0][0].messages[1].content;
        expect(content.length).toBeLessThan(110000);
        expect(content).toContain('[truncated]');
    });

    it('fails clearly without an API key, on refusals and on API errors', async () => {
        vi.mocked(config.ai).apiKey = '';
        await expect(analyzeArticle('Title', 'Text')).rejects.toThrow('OPENAI_API_KEY is not configured');
        vi.mocked(config.ai).apiKey = 'test-api-key';

        respond(null, { refusal: 'I cannot help with that.' });
        await expect(analyzeArticle('Title', 'Text')).rejects.toThrow('LLM error: Model refused: I cannot help with that.');

        mockParse.mockRejectedValueOnce(new Error('API rate limit exceeded'));
        await expect(analyzeArticle('Title', 'Text')).rejects.toThrow('LLM error: API rate limit exceeded');
    });
});
