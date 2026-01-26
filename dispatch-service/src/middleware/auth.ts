/**
 * API Key Authentication Middleware
 *
 * Validates API key authentication for protected endpoints.
 * Supports multiple API keys from the DISPATCH_API_KEYS environment variable.
 *
 * Security features:
 * - Timing-safe comparison to prevent timing attacks
 * - Minimum key length validation
 *
 * @module middleware/auth
 * @requirements 9.1 - Return 401 Unauthorized for missing API key
 * @requirements 9.2 - Return 401 Unauthorized for invalid API key
 * @requirements 9.3 - Process requests with valid API key in X-API-Key header
 * @requirements 9.4 - Support multiple API keys for different client applications
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ApiError } from '../types/index.js';
import { logger } from '../utils/logger.js';

export const API_KEY_HEADER = 'X-API-Key';

/**
 * Minimum required length for API keys (32 characters recommended for security)
 */
const MIN_API_KEY_LENGTH = 32;

/**
 * Perform timing-safe comparison of two strings
 * Prevents timing attacks by always taking the same amount of time
 */
function timingSafeCompare(a: string, b: string): boolean {
  // If lengths differ, still perform comparison to maintain constant time
  if (a.length !== b.length) {
    const dummy = Buffer.from(a);
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Get configured API keys from environment variable.
 * API keys are stored as a comma-separated list in DISPATCH_API_KEYS.
 *
 * @returns Array of valid API keys
 */
export function getConfiguredApiKeys(): string[] {
  const apiKeysEnv = process.env.DISPATCH_API_KEYS || '';

  // Split by comma, trim, and filter out empty strings and short keys
  const keys = apiKeysEnv
    .split(',')
    .map((key) => key.trim())
    .filter((key) => key.length >= MIN_API_KEY_LENGTH);

  return keys;
}

/**
 * Validate an API key against configured keys using timing-safe comparison.
 *
 * @param apiKey - The API key to validate
 * @returns true if the key is valid, false otherwise
 */
export function isValidApiKey(apiKey: string | undefined): boolean {
  if (!apiKey || apiKey.trim().length === 0) {
    return false;
  }

  const trimmedKey = apiKey.trim();

  // Reject keys that are too short
  if (trimmedKey.length < MIN_API_KEY_LENGTH) {
    return false;
  }

  const configuredKeys = getConfiguredApiKeys();

  // If no keys are configured, reject all requests
  if (configuredKeys.length === 0) {
    return false;
  }

  // Check against all configured keys using timing-safe comparison
  // Note: We check all keys to maintain constant time regardless of which key matches
  let isValid = false;
  for (const configuredKey of configuredKeys) {
    if (timingSafeCompare(trimmedKey, configuredKey)) {
      isValid = true;
    }
  }

  return isValid;
}

/**
 * Middleware that validates API key authentication.
 *
 * Checks for the X-API-Key header and validates it against
 * the configured API keys in DISPATCH_API_KEYS environment variable.
 *
 * Returns 401 Unauthorized if:
 * - The X-API-Key header is missing
 * - The API key is invalid
 * - No API keys are configured
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers[API_KEY_HEADER.toLowerCase()] as string | undefined;

  // Check if API key header is present
  if (!apiKey) {
    logger.warn('Missing API key', {
      correlationId: req.correlationId,
      path: req.path,
      method: req.method,
    });

    const error: ApiError = {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing API key. Please provide a valid API key in the X-API-Key header.',
      },
      requestId: req.correlationId,
    };

    res.status(401).json(error);
    return;
  }

  // Validate the API key
  if (!isValidApiKey(apiKey)) {
    logger.warn('Invalid API key', {
      correlationId: req.correlationId,
      path: req.path,
      method: req.method,
      // Don't log the actual key for security reasons
      keyLength: apiKey.length,
    });

    const error: ApiError = {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid API key. Please provide a valid API key.',
      },
      requestId: req.correlationId,
    };

    res.status(401).json(error);
    return;
  }

  // API key is valid, proceed to next middleware
  logger.debug('API key validated', {
    correlationId: req.correlationId,
    path: req.path,
    method: req.method,
  });

  next();
}
