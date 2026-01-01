import { Router, Request, Response } from 'express';
import { config } from '../config/index.js';

const router = Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.env,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    },
  });
});

/**
 * Readiness check endpoint
 * GET /health/ready
 */
router.get('/ready', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      ready: true,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Liveness check endpoint
 * GET /health/live
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      alive: true,
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
