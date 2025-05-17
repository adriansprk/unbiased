import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performAnalysisWithGemini } from '../../lib/geminiClient';
import { GoogleGenAI } from '@google/genai';
import config from '../../config';
import { AnalysisResults } from '../../types';

// Mock the GoogleGenAI module
vi.mock('@google/genai', () => {
    return {
        GoogleGenAI: vi.fn()
    };
});

// Mock the config to ensure it has the required values
vi.mock('../../config', () => ({
    default: {
        ai: {
            geminiApiKey: 'test-api-key',
            geminiModelName: 'gemini-test-model',
        },
    }
}));

describe('geminiClient', () => {
    // Create mock functions for models approach
    const mockModelsGenerateContent = vi.fn();

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();

        // Set up default mock implementation that works with the models.generateContent approach
        (GoogleGenAI as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
            return {
                models: {
                    generateContent: mockModelsGenerateContent
                }
            };
        });

        // Default successful response
        mockModelsGenerateContent.mockResolvedValue({
            text: JSON.stringify({
                slant: { category: "Neutral" },
                claims: { factual_claims: [] },
                report: { bias_analysis: { overall_assessment: "Neutral" } }
            })
        });
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('should successfully perform analysis with Gemini', async () => {
        // Call the function
        const result = await performAnalysisWithGemini('Test Title', 'Test article text');

        // Assertions
        expect(result).toHaveProperty('slant');
        expect(result.slant).toHaveProperty('category', 'Neutral');
        expect(result).toHaveProperty('claims');
        expect(result).toHaveProperty('report');

        // Verify the mock was called
        expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
        expect(mockModelsGenerateContent).toHaveBeenCalled();
    });

    it('should extract JSON from markdown code blocks', async () => {
        // Override the mock for this test to return markdown code blocks
        mockModelsGenerateContent.mockResolvedValueOnce({
            text: '```json\n{"slant":{"category":"Neutral"},"claims":{"factual_claims":[]},"report":{"bias_analysis":{"overall_assessment":"Neutral"}}}\n```'
        });

        // Call the function
        const result = await performAnalysisWithGemini('Test Title', 'Test article text');

        // Expect the result to match the JSON in the code block
        expect(result).toHaveProperty('slant');
        expect(result.slant).toHaveProperty('category', 'Neutral');
        expect(result).toHaveProperty('claims');
        expect(result).toHaveProperty('report');
    });

    it('should handle error responses', async () => {
        // Mock error response
        mockModelsGenerateContent.mockRejectedValueOnce(new Error('API error'));

        // Expect the function to throw an error
        await expect(performAnalysisWithGemini('Test Title', 'Test article text'))
            .rejects.toThrow('Gemini API error: API error');
    });

    it('should handle invalid JSON responses', async () => {
        // Mock invalid JSON response
        mockModelsGenerateContent.mockResolvedValueOnce({
            text: 'Not valid JSON'
        });

        // Expect the function to throw an error
        await expect(performAnalysisWithGemini('Test Title', 'Test article text'))
            .rejects.toThrow('Failed to parse combined analysis response');
    });
});