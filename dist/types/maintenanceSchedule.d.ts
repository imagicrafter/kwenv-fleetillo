/**
 * Maintenance Schedule-related type definitions for RouteIQ application
 */
import type { ID, Timestamps } from './common';
/**
 * Maintenance schedule status options
 */
export type MaintenanceScheduleStatus = 'scheduled' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
/**
 * Common maintenance types
 */
export type MaintenanceType = 'oil_change' | 'tire_rotation' | 'brake_inspection' | 'brake_service' | 'transmission_service' | 'coolant_flush' | 'air_filter_replacement' | 'battery_replacement' | 'tune_up' | 'inspection' | 'engine_repair' | 'bodywork' | 'other';
/**
 * Maintenance Schedule entity representing a maintenance schedule/record in the system
 */
export interface MaintenanceSchedule extends Timestamps {
    id: ID;
    vehicleId: ID;
    maintenanceType: string;
    description?: string;
    scheduledDate: Date;
    dueDate?: Date;
    completedDate?: Date;
    status: MaintenanceScheduleStatus;
    odometerAtMaintenance?: number;
    nextMaintenanceOdometer?: number;
    cost?: number;
    currency?: string;
    performedBy?: string;
    serviceProvider?: string;
    notes?: string;
    attachments?: string[];
    deletedAt?: Date;
}
/**
 * Database row representation (snake_case as stored in Supabase)
 */
export interface MaintenanceScheduleRow {
    id: string;
    vehicle_id: string;
    maintenance_type: string;
    description: string | null;
    scheduled_date: string;
    due_date: string | null;
    completed_date: string | null;
    status: MaintenanceScheduleStatus;
    odometer_at_maintenance: number | null;
    next_maintenance_odometer: number | null;
    cost: number | null;
    currency: string | null;
    performed_by: string | null;
    service_provider: string | null;
    notes: string | null;
    attachments: string[] | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}
/**
 * Input for creating a new maintenance schedule
 */
export interface CreateMaintenanceScheduleInput {
    vehicleId: ID;
    maintenanceType: string;
    description?: string;
    scheduledDate: Date;
    dueDate?: Date;
    completedDate?: Date;
    status?: MaintenanceScheduleStatus;
    odometerAtMaintenance?: number;
    nextMaintenanceOdometer?: number;
    cost?: number;
    currency?: string;
    performedBy?: string;
    serviceProvider?: string;
    notes?: string;
    attachments?: string[];
}
/**
 * Input for updating an existing maintenance schedule
 */
export interface UpdateMaintenanceScheduleInput extends Partial<CreateMaintenanceScheduleInput> {
    id: ID;
}
/**
 * Maintenance schedule filter options for queries
 */
export interface MaintenanceScheduleFilters {
    vehicleId?: ID;
    status?: MaintenanceScheduleStatus;
    maintenanceType?: string;
    scheduledDateFrom?: Date;
    scheduledDateTo?: Date;
    dueDateFrom?: Date;
    dueDateTo?: Date;
    completedDateFrom?: Date;
    completedDateTo?: Date;
    serviceProvider?: string;
    includeDeleted?: boolean;
}
/**
 * Converts a database row to a MaintenanceSchedule entity
 */
export declare function rowToMaintenanceSchedule(row: MaintenanceScheduleRow): MaintenanceSchedule;
/**
 * Converts a CreateMaintenanceScheduleInput to a database row format
 *
 * Important: Only includes fields that are explicitly defined in the input.
 * This prevents undefined fields from overwriting existing values during updates.
 */
export declare function maintenanceScheduleInputToRow(input: CreateMaintenanceScheduleInput): Partial<MaintenanceScheduleRow>;
/**
 * Helper function to determine if a maintenance schedule is overdue
 */
export declare function isMaintenanceOverdue(schedule: MaintenanceSchedule): boolean;
/**
 * Helper function to calculate days until/overdue
 */
export declare function getDaysUntilDue(schedule: MaintenanceSchedule): number;
//# sourceMappingURL=maintenanceSchedule.d.ts.map