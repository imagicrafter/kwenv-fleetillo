/**
 * Driver-related type definitions for OptiRoute application
 */

import type { ID, Timestamps } from './index.js';

/**
 * Driver status options
 */
export type DriverStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';

/**
 * Driver entity representing a driver in the system
 */
export interface Driver extends Timestamps {
  id: ID;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  email?: string;
  telegramChatId?: string;

  // License information
  licenseNumber?: string;
  licenseExpiry?: Date;
  licenseClass?: string;

  // Employment status
  status: DriverStatus;
  hireDate?: Date;

  // Emergency contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;

  // Additional information
  notes?: string;
  profileImageUrl?: string;

  // Computed field - vehicle assignment (from vehicles table)
  assignedVehicleId?: ID;

  // Soft delete
  deletedAt?: Date;
}

/**
 * Database row representation (snake_case as stored in Supabase)
 */
export interface DriverRow {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  email: string | null;
  telegram_chat_id: string | null;
  license_number: string | null;
  license_expiry: string | null;
  license_class: string | null;
  status: DriverStatus;
  hire_date: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Input for creating a new driver
 */
export interface CreateDriverInput {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  email?: string;
  telegramChatId?: string;
  licenseNumber?: string;
  licenseExpiry?: Date;
  licenseClass?: string;
  status?: DriverStatus;
  hireDate?: Date;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  profileImageUrl?: string;
}

/**
 * Input for updating an existing driver
 */
export interface UpdateDriverInput extends Partial<CreateDriverInput> {
  id: ID;
}

/**
 * Driver filter options for queries
 */
export interface DriverFilters {
  status?: DriverStatus;
  searchTerm?: string;
  includeDeleted?: boolean;
}

/**
 * Converts a database row to a Driver entity
 */
export function rowToDriver(row: DriverRow): Driver {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phoneNumber: row.phone_number ?? undefined,
    email: row.email ?? undefined,
    telegramChatId: row.telegram_chat_id ?? undefined,
    licenseNumber: row.license_number ?? undefined,
    licenseExpiry: row.license_expiry ? new Date(row.license_expiry) : undefined,
    licenseClass: row.license_class ?? undefined,
    status: row.status,
    hireDate: row.hire_date ? new Date(row.hire_date) : undefined,
    emergencyContactName: row.emergency_contact_name ?? undefined,
    emergencyContactPhone: row.emergency_contact_phone ?? undefined,
    notes: row.notes ?? undefined,
    profileImageUrl: row.profile_image_url ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
  };
}

/**
 * Converts a CreateDriverInput to a database row format
 */
export function driverInputToRow(input: CreateDriverInput): Partial<DriverRow> {
  return {
    first_name: input.firstName,
    last_name: input.lastName,
    phone_number: input.phoneNumber ?? null,
    email: input.email ?? null,
    telegram_chat_id: input.telegramChatId ?? null,
    license_number: input.licenseNumber ?? null,
    license_expiry: input.licenseExpiry?.toISOString().split('T')[0] ?? null,
    license_class: input.licenseClass ?? null,
    status: input.status ?? 'active',
    hire_date: input.hireDate?.toISOString().split('T')[0] ?? null,
    emergency_contact_name: input.emergencyContactName ?? null,
    emergency_contact_phone: input.emergencyContactPhone ?? null,
    notes: input.notes ?? null,
    profile_image_url: input.profileImageUrl ?? null,
  };
}
