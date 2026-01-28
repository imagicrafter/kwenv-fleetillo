/**
 * Driver-related type definitions for Fleetillo application
 */

import type { ID, Timestamps } from './common';

/**
 * Driver status options
 */
export type DriverStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';

export type DispatchChannel = 'telegram' | 'email';


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

  // Dispatch Preferences
  preferredChannel?: DispatchChannel;
  fallbackEnabled?: boolean;


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
  tags: string[];

  // Custom fields (user-defined metadata)
  customFields?: Record<string, unknown>;

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
  preferred_channel: string | null;
  fallback_enabled: boolean | null;

  license_number: string | null;
  license_expiry: string | null;
  license_class: string | null;
  status: DriverStatus;
  hire_date: string | null;
  assigned_vehicle_id: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  profile_image_url: string | null;
  tags: string[] | null;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Input for creating a new driver
 * Note: Date fields accept both Date objects and ISO date strings for flexibility
 */
export interface CreateDriverInput {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  email?: string;
  telegramChatId?: string;
  preferredChannel?: DispatchChannel;
  fallbackEnabled?: boolean;

  licenseNumber?: string;
  licenseExpiry?: Date | string;
  licenseClass?: string;
  status?: DriverStatus;
  hireDate?: Date | string;
  assignedVehicleId?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  profileImageUrl?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
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
    preferredChannel: (row.preferred_channel as DispatchChannel) ?? 'telegram',
    fallbackEnabled: row.fallback_enabled ?? true,

    licenseNumber: row.license_number ?? undefined,
    licenseExpiry: row.license_expiry ? new Date(row.license_expiry) : undefined,
    licenseClass: row.license_class ?? undefined,
    status: row.status,
    hireDate: row.hire_date ? new Date(row.hire_date) : undefined,
    emergencyContactName: row.emergency_contact_name ?? undefined,
    emergencyContactPhone: row.emergency_contact_phone ?? undefined,
    notes: row.notes ?? undefined,
    profileImageUrl: row.profile_image_url ?? undefined,
    tags: row.tags ?? [],
    customFields: row.custom_fields ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
  };
}

/**
 * Helper to convert a date input (Date object or string) to YYYY-MM-DD format
 */
function formatDateForDb(date: Date | string | undefined | null): string | null {
  if (!date) return null;
  if (date instanceof Date) {
    return date.toISOString().split('T')[0] ?? null;
  }
  // If it's already a string, validate it looks like a date and return as-is
  if (typeof date === 'string' && date.trim().length > 0) {
    // Return the date portion (handles both YYYY-MM-DD and ISO strings)
    return date.split('T')[0] ?? null;
  }
  return null;
}

/**
 * Converts a CreateDriverInput to a database row format
 * Note: assigned_vehicle_id is NOT included here - vehicle assignments are managed
 * via the vehicles table's assigned_driver_id column using assignDriverToVehicle()
 *
 * Important: Only includes fields that are explicitly defined in the input.
 * This prevents undefined fields from overwriting existing values during updates.
 * For example, telegram_chat_id should only be updated by the Telegram registration flow,
 * not cleared when updating other driver fields.
 */
export function driverInputToRow(input: CreateDriverInput): Partial<DriverRow> {
  const row: Partial<DriverRow> = {};

  // Required fields - always include
  if (input.firstName !== undefined) row.first_name = input.firstName;
  if (input.lastName !== undefined) row.last_name = input.lastName;

  // Optional fields - only include if explicitly provided
  if (input.phoneNumber !== undefined) row.phone_number = input.phoneNumber ?? null;
  if (input.email !== undefined) row.email = input.email ?? null;

  // Telegram chat ID - only update if explicitly provided (managed by Telegram registration)
  if (input.telegramChatId !== undefined) row.telegram_chat_id = input.telegramChatId ?? null;

  // Dispatch preferences
  if (input.preferredChannel !== undefined) row.preferred_channel = input.preferredChannel;
  if (input.fallbackEnabled !== undefined) row.fallback_enabled = input.fallbackEnabled;

  // License info
  if (input.licenseNumber !== undefined) row.license_number = input.licenseNumber ?? null;
  if (input.licenseExpiry !== undefined) row.license_expiry = formatDateForDb(input.licenseExpiry);
  if (input.licenseClass !== undefined) row.license_class = input.licenseClass ?? null;

  // Employment info
  if (input.status !== undefined) row.status = input.status;
  if (input.hireDate !== undefined) row.hire_date = formatDateForDb(input.hireDate);

  // Emergency contact
  if (input.emergencyContactName !== undefined) row.emergency_contact_name = input.emergencyContactName ?? null;
  if (input.emergencyContactPhone !== undefined) row.emergency_contact_phone = input.emergencyContactPhone ?? null;

  // Other
  if (input.notes !== undefined) row.notes = input.notes ?? null;
  if (input.profileImageUrl !== undefined) row.profile_image_url = input.profileImageUrl ?? null;
  if (input.tags !== undefined) row.tags = input.tags ?? [];
  if (input.customFields !== undefined) row.custom_fields = input.customFields ?? null;

  return row;
}
