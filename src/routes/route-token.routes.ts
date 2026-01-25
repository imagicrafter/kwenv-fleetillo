/**
 * Route Token Routes
 *
 * Protected API endpoints for managing route access tokens.
 * Used by the dispatch service to generate tokenized route links.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { apiKeyAuth } from '../middleware/api-key-auth';
import { validateRequired } from '../middleware/validation';
import * as routeTokenService from '../services/route-token.service';
import { config } from '../config/index';

const router = Router();

/**
 * POST /api/v1/route-tokens
 *
 * Create a new route access token.
 * Protected by API key authentication.
 *
 * Request body:
 * - route_id: string (required) - The route to create a token for
 * - expiration_hours: number (optional) - Hours until expiration (default: 24)
 *
 * Response:
 * - token: string - The generated token
 * - expires_at: string - ISO datetime when token expires
 * - url: string - Full URL for driver route view
 */
router.post(
  '/',
  apiKeyAuth,
  validateRequired(['route_id']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { route_id, expiration_hours } = req.body;

      const result = await routeTokenService.createToken(
        {
          routeId: route_id,
          expirationHours: expiration_hours,
        },
        config.baseUrl
      );

      if (!result.success) {
        const error = result.error as routeTokenService.RouteTokenServiceError | undefined;
        const statusCode = error?.code === 'ROUTE_NOT_FOUND' ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          error: {
            code: error?.code || 'CREATE_FAILED',
            message: error?.message || 'Failed to create route token',
          },
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: {
          token: result.data!.token,
          expires_at: result.data!.expiresAt.toISOString(),
          url: result.data!.url,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/route-tokens/expired
 *
 * Cleanup expired tokens (older than 7 days).
 * Protected by API key authentication.
 * Typically called by a scheduled job.
 */
router.delete(
  '/expired',
  apiKeyAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const daysOld = parseInt(req.query.days_old as string) || 7;

      const result = await routeTokenService.cleanupExpiredTokens(daysOld);

      if (!result.success) {
        const error = result.error as routeTokenService.RouteTokenServiceError | undefined;
        res.status(500).json({
          success: false,
          error: {
            code: error?.code || 'CLEANUP_FAILED',
            message: error?.message || 'Failed to cleanup expired tokens',
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          deleted_count: result.data!.deletedCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
