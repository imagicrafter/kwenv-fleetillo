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
    status: ClientStatus;
    notes?: string;
    tags?: string[];
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
export declare function rowToClient(row: ClientRow): Client;
/**
 * Converts a CreateClientInput to a database row format
 */
export declare function clientInputToRow(input: CreateClientInput): Partial<ClientRow>;
//# sourceMappingURL=client.d.ts.map