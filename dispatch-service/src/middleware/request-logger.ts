/**
 * Request Logging Middleware
 *
 * Logs incoming HTTP requests and their responses with structured JSON format.
 * Includes correlation ID, method, path, status code, and response time.
 *
 * @module middleware/request-logger
 * @requirements 12.2 - Structured JSON logging for all log entries
 * @requirements 12.4 - Include correlation IDs in logs for request tracing
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Middleware that logs HTTP requests and responses.
 * Logs request details on entry and response details on completion.
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log incoming request
  logger.info('Incoming request', {
    correlationId: req.correlationId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.socket.remoteAddress,
  });

  // Capture response finish event
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]('Request completed', {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
    });
  });

  next();
}
