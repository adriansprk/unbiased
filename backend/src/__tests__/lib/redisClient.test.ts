import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Redis from 'ioredis';
import { redisClient, emitSocketUpdate, createRedisClient } from '../../lib/redisClient';

// Mock ioredis
vi.mock('ioredis', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            publish: vi.fn().mockResolvedValue(1),
            subscribe: vi.fn(),
            on: vi.fn()
        }))
    };
});

describe('Redis Client', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('should publish updates to Redis', async () => {
        // Setup spy on redisClient.publish
        const publishSpy = vi.spyOn(redisClient, 'publish').mockResolvedValue(1);

        // Test emitting a socket update
        await emitSocketUpdate('test-job-id', {
            status: 'Processing'
        });

        // Verify Redis publish was called with the correct parameters
        expect(publishSpy).toHaveBeenCalledWith(
            'job-updates',
            expect.stringContaining('"jobId":"test-job-id"')
        );
        expect(publishSpy).toHaveBeenCalledWith(
            'job-updates',
            expect.stringContaining('"status":"Processing"')
        );
    });

    it('should include results in published updates when provided', async () => {
        // Setup spy on redisClient.publish
        const publishSpy = vi.spyOn(redisClient, 'publish').mockResolvedValue(1);

        const results = { claims: 'Test claims', report: 'Test report', slant: 'Neutral' };

        // Test emitting a socket update with results
        await emitSocketUpdate('test-job-id', {
            status: 'Complete',
            results
        });

        // Verify Redis publish was called with the correct parameters
        expect(publishSpy).toHaveBeenCalledWith(
            'job-updates',
            expect.stringContaining('"results"')
        );
        expect(publishSpy).toHaveBeenCalledWith(
            'job-updates',
            expect.stringContaining('Test claims')
        );
    });

    it('should include error in published updates when provided', async () => {
        // Setup spy on redisClient.publish
        const publishSpy = vi.spyOn(redisClient, 'publish').mockResolvedValue(1);

        // Test emitting a socket update with error
        await emitSocketUpdate('test-job-id', {
            status: 'Failed',
            error: 'Test error message'
        });

        // Verify Redis publish was called with the correct parameters
        expect(publishSpy).toHaveBeenCalledWith(
            'job-updates',
            expect.stringContaining('"error":"Test error message"')
        );
    });

    it('should handle errors when publishing to Redis', async () => {
        // Setup spy on redisClient.publish that throws an error
        const publishSpy = vi.spyOn(redisClient, 'publish').mockRejectedValue(new Error('Redis error'));

        // Mock console.error to verify it's called
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // Test that error is thrown when Redis publish fails
        await expect(emitSocketUpdate('test-job-id', {
            status: 'Processing'
        })).rejects.toThrow('Redis error');

        // Verify console.error was called
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should create a new Redis client when createRedisClient is called', () => {
        // Call the function
        const newClient = createRedisClient();

        // Verify Redis constructor was called
        expect(Redis).toHaveBeenCalled();

        // Verify a new client is returned
        expect(newClient).toBeDefined();
    });
}); 