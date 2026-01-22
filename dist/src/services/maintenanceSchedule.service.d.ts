/**
 * Maintenance Schedule Service
 *
 * Provides CRUD operations and business logic for managing maintenance schedules
 * in the RouteIQ application.
 */
import type { Result, PaginationParams, PaginatedResponse } from '../types/index';
import type { MaintenanceSchedule, CreateMaintenanceScheduleInput, UpdateMaintenanceScheduleInput, MaintenanceScheduleFilters } from '../types/maintenanceSchedule';
/**
 * Maintenance schedule service error
 */
export declare class MaintenanceScheduleServiceError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, code: string, details?: unknown);
}
/**
 * Error codes for maintenance schedule service errors
 */
export declare const MaintenanceScheduleErrorCodes: {
    readonly NOT_FOUND: "MAINTENANCE_SCHEDULE_NOT_FOUND";
    readonly CREATE_FAILED: "MAINTENANCE_SCHEDULE_CREATE_FAILED";
    readonly UPDATE_FAILED: "MAINTENANCE_SCHEDULE_UPDATE_FAILED";
    readonly DELETE_FAILED: "MAINTENANCE_SCHEDULE_DELETE_FAILED";
    readonly QUERY_FAILED: "MAINTENANCE_SCHEDULE_QUERY_FAILED";
    readonly VALIDATION_FAILED: "MAINTENANCE_SCHEDULE_VALIDATION_FAILED";
};
/**
 * Creates a new maintenance schedule
 */
export declare function createMaintenanceSchedule(input: CreateMaintenanceScheduleInput): Promise<Result<MaintenanceSchedule>>;
/**
 * Gets a maintenance schedule by ID
 */
export declare function getMaintenanceScheduleById(id: string): Promise<Result<MaintenanceSchedule>>;
/**
 * Gets all maintenance schedules with optional filtering and pagination
 */
export declare function getMaintenanceSchedules(filters?: MaintenanceScheduleFilters, pagination?: PaginationParams): Promise<Result<PaginatedResponse<MaintenanceSchedule>>>;
/**
 * Updates an existing maintenance schedule
 */
export declare function updateMaintenanceSchedule(input: UpdateMaintenanceScheduleInput): Promise<Result<MaintenanceSchedule>>;
/**
 * Soft deletes a maintenance schedule by setting deleted_at timestamp
 */
export declare function deleteMaintenanceSchedule(id: string): Promise<Result<void>>;
/**
 * Permanently deletes a maintenance schedule (hard delete)
 * Use with caution - this cannot be undone
 */
export declare function hardDeleteMaintenanceSchedule(id: string): Promise<Result<void>>;
/**
 * Restores a soft-deleted maintenance schedule
 */
export declare function restoreMaintenanceSchedule(id: string): Promise<Result<MaintenanceSchedule>>;
/**
 * Gets maintenance schedules for a specific vehicle
 */
export declare function getMaintenanceSchedulesByVehicle(vehicleId: string, filters?: Omit<MaintenanceScheduleFilters, 'vehicleId'>): Promise<Result<MaintenanceSchedule[]>>;
/**
 * Gets overdue maintenance schedules
 */
export declare function getOverdueMaintenanceSchedules(): Promise<Result<MaintenanceSchedule[]>>;
/**
 * Marks a maintenance schedule as completed
 */
export declare function completeMaintenanceSchedule(id: string, completedDate?: Date, odometerReading?: number, cost?: number, notes?: string): Promise<Result<MaintenanceSchedule>>;
/**
 * Gets upcoming maintenance schedules (within next N days)
 */
export declare function getUpcomingMaintenanceSchedules(daysAhead?: number): Promise<Result<MaintenanceSchedule[]>>;
//# sourceMappingURL=maintenanceSchedule.service.d.ts.map