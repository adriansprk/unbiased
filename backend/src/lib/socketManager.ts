import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { validateEnv } from '../config/envValidator';
import config from '../config';
import { JobUpdatePayload, SocketSubscribePayload } from '../types';
import { createRedisClient } from './index';

/**
 * Socket.IO manager for handling real-time updates
 */
export class SocketManager {
    private io: SocketServer;
    private subscriber: ReturnType<typeof createRedisClient>;
    private clientSubscriptions: Map<string, Set<string>> = new Map(); // Map of socketId -> jobIds

    constructor(server: HttpServer) {
        // Initialize Socket.IO server
        this.io = new SocketServer(server, {
            cors: {
                origin: config.api.frontendUrl,
                methods: ['GET', 'POST'],
                credentials: true
            }
        });

        // Initialize Redis subscriber using a dedicated connection
        this.subscriber = createRedisClient();

        // Set up event handlers
        this.setupSocketEvents();
        this.setupRedisSubscriber();

        // Log when server is ready
        this.io.on("connection", (socket) => {
            console.log(`New socket connection: ${socket.id}, total connections: ${this.io.engine.clientsCount}`);
        });
    }

    /**
     * Set up Socket.IO event handlers
     */
    private setupSocketEvents() {
        this.io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            // Initialize client's subscription set
            this.clientSubscriptions.set(socket.id, new Set());

            socket.on('disconnect', (reason) => {
                console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
                // Clean up subscription tracking
                this.clientSubscriptions.delete(socket.id);
            });

            socket.on('subscribeToJob', (data: SocketSubscribePayload) => {
                const room = `job_${data.jobId}`;
                socket.join(room);

                // Track this subscription
                const clientSubs = this.clientSubscriptions.get(socket.id) || new Set();
                clientSubs.add(data.jobId);
                this.clientSubscriptions.set(socket.id, clientSubs);

                console.log(`Client ${socket.id} subscribed to job: ${data.jobId}`);
                console.log(`Client ${socket.id} is now subscribed to jobs:`, [...clientSubs]);

                // Notify client that they have successfully joined the room
                socket.emit('joined', {
                    jobId: data.jobId,
                    room: room,
                    success: true
                });

                // Get rooms this socket is in
                const rooms = Array.from(socket.rooms.values()).filter(r => r !== socket.id);
                console.log(`Socket ${socket.id} is now in rooms:`, rooms);
            });

            socket.on('unsubscribeFromJob', () => {
                // Get rooms this socket is in before leaving
                const rooms = Array.from(socket.rooms.values()).filter(r => r !== socket.id);
                console.log(`Client ${socket.id} unsubscribing from rooms:`, rooms);

                // Leave all rooms except the socket's own room
                rooms.forEach(room => {
                    socket.leave(room);
                });

                // Clear subscription tracking for this client
                this.clientSubscriptions.set(socket.id, new Set());

                console.log(`Client ${socket.id} left all job rooms`);
            });

            // Add a handler for the checkSubscription event
            socket.on('checkSubscription', (data: { jobId: string }) => {
                const jobRoom = `job_${data.jobId}`;
                const rooms = Array.from(socket.rooms.values());
                const isInRoom = rooms.includes(jobRoom);

                // Also check our tracking Map
                const clientSubs = this.clientSubscriptions.get(socket.id) || new Set();
                const isTrackedSubscription = clientSubs.has(data.jobId);

                console.log(`Subscription check for job ${data.jobId}:`, {
                    socketId: socket.id,
                    isInRoom,
                    isTrackedSubscription,
                    trackedJobs: [...clientSubs],
                    allRooms: rooms
                });

                socket.emit('subscriptionStatus', {
                    jobId: data.jobId,
                    subscribed: isInRoom && isTrackedSubscription,
                    room: jobRoom
                });

                // If client should be subscribed but isn't, resubscribe them
                if ((!isInRoom || !isTrackedSubscription) && data.jobId) {
                    // Re-join the room
                    socket.join(jobRoom);

                    // Update subscription tracking
                    clientSubs.add(data.jobId);
                    this.clientSubscriptions.set(socket.id, clientSubs);

                    console.log(`Re-subscribed client ${socket.id} to job: ${data.jobId}`);
                    socket.emit('joined', {
                        jobId: data.jobId,
                        room: jobRoom,
                        success: true
                    });
                }
            });
        });
    }

    /**
     * Set up Redis subscriber for job updates
     */
    private setupRedisSubscriber() {
        this.subscriber.subscribe('job-updates');

        this.subscriber.on('message', (channel, message) => {
            if (channel === 'job-updates') {
                try {
                    const update: JobUpdatePayload = JSON.parse(message);
                    const room = `job_${update.jobId}`;

                    // Get how many clients are in this room
                    const socketsInRoom = this.io.sockets.adapter.rooms.get(room);
                    const clientCount = socketsInRoom ? socketsInRoom.size : 0;

                    console.log(`Emitting update to room ${room}:`, {
                        status: update.status,
                        clientCount,
                        timestamp: new Date().toISOString()
                    });

                    // If there are no clients in the room, log a warning
                    if (clientCount === 0) {
                        console.warn(`No clients in room ${room} to receive update for job ${update.jobId}`);
                    }

                    this.io.to(room).emit('jobUpdate', update);
                } catch (error) {
                    console.error('Error processing job update message:', error);
                }
            }
        });
    }

    /**
     * Manually emit a job update (for direct API server updates)
     */
    public emitJobUpdate(update: JobUpdatePayload) {
        const room = `job_${update.jobId}`;

        // Get how many clients are in this room
        const socketsInRoom = this.io.sockets.adapter.rooms.get(room);
        const clientCount = socketsInRoom ? socketsInRoom.size : 0;

        console.log(`Manually emitting update to room ${room}:`, {
            status: update.status,
            clientCount,
            timestamp: new Date().toISOString()
        });

        this.io.to(room).emit('jobUpdate', update);
    }

    /**
     * Get clients subscribed to a specific job
     */
    public getClientsForJob(jobId: string): string[] {
        const clients: string[] = [];

        // Iterate through all client subscriptions
        for (const [socketId, jobSet] of this.clientSubscriptions.entries()) {
            if (jobSet.has(jobId)) {
                clients.push(socketId);
            }
        }

        return clients;
    }

    /**
     * Get the Socket.IO server instance
     */
    public getIO() {
        return this.io;
    }
}

export default SocketManager; 