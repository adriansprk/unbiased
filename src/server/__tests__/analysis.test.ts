// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { biasLevel, keepVerifiedQuotes, quoteInText, toAnalysisView } from '../analysis';
import { analysis, ARTICLE_TEXT, ARTICLE_TITLE } from '@/__tests__/data/analysis';

const ratings = (...statuses: Array<'Balanced' | 'Caution' | 'Biased' | 'Unknown'>) => {
    const [word_choice, framing, sources, balance, headline] = statuses.map(status => ({ summary: '', status }));
    return { word_choice, framing, sources, balance, headline };
};

describe('biasLevel', () => {
    it('follows from the five ratings', () => {
        expect(biasLevel(ratings('Balanced', 'Balanced', 'Caution', 'Unknown', 'Balanced'))).toBe('Low');
        expect(biasLevel(ratings('Caution', 'Caution', 'Balanced', 'Balanced', 'Balanced'))).toBe('Moderate');
        expect(biasLevel(ratings('Biased', 'Balanced', 'Balanced', 'Balanced', 'Balanced'))).toBe('Moderate');
        expect(biasLevel(ratings('Biased', 'Biased', 'Balanced', 'Balanced', 'Balanced'))).toBe('High');
    });
});

describe('quoteInText', () => {
    const source = 'der senat lehnte ab. »das ist ein skandal«, sagte sie – und ging.';

    it('ignores case, quotation mark style, dash style and whitespace', () => {
        expect(quoteInText('"Das ist ein   Skandal", sagte sie - und ging.', source)).toBe(true);
    });

    it('accepts quotes shortened with an ellipsis', () => {
        expect(quoteInText('Der Senat … sagte sie', source)).toBe(true);
    });

    it('rejects text the article does not contain', () => {
        expect(quoteInText('Das ist eine Katastrophe', source)).toBe(false);
        expect(quoteInText('…', source)).toBe(false);
    });
});

describe('keepVerifiedQuotes', () => {
    it('keeps genuine quotes, headline quotes and omissions', () => {
        const withHeadline = {
            ...analysis,
            findings: [...analysis.findings, { ...analysis.findings[0], dimension: 'headline' as const, quote: ARTICLE_TITLE }],
        };
        const { analysis: kept, dropped } = keepVerifiedQuotes(withHeadline, ARTICLE_TITLE, ARTICLE_TEXT);
        expect(dropped).toEqual([]);
        expect(kept).toEqual(withHeadline);
    });

    it('drops findings, actors and claims whose quote is not in the article', () => {
        const invented = 'The mayor admitted the plan was rushed.';
        const { analysis: kept, dropped } = keepVerifiedQuotes(
            {
                ...analysis,
                findings: [...analysis.findings, { ...analysis.findings[0], quote: invented }],
                actors: [{ ...analysis.actors[0], quote: invented }],
                claims: [...analysis.claims, { ...analysis.claims[0], quote: invented }],
            },
            ARTICLE_TITLE,
            ARTICLE_TEXT
        );
        expect(dropped).toEqual([invented, invented, invented]);
        expect(kept.findings).toEqual(analysis.findings);
        expect(kept.actors).toEqual([]);
        expect(kept.claims).toEqual(analysis.claims);
    });
});

describe('toAnalysisView', () => {
    it('adds the calculated level to current results', () => {
        expect(toAnalysisView(analysis)).toEqual({ ...analysis, bias_level: 'Moderate' });
    });

    it('maps results from the first prompt version', () => {
        const view = toAnalysisView({
            slant: { category: 'Establishment', confidence: 'Medium', rationale: '…' },
            claims: {
                factual_claims: [
                    { claim_topic: 'Vote', claim_statement: 'It passed.', quote_from_article: 'voted 31 to 12', significance_rationale: 'Core.' },
                ],
            },
            report: {
                bias_analysis: {
                    overall_assessment: 'Mostly fair.',
                    overall_bias_level: 'High',
                    dimension_summaries: {
                        'Source Selection': { summary: 'One-sided.', status: 'Biased' },
                        'Fairness / Balance': { summary: 'Thin.', status: 'Caution' },
                        'Framing / Emphasis': { summary: 'Fine.', status: 'Balanced' },
                        'Word Choice / Tone': { summary: 'Fine.', status: 'Balanced' },
                        'Headline / Title Bias': { summary: 'Fine.', status: 'Balanced' },
                    },
                    detailed_findings: [
                        { dimension: 'Source Selection', observation: 'Only officials.', quote_evidence: 'N/A - Omission', explanation: 'No critics.' },
                    ],
                },
            },
        });

        expect(view).toEqual({
            article_type: null,
            findings: [{ dimension: 'sources', quote: null, observation: 'Only officials.', explanation: 'No critics.' }],
            dimensions: {
                word_choice: { summary: 'Fine.', status: 'Balanced' },
                framing: { summary: 'Fine.', status: 'Balanced' },
                sources: { summary: 'One-sided.', status: 'Biased' },
                balance: { summary: 'Thin.', status: 'Caution' },
                headline: { summary: 'Fine.', status: 'Balanced' },
            },
            actors: [],
            claims: [{ topic: 'Vote', statement: 'It passed.', quote: 'voted 31 to 12', significance: 'Core.' }],
            summary: 'Mostly fair.',
            // calculated, not the stored "High" that contradicted the ratings
            bias_level: 'Moderate',
        });
    });

    it('returns null for rows without a result', () => {
        expect(toAnalysisView(null)).toBeNull();
        expect(toAnalysisView({ unexpected: true })).toBeNull();
    });
});
