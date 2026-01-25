/**
 * Customer-related type definitions for Fleetillo application
 */

import type { ID, Timestamps } from './index';

/**
 * Customer status options
 */
export type CustomerStatus = 'active' | 'inactive' | 'suspended' | 'archived';

/**
 * Address information
 */
export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Geolocation coordinates
 */
export interface GeoLocation {
  latitude: number;
  longitude: number;
}

/**
 * Contact information
 */
export interface ContactInfo {
  email?: string;
  phone?: string;
  mobilePhone?: string;
}

/**
 * Customer entity representing a customer in the system
 */
export interface Customer extends Timestamps {
  id: ID;
  name: string;
  companyName?: string;

  // Contact information
  email?: string;
  phone?: string;
  mobilePhone?: string;

  // Primary address (billing/main)
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;

  // Service address
  serviceAddressLine1?: string;
  serviceAddressLine2?: string;
  serviceCity?: string;
  serviceState?: string;
  servicePostalCode?: string;
  serviceCountry?: string;

  // Geolocation
  latitude?: number;
  longitude?: number;

  // Status and metadata
  status: CustomerStatus;
  notes?: string;
  tags?: string[];

  // Soft delete
  deletedAt?: Date;
}

/**
 * Database row representation (snake_case as stored in Supabase)
 */
export interface CustomerRow {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  service_address_line1: string | null;
  service_address_line2: string | null;
  service_city: string | null;
  service_state: string | null;
  service_postal_code: string | null;
  service_country: string | null;
  latitude: number | null;
  longitude: number | null;
  status: CustomerStatus;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Input for creating a new customer
 */
export interface CreateCustomerInput {
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  serviceAddressLine1?: string;
  serviceAddressLine2?: string;
  serviceCity?: string;
  serviceState?: string;
  servicePostalCode?: string;
  serviceCountry?: string;
  latitude?: number;
  longitude?: number;
  status?: CustomerStatus;
  notes?: string;
  tags?: string[];
}

/**
 * Input for updating an existing customer
 */
export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
  id: ID;
}

/**
 * Customer filter options for queries
 */
export interface CustomerFilters {
  status?: CustomerStatus;
  city?: string;
  state?: string;
  tags?: string[];
  searchTerm?: string;
  includeDeleted?: boolean;
}

/**
 * Converts a database row to a Customer entity
 */
export function rowToCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    companyName: row.company_name ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    mobilePhone: row.mobile_phone ?? undefined,
    addressLine1: row.address_line1 ?? undefined,
    addressLine2: row.address_line2 ?? undefined,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    postalCode: row.postal_code ?? undefined,
    country: row.country ?? undefined,
    serviceAddressLine1: row.service_address_line1 ?? undefined,
    serviceAddressLine2: row.service_address_line2 ?? undefined,
    serviceCity: row.service_city ?? undefined,
    serviceState: row.service_state ?? undefined,
    servicePostalCode: row.service_postal_code ?? undefined,
    serviceCountry: row.service_country ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    tags: row.tags ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
  };
}

/**
 * Converts a CreateCustomerInput to a database row format
 *
 * Important: Only includes fields that are explicitly defined in the input.
 * This prevents undefined fields from overwriting existing values during updates.
 */
export function customerInputToRow(input: CreateCustomerInput): Partial<CustomerRow> {
  const row: Partial<CustomerRow> = {};

  // Required field
  if (input.name !== undefined) row.name = input.name;

  // Company info
  if (input.companyName !== undefined) row.company_name = input.companyName ?? null;

  // Contact info
  if (input.email !== undefined) row.email = input.email ?? null;
  if (input.phone !== undefined) row.phone = input.phone ?? null;
  if (input.mobilePhone !== undefined) row.mobile_phone = input.mobilePhone ?? null;

  // Primary address
  if (input.addressLine1 !== undefined) row.address_line1 = input.addressLine1 ?? null;
  if (input.addressLine2 !== undefined) row.address_line2 = input.addressLine2 ?? null;
  if (input.city !== undefined) row.city = input.city ?? null;
  if (input.state !== undefined) row.state = input.state ?? null;
  if (input.postalCode !== undefined) row.postal_code = input.postalCode ?? null;
  if (input.country !== undefined) row.country = input.country ?? null;

  // Service address
  if (input.serviceAddressLine1 !== undefined) row.service_address_line1 = input.serviceAddressLine1 ?? null;
  if (input.serviceAddressLine2 !== undefined) row.service_address_line2 = input.serviceAddressLine2 ?? null;
  if (input.serviceCity !== undefined) row.service_city = input.serviceCity ?? null;
  if (input.serviceState !== undefined) row.service_state = input.serviceState ?? null;
  if (input.servicePostalCode !== undefined) row.service_postal_code = input.servicePostalCode ?? null;
  if (input.serviceCountry !== undefined) row.service_country = input.serviceCountry ?? null;

  // Geolocation
  if (input.latitude !== undefined) row.latitude = input.latitude ?? null;
  if (input.longitude !== undefined) row.longitude = input.longitude ?? null;

  // Status and metadata
  if (input.status !== undefined) row.status = input.status;
  if (input.notes !== undefined) row.notes = input.notes ?? null;
  if (input.tags !== undefined) row.tags = input.tags ?? null;

  return row;
}
