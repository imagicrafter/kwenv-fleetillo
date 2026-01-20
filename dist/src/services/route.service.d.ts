/**
 * Route Service
 *
 * Provides CRUD operations and business logic for managing routes
 * in the RouteIQ application.
 */
import type { Result, PaginationParams, PaginatedResponse } from '../types/index.js';
import type { Route, CreateRouteInput, UpdateRouteInput, RouteFilters } from '../types/route.js';
/**
 * Route service error
 */
export declare class RouteServiceError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, code: string, details?: unknown);
}
/**
 * Error codes for route service errors
 */
export declare const RouteErrorCodes: {
    readonly NOT_FOUND: "ROUTE_NOT_FOUND";
    readonly CREATE_FAILED: "ROUTE_CREATE_FAILED";
    readonly UPDATE_FAILED: "ROUTE_UPDATE_FAILED";
    readonly DELETE_FAILED: "ROUTE_DELETE_FAILED";
    readonly QUERY_FAILED: "ROUTE_QUERY_FAILED";
    readonly VALIDATION_FAILED: "ROUTE_VALIDATION_FAILED";
};
/**
 * Creates a new route
 */
export declare function createRoute(input: CreateRouteInput): Promise<Result<Route>>;
/**
 * Gets a route by ID
 */
export declare function getRouteById(id: string): Promise<Result<Route>>;
/**
 * Gets all routes with optional filtering and pagination
 */
export declare function getRoutes(filters?: RouteFilters, pagination?: PaginationParams): Promise<Result<PaginatedResponse<Route>>>;
/**
 * Updates an existing route
 */
export declare function updateRoute(input: UpdateRouteInput): Promise<Result<Route>>;
/**
 * Soft deletes a route by setting deleted_at timestamp
 * Also resets the bookings assigned to this route so they can be re-planned
 */
export declare function deleteRoute(id: string): Promise<Result<void>>;
/**
 * Permanently deletes a route (hard delete)
 * Use with caution - this cannot be undone
 */
export declare function hardDeleteRoute(id: string): Promise<Result<void>>;
/**
 * Restores a soft-deleted route
 */
export declare function restoreRoute(id: string): Promise<Result<Route>>;
/**
 * Counts routes with optional filters
 */
export declare function countRoutes(filters?: RouteFilters): Promise<Result<number>>;
/**
 * Gets routes by vehicle ID
 */
export declare function getRoutesByVehicle(vehicleId: string, filters?: Omit<RouteFilters, 'vehicleId'>): Promise<Result<Route[]>>;
/**
 * Updates route status
 */
export declare function updateRouteStatus(id: string, status: Route['status']): Promise<Result<Route>>;
/**
 * Gets routes for a specific date range
 */
export declare function getRoutesByDateRange(startDate: Date, endDate: Date, filters?: Omit<RouteFilters, 'routeDateFrom' | 'routeDateTo'>): Promise<Result<Route[]>>;
/**
 * Gets the next available route date on or after the given date
 * Returns the date as a YYYY-MM-DD string to avoid timezone issues
 */
export declare function getNextAvailableRouteDate(fromDate: Date | string): Promise<Result<string | null>>;
/**
 * Gets route statistics grouped by date and status for a date range
 * Accepts string dates (YYYY-MM-DD) to ensure exact range matching without timezone shifts
 */
export declare function getRouteStatsByDateRange(startDateStr: string, endDateStr: string): Promise<Result<Record<string, Record<string, number>>>>;
//# sourceMappingURL=route.service.d.ts.map