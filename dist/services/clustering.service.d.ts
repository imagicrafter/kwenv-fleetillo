/**
 * Geographic Clustering Service for Route Planning
 *
 * Implements home-based clustering to assign bookings to vehicle depots,
 * preventing cross-city route assignments.
 */
import type { Vehicle } from '../types/vehicle';
import type { Booking } from '../types/booking';
/**
 * Coordinates for a location
 */
export interface Coordinates {
    latitude: number;
    longitude: number;
}
/**
 * A depot (vehicle home location) with its coordinates
 */
export interface Depot {
    locationId: string;
    name: string;
    city: string;
    coordinates: Coordinates;
    vehicles: Vehicle[];
}
/**
 * A booking with its location coordinates
 */
export interface BookingWithCoordinates {
    booking: Booking;
    coordinates: Coordinates;
    locationName: string;
    locationCity: string;
}
/**
 * Result of assigning a booking to a depot
 */
export interface DepotAssignment {
    booking: Booking;
    depot: Depot;
    distanceMiles: number;
}
/**
 * Reason why a booking couldn't be assigned
 */
export type UnassignedReason = 'out_of_service_area' | 'no_vehicle_available' | 'capacity_exceeded' | 'no_coordinates' | 'no_matching_service';
/**
 * A booking that couldn't be assigned to any depot
 */
export interface UnassignedBooking {
    booking: Booking;
    reason: UnassignedReason;
    details?: string;
}
/**
 * Result of the clustering operation
 */
export interface ClusteringResult {
    /** Bookings grouped by depot location ID */
    depotClusters: Map<string, DepotAssignment[]>;
    /** Bookings that couldn't be assigned to any depot */
    unassigned: UnassignedBooking[];
    /** Summary statistics */
    stats: {
        totalBookings: number;
        assignedBookings: number;
        unassignedBookings: number;
        depotCount: number;
    };
}
/**
 * Configuration for clustering
 */
export interface ClusteringConfig {
    maxRadiusMiles: number;
    maxStopsPerVehicle: number;
}
/**
 * Calculate the Haversine distance between two coordinates in miles
 */
export declare function calculateDistanceMiles(coord1: Coordinates, coord2: Coordinates): number;
/**
 * Find the nearest depot to a given coordinate
 */
export declare function findNearestDepot(coordinates: Coordinates, depots: Depot[]): {
    depot: Depot;
    distance: number;
} | null;
/**
 * Check if a vehicle can service a booking based on service types
 */
export declare function canVehicleServiceBooking(vehicle: Vehicle, booking: Booking): boolean;
/**
 * Main clustering function: Assigns bookings to depots based on geographic proximity
 *
 * Algorithm:
 * 1. Build list of depots from vehicle home locations
 * 2. For each booking, find the nearest depot within the radius limit
 * 3. Check that at least one vehicle at the depot can service the booking
 * 4. Group bookings by depot
 * 5. Handle capacity overflow
 */
export declare function clusterBookingsByDepot(bookings: BookingWithCoordinates[], vehicles: Vehicle[], depotLocations: Map<string, {
    name: string;
    city: string;
    coordinates: Coordinates;
}>, clusterConfig: ClusteringConfig): ClusteringResult;
/**
 * Get the default clustering configuration from app config (sync - uses env var)
 */
export declare function getDefaultClusteringConfig(maxStopsPerVehicle: number): ClusteringConfig;
/**
 * Get clustering configuration from database settings (async)
 */
export declare function getClusteringConfigAsync(maxStopsPerVehicle: number): Promise<ClusteringConfig>;
/**
 * Check if clustering is enabled (sync version - checks env var only)
 * Use isClusteringEnabledAsync for full check including database setting
 */
export declare function isClusteringEnabled(): boolean;
/**
 * Check if clustering is enabled (async version - checks env var AND database setting)
 */
export declare function isClusteringEnabledAsync(): Promise<boolean>;
//# sourceMappingURL=clustering.service.d.ts.map