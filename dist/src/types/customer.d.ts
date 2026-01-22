/**
 * Customer-related type definitions for Fleetillo application
 */
import type { ID, Timestamps } from './index.js';
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
    status: CustomerStatus;
    notes?: string;
    tags?: string[];
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
export declare function rowToCustomer(row: CustomerRow): Customer;
/**
 * Converts a CreateCustomerInput to a database row format
 */
export declare function customerInputToRow(input: CreateCustomerInput): Partial<CustomerRow>;
//# sourceMappingURL=customer.d.ts.map