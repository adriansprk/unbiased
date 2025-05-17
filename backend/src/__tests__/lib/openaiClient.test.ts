import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performAnalysisWithOpenAI } from '../../lib/openaiClient';
import OpenAI from 'openai';
import config from '../../config';
import { AnalysisResults } from '../../types';

// Use vi.hoisted to create mocks before they're used in vi.mock()
const mockCreate = vi.hoisted(() => vi.fn());

// Mock the OpenAI module
vi.mock('openai', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            chat: {
                completions: {
                    create: mockCreate
                }
            }
        }))
    };
});

// Mock the config to ensure it has the required values
vi.mock('../../config', () => ({
    default: {
        ai: {
            openaiApiKey: 'test-api-key',
            modelName: 'test-model',
        },
    }
}));

// Mock the console to prevent polluting test output
vi.spyOn(console, 'error').mockImplementation(() => { });
vi.spyOn(console, 'log').mockImplementation(() => { });
vi.spyOn(console, 'warn').mockImplementation(() => { });

describe('OpenAI Client', () => {
    beforeEach(() => {
        // Reset all mocks before each test
        vi.resetAllMocks();

        // Ensure config has API key by default
        vi.mocked(config.ai).openaiApiKey = 'test-api-key';

        // Set up default mock response with combined result structure
        mockCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: JSON.stringify({
                        slant: {
                            category: "Liberal/Progressive",
                            confidence: "High",
                            rationale: "The article uses language that emphasizes social justice concerns"
                        },
                        claims: {
                            factual_claims: [
                                {
                                    claim_topic: "Climate Change",
                                    claim_statement: "Global temperatures have risen 1.1°C since pre-industrial times",
                                    quote_from_article: "Global temperatures have already risen by 1.1 degrees Celsius compared to pre-industrial levels",
                                    significance_rationale: "This establishes the core scientific basis for the article's argument"
                                }
                            ]
                        },
                        report: {
                            bias_analysis: {
                                overall_assessment: "The article shows moderate bias through framing and word choice",
                                overall_bias_level: "Moderate",
                                dimension_summaries: {
                                    "Word Choice / Tone": {
                                        summary: "Uses emotional language when describing climate impacts",
                                        status: "Caution"
                                    },
                                    "Framing / Emphasis": {
                                        summary: "Emphasizes urgency of climate action",
                                        status: "Caution"
                                    },
                                    "Source Selection": {
                                        summary: "Relies primarily on progressive-leaning sources",
                                        status: "Caution"
                                    },
                                    "Fairness / Balance": {
                                        summary: "Limited representation of alternative viewpoints",
                                        status: "Caution"
                                    },
                                    "Headline / Title Bias": {
                                        summary: "The headline accurately reflects content without sensationalism",
                                        status: "Balanced"
                                    }
                                },
                                evidence: {
                                    notable_quotes: [],
                                    framing_examples: []
                                }
                            }
                        }
                    })
                }
            }],
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should successfully perform analysis with OpenAI using the combined prompt approach', async () => {
        // Call the function with test data
        const result = await performAnalysisWithOpenAI('Test Title', 'Test article text', 'en');

        // Verify that the OpenAI API was called once with the combined prompt
        expect(mockCreate).toHaveBeenCalledTimes(1);

        // Verify that the correct model name was used
        expect(mockCreate.mock.calls[0][0]).toHaveProperty('model', config.ai.modelName);

        // Check that user message contains the content
        expect(mockCreate.mock.calls[0][0].messages[0].role).toBe('user');
        expect(mockCreate.mock.calls[0][0].messages[0].content).toContain('Test Title');
        expect(mockCreate.mock.calls[0][0].messages[0].content).toContain('Test article text');
        expect(mockCreate.mock.calls[0][0].messages[0].content).toContain('Language Instruction:');
        expect(mockCreate.mock.calls[0][0].messages[0].content).toContain('Generate all text content (summaries, rationales, explanations) in English');

        // Check that the response is properly structured
        expect(result).toHaveProperty('claims');
        expect(result).toHaveProperty('report');
        expect(result).toHaveProperty('slant');
    });

    it('should handle German language parameter', async () => {
        // Call the function with German language
        await performAnalysisWithOpenAI('Test Title', 'Test article text', 'de');

        // Check that the prompt includes German language instructions
        expect(mockCreate.mock.calls[0][0].messages[0].content).toContain('Language Instruction:');
        expect(mockCreate.mock.calls[0][0].messages[0].content).toContain('Generate all text content (summaries, rationales, explanations) in German');
    });

    it('should handle missing API key', async () => {
        // Override config for this test only
        vi.mocked(config.ai).openaiApiKey = '';

        // Test that function throws an error with missing API key
        await expect(performAnalysisWithOpenAI('Title', 'Text')).rejects.toThrow(
            'OpenAI API key is not configured'
        );

        // Restore API key for other tests
        vi.mocked(config.ai).openaiApiKey = 'test-api-key';
    });

    it('should handle API errors gracefully', async () => {
        // Override previous mocks for this test
        mockCreate.mockReset();

        // Mock API failure
        mockCreate.mockRejectedValueOnce(
            new Error('API rate limit exceeded')
        );

        // Test that function passes through error message
        await expect(performAnalysisWithOpenAI('Title', 'Text')).rejects.toThrow(
            'API rate limit exceeded'
        );
    });

    it('should throw error for malformed JSON in response', async () => {
        // Mock response with invalid JSON
        mockCreate.mockResolvedValueOnce({
            choices: [{
                message: {
                    content: 'This is not valid JSON'
                }
            }],
        });

        // The function should throw an error about parsing failure
        await expect(performAnalysisWithOpenAI('Test Title', 'Test article text')).rejects.toThrow(
            'Failed to parse combined analysis response'
        );
    });

    it('should throw error for empty or missing API responses', async () => {
        // Override previous mocks for this test
        mockCreate.mockReset();

        // Empty response
        mockCreate.mockResolvedValueOnce({});

        // The function should throw an error about parsing failure
        await expect(performAnalysisWithOpenAI('Test Title', 'Test article text')).rejects.toThrow(
            'OpenAI API error: Failed to parse combined analysis response'
        );
    });

    it('should truncate very long text', async () => {
        // Create very long text
        const longText = 'a'.repeat(200000);

        // Call the function with long text
        await performAnalysisWithOpenAI('Title', longText);

        // Get the first call arguments
        const callArgs = mockCreate.mock.calls[0][0];

        // Check that the text was truncated
        expect(callArgs.messages[0].content.length).toBeLessThan(longText.length);
        expect(callArgs.messages[0].content).toContain('[truncated');
    });

    it('should extract JSON from markdown code blocks', async () => {
        // Mock response with JSON embedded in markdown code blocks
        mockCreate.mockResolvedValueOnce({
            choices: [{
                message: {
                    content: '```json\n{"slant":{"category":"Neutral"},"claims":{"factual_claims":[]},"report":{"bias_analysis":{"overall_assessment":"Neutral"}}}\n```'
                }
            }],
        });

        // The function should extract and parse the JSON
        const result = await performAnalysisWithOpenAI('Test Title', 'Test article text');

        // Expect the result to match the JSON in the code block
        expect(result).toHaveProperty('slant');
        expect(result).toHaveProperty('claims');
        expect(result).toHaveProperty('report');
    });
}); 