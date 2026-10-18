import { z } from 'zod';

/**
 * The analysis as the LLM returns it (structured outputs) and as it is stored in `jobs.analysis_results`.
 * Field order is the order the model works in: what kind of article → evidence → verdicts → summary.
 */

export const DIMENSIONS = ['word_choice', 'framing', 'sources', 'balance', 'headline'] as const;
export type Dimension = (typeof DIMENSIONS)[number];

const status = z.enum(['Balanced', 'Caution', 'Biased', 'Unknown']);
const rating = z.object({ summary: z.string(), status });

export const AnalysisSchema = z.object({
  article_type: z.object({
    type: z.enum(['news', 'analysis', 'opinion', 'interview', 'other']),
    rationale: z.string(),
  }),
  findings: z.array(
    z.object({
      dimension: z.enum(DIMENSIONS),
      quote: z.string().nullable().describe('Verbatim from the article or headline; null for an omission'),
      observation: z.string(),
      explanation: z.string(),
    })
  ),
  dimensions: z.object({
    word_choice: rating,
    framing: rating,
    sources: rating,
    balance: rating,
    headline: rating,
  }),
  actors: z.array(
    z.object({
      name: z.string(),
      portrayal: z.enum(['favorable', 'neutral', 'critical']),
      quote: z.string().describe('Verbatim from the article'),
      rationale: z.string(),
    })
  ),
  claims: z.array(
    z.object({
      topic: z.string(),
      statement: z.string(),
      quote: z.string().describe('Verbatim from the article'),
      significance: z.string(),
    })
  ),
  summary: z.string(),
});

export type Analysis = z.infer<typeof AnalysisSchema>;
export type DimensionStatus = z.infer<typeof status>;
export type BiasLevel = 'Low' | 'Moderate' | 'High';

/** What the result page renders. Rows from before the article type was asked for have none. */
export type AnalysisView = Omit<Analysis, 'article_type'> & {
  article_type: Analysis['article_type'] | null;
  bias_level: BiasLevel;
};

/** The overall level follows from the five ratings, so it can't contradict them */
export function biasLevel(dimensions: Analysis['dimensions']): BiasLevel {
  const statuses = Object.values(dimensions).map(d => d.status);
  const biased = statuses.filter(s => s === 'Biased').length;
  const caution = statuses.filter(s => s === 'Caution').length;
  if (biased >= 2) return 'High';
  if (biased >= 1 || caution >= 2) return 'Moderate';
  return 'Low';
}

// Quotes are compared without case, punctuation-style differences (»« vs "", – vs -) or whitespace
const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[»«„“”"‚‘’'`´]/g, '')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

/** A quote is genuine if every part of it (split at ellipses) appears in the text */
export function quoteInText(quote: string, text: string): boolean {
  const source = normalize(text);
  const parts = quote.split(/\.\.\.|…|\[…\]|\[\.\.\.\]/).map(normalize).filter(Boolean);
  return parts.length > 0 && parts.every(part => source.includes(part));
}

/**
 * Drops findings, actors and claims whose quote isn't in the article: an invented quote
 * would present the analysis as evidence-backed when it isn't. Omission findings (quote null) stay.
 */
export function keepVerifiedQuotes(analysis: Analysis, title: string, text: string): { analysis: Analysis; dropped: string[] } {
  const source = `${title}\n${text}`;
  const dropped: string[] = [];
  const genuine = ({ quote }: { quote: string | null }) => {
    if (quote === null || quoteInText(quote, source)) return true;
    dropped.push(quote);
    return false;
  };
  const findings = analysis.findings.filter(genuine);
  const actors = analysis.actors.filter(genuine);
  const claims = analysis.claims.filter(genuine);
  return { analysis: { ...analysis, findings, actors, claims }, dropped };
}

const LEGACY_DIMENSIONS: Record<string, Dimension> = {
  'Word Choice / Tone': 'word_choice',
  'Framing / Emphasis': 'framing',
  'Source Selection': 'sources',
  'Fairness / Balance': 'balance',
  'Headline / Title Bias': 'headline',
};

interface LegacyAnalysis {
  claims?: { factual_claims?: Array<Record<string, string | undefined>> };
  report?: {
    bias_analysis?: {
      overall_assessment?: string;
      dimension_summaries?: Record<string, { summary?: string; status?: string }>;
      detailed_findings?: Array<Record<string, string | undefined>>;
    };
  };
}

/** Stored results → page view; rows from the first prompt version ({ slant, claims, report }) are mapped over */
export function toAnalysisView(stored: unknown): AnalysisView | null {
  if (!stored || typeof stored !== 'object') return null;

  const current = AnalysisSchema.safeParse(stored);
  if (current.success) return { ...current.data, bias_level: biasLevel(current.data.dimensions) };

  const legacy = stored as LegacyAnalysis;
  const bias = legacy.report?.bias_analysis;
  if (!bias) return null;

  const dimensions = Object.fromEntries(
    Object.entries(LEGACY_DIMENSIONS).map(([name, id]) => {
      const entry = bias.dimension_summaries?.[name];
      const parsed = status.safeParse(entry?.status);
      return [id, { summary: entry?.summary ?? '', status: parsed.success ? parsed.data : 'Unknown' }];
    })
  ) as Analysis['dimensions'];

  return {
    article_type: null,
    findings: (bias.detailed_findings ?? []).flatMap(f => {
      const dimension = LEGACY_DIMENSIONS[f.dimension ?? ''];
      if (!dimension) return [];
      const quote = f.quote_evidence && f.quote_evidence !== 'N/A - Omission' ? f.quote_evidence : null;
      return [{ dimension, quote, observation: f.observation ?? '', explanation: f.explanation ?? '' }];
    }),
    dimensions,
    actors: [],
    claims: (legacy.claims?.factual_claims ?? []).map(c => ({
      topic: c.claim_topic ?? '',
      statement: c.claim_statement ?? '',
      quote: c.quote_from_article ?? '',
      significance: c.significance_rationale ?? '',
    })),
    summary: bias.overall_assessment ?? '',
    bias_level: biasLevel(dimensions),
  };
}
