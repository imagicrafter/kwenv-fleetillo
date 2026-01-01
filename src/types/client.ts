/**
 * Client-related type definitions for RouteIQ application
 */

import type { ID, Timestamps } from './index.js';

/**
 * Client status options
 */
export type ClientStatus = 'active' | 'inactive' | 'suspended' | 'archived';

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
 * Client entity representing a customer in the system
 */
export interface Client extends Timestamps {
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
  status: ClientStatus;
  notes?: string;
  tags?: string[];

  // Soft delete
  deletedAt?: Date;
}

/**
 * Database row representation (snake_case as stored in Supabase)
 */
export interface ClientRow {
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
  status: ClientStatus;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Input for creating a new client
 */
export interface CreateClientInput {
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
  status?: ClientStatus;
  notes?: string;
  tags?: string[];
}

/**
 * Input for updating an existing client
 */
export interface UpdateClientInput extends Partial<CreateClientInput> {
  id: ID;
}

/**
 * Client filter options for queries
 */
export interface ClientFilters {
  status?: ClientStatus;
  city?: string;
  state?: string;
  tags?: string[];
  searchTerm?: string;
  includeDeleted?: boolean;
}

/**
 * Converts a database row to a Client entity
 */
export function rowToClient(row: ClientRow): Client {
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
 * Converts a CreateClientInput to a database row format
 */
export function clientInputToRow(input: CreateClientInput): Partial<ClientRow> {
  return {
    name: input.name,
    company_name: input.companyName ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    mobile_phone: input.mobilePhone ?? null,
    address_line1: input.addressLine1 ?? null,
    address_line2: input.addressLine2 ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    postal_code: input.postalCode ?? null,
    country: input.country ?? null,
    service_address_line1: input.serviceAddressLine1 ?? null,
    service_address_line2: input.serviceAddressLine2 ?? null,
    service_city: input.serviceCity ?? null,
    service_state: input.serviceState ?? null,
    service_postal_code: input.servicePostalCode ?? null,
    service_country: input.serviceCountry ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    status: input.status ?? 'active',
    notes: input.notes ?? null,
    tags: input.tags ?? null,
  };
}
