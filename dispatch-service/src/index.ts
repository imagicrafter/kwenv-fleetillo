/**
 * OptiRoute Dispatch Service
 *
 * A standalone microservice for sending route assignments to drivers
 * via multiple communication channels (Telegram, Email).
 *
 * @module dispatch-service
 * @requirements 12.2 - Structured JSON logging for all log entries
 * @requirements 12.4 - Include correlation IDs in logs for request tracing
 */

import 'dotenv/config';
import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { logger } from './utils/logger.js';
import { correlationMiddleware } from './middleware/correlation.js';
import { requestLoggerMiddleware } from './middleware/request-logger.js';
import { ApiError } from './types/index.js';
import { createApiRouter } from './api/routes.js';
import { createDispatchOrchestrator } from './core/orchestrator.js';
import { telegramAdapter } from './adapters/telegram.js';
import { emailAdapter } from './adapters/email.js';

// Create Express application
const app = express();

// Configuration
const PORT = parseInt(process.env.PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// =============================================================================
// Middleware Setup
// =============================================================================

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Correlation-ID'],
    exposedHeaders: ['X-Correlation-ID'],
  })
);

// Add correlation ID to all requests
app.use(correlationMiddleware);

// Log all requests
app.use(requestLoggerMiddleware);

// =============================================================================
// Routes
// =============================================================================

// Create the dispatch orchestrator with adapters
const orchestrator = createDispatchOrchestrator([telegramAdapter, emailAdapter]);

// Create and mount the API router
// Health endpoint is public, dispatch endpoints require authentication
const apiRouter = createApiRouter({
  orchestrator,
  healthDependencies: {
    adapters: [telegramAdapter, emailAdapter],
  },
});
app.use('/api/v1', apiRouter);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'OptiRoute Dispatch Service',
    version: '1.0.0',
    status: 'running',
  });
});

// =============================================================================
// Error Handling
// =============================================================================

// 404 handler for unknown routes
app.use((req: Request, res: Response) => {
  const error: ApiError = {
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    requestId: req.correlationId,
  };
  res.status(404).json(error);
});

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { correlationId: req.correlationId }, err);

  const error: ApiError = {
    error: {
      code: 'INTERNAL_ERROR',
      message: NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
      details: NODE_ENV === 'production' ? undefined : { stack: err.stack },
    },
    requestId: req.correlationId,
  };

  res.status(500).json(error);
});

// =============================================================================
// Server Startup
// =============================================================================

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info('Dispatch Service started', {
      port: PORT,
      environment: NODE_ENV,
      nodeVersion: process.version,
    });
  });
}

// Export app for testing
export { app };
