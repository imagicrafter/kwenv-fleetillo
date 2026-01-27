/**
 * Rate Limiting Middleware
 *
 * Provides tiered rate limiting for different endpoint types:
 * - General API: 100 requests per minute
 * - Dispatch endpoints: 50 requests per minute
 * - Telegram webhook: 10 requests per second
 *
 * @module middleware/rate-limit
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import { ApiError } from '../types/index.js';

/**
 * Get rate limit configuration from environment variables with defaults
 */
function getRateLimitConfig() {
  return {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  };
}

/**
 * Standard rate limit exceeded handler
 * Returns a consistent API error response
 */
function rateLimitHandler(req: Request, res: Response): void {
  const error: ApiError = {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
    requestId: req.correlationId,
  };
  res.status(429).json(error);
}

/**
 * General API rate limiter
 * Applied to all routes as a baseline protection
 *
 * Default: 100 requests per minute (configurable via environment)
 */
export const generalRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: getRateLimitConfig().windowMs,
  max: getRateLimitConfig().maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/api/v1/health' || req.path === '/health';
  },
});

/**
 * Dispatch endpoint rate limiter
 * More restrictive for dispatch operations to prevent abuse
 *
 * Default: 50 requests per minute
 */
export const dispatchRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60000, // 1 minute
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req: Request) => {
    // Use API key if present for rate limiting by client
    const apiKey = req.headers['x-api-key'] as string | undefined;
    if (apiKey) {
      return apiKey;
    }
    // Fall back to IP (with unknown as final fallback)
    return req.ip || 'unknown';
  },
  // Disable validation warning for custom keyGenerator
  // Our keyGenerator uses API key as primary, IP as fallback
  validate: { xForwardedForHeader: false },
});

/**
 * Telegram webhook rate limiter
 * Strict rate limiting to prevent bot spam and abuse
 *
 * Default: 10 requests per second (600 per minute)
 */
export const webhookRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 1000, // 1 second
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    // Telegram expects 200 OK even on errors, otherwise it will retry
    // Log the rate limit for monitoring
    const error: ApiError = {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Webhook rate limit exceeded',
      },
      requestId: req.correlationId,
    };
    res.status(429).json(error);
  },
});
