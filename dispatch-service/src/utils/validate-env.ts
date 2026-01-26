/**
 * Environment Variable Validation
 *
 * Validates required environment variables at startup.
 * Fails fast with clear error messages if required vars are missing.
 *
 * @module utils/validate-env
 */

import { logger } from './logger.js';

interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Required environment variables for the dispatch service
 */
const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'DISPATCH_API_KEYS',
  'TELEGRAM_BOT_TOKEN',
];

/**
 * Environment variables required only in production
 */
const PRODUCTION_REQUIRED_ENV_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
];

/**
 * Environment variables that should be set in production (warnings only)
 */
const PRODUCTION_RECOMMENDED_ENV_VARS = [
  { name: 'TELEGRAM_WEBHOOK_SECRET', reason: 'Webhook requests will not be authenticated' },
  { name: 'CORS_ORIGIN', reason: 'CORS will block all cross-origin requests in production' },
];

/**
 * Validate that required environment variables are set
 *
 * @returns Validation result with errors and warnings
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // Check required vars
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar] || process.env[envVar]?.trim() === '') {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }

  // Check production-required vars
  if (isProduction) {
    for (const envVar of PRODUCTION_REQUIRED_ENV_VARS) {
      if (!process.env[envVar] || process.env[envVar]?.trim() === '') {
        errors.push(`Missing required environment variable for production: ${envVar}`);
      }
    }
  }

  // Check production-recommended vars (warnings only)
  if (isProduction) {
    for (const { name, reason } of PRODUCTION_RECOMMENDED_ENV_VARS) {
      if (!process.env[name] || process.env[name]?.trim() === '') {
        warnings.push(`${name} is not set. ${reason}`);
      }
    }
  }

  // Validate DISPATCH_API_KEYS format (32-char minimum)
  const apiKeys = process.env.DISPATCH_API_KEYS;
  if (apiKeys) {
    const keys = apiKeys.split(',').map((k) => k.trim()).filter(Boolean);
    const shortKeys = keys.filter((k) => k.length < 32);
    if (shortKeys.length > 0) {
      errors.push(
        `DISPATCH_API_KEYS contains ${shortKeys.length} key(s) shorter than 32 characters. ` +
        `All API keys must be at least 32 characters for security.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate environment and exit if validation fails
 *
 * Call this at application startup before initializing services.
 */
export function validateEnvOrExit(): void {
  const result = validateEnvironment();

  // Log warnings
  for (const warning of result.warnings) {
    logger.warn(`Environment warning: ${warning}`);
  }

  // If there are errors, log them and exit
  if (!result.valid) {
    logger.error('Environment validation failed', {
      errors: result.errors,
    });

    console.error('\n' + '='.repeat(60));
    console.error('ENVIRONMENT VALIDATION FAILED');
    console.error('='.repeat(60));
    console.error('\nThe following required environment variables are missing or invalid:\n');
    for (const error of result.errors) {
      console.error(`  ❌ ${error}`);
    }
    console.error('\nPlease set these variables in your .env file or environment.');
    console.error('See README.md for configuration details.');
    console.error('='.repeat(60) + '\n');

    process.exit(1);
  }

  logger.info('Environment validation passed');
}
