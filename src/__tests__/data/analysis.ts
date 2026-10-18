import type { Analysis } from '@/server/analysis';

export const ARTICLE_TITLE = 'Council approves new tram line';
export const ARTICLE_TEXT =
  'The city council voted 31 to 12 on Tuesday to build a new tram line. Mayor Jane Roe called it »a historic day for the city«. Critics say the costs are out of control.';

/** A result in the current shape whose quotes all appear in ARTICLE_TITLE / ARTICLE_TEXT */
export const analysis: Analysis = {
  article_type: { type: 'news', rationale: 'Reports a council vote.' },
  findings: [
    {
      dimension: 'word_choice',
      quote: 'Critics say the costs are out of control.',
      observation: 'Critics stay anonymous.',
      explanation: 'An unnamed group carries the only counterargument.',
    },
    { dimension: 'balance', quote: null, observation: 'No cost figures.', explanation: 'Readers cannot judge the criticism.' },
  ],
  dimensions: {
    word_choice: { summary: 'Mostly neutral.', status: 'Caution' },
    framing: { summary: 'Focus on the vote.', status: 'Balanced' },
    sources: { summary: 'Mayor quoted, critics unnamed.', status: 'Caution' },
    balance: { summary: 'Costs missing.', status: 'Caution' },
    headline: { summary: 'Matches the text.', status: 'Balanced' },
  },
  actors: [
    {
      name: 'Jane Roe',
      portrayal: 'neutral',
      quote: 'Mayor Jane Roe called it "a historic day for the city".',
      rationale: 'Quoted without comment.',
    },
  ],
  claims: [
    {
      topic: 'Council vote',
      statement: 'The council approved the tram line 31 to 12.',
      quote: 'The city council voted 31 to 12 on Tuesday',
      significance: 'The news itself.',
    },
  ],
  summary: 'A short, mostly neutral report.',
};
