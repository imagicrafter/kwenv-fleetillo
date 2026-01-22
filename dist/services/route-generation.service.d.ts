/**
 * Route Generation Service
 *
 * Batches bookings by vehicle and service type, then calls Google Routes API
 * for route optimization. This service is designed to handle multiple bookings
 * and generate optimized routes for efficient service delivery.
 */
import type { Result } from '../types/index';
import type { Booking } from '../types/booking';
import { TravelMode, RoutingPreference } from '../types/google-routes';
import type { Route } from '../types/google-routes';
/**
 * Route generation service error
 */
export declare class RouteGenerationServiceError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, code: string, details?: unknown);
}
/**
 * Error codes for route generation service
 */
export declare const RouteGenerationErrorCodes: {
    readonly INVALID_INPUT: "ROUTE_GENERATION_INVALID_INPUT";
    readonly NO_BOOKINGS: "ROUTE_GENERATION_NO_BOOKINGS";
    readonly MISSING_COORDINATES: "ROUTE_GENERATION_MISSING_COORDINATES";
    readonly FETCH_BOOKING_FAILED: "ROUTE_GENERATION_FETCH_BOOKING_FAILED";
    readonly OPTIMIZATION_FAILED: "ROUTE_GENERATION_OPTIMIZATION_FAILED";
    readonly BATCH_FAILED: "ROUTE_GENERATION_BATCH_FAILED";
};
/**
 * A batch of bookings grouped by vehicle and service type
 */
export interface BookingBatch {
    vehicleId: string;
    serviceId: string;
    bookings: Booking[];
}
/**
 * Optimized route result for a batch of bookings
 */
export interface OptimizedRouteBatch {
    vehicleId: string;
    serviceId: string;
    bookings: Booking[];
    route: Route;
    optimizedOrder: number[];
    totalDistanceMeters: number;
    totalDurationSeconds: number;
    plannedStartTime?: string;
    plannedEndTime?: string;
    warnings?: string[];
}
/**
 * Input for generating optimized routes
 */
export interface GenerateOptimizedRoutesInput {
    bookingIds?: string[];
    bookings?: Booking[];
    departureLocation?: {
        latitude: number;
        longitude: number;
    };
    returnToStart?: boolean;
    travelMode?: TravelMode;
    routingPreference?: RoutingPreference;
    optimizeWaypointOrder?: boolean;
}
/**
 * Response from route generation
 */
export interface GenerateOptimizedRoutesResponse {
    batches: OptimizedRouteBatch[];
    summary: {
        totalBatches: number;
        totalBookings: number;
        successfulBatches: number;
        failedBatches: number;
        totalDistanceMeters: number;
        totalDurationSeconds: number;
    };
    errors?: Array<{
        batchIndex: number;
        vehicleId: string;
        serviceId: string;
        error: string;
    }>;
}
/**
 * Generates optimized routes for multiple bookings by batching them
 * by vehicle and service type, then calling Google Routes API
 *
 * @param input - Configuration for route generation
 * @returns Optimized route batches with summary
 */
export declare function generateOptimizedRoutes(input: GenerateOptimizedRoutesInput): Promise<Result<GenerateOptimizedRoutesResponse>>;
//# sourceMappingURL=route-generation.service.d.ts.map