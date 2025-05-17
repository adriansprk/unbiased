/**
 * Frontend logging utility with support for different log levels
 * Automatically disables verbose logging in production
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

// Define a type for the window with our custom properties
interface CustomWindow extends Window {
    CURRENT_LOG_LEVEL?: number;
    toggleDebugLogs?: () => string;
}

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Determine log level
// 1. Use explicit LOG_LEVEL from env if set
// 2. In production, default to 'error' only
// 3. In development, default to 'debug'
// 4. Otherwise use 'info'
const LOG_LEVEL = (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) ||
    (isProduction ? 'error' : (isDevelopment ? 'debug' : 'info'));

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

// Enable debug mode in browser console with localStorage
if (typeof window !== 'undefined') {
    try {
        const debugMode = localStorage.getItem('debug_mode');
        if (debugMode === 'true') {
            // Override the current level with the highest level
            Object.defineProperty(window, 'CURRENT_LOG_LEVEL', {
                value: LOG_LEVELS.trace,
                writable: false,
            });
            console.log('Debug mode enabled via localStorage. Set localStorage.debug_mode = "false" to disable.');
        } else {
            Object.defineProperty(window, 'CURRENT_LOG_LEVEL', {
                value: CURRENT_LEVEL,
                writable: false,
            });
        }
    } catch {
        // Ignore localStorage errors
        void 0; // No-op, just to avoid the empty catch block issue
    }
}

// Get the effective current log level (considers browser override)
const getEffectiveLogLevel = (): number => {
    if (typeof window !== 'undefined' && 'CURRENT_LOG_LEVEL' in window) {
        return (window as CustomWindow).CURRENT_LOG_LEVEL || CURRENT_LEVEL;
    }
    return CURRENT_LEVEL;
};

// Type for log arguments - can be any type of value
type LogArgs = unknown[];

// Logger utility with methods for each log level
export const logger = {
    /**
     * Logs critical errors that need immediate attention
     * Always logged regardless of log level
     */
    error: (message: string, ...args: LogArgs) => {
        console.error(`ERROR: ${message}`, ...args);
    },

    /**
     * Logs warnings that don't prevent operation but indicate issues
     */
    warn: (message: string, ...args: LogArgs) => {
        if (getEffectiveLogLevel() >= LOG_LEVELS.warn) {
            console.warn(`WARN: ${message}`, ...args);
        }
    },

    /**
     * Logs important operational events
     */
    info: (message: string, ...args: LogArgs) => {
        if (getEffectiveLogLevel() >= LOG_LEVELS.info) {
            console.log(`INFO: ${message}`, ...args);
        }
    },

    /**
     * Logs detailed information useful for debugging
     */
    debug: (message: string, ...args: LogArgs) => {
        if (getEffectiveLogLevel() >= LOG_LEVELS.debug) {
            console.log(`DEBUG: ${message}`, ...args);
        }
    },

    /**
     * Logs very detailed tracing information
     */
    trace: (message: string, ...args: LogArgs) => {
        if (getEffectiveLogLevel() >= LOG_LEVELS.trace) {
            console.log(`TRACE: ${message}`, ...args);
        }
    },

    /**
     * Enable debug mode for the current session
     * This will log all levels regardless of environment
     */
    enableDebug: () => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('debug_mode', 'true');
                (window as CustomWindow).CURRENT_LOG_LEVEL = LOG_LEVELS.trace;
                console.log('Debug mode enabled. To disable, call logger.disableDebug()');
            } catch (error) {
                console.error('Failed to enable debug mode:', error);
            }
        }
    },

    /**
     * Disable debug mode for the current session
     */
    disableDebug: () => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('debug_mode', 'false');
                (window as CustomWindow).CURRENT_LOG_LEVEL = CURRENT_LEVEL;
                console.log('Debug mode disabled');
            } catch (error) {
                console.error('Failed to disable debug mode:', error);
            }
        }
    },
};

// Convenience function to help users toggle debug mode from console
if (typeof window !== 'undefined') {
    (window as CustomWindow).toggleDebugLogs = () => {
        if (getEffectiveLogLevel() >= LOG_LEVELS.trace) {
            logger.disableDebug();
            return 'Debug logs disabled';
        } else {
            logger.enableDebug();
            return 'Debug logs enabled';
        }
    };
}

export default logger; 