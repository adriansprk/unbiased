import { after } from 'next/server';
import { z } from 'zod';
import { findOrCreateJob } from '@/server/jobs';
import logger from '@/server/logger';
import { runAnalysis } from '@/server/pipeline';
import { verifyTurnstile } from '@/server/turnstile';

function isHttpUrl(value: string): boolean {
  try {
    return /^https?:$/.test(new URL(value).protocol);
  } catch {
    return false;
  }
}

const requestSchema = z.object({
  url: z.string().refine(isHttpUrl),
  language: z.enum(['en', 'de']).default('en'),
  turnstileToken: z.string().optional(),
});

/**
 * Starts (or reuses) an analysis and returns its job id; the client then opens /analysis/[id].
 * The analysis itself runs after the response is sent.
 */
export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'invalid_url' }, { status: 400 });
  }
  const { url, language, turnstileToken } = parsed.data;

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return Response.json({ error: 'verification_failed' }, { status: 403 });
  }

  try {
    const { id, isNew } = await findOrCreateJob(url, language);
    if (isNew) {
      after(() => runAnalysis({ id, url, language }));
    }
    return Response.json({ id });
  } catch (error) {
    logger.error('Failed to start analysis:', error);
    return Response.json({ error: 'server_error' }, { status: 500 });
  }
}
