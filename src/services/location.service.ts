/**
 * Location Service
 *
 * Provides CRUD operations and business logic for managing locations
 * in the Fleetillo application.
 */

import { getSupabaseClient, getAdminSupabaseClient } from './supabase.js';
import { createContextLogger } from '../utils/logger.js';
import type { Result, PaginationParams, PaginatedResponse } from '../types/index.js';

/**
 * Logger instance for location operations
 */
const logger = createContextLogger('LocationService');

/**
 * Table name for locations
 */
const LOCATIONS_TABLE = 'locations';

export interface Location {
    id: string;
    customerId?: string | null;
    customerName?: string; // Populated from join
    name: string;
    locationType: 'client' | 'depot' | 'disposal' | 'maintenance' | 'home' | 'other';
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    latitude?: number | null;
    longitude?: number | null;
    isPrimary: boolean;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
}

export type CreateLocationInput = Omit<Location, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type UpdateLocationInput = Partial<CreateLocationInput> & { id: string };

/**
 * Helper to get the appropriate Supabase client
 */
function getConnection() {
    return getAdminSupabaseClient() || getSupabaseClient();
}

/**
 * Converts DB row to Location object
 */
function rowToLocation(row: any): Location {
    return {
        id: row.id,
        customerId: row.customer_id,
        customerName: row.customers?.name,
        name: row.name,
        locationType: row.location_type,
        addressLine1: row.address_line1,
        addressLine2: row.address_line2,
        city: row.city,
        state: row.state,
        postalCode: row.postal_code,
        country: row.service_country || row.country || 'USA', // Handle potential schema variations
        latitude: row.latitude,
        longitude: row.longitude,
        isPrimary: row.is_primary,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at
    };
}

/**
 * Converts input to DB row
 */
function inputToRow(input: CreateLocationInput | UpdateLocationInput): any {
    const row: any = {};
    if ('customerId' in input) row.customer_id = input.customerId;
    if ('name' in input) row.name = input.name;
    if ('locationType' in input) row.location_type = input.locationType;
    if ('addressLine1' in input) row.address_line1 = input.addressLine1;
    if ('addressLine2' in input) row.address_line2 = input.addressLine2;
    if ('city' in input) row.city = input.city;
    if ('state' in input) row.state = input.state;
    if ('postalCode' in input) row.postal_code = input.postalCode;
    if ('country' in input) row.country = input.country;
    if ('latitude' in input) row.latitude = input.latitude;
    if ('longitude' in input) row.longitude = input.longitude;
    if ('isPrimary' in input) row.is_primary = input.isPrimary;
    if ('notes' in input) row.notes = input.notes;
    return row;
}

/**
 * Creates a new location
 */
export async function createLocation(input: CreateLocationInput): Promise<Result<Location>> {
    logger.debug('Creating location', { name: input.name, customerId: input.customerId });

    try {
        const supabase = getConnection();
        const rowData = inputToRow(input);

        const { data, error } = await supabase
            .from(LOCATIONS_TABLE)
            .insert(rowData)
            .select('*, customers(name)')
            .single();

        if (error) throw error;

        return { success: true, data: rowToLocation(data) };
    } catch (error: any) {
        logger.error('Failed to create location', error);
        return { success: false, error: new Error(`Failed to create location: ${error.message}`) };
    }
}

/**
 * Gets a location by ID
 */
export async function getLocationById(id: string): Promise<Result<Location>> {
    try {
        const supabase = getConnection();
        const { data, error } = await supabase
            .from(LOCATIONS_TABLE)
            .select('*, customers(name)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return { success: true, data: rowToLocation(data) };
    } catch (error: any) {
        logger.error('Failed to get location', error);
        return { success: false, error: new Error(`Failed to get location: ${error.message}`) };
    }
}

/**
 * Gets all locations with optional filters
 */
export async function getAllLocations(
    filters?: { type?: string; customerId?: string; searchTerm?: string },
    pagination?: PaginationParams
): Promise<Result<PaginatedResponse<Location>>> {
    try {
        const supabase = getConnection();
        let query = supabase
            .from(LOCATIONS_TABLE)
            .select('*, customers(name)', { count: 'exact' });

        query = query.is('deleted_at', null);

        if (filters?.type) {
            query = query.eq('location_type', filters.type);
        }

        if (filters?.customerId) {
            query = query.eq('customer_id', filters.customerId);
        }

        if (filters?.searchTerm) {
            query = query.or(`name.ilike.%${filters.searchTerm}%,address_line1.ilike.%${filters.searchTerm}%,city.ilike.%${filters.searchTerm}%`);
        }

        // Apply pagination
        const page = pagination?.page ?? 1;
        const limit = pagination?.limit ?? 20;
        const offset = (page - 1) * limit;

        query = query.range(offset, offset + limit - 1);

        // Apply sorting
        const sortBy = pagination?.sortBy ?? 'created_at';
        const sortOrder = pagination?.sortOrder ?? 'desc';
        // Note: 'customers(name)' alias sorting might be tricky, sticking to main table columns for now
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });

        const { data, error, count } = await query;

        if (error) throw error;

        const total = count ?? 0;

        return {
            success: true,
            data: {
                data: data.map(rowToLocation),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        };
    } catch (error: any) {
        logger.error('Failed to get all locations', error);
        return { success: false, error: new Error(`Failed to get all locations: ${error.message}`) };
    }
}

/**
 * Gets all locations for a customer
 */
export async function getCustomerLocations(customerId: string): Promise<Result<Location[]>> {
    try {
        const supabase = getConnection();
        const { data, error } = await supabase
            .from(LOCATIONS_TABLE)
            .select('*, customers(name)')
            .eq('customer_id', customerId)
            .is('deleted_at', null)
            .order('is_primary', { ascending: false }); // Primary first

        if (error) throw error;
        return { success: true, data: data.map(rowToLocation) };
    } catch (error: any) {
        logger.error('Failed to get customer locations', error);
        return { success: false, error: new Error(`Failed to get customer locations: ${error.message}`) };
    }
}

/**
 * Updates a location
 */
export async function updateLocation(input: UpdateLocationInput): Promise<Result<Location>> {
    try {
        const supabase = getConnection();
        const rowData = inputToRow(input);

        const { data, error } = await supabase
            .from(LOCATIONS_TABLE)
            .update(rowData)
            .eq('id', input.id)
            .select('*, customers(name)')
            .single();

        if (error) throw error;
        return { success: true, data: rowToLocation(data) };
    } catch (error: any) {
        logger.error('Failed to update location', error);
        return { success: false, error: new Error(`Failed to update location: ${error.message}`) };
    }
}

/**
 * Soft deletes a location
 */
export async function deleteLocation(id: string): Promise<Result<void>> {
    try {
        const supabase = getConnection();
        const { error } = await supabase
            .from(LOCATIONS_TABLE)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        logger.error('Failed to delete location', error);
        return { success: false, error: new Error(`Failed to delete location: ${error.message}`) };
    }
}
