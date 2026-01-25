/**
 * Public Route Service
 *
 * Provides minimal route map data for public driver view.
 * Returns only coordinates and polyline - no sensitive customer data.
 */
import type { Result } from '../types/index';
import type { PublicRouteMapData } from '../types/route-token';
/**
 * Public route service error
 */
export declare class PublicRouteServiceError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, code: string, details?: unknown);
}
/**
 * Error codes for public route service errors
 */
export declare const PublicRouteErrorCodes: {
    readonly ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND";
    readonly NO_GEOMETRY: "ROUTE_NO_GEOMETRY";
    readonly NO_STOPS: "ROUTE_NO_STOPS";
    readonly QUERY_FAILED: "ROUTE_QUERY_FAILED";
};
/**
 * Gets minimal route data for map display
 *
 * Returns only:
 * - Route polyline (encoded)
 * - Stop coordinates with sequence numbers
 * - Start and end points
 *
 * Does NOT return:
 * - Customer names
 * - Contact information
 * - Booking details
 * - Pricing information
 *
 * @param routeId - The route ID to fetch
 * @returns Result containing PublicRouteMapData
 */
export declare function getRouteMapData(routeId: string): Promise<Result<PublicRouteMapData>>;
//# sourceMappingURL=public-route.service.d.ts.map