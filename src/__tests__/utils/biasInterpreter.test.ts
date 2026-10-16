import { interpretBiasAnalysis } from '@/utils/biasInterpreter';
import { AnalysisData } from '@/types/analysis';
import { describe, it, expect } from 'vitest';

describe('biasInterpreter utility', () => {
    // Test data with high bias
    const highBiasData: AnalysisData = {
        slant: {
            category: 'Conservative',
            confidence: 'High',
            rationale: 'The article shows a strong conservative perspective'
        },
        claims: {
            factual_claims: []
        },
        report: {
            bias_analysis: {
                overall_assessment: 'The article exhibits high bias in its presentation of the topic.',
                overall_bias_level: 'High',
                dimension_summaries: {
                    'Source Selection': {
                        summary: 'Sources are one-sided, lacking diverse perspectives.',
                        status: 'Biased'
                    },
                    'Fairness / Balance': {
                        summary: 'The article lacks balance in its presentation.',
                        status: 'Biased'
                    },
                    'Framing / Emphasis': {
                        summary: 'The framing heavily emphasizes one viewpoint.',
                        status: 'Biased'
                    },
                    'Word Choice / Tone': {
                        summary: 'The language used is emotionally charged and partisan.',
                        status: 'Biased'
                    },
                    'Headline / Title Bias': {
                        summary: 'The headline is sensationalized and suggests a clear partisan angle.',
                        status: 'Biased'
                    }
                },
                detailed_findings: []
            }
        }
    };

    // Test data with moderate bias
    const moderateBiasData: AnalysisData = {
        slant: {
            category: 'Liberal/Progressive',
            confidence: 'Medium',
            rationale: 'The article leans liberal in its coverage'
        },
        claims: {
            factual_claims: []
        },
        report: {
            bias_analysis: {
                overall_assessment: 'The article shows some bias in its coverage, with moderate partisan framing.',
                overall_bias_level: 'Moderate',
                dimension_summaries: {
                    'Source Selection': {
                        summary: 'Sources show some diversity but lean toward liberal perspectives.',
                        status: 'Caution'
                    },
                    'Fairness / Balance': {
                        summary: 'The article presents multiple viewpoints but gives more space to liberal views.',
                        status: 'Caution'
                    },
                    'Framing / Emphasis': {
                        summary: 'Framing could be improved to present opposing views more fairly.',
                        status: 'Caution'
                    },
                    'Word Choice / Tone': {
                        summary: 'Language is mostly neutral with some emotionally charged terms.',
                        status: 'Caution'
                    },
                    'Headline / Title Bias': {
                        summary: 'The headline suggests a slight liberal perspective.',
                        status: 'Caution'
                    }
                },
                detailed_findings: []
            }
        }
    };

    // Test data with low bias
    const lowBiasData: AnalysisData = {
        slant: {
            category: 'Academic/Scientific',
            confidence: 'High',
            rationale: 'The article maintains an academic tone throughout'
        },
        claims: {
            factual_claims: []
        },
        report: {
            bias_analysis: {
                overall_assessment: 'The article presents information in a balanced way with minimal bias detected.',
                overall_bias_level: 'Low',
                dimension_summaries: {
                    'Source Selection': {
                        summary: 'Sources represent a wide range of perspectives and expertise.',
                        status: 'Balanced'
                    },
                    'Fairness / Balance': {
                        summary: 'The article presents multiple viewpoints fairly and evenly.',
                        status: 'Balanced'
                    },
                    'Framing / Emphasis': {
                        summary: 'The framing is neutral and objective.',
                        status: 'Balanced'
                    },
                    'Word Choice / Tone': {
                        summary: 'Language is precise and neutral throughout.',
                        status: 'Balanced'
                    },
                    'Headline / Title Bias': {
                        summary: 'The headline accurately represents the content without bias.',
                        status: 'Balanced'
                    }
                },
                detailed_findings: []
            }
        }
    };

    it('should interpret high bias correctly', () => {
        const result = interpretBiasAnalysis(highBiasData);

        expect(result.overallBiasLevel).toBe('High');
        expect(result.slantCategory).toBe('Conservative');
        expect(result.slantConfidence).toBe('High');

        // Check dimension statuses
        expect(result.dimensionStatuses['Source Selection']).toBe('Biased');
        expect(result.dimensionStatuses['Fairness / Balance']).toBe('Biased');
        expect(result.dimensionStatuses['Framing / Emphasis']).toBe('Biased');
        expect(result.dimensionStatuses['Word Choice / Tone']).toBe('Biased');
        expect(result.dimensionStatuses['Headline / Title Bias']).toBe('Biased');
    });

    it('should interpret moderate bias correctly', () => {
        const result = interpretBiasAnalysis(moderateBiasData);

        expect(result.overallBiasLevel).toBe('Moderate');
        expect(result.slantCategory).toBe('Liberal/Progressive');
        expect(result.slantConfidence).toBe('Medium');

        // Check dimension statuses - mix of caution and good
        expect(result.dimensionStatuses['Source Selection']).toBe('Caution');
        expect(result.dimensionStatuses['Fairness / Balance']).toBe('Caution');
        expect(result.dimensionStatuses['Framing / Emphasis']).toBe('Caution');
        expect(result.dimensionStatuses['Word Choice / Tone']).toBe('Caution');
        expect(result.dimensionStatuses['Headline / Title Bias']).toBe('Caution');
    });

    it('should interpret low bias correctly', () => {
        const result = interpretBiasAnalysis(lowBiasData);

        expect(result.overallBiasLevel).toBe('Low');
        expect(result.slantCategory).toBe('Academic/Scientific');
        expect(result.slantConfidence).toBe('High');

        // Check dimension statuses - should all be good
        expect(result.dimensionStatuses['Source Selection']).toBe('Balanced');
        expect(result.dimensionStatuses['Fairness / Balance']).toBe('Balanced');
        expect(result.dimensionStatuses['Framing / Emphasis']).toBe('Balanced');
        expect(result.dimensionStatuses['Word Choice / Tone']).toBe('Balanced');
        expect(result.dimensionStatuses['Headline / Title Bias']).toBe('Balanced');
    });

    it('should throw error for null analysis data', () => {
        expect(() => {
            // @ts-ignore - intentionally passing null for test
            interpretBiasAnalysis(null);
        }).toThrow('Analysis data is required for interpretation');
    });
}); 