/**
 * Public Routes
 *
 * Public API endpoints that don't require authentication.
 * Used for driver route map access via token-based authorization.
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as routeTokenService from '../services/route-token.service';
import * as publicRouteService from '../services/public-route.service';
import { RouteTokenErrorCodes } from '../services/route-token.service';
import { config } from '../config/index';

const router = Router();

/**
 * GET /api/v1/public/route/:token
 *
 * Get public route map data by token.
 * Returns only coordinates and polyline - no sensitive customer data.
 *
 * @param token - Route access token (UUID)
 * @returns PublicRouteMapData if token is valid
 *
 * Responses:
 * - 200: Route data returned
 * - 404: Token not found or invalid
 * - 410: Token expired
 */
router.get(
  '/route/:token',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;

      if (!token) {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Token is required',
          },
        });
        return;
      }

      // Validate the token
      const tokenResult = await routeTokenService.validateToken(token);

      if (!tokenResult.success) {
        const error = tokenResult.error as routeTokenService.RouteTokenServiceError | undefined;

        // Return 410 Gone for expired tokens
        if (error && error.code === RouteTokenErrorCodes.EXPIRED) {
          res.status(410).json({
            success: false,
            error: {
              code: 'GONE',
              message: 'This route link has expired',
            },
          });
          return;
        }

        // Return 404 for not found / invalid tokens
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Invalid route link',
          },
        });
        return;
      }

      // Get public route map data
      const routeResult = await publicRouteService.getRouteMapData(
        tokenResult.data!.routeId
      );

      if (!routeResult.success) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Route not found',
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: routeResult.data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/public/maps-key
 *
 * Get Google Maps API key for public map views.
 * This is a public endpoint - the key should be restricted in Google Cloud Console.
 */
router.get('/maps-key', (_req: Request, res: Response): void => {
  const apiKey = config.googleMaps.apiKey || '';

  if (!apiKey) {
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Maps service not configured',
      },
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      key: apiKey,
    },
  });
});

export default router;
