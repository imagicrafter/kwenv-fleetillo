/**
 * Vehicle Location Service
 * Manages the many-to-many relationship between vehicles and locations
 */
import type { Result } from '../types/index.js';
import type { VehicleLocation, SetVehicleLocationInput } from '../types/vehicle-location.js';
/**
 * Get all locations associated with a vehicle
 */
export declare function getVehicleLocations(vehicleId: string): Promise<Result<VehicleLocation[]>>;
/**
 * Get the primary location for a vehicle
 */
export declare function getVehiclePrimaryLocation(vehicleId: string): Promise<Result<VehicleLocation | null>>;
/**
 * Set locations for a vehicle (replaces all existing associations)
 */
export declare function setVehicleLocations(vehicleId: string, locations: SetVehicleLocationInput[]): Promise<Result<VehicleLocation[]>>;
/**
 * Add a single location to a vehicle
 */
export declare function addVehicleLocation(vehicleId: string, locationId: string, isPrimary?: boolean): Promise<Result<VehicleLocation>>;
/**
 * Remove a location from a vehicle
 */
export declare function removeVehicleLocation(vehicleId: string, locationId: string): Promise<Result<void>>;
/**
 * Set primary location for a vehicle
 */
export declare function setVehiclePrimaryLocation(vehicleId: string, locationId: string): Promise<Result<void>>;
//# sourceMappingURL=vehicle-location.service.d.ts.map