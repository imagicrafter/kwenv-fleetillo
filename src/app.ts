import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import 'express-async-errors';
import { config } from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestLogger, logRequest } from './middleware/request-logger.js';
import { sanitizeBody } from './middleware/validation.js';
import routes from './routes/index.js';
import healthRoutes from './routes/health.routes.js';
import { logger } from './utils/logger.js';

/**
 * Create and configure Express application
 */
export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // CORS configuration
  app.use(cors({
    origin: config.env === 'production'
      ? [] // Configure allowed origins in production
      : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use(requestLogger());
  app.use(logRequest);

  // Body sanitization
  app.use(sanitizeBody);

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      data: {
        name: 'RouteIQ API',
        version: '1.0.0',
        status: 'running',
        environment: config.env,
        apiPrefix: `${config.api.prefix}/${config.api.version}`,
      },
    });
  });

  // Health check route (no prefix)
  app.use('/health', healthRoutes);

  // Static files serving - serves from dist/public when built, or src/public in dev
  const publicPath = path.join(process.cwd(), 'dist', 'public');
  app.use('/ui', express.static(publicPath));

  // API routes with prefix
  app.use(`${config.api.prefix}/${config.api.version}`, routes);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  logger.info('Express application configured successfully', {
    nodeEnv: config.env,
    apiPrefix: config.api.prefix,
    apiVersion: config.api.version,
  });

  return app;
};

export default createApp;
