/**
 * Maintenance Schedule-related type definitions for RouteIQ application
 */

import type { ID, Timestamps } from './index';

/**
 * Maintenance schedule status options
 */
export type MaintenanceScheduleStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'cancelled';

/**
 * Common maintenance types
 */
export type MaintenanceType =
  | 'oil_change'
  | 'tire_rotation'
  | 'brake_inspection'
  | 'brake_service'
  | 'transmission_service'
  | 'coolant_flush'
  | 'air_filter_replacement'
  | 'battery_replacement'
  | 'tune_up'
  | 'inspection'
  | 'engine_repair'
  | 'bodywork'
  | 'other';

/**
 * Maintenance Schedule entity representing a maintenance schedule/record in the system
 */
export interface MaintenanceSchedule extends Timestamps {
  id: ID;

  // Foreign key
  vehicleId: ID;

  // Maintenance information
  maintenanceType: string;
  description?: string;

  // Scheduling information
  scheduledDate: Date;
  dueDate?: Date;
  completedDate?: Date;

  // Status
  status: MaintenanceScheduleStatus;

  // Odometer tracking
  odometerAtMaintenance?: number;
  nextMaintenanceOdometer?: number;

  // Cost tracking
  cost?: number;
  currency?: string;

  // Service provider
  performedBy?: string;
  serviceProvider?: string;

  // Additional information
  notes?: string;
  attachments?: string[];

  // Soft delete
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
export function rowToMaintenanceSchedule(row: MaintenanceScheduleRow): MaintenanceSchedule {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    maintenanceType: row.maintenance_type,
    description: row.description ?? undefined,
    scheduledDate: new Date(row.scheduled_date),
    dueDate: row.due_date ? new Date(row.due_date) : undefined,
    completedDate: row.completed_date ? new Date(row.completed_date) : undefined,
    status: row.status,
    odometerAtMaintenance: row.odometer_at_maintenance ?? undefined,
    nextMaintenanceOdometer: row.next_maintenance_odometer ?? undefined,
    cost: row.cost ?? undefined,
    currency: row.currency ?? undefined,
    performedBy: row.performed_by ?? undefined,
    serviceProvider: row.service_provider ?? undefined,
    notes: row.notes ?? undefined,
    attachments: row.attachments ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
  };
}

/**
 * Converts a CreateMaintenanceScheduleInput to a database row format
 *
 * Important: Only includes fields that are explicitly defined in the input.
 * This prevents undefined fields from overwriting existing values during updates.
 */
export function maintenanceScheduleInputToRow(
  input: CreateMaintenanceScheduleInput
): Partial<MaintenanceScheduleRow> {
  const row: Partial<MaintenanceScheduleRow> = {};

  // Required fields
  if (input.vehicleId !== undefined) row.vehicle_id = input.vehicleId;
  if (input.maintenanceType !== undefined) row.maintenance_type = input.maintenanceType;
  if (input.scheduledDate !== undefined) row.scheduled_date = input.scheduledDate.toISOString().split('T')[0];

  // Optional fields
  if (input.description !== undefined) row.description = input.description ?? null;
  if (input.dueDate !== undefined) row.due_date = input.dueDate?.toISOString().split('T')[0] ?? null;
  if (input.completedDate !== undefined) row.completed_date = input.completedDate?.toISOString().split('T')[0] ?? null;
  if (input.status !== undefined) row.status = input.status;

  // Odometer tracking
  if (input.odometerAtMaintenance !== undefined) row.odometer_at_maintenance = input.odometerAtMaintenance ?? null;
  if (input.nextMaintenanceOdometer !== undefined) row.next_maintenance_odometer = input.nextMaintenanceOdometer ?? null;

  // Cost
  if (input.cost !== undefined) row.cost = input.cost ?? null;
  if (input.currency !== undefined) row.currency = input.currency;

  // Service details
  if (input.performedBy !== undefined) row.performed_by = input.performedBy ?? null;
  if (input.serviceProvider !== undefined) row.service_provider = input.serviceProvider ?? null;

  // Metadata
  if (input.notes !== undefined) row.notes = input.notes ?? null;
  if (input.attachments !== undefined) row.attachments = input.attachments ?? null;

  return row;
}

/**
 * Helper function to determine if a maintenance schedule is overdue
 */
export function isMaintenanceOverdue(schedule: MaintenanceSchedule): boolean {
  if (schedule.status === 'completed' || schedule.status === 'cancelled') {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = schedule.dueDate ?? schedule.scheduledDate;
  const dueDateOnly = new Date(dueDate);
  dueDateOnly.setHours(0, 0, 0, 0);

  return dueDateOnly < today;
}

/**
 * Helper function to calculate days until/overdue
 */
export function getDaysUntilDue(schedule: MaintenanceSchedule): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = schedule.dueDate ?? schedule.scheduledDate;
  const dueDateOnly = new Date(dueDate);
  dueDateOnly.setHours(0, 0, 0, 0);

  const diffTime = dueDateOnly.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
