/**
 * Re-runs the analysis on stored articles and compares it with the stored result:
 *   npm run eval -- <jobId> [<jobId> ...]
 * Uses the server env (.env.local, .env); full results go to eval-out/<jobId>.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import type { AnalysisView } from '../src/server/analysis';

for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file);
  } catch {
    // optional
  }
}

// After the env is loaded: the LLM client reads its config on import
const { getJob } = await import('../src/server/db');
const { analyzeArticle } = await import('../src/server/llm');
const { toAnalysisView } = await import('../src/server/analysis');

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error('Usage: npm run eval -- <jobId> [<jobId> ...]');
  process.exit(1);
}

const line = (a: AnalysisView) =>
  [
    `${a.bias_level.padEnd(8)} ${a.article_type?.type ?? '-'}`,
    Object.entries(a.dimensions)
      .map(([d, r]) => `${d}=${r.status}`)
      .join(' '),
    `${a.findings.length} findings, ${a.actors.length} actors, ${a.claims.length} claims`,
  ].join(' | ');

mkdirSync('eval-out', { recursive: true });
for (const id of ids) {
  const job = await getJob(id);
  if (!job?.article_text) {
    console.log(`${id}: no stored article text`);
    continue;
  }
  const started = Date.now();
  const fresh = toAnalysisView(await analyzeArticle(job.article_title ?? '', job.article_text, job.language))!;
  const old = toAnalysisView(job.analysis_results);

  console.log(`\n${id}  ${job.article_title}  (${((Date.now() - started) / 1000).toFixed(0)}s)`);
  if (old) console.log(`  old  ${line(old)}`);
  console.log(`  new  ${line(fresh)}`);
  for (const actor of fresh.actors) console.log(`       ${actor.portrayal.padEnd(9)} ${actor.name}`);
  writeFileSync(`eval-out/${id}.json`, JSON.stringify({ old, new: fresh }, null, 2));
}
