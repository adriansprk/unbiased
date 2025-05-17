import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import socketClient, {
    getSocket,
    subscribeToJob,
    unsubscribeFromJob,
    disconnectSocket
} from '../../lib/socketClient';

// Mock socket.io-client
vi.mock('socket.io-client', () => {
    const mockSocket = {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
        onAny: vi.fn(),
        removeAllListeners: vi.fn(),
        disconnect: vi.fn(),
        connected: true,
        id: 'mock-socket-id'
    };

    return {
        io: vi.fn(() => mockSocket)
    };
});

describe('socketClient', () => {
    let mockSocket: any;

    beforeEach(() => {
        // Reset all mocks between tests
        vi.resetAllMocks();

        // Get the mocked socket for testing
        mockSocket = getSocket();
    });

    afterEach(() => {
        // Clear any lingering socket instance between tests
        vi.resetModules();
    });

    it('getSocket initializes a socket connection and adds default event handlers', () => {
        expect(mockSocket).toBeDefined();

        // Should set up default event handlers
        expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    });

    it('subscribeToJob emits a subscription event and sets up a listener', () => {
        const jobId = 'test-job-123';
        const callback = vi.fn();

        subscribeToJob(jobId, callback);

        // Should emit the subscribeToJob event
        expect(mockSocket.emit).toHaveBeenCalledWith('subscribeToJob', { jobId });

        // Should set up a listener for jobUpdate events
        expect(mockSocket.on).toHaveBeenCalledWith('jobUpdate', expect.any(Function));
    });

    it('unsubscribeFromJob removes the jobUpdate listener', () => {
        unsubscribeFromJob();

        // Should remove the jobUpdate listener
        expect(mockSocket.off).toHaveBeenCalledWith('jobUpdate');
    });

    it('disconnectSocket disconnects the socket', () => {
        disconnectSocket();

        // Should call disconnect on the socket
        expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('calls the callback when a matching jobUpdate is received', () => {
        const jobId = 'test-job-123';
        const callback = vi.fn();
        const mockUpdate = { jobId, status: 'Complete', results: {} };

        // Set up the subscription
        subscribeToJob(jobId, callback);

        // Get the callback function that was passed to socket.on
        const onJobUpdateHandler = mockSocket.on.mock.calls.find(
            (call: [string, Function]) => call[0] === 'jobUpdate'
        )[1];

        // Manually call the handler with our mock update
        onJobUpdateHandler(mockUpdate);

        // Callback should be called with the update
        expect(callback).toHaveBeenCalledWith(mockUpdate);
    });

    it('does not call the callback when jobId does not match', () => {
        const jobId = 'test-job-123';
        const callback = vi.fn();
        const mockUpdate = { jobId: 'different-job', status: 'Complete' };

        // Set up the subscription
        subscribeToJob(jobId, callback);

        // Get the callback function that was passed to socket.on
        const onJobUpdateHandler = mockSocket.on.mock.calls.find(
            (call: [string, Function]) => call[0] === 'jobUpdate'
        )[1];

        // Manually call the handler with a non-matching update
        onJobUpdateHandler(mockUpdate);

        // Callback should not be called
        expect(callback).not.toHaveBeenCalled();
    });
}); 