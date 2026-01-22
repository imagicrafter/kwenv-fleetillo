/**
 * Service Service
 *
 * Provides CRUD operations and business logic for managing services
 * in the RouteIQ application.
 */
import type { Service, ServiceFilters, CreateServiceInput, UpdateServiceInput, Result, PaginationParams, PaginatedResponse } from '../types/index';
/**
 * Service service error
 */
export declare class ServiceServiceError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, code: string, details?: unknown);
}
/**
 * Error codes for service service errors
 */
export declare const ServiceErrorCodes: {
    readonly NOT_FOUND: "SERVICE_NOT_FOUND";
    readonly CREATE_FAILED: "SERVICE_CREATE_FAILED";
    readonly UPDATE_FAILED: "SERVICE_UPDATE_FAILED";
    readonly DELETE_FAILED: "SERVICE_DELETE_FAILED";
    readonly QUERY_FAILED: "SERVICE_QUERY_FAILED";
    readonly VALIDATION_FAILED: "SERVICE_VALIDATION_FAILED";
    readonly DUPLICATE_CODE: "SERVICE_DUPLICATE_CODE";
};
/**
 * Creates a new service
 */
export declare function createService(input: CreateServiceInput): Promise<Result<Service>>;
/**
 * Gets a service by ID
 */
export declare function getServiceById(id: string): Promise<Result<Service>>;
/**
 * Gets a service by code
 */
export declare function getServiceByCode(code: string): Promise<Result<Service>>;
/**
 * Gets all services with optional filtering and pagination
 */
/**
 * Gets services by type
 */
export declare function getServicesByType(serviceType: string, pagination?: PaginationParams): Promise<Result<PaginatedResponse<Service>>>;
/**
 * Updates an existing service
 */
export declare function updateService(input: UpdateServiceInput): Promise<Result<Service>>;
/**
 * Soft deletes a service by setting deleted_at timestamp
 */
export declare function deleteService(id: string): Promise<Result<void>>;
/**
 * Permanently deletes a service (hard delete)
 * Use with caution - this cannot be undone
 */
export declare function hardDeleteService(id: string): Promise<Result<void>>;
/**
 * Restores a soft-deleted service
 */
export declare function restoreService(id: string): Promise<Result<Service>>;
/**
 * Counts services with optional filters
 */
export declare function getServices(filters?: ServiceFilters, pagination?: PaginationParams): Promise<Result<PaginatedResponse<Service>>>;
/**
 * Counts services with optional filters
 */
export declare function countServices(filters?: ServiceFilters): Promise<Result<number>>;
//# sourceMappingURL=service.service.d.ts.map