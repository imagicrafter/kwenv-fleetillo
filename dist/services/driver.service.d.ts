/**
 * Driver Service
 *
 * Provides CRUD operations and business logic for managing drivers
 * in the OptiRoute application.
 */
import type { Result, PaginationParams, PaginatedResponse } from '../types/index.js';
import type { Driver, CreateDriverInput, UpdateDriverInput, DriverFilters } from '../types/driver.js';
import type { Vehicle } from '../types/vehicle.js';
/**
 * Driver service error
 */
export declare class DriverServiceError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, code: string, details?: unknown);
}
/**
 * Error codes for driver service errors
 */
export declare const DriverErrorCodes: {
    readonly NOT_FOUND: "DRIVER_NOT_FOUND";
    readonly CREATE_FAILED: "DRIVER_CREATE_FAILED";
    readonly UPDATE_FAILED: "DRIVER_UPDATE_FAILED";
    readonly DELETE_FAILED: "DRIVER_DELETE_FAILED";
    readonly QUERY_FAILED: "DRIVER_QUERY_FAILED";
    readonly VALIDATION_FAILED: "DRIVER_VALIDATION_FAILED";
};
/**
 * Creates a new driver
 */
export declare function createDriver(input: CreateDriverInput): Promise<Result<Driver>>;
/**
 * Gets a driver by ID
 */
export declare function getDriverById(id: string): Promise<Result<Driver>>;
/**
 * Gets all drivers with optional filtering and pagination
 * Includes LEFT JOIN with vehicles to get assigned vehicle info
 */
export declare function getDrivers(filters?: DriverFilters, pagination?: PaginationParams): Promise<Result<PaginatedResponse<Driver>>>;
/**
 * Updates an existing driver
 */
export declare function updateDriver(id: string, input: UpdateDriverInput): Promise<Result<Driver>>;
/**
 * Soft deletes a driver by setting deleted_at timestamp
 */
export declare function deleteDriver(id: string): Promise<Result<void>>;
/**
 * Counts drivers matching the given filters
 */
export declare function countDrivers(filters?: DriverFilters): Promise<Result<number>>;
/**
 * Gets a driver with their assigned vehicle information
 */
export declare function getDriverWithVehicle(id: string): Promise<Result<Driver & {
    assignedVehicle?: Vehicle;
}>>;
/**
 * Assigns a driver to a vehicle
 */
export declare function assignDriverToVehicle(driverId: string, vehicleId: string): Promise<Result<void>>;
/**
 * Unassigns a driver from a vehicle
 */
export declare function unassignDriverFromVehicle(vehicleId: string): Promise<Result<void>>;
/**
 * Gets all vehicles assigned to a driver
 */
export declare function getDriverVehicles(driverId: string): Promise<Result<Vehicle[]>>;
/**
 * Uploads an avatar image for a driver
 * Stores the image in Supabase storage and updates the driver's profile_image_url
 */
export declare function uploadDriverAvatar(driverId: string, fileBuffer: Buffer, mimeType: string, originalName: string): Promise<Result<string>>;
/**
 * Gets the avatar URL for a driver
 * Returns the public URL if profile_image_url exists, otherwise null
 */
export declare function getDriverAvatarUrl(driverId: string): Promise<Result<string | null>>;
/**
 * Deletes a driver's avatar image
 * Removes the file from Supabase storage and clears the profile_image_url field
 */
export declare function deleteDriverAvatar(driverId: string): Promise<Result<void>>;
//# sourceMappingURL=driver.service.d.ts.map