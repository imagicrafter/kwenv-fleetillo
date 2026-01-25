/**
 * Route Token Service
 *
 * Provides management of time-limited route access tokens for
 * driver dispatch links. Tokens allow public access to route
 * map data without authentication.
 */

import { randomUUID } from 'crypto';
import { getSupabaseClient, getAdminSupabaseClient } from './supabase';
import { createContextLogger } from '../utils/logger';
import type { Result } from '../types/index';
import type {
  RouteToken,
  RouteTokenRow,
  CreateRouteTokenInput,
  RouteTokenResponse,
} from '../types/route-token';
import { rowToRouteToken, routeTokenInputToRow } from '../types/route-token';

/**
 * Logger instance for route token operations
 */
const logger = createContextLogger('RouteTokenService');

/**
 * Table name for route tokens
 */
const ROUTE_TOKENS_TABLE = 'route_tokens';

/**
 * Default token expiration in hours
 */
const DEFAULT_EXPIRATION_HOURS = 24;

/**
 * Route token service error
 */
export class RouteTokenServiceError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'RouteTokenServiceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Error codes for route token service errors
 */
export const RouteTokenErrorCodes = {
  NOT_FOUND: 'ROUTE_TOKEN_NOT_FOUND',
  EXPIRED: 'ROUTE_TOKEN_EXPIRED',
  CREATE_FAILED: 'ROUTE_TOKEN_CREATE_FAILED',
  VALIDATION_FAILED: 'ROUTE_TOKEN_VALIDATION_FAILED',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  CLEANUP_FAILED: 'ROUTE_TOKEN_CLEANUP_FAILED',
} as const;

/**
 * Creates a new route access token
 *
 * @param input - Token creation parameters
 * @param baseUrl - Base URL for constructing the full route URL
 * @returns Result containing token response with URL
 */
export async function createToken(
  input: CreateRouteTokenInput,
  baseUrl: string
): Promise<Result<RouteTokenResponse>> {
  logger.debug('Creating route token', { routeId: input.routeId });

  if (!input.routeId) {
    return {
      success: false,
      error: new RouteTokenServiceError(
        'Route ID is required',
        RouteTokenErrorCodes.VALIDATION_FAILED,
        { field: 'routeId' }
      ),
    };
  }

  try {
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    // Verify route exists
    const { data: route, error: routeError } = await supabase
      .from('routes')
      .select('id')
      .eq('id', input.routeId)
      .single();

    if (routeError || !route) {
      logger.warn('Route not found for token creation', { routeId: input.routeId });
      return {
        success: false,
        error: new RouteTokenServiceError(
          'Route not found',
          RouteTokenErrorCodes.ROUTE_NOT_FOUND,
          { routeId: input.routeId }
        ),
      };
    }

    // Generate token and expiration
    const token = randomUUID();
    const expirationHours = input.expirationHours ?? DEFAULT_EXPIRATION_HOURS;
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

    // Insert token
    const rowData = routeTokenInputToRow(input, token, expiresAt);

    const { data, error } = await supabase
      .from(ROUTE_TOKENS_TABLE)
      .insert(rowData)
      .select()
      .single();

    if (error) {
      logger.error('Failed to create route token', { error });
      return {
        success: false,
        error: new RouteTokenServiceError(
          'Failed to create route token',
          RouteTokenErrorCodes.CREATE_FAILED,
          error
        ),
      };
    }

    const routeToken = rowToRouteToken(data as RouteTokenRow);

    // Construct the full URL (web-launcher serves static files at root)
    const url = `${baseUrl}/driver/route.html?token=${token}`;

    logger.info('Route token created', {
      tokenId: routeToken.id,
      routeId: input.routeId,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      success: true,
      data: {
        token,
        expiresAt,
        url,
      },
    };
  } catch (error) {
    logger.error('Unexpected error creating route token', { error });
    return {
      success: false,
      error: new RouteTokenServiceError(
        'Unexpected error creating route token',
        RouteTokenErrorCodes.CREATE_FAILED,
        error
      ),
    };
  }
}

/**
 * Validates a token and returns the associated route ID
 *
 * @param token - The token string to validate
 * @returns Result containing route_id if valid
 */
export async function validateToken(
  token: string
): Promise<Result<{ routeId: string }>> {
  logger.debug('Validating route token');

  if (!token) {
    return {
      success: false,
      error: new RouteTokenServiceError(
        'Token is required',
        RouteTokenErrorCodes.VALIDATION_FAILED,
        { field: 'token' }
      ),
    };
  }

  try {
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    const { data, error } = await supabase
      .from(ROUTE_TOKENS_TABLE)
      .select('*')
      .eq('token', token)
      .single();

    if (error || !data) {
      logger.debug('Token not found', { token: token.substring(0, 8) + '...' });
      return {
        success: false,
        error: new RouteTokenServiceError(
          'Token not found',
          RouteTokenErrorCodes.NOT_FOUND
        ),
      };
    }

    const routeToken = rowToRouteToken(data as RouteTokenRow);

    // Check expiration
    if (routeToken.expiresAt < new Date()) {
      logger.debug('Token expired', {
        tokenId: routeToken.id,
        expiredAt: routeToken.expiresAt.toISOString(),
      });
      return {
        success: false,
        error: new RouteTokenServiceError(
          'This route link has expired',
          RouteTokenErrorCodes.EXPIRED,
          { expiredAt: routeToken.expiresAt }
        ),
      };
    }

    logger.debug('Token validated', {
      tokenId: routeToken.id,
      routeId: routeToken.routeId,
    });

    return {
      success: true,
      data: { routeId: routeToken.routeId },
    };
  } catch (error) {
    logger.error('Unexpected error validating token', { error });
    return {
      success: false,
      error: new RouteTokenServiceError(
        'Failed to validate token',
        RouteTokenErrorCodes.VALIDATION_FAILED,
        error
      ),
    };
  }
}

/**
 * Deletes expired tokens that are older than the specified days
 *
 * @param daysOld - Number of days past expiration to delete (default: 7)
 * @returns Result containing count of deleted tokens
 */
export async function cleanupExpiredTokens(
  daysOld: number = 7
): Promise<Result<{ deletedCount: number }>> {
  logger.info('Starting expired token cleanup', { daysOld });

  try {
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    // Calculate the cutoff date (tokens expired more than daysOld days ago)
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from(ROUTE_TOKENS_TABLE)
      .delete()
      .lt('expires_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      logger.error('Failed to cleanup expired tokens', { error });
      return {
        success: false,
        error: new RouteTokenServiceError(
          'Failed to cleanup expired tokens',
          RouteTokenErrorCodes.CLEANUP_FAILED,
          error
        ),
      };
    }

    const deletedCount = data?.length ?? 0;

    logger.info('Expired token cleanup complete', {
      deletedCount,
      cutoffDate: cutoffDate.toISOString(),
    });

    return {
      success: true,
      data: { deletedCount },
    };
  } catch (error) {
    logger.error('Unexpected error during token cleanup', { error });
    return {
      success: false,
      error: new RouteTokenServiceError(
        'Unexpected error during token cleanup',
        RouteTokenErrorCodes.CLEANUP_FAILED,
        error
      ),
    };
  }
}

/**
 * Gets a token by its value (for testing/admin purposes)
 */
export async function getTokenByValue(
  token: string
): Promise<Result<RouteToken>> {
  try {
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    const { data, error } = await supabase
      .from(ROUTE_TOKENS_TABLE)
      .select('*')
      .eq('token', token)
      .single();

    if (error || !data) {
      return {
        success: false,
        error: new RouteTokenServiceError(
          'Token not found',
          RouteTokenErrorCodes.NOT_FOUND
        ),
      };
    }

    return {
      success: true,
      data: rowToRouteToken(data as RouteTokenRow),
    };
  } catch (error) {
    return {
      success: false,
      error: new RouteTokenServiceError(
        'Failed to get token',
        RouteTokenErrorCodes.VALIDATION_FAILED,
        error
      ),
    };
  }
}
