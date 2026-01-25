/**
 * Route Planning Service
 *
 * Orchestrates the complete route planning workflow:
 * 1. Fetches unscheduled bookings for a date
 * 2. Groups bookings by service type
 * 3. Clusters geographically and respects max stops per route
 * 4. Optimizes routes using Google Routes API
 * 5. Assigns compatible vehicles
 * 6. Persists routes and updates bookings
 */
import type { Result } from '../types/index';
import type { Booking } from '../types/booking';
import type { Route } from '../types/route';
import type { Vehicle } from '../types/vehicle';
/**
 * Route planning service error
 */
export declare class RoutePlanningServiceError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, code: string, details?: unknown);
}
/**
 * Error codes for route planning service
 */
export declare const RoutePlanningErrorCodes: {
    readonly INVALID_INPUT: "ROUTE_PLANNING_INVALID_INPUT";
    readonly NO_BOOKINGS: "ROUTE_PLANNING_NO_BOOKINGS";
    readonly NO_VEHICLES: "ROUTE_PLANNING_NO_VEHICLES";
    readonly FETCH_FAILED: "ROUTE_PLANNING_FETCH_FAILED";
    readonly OPTIMIZATION_FAILED: "ROUTE_PLANNING_OPTIMIZATION_FAILED";
    readonly PERSIST_FAILED: "ROUTE_PLANNING_PERSIST_FAILED";
};
/**
 * Input for planning routes
 */
export interface PlanRoutesInput {
    routeDate: Date | string;
    serviceId?: string;
    maxStopsPerRoute?: number;
    departureLocation?: {
        latitude: number;
        longitude: number;
    };
    returnToStart?: boolean;
    routingPreference?: 'TRAFFIC_UNAWARE' | 'TRAFFIC_AWARE';
    vehicleAllocations?: VehicleAllocation[];
}
/**
 * Vehicle allocation for route planning
 */
export interface VehicleAllocation {
    vehicleId: string;
    bookingCount: number;
    bookingIds?: string[];
    startLocationId?: string;
    endLocationId?: string;
}
/**
 * Result from planning routes
 */
export interface PlanRoutesResponse {
    routes: Route[];
    unassignedBookings: Booking[];
    summary: {
        totalBookings: number;
        assignedBookings: number;
        routesCreated: number;
        vehiclesUsed: number;
    };
    warnings: string[];
}
/**
 * Preview response for route planning (before creating routes)
 */
export interface RoutePlanPreview {
    routeDate: Date;
    bookings: Booking[];
    vehicles: Vehicle[];
    defaultAllocation: {
        vehicleId: string;
        vehicleName: string;
        bookingCount: number;
        homeLocationId?: string;
        homeLocationName?: string;
        availableLocations: {
            id: string;
            name: string;
            city: string;
            state: string;
            isPrimary: boolean;
        }[];
    }[];
    unassignableBookings: Booking[];
    warnings: string[];
    availableBaseLocations: {
        id: string;
        name: string;
        city: string;
        state: string;
    }[];
}
/**
 * Preview route planning before actually creating routes.
 * Returns list of compatible bookings, available vehicles, and default allocation.
 */
export declare function previewRoutePlan(input: PlanRoutesInput): Promise<Result<RoutePlanPreview>>;
/**
 * Plans routes for a specific date
 */
export declare function planRoutes(input: PlanRoutesInput): Promise<Result<PlanRoutesResponse>>;
//# sourceMappingURL=route-planning.service.d.ts.map