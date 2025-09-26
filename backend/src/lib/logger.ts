/**
 * Simple logging utility with support for different log levels based on environment
 */

import { LogLevel, LogArgs } from '../types';

// Determine log level from environment or use default
const LOG_LEVEL =
  (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Log level hierarchy (higher number = more verbose)
const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

// Current log level as a number
const CURRENT_LEVEL = LOG_LEVELS[LOG_LEVEL] || LOG_LEVELS.info;


// Logger utility with methods for each log level
export const logger = {
  /**
   * Logs critical errors that need immediate attention
   */
  error: (message: string, ...args: LogArgs) => {
    console.error(`ERROR: ${message}`, ...args);
  },

  /**
   * Logs warnings that don't prevent operation but indicate issues
   */
  warn: (message: string, ...args: LogArgs) => {
    if (CURRENT_LEVEL >= LOG_LEVELS.warn) {
      console.warn(`WARN: ${message}`, ...args);
    }
  },

  /**
   * Logs important operational events (always logged in production)
   */
  info: (message: string, ...args: LogArgs) => {
    if (CURRENT_LEVEL >= LOG_LEVELS.info) {
      console.log(`INFO: ${message}`, ...args);
    }
  },

  /**
   * Logs detailed information useful for debugging (not logged in production by default)
   */
  debug: (message: string, ...args: LogArgs) => {
    if (CURRENT_LEVEL >= LOG_LEVELS.debug) {
      console.log(`DEBUG: ${message}`, ...args);
    }
  },

  /**
   * Logs very detailed tracing information (typically only enabled manually)
   */
  trace: (message: string, ...args: LogArgs) => {
    if (CURRENT_LEVEL >= LOG_LEVELS.trace) {
      console.log(`TRACE: ${message}`, ...args);
    }
  },
};

export default logger;
