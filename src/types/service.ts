/**
 * Service-related type definitions for RouteIQ application
 */

import type { ID, Timestamps } from './index.js';

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
  serviceType: ServiceType | string;  // Allow custom service types

  // Service details
  description?: string;

  // Duration information (in minutes)
  averageDurationMinutes: number;
  minimumDurationMinutes?: number;
  maximumDurationMinutes?: number;

  // Pricing
  basePrice?: number;
  priceCurrency?: string;

  // Scheduling constraints
  requiresAppointment: boolean;
  maxPerDay?: number;

  // Service requirements
  equipmentRequired?: string[];
  skillsRequired?: string[];

  // Status and metadata
  status: ServiceStatus;
  notes?: string;
  tags?: string[];

  // Soft delete
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
export function rowToService(row: ServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    code: row.code ?? undefined,
    serviceType: row.service_type,
    description: row.description ?? undefined,
    averageDurationMinutes: row.average_duration_minutes,
    minimumDurationMinutes: row.minimum_duration_minutes ?? undefined,
    maximumDurationMinutes: row.maximum_duration_minutes ?? undefined,
    basePrice: row.base_price ?? undefined,
    priceCurrency: row.price_currency ?? undefined,
    requiresAppointment: row.requires_appointment,
    maxPerDay: row.max_per_day ?? undefined,
    equipmentRequired: row.equipment_required ?? undefined,
    skillsRequired: row.skills_required ?? undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    tags: row.tags ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
  };
}

/**
 * Converts a CreateServiceInput to a database row format
 */
export function serviceInputToRow(input: CreateServiceInput): Partial<ServiceRow> {
  return {
    name: input.name,
    code: input.code ?? null,
    service_type: input.serviceType,
    description: input.description ?? null,
    average_duration_minutes: input.averageDurationMinutes,
    minimum_duration_minutes: input.minimumDurationMinutes ?? null,
    maximum_duration_minutes: input.maximumDurationMinutes ?? null,
    base_price: input.basePrice ?? null,
    price_currency: input.priceCurrency ?? null,
    requires_appointment: input.requiresAppointment ?? true,
    max_per_day: input.maxPerDay ?? null,
    equipment_required: input.equipmentRequired ?? null,
    skills_required: input.skillsRequired ?? null,
    status: input.status ?? 'active',
    notes: input.notes ?? null,
    tags: input.tags ?? null,
  };
}
