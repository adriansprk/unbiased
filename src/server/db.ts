import { createClient, SupabaseClient } from '@supabase/supabase-js';
import config from './config';
import { Job } from './types';

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (!client) {
    const { url, serviceKey } = config.supabase;
    if (!url || !serviceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    client = createClient(url, serviceKey, { auth: { persistSession: false } });
  }
  return client;
}

export async function createJob(fields: Pick<Job, 'url' | 'normalized_url' | 'language'>): Promise<Job> {
  const { data, error } = await db()
    .from('jobs')
    .insert({ ...fields, status: 'Queued', article_canonical_url: fields.url })
    .select()
    .single();
  if (error) throw new Error(`Failed to create job: ${error.message}`);
  return data as Job;
}

export async function getJob(id: string): Promise<Job | null> {
  const { data, error } = await db().from('jobs').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Failed to load job ${id}: ${error.message}`);
  return data as Job | null;
}

export type JobState = Pick<Job, 'id' | 'status' | 'created_at' | 'updated_at'>;

/** Most recent non-failed jobs for an article, newest first */
export async function findJobsForArticle(normalizedUrl: string, language: string): Promise<JobState[]> {
  const { data, error } = await db()
    .from('jobs')
    .select('id, status, created_at, updated_at')
    .eq('normalized_url', normalizedUrl)
    .eq('language', language)
    .neq('status', 'Failed')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw new Error(`Failed to look up existing jobs: ${error.message}`);
  return (data ?? []) as JobState[];
}

export async function updateJob(id: string, fields: Partial<Job>): Promise<void> {
  const { error } = await db()
    .from('jobs')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Failed to update job ${id}: ${error.message}`);
}
