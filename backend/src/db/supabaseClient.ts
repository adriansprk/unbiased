import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import config from '../config';
import logger from '../lib/logger';
import { Job, JobStatus, AnalysisResults, JobDetails, HistoryItem } from '../types';

// Load environment variables first
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Create Supabase client
export const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

// Repository pattern functions for jobs table
export const jobsRepository = {
  /**
   * Create a new job in the database
   */
  async createJob(url: string): Promise<Job> {
    const result = await supabase.from('jobs').insert({ url }).select().single();
    const { data, error } = result as { data: Job | null; error: { message: string } | null };

    if (error) {
      logger.error(`Failed to create job for URL: ${url}`, error);
      throw new Error(`Failed to create job: ${error.message}`);
    }
    if (!data) {
      throw new Error('No data returned from job creation');
    }
    return data;
  },

  /**
   * Get a job by ID
   */
  async getJob(jobId: string): Promise<Job> {
    const result = await supabase.from('jobs').select('*').eq('id', jobId).single();
    const { data, error } = result as { data: Job | null; error: { message: string } | null };

    if (error) {
      logger.error(`Failed to get job with ID: ${jobId}`, error);
      throw new Error(`Failed to get job: ${error.message}`);
    }
    if (!data) {
      throw new Error(`Job not found with ID: ${jobId}`);
    }
    return data;
  },

  /**
   * Update job status
   */
  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    details?: AnalysisResults | JobDetails | { error: string }
  ): Promise<Job> {
    const updateData: Partial<Job> = { status };

    if (details) {
      if (status === 'Complete') {
        updateData.analysis_results = details as AnalysisResults;
      } else if (status === 'Failed') {
        const errorDetails = details as { error: string };
        updateData.error_message = errorDetails.error || 'Unknown error';
      } else {
        updateData.job_details = details as JobDetails;
      }
    }

    const result = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .select()
      .single();

    const { data, error } = result as { data: Job | null; error: { message: string } | null };

    if (error) {
      logger.error(`Failed to update job status to ${status} for job ID: ${jobId}`, error);
      throw new Error(`Failed to update job status: ${error.message}`);
    }
    if (!data) {
      throw new Error(`Job not found for update with ID: ${jobId}`);
    }
    return data;
  },

  /**
   * Get recent job history
   */
  async getJobHistory(limit = 50): Promise<HistoryItem[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select(
        'id, url, status, job_details->title as headline, analysis_results->slant as slant, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error(`Failed to retrieve job history (limit: ${limit})`, error);
      throw error;
    }
    return (data as unknown as HistoryItem[]) || [];
  },
};

export default supabase;
