/**
 * Route Token Service
 *
 * Provides management of time-limited route access tokens for
 * driver dispatch links. Tokens allow public access to route
 * map data without authentication.
 */
import type { Result } from '../types/index';
import type { RouteToken, CreateRouteTokenInput, RouteTokenResponse } from '../types/route-token';
/**
 * Route token service error
 */
export declare class RouteTokenServiceError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, code: string, details?: unknown);
}
/**
 * Error codes for route token service errors
 */
export declare const RouteTokenErrorCodes: {
    readonly NOT_FOUND: "ROUTE_TOKEN_NOT_FOUND";
    readonly EXPIRED: "ROUTE_TOKEN_EXPIRED";
    readonly CREATE_FAILED: "ROUTE_TOKEN_CREATE_FAILED";
    readonly VALIDATION_FAILED: "ROUTE_TOKEN_VALIDATION_FAILED";
    readonly ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND";
    readonly CLEANUP_FAILED: "ROUTE_TOKEN_CLEANUP_FAILED";
};
/**
 * Creates a new route access token
 *
 * @param input - Token creation parameters
 * @param baseUrl - Base URL for constructing the full route URL
 * @returns Result containing token response with URL
 */
export declare function createToken(input: CreateRouteTokenInput, baseUrl: string): Promise<Result<RouteTokenResponse>>;
/**
 * Validates a token and returns the associated route ID
 *
 * @param token - The token string to validate
 * @returns Result containing route_id if valid
 */
export declare function validateToken(token: string): Promise<Result<{
    routeId: string;
}>>;
/**
 * Deletes expired tokens that are older than the specified days
 *
 * @param daysOld - Number of days past expiration to delete (default: 7)
 * @returns Result containing count of deleted tokens
 */
export declare function cleanupExpiredTokens(daysOld?: number): Promise<Result<{
    deletedCount: number;
}>>;
/**
 * Gets a token by its value (for testing/admin purposes)
 */
export declare function getTokenByValue(token: string): Promise<Result<RouteToken>>;
//# sourceMappingURL=route-token.service.d.ts.map