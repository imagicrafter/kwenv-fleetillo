import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

/**
 * Global error handling middleware for Express
 * Catches all errors and formats them into consistent API responses
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log the error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // Handle AppError instances (our custom errors)
  if (err instanceof AppError) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        context: err.context,
        validationErrors: err.validationErrors,
      },
    });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
      details: process.env.NODE_ENV === 'production'
        ? undefined
        : err.stack,
    },
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
      path: req.path,
      method: req.method,
    },
  });
};
