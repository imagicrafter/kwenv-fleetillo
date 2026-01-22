import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { logger } from '../utils/logger';

/**
 * Custom morgan token to log request body (for development)
 */
morgan.token('body', (req: Request) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    // Don't log sensitive fields
    const body = { ...req.body };
    if (body.password) body.password = '[REDACTED]';
    if (body.apiKey) body.apiKey = '[REDACTED]';
    if (body.token) body.token = '[REDACTED]';
    return JSON.stringify(body);
  }
  return '';
});

/**
 * Morgan format for development
 */
const devFormat = ':method :url :status :response-time ms - :body';

/**
 * Morgan format for production
 */
const prodFormat = ':method :url :status :response-time ms';

/**
 * Get morgan middleware based on environment
 */
export const requestLogger = () => {
  const format = process.env.NODE_ENV === 'production' ? prodFormat : devFormat;

  return morgan(format, {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      },
    },
  });
};

/**
 * Custom request logging middleware for additional context
 */
export const logRequest = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Log when response is finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip,
    };

    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', logData);
    } else {
      logger.debug('Request completed', logData);
    }
  });

  next();
};
