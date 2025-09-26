import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import config from '../config';
import logger from '../lib/logger';

// Load environment variables first
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Create Supabase client
export const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

// Repository pattern functions for jobs table
export const jobsRepository = {
  /**
   * Create a new job in the database
   */
  async createJob(url: string) {
    const { data, error } = await supabase.from('jobs').insert({ url }).select().single();

    if (error) {
      logger.error(`Failed to create job for URL: ${url}`, error);
      throw error;
    }
    return data;
  },

  /**
   * Get a job by ID
   */
  async getJob(jobId: string) {
    const { data, error } = await supabase.from('jobs').select('*').eq('id', jobId).single();

    if (error) {
      logger.error(`Failed to get job with ID: ${jobId}`, error);
      throw error;
    }
    return data;
  },

  /**
   * Update job status
   */
  async updateJobStatus(jobId: string, status: string, details?: any) {
    const updateData: any = { status };

    if (details) {
      if (status === 'Complete') {
        updateData.analysis_results = details;
      } else if (status === 'Failed') {
        updateData.error_message = details.error || 'Unknown error';
      } else {
        updateData.job_details = details;
      }
    }

    const { data, error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .select()
      .single();

    if (error) {
      logger.error(`Failed to update job status to ${status} for job ID: ${jobId}`, error);
      throw error;
    }
    return data;
  },

  /**
   * Get recent job history
   */
  async getJobHistory(limit = 50) {
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
    return data;
  },
};

export default supabase;
