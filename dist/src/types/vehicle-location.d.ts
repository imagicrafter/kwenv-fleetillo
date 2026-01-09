/**
 * Vehicle Location types - junction table for vehicle-location relationships
 */
import type { ID } from './index.js';
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
export declare function rowToVehicleLocation(row: VehicleLocationRow): VehicleLocation;
//# sourceMappingURL=vehicle-location.d.ts.map