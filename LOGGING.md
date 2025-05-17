# Logging System

This document outlines the logging approach used in the Unbias application.

## Overview

We've implemented a flexible, environment-aware logging system that allows you to:

1. Control verbosity in different environments
2. Enable detailed logging when debugging issues
3. Keep production logs clean and focused on important information
4. Dynamically change log levels without code changes

## Log Levels

The system supports the following log levels (from least to most verbose):

1. **error**: Only logs critical errors that need immediate attention
2. **warn**: Logs warnings and errors
3. **info**: Logs important operational events plus warnings and errors
4. **debug**: Logs detailed debugging information plus everything above
5. **trace**: Logs very detailed tracing information plus everything above

## Default Log Levels by Environment

- **Production**: `error` (frontend), `info` (backend)
- **Development**: `debug`
- **Test**: `error`

## How to Control Log Levels

### Backend

The backend uses environment variables to control log levels:

```bash
# Run with default log level
npm run dev

# Run with debug level (detailed logs)
npm run dev:debug

# Run with trace level (all logs)
npm run dev:trace

# Run with error level only (quiet mode)
npm run dev:quiet

# Manually set any log level
LOG_LEVEL=info npm run dev
```

### Frontend

The frontend allows multiple ways to control logging:

```bash
# Run with default log level
npm run dev

# Run with debug level
npm run dev:debug

# Run with trace level (all logs)
npm run dev:trace

# Run with error level only (quiet mode)
npm run dev:quiet

# Manually set any log level
NEXT_PUBLIC_LOG_LEVEL=info npm run dev
```

### Dynamic Control in Browser

You can dynamically change the log level in the browser console:

```javascript
// Enable debug mode (maximum logging)
localStorage.setItem('debug_mode', 'true');
// Then refresh the page

// Or use the convenience function
toggleDebugLogs(); // Toggles between normal and debug mode

// Disable debug mode
localStorage.setItem('debug_mode', 'false');
// Then refresh the page
```

## Best Practices

1. **Use appropriate log levels**:
   - `error`: Only for critical errors that prevent operation
   - `warn`: For issues that don't prevent operation but indicate problems
   - `info`: For important operational events (like job completion)
   - `debug`: For detailed information useful when debugging
   - `trace`: For very detailed tracing information

2. **Don't log sensitive information**: Be careful not to log sensitive data like tokens, passwords, etc.

3. **Structure logs for parsing**: When possible, use structured data in logs to make them easier to parse.

## Implementation

The logging system is implemented in:

- Backend: `backend/src/lib/logger.ts`
- Frontend: `frontend/src/utils/logger.ts`

Both implementations follow the same structure and API.

## Example Usage

```typescript
import logger from '@/utils/logger'; // or '../../lib/logger' in backend

// Always logged
logger.error('Critical error occurred', errorObject);

// Only logged if level is warn or higher
logger.warn('Something looks suspicious', data);

// Only logged if level is info or higher
logger.info('Job completed successfully', jobId);

// Only logged if level is debug or higher
logger.debug('Processing request with parameters', params);

// Only logged if level is trace
logger.trace('Entering function', functionName, args);
``` 