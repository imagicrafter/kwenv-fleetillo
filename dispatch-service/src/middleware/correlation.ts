/**
 * Correlation ID Middleware
 *
 * Adds a unique correlation ID to each request for request tracing.
 * The correlation ID is either taken from the X-Correlation-ID header
 * or generated if not present.
 *
 * @module middleware/correlation
 * @requirements 12.4 - Include correlation IDs in logs for request tracing
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Extend Express Request to include correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

export const CORRELATION_ID_HEADER = 'X-Correlation-ID';

/**
 * Middleware that adds a correlation ID to each request.
 * If the request already has a correlation ID header, it uses that.
 * Otherwise, it generates a new UUID.
 */
export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Get correlation ID from header or generate a new one
  const correlationId =
    (req.headers[CORRELATION_ID_HEADER.toLowerCase()] as string) || randomUUID();

  // Attach to request object for use in handlers
  req.correlationId = correlationId;

  // Add to response headers for client tracking
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  next();
}
