import { Queue } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { validateEnv } from '../config/envValidator';
import config from '../config';
import logger from '../lib/logger';

// Validate environment variables
validateEnv();

// Load environment variables
dotenv.config();

// Initialize Redis connection
const connection = new Redis(config.redis.url, {
    maxRetriesPerRequest: null // Required for BullMQ workers
});

// Interface for job data
export interface AnalysisJobData {
    jobId: string;
    url: string;
    language: string;
}

// Create the analysis queue
export const analysisQueue = new Queue<AnalysisJobData>('analysis-queue', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    }
});

/**
 * Add a job to the analysis queue
 */
export async function addAnalysisJob(jobId: string, url: string, language: string): Promise<string> {
    logger.info(`Adding job ${jobId} to analysis queue for URL: ${url}, language: ${language}`);
    const job = await analysisQueue.add('analyze', { jobId, url, language });
    return job.id || `job-${Date.now()}`;
}

export default analysisQueue; 