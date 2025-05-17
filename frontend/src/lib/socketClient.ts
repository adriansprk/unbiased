import { io, Socket } from 'socket.io-client';
import { JobUpdate } from '../types/analysis';
import logger from '@/utils/logger';

// Create a reusable socket instance
let socket: Socket | null = null;
let subscriptionVerified = false;
let activeJobId: string | null = null;

export const getSocket = (): Socket => {
    if (!socket || !socket.connected) {
        // Disconnect any existing socket first
        if (socket) {
            logger.debug('Disconnecting existing socket before creating a new one');
            socket.disconnect();
            socket = null;
        }

        // Create new socket connection if none exists
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3001';
        logger.info('Creating new socket connection to:', socketUrl);
        socket = io(socketUrl, {
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 10000,
        });

        // Set up base listeners
        socket.on('connect', () => {
            logger.info('Socket connected successfully with ID:', socket?.id);

            // If we have an active job ID, resubscribe after reconnection
            if (activeJobId) {
                logger.debug('Resubscribing to job after reconnection:', activeJobId);
                socket?.emit('subscribeToJob', { jobId: activeJobId });
                subscriptionVerified = false;

                // Schedule verification check
                setTimeout(() => {
                    if (socket && !subscriptionVerified) {
                        socket.emit('checkSubscription', { jobId: activeJobId });
                    }
                }, 1000);
            }
        });

        socket.on('disconnect', (reason) => {
            logger.warn('Socket disconnected. Reason:', reason);
            subscriptionVerified = false;
        });

        socket.on('connect_error', (error) => {
            logger.error('Socket connection error:', error);
            logger.debug('Attempted connection to:', socketUrl);
            subscriptionVerified = false;
        });

        socket.on('reconnect', (attemptNumber) => {
            logger.info(`Socket reconnected after ${attemptNumber} attempts`);
        });

        socket.on('reconnect_error', (error) => {
            logger.error('Socket reconnection error:', error);
            subscriptionVerified = false;
        });

        // Add a catchall event listener to log all incoming events for debugging
        socket.onAny((event, ...args) => {
            logger.trace(`Socket received event: ${event}`, args);
        });
    }

    return socket;
};

// Subscribe to job updates
export const subscribeToJob = (jobId: string, callback: (update: JobUpdate) => void): void => {
    const socket = getSocket();

    // Store active job ID for reconnection handling
    activeJobId = jobId;
    subscriptionVerified = false;

    // Clean up any existing listeners first to prevent duplicates
    unsubscribeFromJob();

    // Subscribe to new job
    socket.emit('subscribeToJob', { jobId });
    logger.info(`Socket: Subscribed to job ${jobId}`);

    // Set up job update listener with enhanced debugging
    socket.on('jobUpdate', (update: JobUpdate) => {
        logger.debug(`Socket: received update:`, update);
        logger.trace(`Current job ID: ${jobId}, Update job ID: ${update.jobId}`);

        if (update.jobId === jobId) {
            logger.debug(`Calling callback with update: ${update.status}`);
            callback(update);
        } else {
            logger.warn(`Socket: Ignoring update for job ${update.jobId}, we're subscribed to ${jobId}`);
        }
    });

    // Listen for the 'joined' event to confirm the subscription worked
    socket.on('joined', (data) => {
        logger.debug('Socket: Successfully joined room for job:', data);
        if (data.jobId === jobId) {
            subscriptionVerified = true;
        }
    });

    // Listen for subscription status events
    socket.on('subscriptionStatus', (data) => {
        logger.debug('Socket: Subscription status received:', data);
        if (data.jobId === jobId) {
            subscriptionVerified = data.subscribed;

            // If we're not properly subscribed, resubscribe
            if (!data.subscribed) {
                logger.info('Socket: Resubscribing to job', jobId);
                socket.emit('subscribeToJob', { jobId });
            }
        }
    });

    // Additional verification by manually checking status shortly after subscription
    const verifySubscription = () => {
        if (!subscriptionVerified && socket.connected && activeJobId === jobId) {
            logger.debug('Verifying subscription status for job:', jobId);
            socket.emit('checkSubscription', { jobId });

            // Schedule another check if necessary
            setTimeout(() => {
                if (!subscriptionVerified && socket.connected && activeJobId === jobId) {
                    logger.warn('Still not verified, trying again...');
                    socket.emit('subscribeToJob', { jobId });
                    socket.emit('checkSubscription', { jobId });
                }
            }, 2000);
        }
    };

    setTimeout(verifySubscription, 1000);
};

// Unsubscribe from job updates
export const unsubscribeFromJob = (): void => {
    if (!socket) {
        logger.debug('Socket: Cannot unsubscribe - no active socket');
        return;
    }

    logger.info('Socket: Unsubscribing from job updates');
    socket.off('jobUpdate');
    socket.off('joined');
    socket.off('subscriptionStatus');
    socket.emit('unsubscribeFromJob');
    activeJobId = null;
    subscriptionVerified = false;

    // Add a small delay to ensure the server has time to process the unsubscribe
    setTimeout(() => {
        if (socket) {
            // Double check that we've removed all listeners
            socket.removeAllListeners('jobUpdate');
            socket.removeAllListeners('joined');
            socket.removeAllListeners('subscriptionStatus');
            logger.debug('Socket: All job update listeners removed');
        }
    }, 100);
};

// Disconnect socket when no longer needed
export const disconnectSocket = (): void => {
    if (socket) {
        logger.info('Socket: Disconnecting socket');
        socket.disconnect();
        socket = null;
        activeJobId = null;
        subscriptionVerified = false;
    } else {
        logger.debug('Socket: No active socket to disconnect');
    }
};

// Export as named object
const socketClient = {
    getSocket,
    subscribeToJob,
    unsubscribeFromJob,
    disconnectSocket,
};

export default socketClient; 