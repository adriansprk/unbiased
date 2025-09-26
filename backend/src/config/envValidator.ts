/**
 * Environment variable validator
 */

import dotenv from 'dotenv';
import path from 'path';
import logger from '../lib/logger';

// Load environment variables from .env file if not already set
if (process.env.NODE_ENV !== 'production') {
  const envPath =
    process.env.NODE_ENV === 'test'
      ? path.resolve(process.cwd(), '.env.test')
      : path.resolve(process.cwd(), '.env');

  dotenv.config({ path: envPath });
}

/**
 * Required environment variables
 */
const requiredEnvVars = [
  'PORT',
  'FRONTEND_URL',
  'REDIS_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DIFFBOT_API_KEY',
  'GEMINI_API_KEY', // Now required as the primary LLM provider
  // 'OPENAI_API_KEY' - now optional as we can use Gemini as primary
];

/**
 * Optional environment variables that add functionality but aren't required
 */
const optionalEnvVars = [
  'OPENAI_API_KEY', // Now optional, to be used as fallback
  'GEMINI_MODEL_NAME',
  'ANALYSIS_LLM_PROVIDER',
];

/**
 * Validates that all required environment variables are set
 */
export function validateEnv(): void {
  logger.info('Environment:', process.env.NODE_ENV);

  // In test environment, we don't need to validate all env vars
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const missingVars = requiredEnvVars.filter(name => !process.env[name]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Log a warning for any optional variables that aren't set
  const missingOptionalVars = optionalEnvVars.filter(name => !process.env[name]);
  if (missingOptionalVars.length > 0) {
    logger.warn(`Missing optional environment variables: ${missingOptionalVars.join(', ')}`);
  }

  // If ANALYSIS_LLM_PROVIDER is set to 'openai' but OPENAI_API_KEY is missing, warn user
  if (process.env.ANALYSIS_LLM_PROVIDER === 'openai' && !process.env.OPENAI_API_KEY) {
    logger.warn(
      'Warning: ANALYSIS_LLM_PROVIDER is set to "openai" but OPENAI_API_KEY is not set. Falling back to Gemini.'
    );
  }
}

/**
 * Validates a specific environment variable is set
 */
export function validateVar(varName: string, errorMessage?: string): string {
  const value = process.env[varName];

  if (!value) {
    throw new Error(errorMessage || `Required environment variable ${varName} is not set`);
  }

  return value;
}

/**
 * Converts and validates a boolean environment variable.
 * Returns the default value if the variable is not set or has an unrecognized value.
 *
 * @param varName - Name of the environment variable
 * @param defaultValue - Default value to use if the variable is not set or has an invalid value
 * @returns Boolean value of the environment variable
 */
export function validateBooleanVar(varName: string, defaultValue: boolean = false): boolean {
  const value = process.env[varName];

  if (!value) {
    return defaultValue;
  }

  // Convert string values to booleans
  const lowercaseValue = value.toLowerCase();
  if (lowercaseValue === 'true' || lowercaseValue === '1') {
    return true;
  } else if (lowercaseValue === 'false' || lowercaseValue === '0') {
    return false;
  }

  // If value is not recognized, return default
  return defaultValue;
}

export default { validateEnv, validateVar, validateBooleanVar };
