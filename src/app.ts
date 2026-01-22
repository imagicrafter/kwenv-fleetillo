import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import 'express-async-errors';
import { config } from './config/index';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { requestLogger, logRequest } from './middleware/request-logger';
import { sanitizeBody } from './middleware/validation';
import routes from './routes/index';
import healthRoutes from './routes/health.routes';
import { logger } from './utils/logger';

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

  // Static files serving
  // In development, prioritize shared/public (source)
  // In production, use dist/public (build artifact)
  if (process.env.NODE_ENV === 'development') {
    app.use('/ui', express.static(path.join(process.cwd(), 'shared', 'public')));
    app.use('/ui', express.static(path.join(process.cwd(), 'src', 'public')));
  } else {
    app.use('/ui', express.static(path.join(process.cwd(), 'dist', 'public')));
  }

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
