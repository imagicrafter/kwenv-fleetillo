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
  serviceType: ServiceType | string;  // Allow custom service types

  // Service details
  description?: string;

  // Duration information (in minutes)
  averageDurationMinutes: number;
  minimumDurationMinutes?: number;
  maximumDurationMinutes?: number;

  // Pricing
  basePrice?: number;
  materialsCost?: number;  // Average cost of materials/supplies consumed per service
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
    materialsCost: row.materials_cost ?? undefined,
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
 *
 * Important: Only includes fields that are explicitly defined in the input.
 * This prevents undefined fields from overwriting existing values during updates.
 */
export function serviceInputToRow(input: CreateServiceInput): Partial<ServiceRow> {
  const row: Partial<ServiceRow> = {};

  // Required fields
  if (input.name !== undefined) row.name = input.name;
  if (input.serviceType !== undefined) row.service_type = input.serviceType;
  if (input.averageDurationMinutes !== undefined) row.average_duration_minutes = input.averageDurationMinutes;

  // Optional identification
  if (input.code !== undefined) row.code = input.code ?? null;
  if (input.description !== undefined) row.description = input.description ?? null;

  // Duration constraints
  if (input.minimumDurationMinutes !== undefined) row.minimum_duration_minutes = input.minimumDurationMinutes ?? null;
  if (input.maximumDurationMinutes !== undefined) row.maximum_duration_minutes = input.maximumDurationMinutes ?? null;

  // Pricing
  if (input.basePrice !== undefined) row.base_price = input.basePrice ?? null;
  if (input.materialsCost !== undefined) row.materials_cost = input.materialsCost ?? null;
  if (input.priceCurrency !== undefined) row.price_currency = input.priceCurrency ?? null;

  // Scheduling
  if (input.requiresAppointment !== undefined) row.requires_appointment = input.requiresAppointment;
  if (input.maxPerDay !== undefined) row.max_per_day = input.maxPerDay ?? null;

  // Requirements
  if (input.equipmentRequired !== undefined) row.equipment_required = input.equipmentRequired ?? null;
  if (input.skillsRequired !== undefined) row.skills_required = input.skillsRequired ?? null;

  // Status and metadata
  if (input.status !== undefined) row.status = input.status;
  if (input.notes !== undefined) row.notes = input.notes ?? null;
  if (input.tags !== undefined) row.tags = input.tags ?? null;

  return row;
}
