/**
 * Google Routes API Service
 *
 * Provides route computation and optimization functionality using the Google Routes API (v2).
 * Includes proper error handling, retry logic, and batching capabilities for efficient processing.
 */
import type { Result } from '../types/index';
import type { ComputeRoutesInput, ComputeRoutesResponse, ComputeRouteMatrixInput, ComputeRouteMatrixResponse, BatchComputeRoutesItem, BatchComputeRoutesResult, Route } from '../types/google-routes';
/**
 * Google Routes API service error
 */
export declare class GoogleRoutesServiceError extends Error {
    readonly code: string;
    readonly details?: unknown;
    readonly isRetryable: boolean;
    constructor(message: string, code: string, details?: unknown, isRetryable?: boolean);
}
/**
 * Error codes for Google Routes service errors
 */
export declare const GoogleRoutesErrorCodes: {
    readonly MISSING_API_KEY: "GOOGLEROUTES_MISSING_API_KEY";
    readonly INVALID_WAYPOINT: "GOOGLEROUTES_INVALID_WAYPOINT";
    readonly INVALID_REQUEST: "GOOGLEROUTES_INVALID_REQUEST";
    readonly MAX_WAYPOINTS_EXCEEDED: "GOOGLEROUTES_MAX_WAYPOINTS_EXCEEDED";
    readonly MAX_ROUTE_LENGTH_EXCEEDED: "GOOGLEROUTES_MAX_ROUTE_LENGTH_EXCEEDED";
    readonly API_ERROR: "GOOGLEROUTES_API_ERROR";
    readonly QUOTA_EXCEEDED: "GOOGLEROUTES_QUOTA_EXCEEDED";
    readonly REQUEST_DENIED: "GOOGLEROUTES_REQUEST_DENIED";
    readonly ZERO_RESULTS: "GOOGLEROUTES_ZERO_RESULTS";
    readonly TIMEOUT: "GOOGLEROUTES_TIMEOUT";
    readonly NETWORK_ERROR: "GOOGLEROUTES_NETWORK_ERROR";
};
/**
 * Computes routes between origin and destination
 *
 * @param input - The route computation input
 * @returns Result containing computed routes or error
 */
export declare function computeRoutes(input: ComputeRoutesInput): Promise<Result<ComputeRoutesResponse>>;
/**
 * Computes a route matrix (distance and duration between multiple origins and destinations)
 *
 * @param input - The route matrix computation input
 * @returns Result containing route matrix or error
 */
export declare function computeRouteMatrix(input: ComputeRouteMatrixInput): Promise<Result<ComputeRouteMatrixResponse>>;
/**
 * Batch compute routes for multiple requests with concurrency limiting
 *
 * @param items - Array of route computation inputs
 * @param options - Batch processing options
 * @returns Result containing array of batch results
 */
export declare function batchComputeRoutes(items: BatchComputeRoutesItem[], options?: {
    concurrency?: number;
    delayMs?: number;
}): Promise<Result<BatchComputeRoutesResult[]>>;
/**
 * Gets the optimal route from a compute routes response
 * Convenience function to get the first/best route
 *
 * @param response - The compute routes response
 * @returns The optimal route or undefined
 */
export declare function getOptimalRoute(response: ComputeRoutesResponse): Route | undefined;
/**
 * Calculates total route metrics across all legs
 *
 * @param route - The route to analyze
 * @returns Object with total distance (meters) and duration (seconds)
 */
export declare function calculateRouteTotals(route: Route): {
    totalDistanceMeters: number;
    totalDurationSeconds: number;
};
//# sourceMappingURL=google-routes.service.d.ts.map