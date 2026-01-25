/**
 * Service-related type definitions for RouteIQ application
 */
import type { ID, Timestamps } from './common';
/**
 * Service status options
 */
export type ServiceStatus = 'active' | 'inactive' | 'discontinued';
/**
 * Service type categories
 */
export type ServiceType = 'maintenance' | 'repair' | 'inspection' | 'installation' | 'consultation' | 'other';
/**
 * Service entity representing a service type in the system
 */
export interface Service extends Timestamps {
    id: ID;
    name: string;
    code?: string;
    serviceType: ServiceType | string;
    description?: string;
    averageDurationMinutes: number;
    minimumDurationMinutes?: number;
    maximumDurationMinutes?: number;
    basePrice?: number;
    materialsCost?: number;
    priceCurrency?: string;
    requiresAppointment: boolean;
    maxPerDay?: number;
    equipmentRequired?: string[];
    skillsRequired?: string[];
    status: ServiceStatus;
    notes?: string;
    tags?: string[];
    deletedAt?: Date;
}
/**
 * Database row representation (snake_case as stored in Supabase)
 */
export interface ServiceRow {
    id: string;
    name: string;
    code: string | null;
    service_type: string;
    description: string | null;
    average_duration_minutes: number;
    minimum_duration_minutes: number | null;
    maximum_duration_minutes: number | null;
    base_price: number | null;
    materials_cost: number | null;
    price_currency: string | null;
    requires_appointment: boolean;
    max_per_day: number | null;
    equipment_required: string[] | null;
    skills_required: string[] | null;
    status: ServiceStatus;
    notes: string | null;
    tags: string[] | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}
/**
 * Input for creating a new service
 */
export interface CreateServiceInput {
    name: string;
    code?: string;
    serviceType: ServiceType | string;
    description?: string;
    averageDurationMinutes: number;
    minimumDurationMinutes?: number;
    maximumDurationMinutes?: number;
    basePrice?: number;
    materialsCost?: number;
    priceCurrency?: string;
    requiresAppointment?: boolean;
    maxPerDay?: number;
    equipmentRequired?: string[];
    skillsRequired?: string[];
    status?: ServiceStatus;
    notes?: string;
    tags?: string[];
}
/**
 * Input for updating an existing service
 */
export interface UpdateServiceInput extends Partial<CreateServiceInput> {
    id: ID;
}
/**
 * Service filter options for queries
 */
export interface ServiceFilters {
    status?: ServiceStatus;
    serviceType?: ServiceType | string;
    requiresAppointment?: boolean;
    tags?: string[];
    searchTerm?: string;
    includeDeleted?: boolean;
    minDuration?: number;
    maxDuration?: number;
}
/**
 * Converts a database row to a Service entity
 */
export declare function rowToService(row: ServiceRow): Service;
/**
 * Converts a CreateServiceInput to a database row format
 *
 * Important: Only includes fields that are explicitly defined in the input.
 * This prevents undefined fields from overwriting existing values during updates.
 */
export declare function serviceInputToRow(input: CreateServiceInput): Partial<ServiceRow>;
//# sourceMappingURL=service.d.ts.map