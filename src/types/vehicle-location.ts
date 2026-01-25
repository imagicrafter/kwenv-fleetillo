/**
 * Vehicle Location types - junction table for vehicle-location relationships
 */

import type { ID } from './common';

/**
 * Vehicle Location entity - links a vehicle to a location
 */
export interface VehicleLocation {
    id: ID;
    vehicleId: ID;
    locationId: ID;
    isPrimary: boolean;
    createdAt: Date;
}

/**
 * Database row representation
 */
export interface VehicleLocationRow {
    id: string;
    vehicle_id: string;
    location_id: string;
    is_primary: boolean;
    created_at: string;
}

/**
 * Input for setting vehicle locations
 */
export interface SetVehicleLocationInput {
    locationId: ID;
    isPrimary?: boolean;
}

/**
 * Converts a database row to a VehicleLocation entity
 */
export function rowToVehicleLocation(row: VehicleLocationRow): VehicleLocation {
    return {
        id: row.id,
        vehicleId: row.vehicle_id,
        locationId: row.location_id,
        isPrimary: row.is_primary,
        createdAt: new Date(row.created_at),
    };
}
