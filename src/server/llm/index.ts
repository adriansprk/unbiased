import config from '../config';
import logger from '../logger';
import { AnalysisResults } from '../types';
import { performAnalysisWithGemini } from './gemini';
import { performAnalysisWithOpenAI } from './openai';

/**
 * Analyzes an article with the configured provider (Gemini by default),
 * falling back to OpenAI when Gemini fails and an OpenAI key is set.
 */
export async function analyzeArticle(title: string, text: string, language: string): Promise<AnalysisResults> {
  const { analysisLlmProvider, openaiApiKey } = config.ai;

  if (analysisLlmProvider === 'openai' && openaiApiKey) {
    return performAnalysisWithOpenAI(title, text, language);
  }

  try {
    return await performAnalysisWithGemini(title, text, language);
  } catch (error) {
    if (!openaiApiKey) throw error;
    logger.warn(`Gemini analysis failed, falling back to OpenAI: ${error instanceof Error ? error.message : error}`);
    return performAnalysisWithOpenAI(title, text, language);
  }
}
