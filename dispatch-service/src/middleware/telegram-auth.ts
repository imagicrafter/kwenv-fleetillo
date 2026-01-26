/**
 * Telegram Webhook Authentication Middleware
 *
 * Validates the X-Telegram-Bot-Api-Secret-Token header to ensure
 * webhook requests are genuinely from Telegram.
 *
 * @module middleware/telegram-auth
 * @see https://core.telegram.org/bots/api#setwebhook
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { ApiError } from '../types/index.js';

const TELEGRAM_SECRET_HEADER = 'x-telegram-bot-api-secret-token';

/**
 * Get the configured Telegram webhook secret from environment
 */
function getTelegramWebhookSecret(): string | undefined {
  return process.env.TELEGRAM_WEBHOOK_SECRET;
}

/**
 * Perform timing-safe comparison of two strings
 * Prevents timing attacks by always taking the same amount of time
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to maintain constant time
    const dummy = Buffer.from(a);
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Middleware that validates the Telegram webhook secret token
 *
 * When registering your webhook with Telegram, you can specify a secret_token.
 * Telegram will then send this token in the X-Telegram-Bot-Api-Secret-Token header
 * with every webhook request.
 *
 * @see https://core.telegram.org/bots/api#setwebhook
 *
 * Usage:
 * ```typescript
 * router.post('/telegram/webhook', telegramAuthMiddleware, webhookHandler);
 * ```
 */
export function telegramAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const secret = getTelegramWebhookSecret();

  // If no secret is configured, skip validation (development mode)
  // Log a warning in production
  if (!secret) {
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'production') {
      logger.warn('TELEGRAM_WEBHOOK_SECRET not configured - webhook is unprotected', {
        correlationId: req.correlationId,
      });
    }
    next();
    return;
  }

  const providedToken = req.headers[TELEGRAM_SECRET_HEADER] as string | undefined;

  // Check if the header is present
  if (!providedToken) {
    logger.warn('Missing Telegram webhook secret token', {
      correlationId: req.correlationId,
      ip: req.ip,
    });

    const error: ApiError = {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing webhook authentication token',
      },
      requestId: req.correlationId,
    };

    res.status(401).json(error);
    return;
  }

  // Validate the token using timing-safe comparison
  if (!timingSafeCompare(providedToken, secret)) {
    logger.warn('Invalid Telegram webhook secret token', {
      correlationId: req.correlationId,
      ip: req.ip,
    });

    const error: ApiError = {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid webhook authentication token',
      },
      requestId: req.correlationId,
    };

    res.status(401).json(error);
    return;
  }

  // Token is valid, proceed to handler
  logger.debug('Telegram webhook authenticated', {
    correlationId: req.correlationId,
  });

  next();
}
