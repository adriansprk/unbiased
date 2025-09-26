import Redis from 'ioredis';
import { validateVar } from '../config/envValidator';
import { JobUpdatePayload, JobStatus } from '../types';

// Create Redis client for publishing updates
export const redisClient = new Redis(
  process.env.NODE_ENV === 'test' ? 'redis://localhost:6379' : validateVar('REDIS_URL'),
  {
    maxRetriesPerRequest: null, // Required for BullMQ workers
  }
);

/**
 * Emits a socket update via Redis Pub/Sub
 * @param jobId - The ID of the job being updated
 * @param payload - The update payload to emit
 */
export async function emitSocketUpdate(
  jobId: string,
  payload: Partial<JobUpdatePayload>
): Promise<void> {
  try {
    // Construct the full update payload
    const updatePayload: JobUpdatePayload = {
      jobId,
      status: payload.status as JobStatus,
      ...(payload.results && { results: payload.results }),
      ...(payload.error && { error: payload.error }),
    };

    // Publish to Redis
    await redisClient.publish('job-updates', JSON.stringify(updatePayload));
    console.log(`Socket update emitted for job ${jobId}: ${updatePayload.status}`);
  } catch (error) {
    console.error(`Error emitting socket update for job ${jobId}:`, error);
    throw error;
  }
}

/**
 * Creates a duplicate Redis client
 * Use this when you need a separate connection for subscriptions
 */
export function createRedisClient(): Redis {
  return new Redis(
    process.env.NODE_ENV === 'test' ? 'redis://localhost:6379' : validateVar('REDIS_URL'),
    {
      maxRetriesPerRequest: null, // Required for BullMQ workers
    }
  );
}

export default redisClient;
