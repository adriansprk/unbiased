import express from 'express';
import http from 'http';
import cors from 'cors';
import { validateEnv } from '../config/envValidator';
import config from '../config';
import { SocketManager } from '../lib';
import submitHandler from './routes/submit';
import resultsHandler from './routes/results';
import imageProxyHandler from './routes/imageProxy';
import { getStatusByJobId } from './routes/status';
import { getHistory } from './routes/history';
import { supabase } from '../db/supabaseClient';
import logger from '../lib/logger';
import { isValidUuid } from '../lib/utils';

// Validate environment variables
validateEnv();

// Create Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO manager
const socketManager = new SocketManager(server);

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: config.api.frontendUrl,
    credentials: true,
  })
);

// Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API server is running' });
});

/**
 * Image proxy endpoint
 * Fetches, optionally optimizes, and serves external images
 */
app.get('/api/image-proxy', (req, res) => void imageProxyHandler(req, res));

/**
 * Submit a new URL for analysis
 */
app.post('/api/submit', (req, res) => void submitHandler(req, res));

/**
 * Get results of a completed job
 * This endpoint is optimized for retrieving the full analysis results
 * and should only be called for completed jobs
 */
app.get('/api/results/:jobId', (req, res) => void resultsHandler(req, res));

/**
 * Get status of a specific job
 */
app.get('/api/status/:jobId', (req, res) => void getStatusByJobId(req, res));

/**
 * Get history of completed jobs
 */
app.get('/api/history', (req, res) => void getHistory(req, res));

/**
 * Debug endpoint to get raw job data for troubleshooting
 */
app.get('/api/debug/:jobId', (req, res) => {
  void (async () => {
    try {
      const { jobId } = req.params;

      // Validate UUID format
      if (!isValidUuid(jobId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid job ID format',
        });
      }

      // Get raw job from database
      const { data, error } = await supabase.from('jobs').select('*').eq('id', jobId).single();

      if (error) {
        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }

      // Return the raw job data for debugging
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      logger.error('Error in debug endpoint:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  })();
});

// Start server
const PORT = config.api.port;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export { app, server, socketManager };
