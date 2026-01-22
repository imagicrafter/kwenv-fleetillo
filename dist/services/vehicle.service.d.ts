/**
 * Vehicle Service
 *
 * Provides CRUD operations and business logic for managing vehicles
 * in the RouteIQ application.
 */
import type { Result, PaginationParams, PaginatedResponse } from '../types/index';
import type { Vehicle, VehicleFilters, CreateVehicleInput, UpdateVehicleInput } from '../types/index';
/**
 * Vehicle service error
 */
export declare class VehicleServiceError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, code: string, details?: unknown);
}
/**
 * Error codes for vehicle service errors
 */
export declare const VehicleErrorCodes: {
    readonly NOT_FOUND: "VEHICLE_NOT_FOUND";
    readonly CREATE_FAILED: "VEHICLE_CREATE_FAILED";
    readonly UPDATE_FAILED: "VEHICLE_UPDATE_FAILED";
    readonly DELETE_FAILED: "VEHICLE_DELETE_FAILED";
    readonly QUERY_FAILED: "VEHICLE_QUERY_FAILED";
    readonly VALIDATION_FAILED: "VEHICLE_VALIDATION_FAILED";
};
/**
 * Creates a new vehicle
 */
export declare function createVehicle(input: CreateVehicleInput): Promise<Result<Vehicle>>;
/**
 * Gets a vehicle by ID
 */
export declare function getVehicleById(id: string): Promise<Result<Vehicle>>;
/**
 * Gets all vehicles with optional filtering and pagination
 */
export declare function getVehicles(filters?: VehicleFilters, pagination?: PaginationParams): Promise<Result<PaginatedResponse<Vehicle>>>;
/**
 * Updates an existing vehicle
 */
export declare function updateVehicle(input: UpdateVehicleInput): Promise<Result<Vehicle>>;
/**
 * Soft deletes a vehicle by setting deleted_at timestamp
 */
export declare function deleteVehicle(id: string): Promise<Result<void>>;
/**
 * Permanently deletes a vehicle (hard delete)
 * Use with caution - this cannot be undone
 */
export declare function hardDeleteVehicle(id: string): Promise<Result<void>>;
/**
 * Restores a soft-deleted vehicle
 */
export declare function restoreVehicle(id: string): Promise<Result<Vehicle>>;
/**
 * Gets vehicles with optional filters and pagination
 */
/**
 * Counts vehicles with optional filters
 */
export declare function countVehicles(filters?: VehicleFilters): Promise<Result<number>>;
/**
 * Gets vehicles by service type capability
 */
export declare function getVehiclesByServiceType(serviceType: string, filters?: Omit<VehicleFilters, 'serviceTypes'>): Promise<Result<Vehicle[]>>;
/**
 * Updates vehicle location
 */
export declare function updateVehicleLocation(id: string, latitude: number, longitude: number): Promise<Result<Vehicle>>;
/**
 * Updates vehicle status
 */
export declare function updateVehicleStatus(id: string, status: Vehicle['status']): Promise<Result<Vehicle>>;
//# sourceMappingURL=vehicle.service.d.ts.map