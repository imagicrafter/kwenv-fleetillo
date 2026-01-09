"use strict";
/**
 * Location Service
 *
 * Provides CRUD operations and business logic for managing locations
 * in the RouteIQ application.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLocation = createLocation;
exports.getLocationById = getLocationById;
exports.getAllLocations = getAllLocations;
exports.getClientLocations = getClientLocations;
exports.updateLocation = updateLocation;
exports.deleteLocation = deleteLocation;
const supabase_js_1 = require("./supabase.js");
const logger_js_1 = require("../utils/logger.js");
/**
 * Logger instance for location operations
 */
const logger = (0, logger_js_1.createContextLogger)('LocationService');
/**
 * Table name for locations
 */
const LOCATIONS_TABLE = 'locations';
/**
 * Helper to get the appropriate Supabase client
 */
function getConnection() {
    return (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
}
/**
 * Converts DB row to Location object
 */
function rowToLocation(row) {
    return {
        id: row.id,
        clientId: row.client_id,
        clientName: row.clients?.name,
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
function inputToRow(input) {
    const row = {};
    if ('clientId' in input)
        row.client_id = input.clientId;
    if ('name' in input)
        row.name = input.name;
    if ('locationType' in input)
        row.location_type = input.locationType;
    if ('addressLine1' in input)
        row.address_line1 = input.addressLine1;
    if ('addressLine2' in input)
        row.address_line2 = input.addressLine2;
    if ('city' in input)
        row.city = input.city;
    if ('state' in input)
        row.state = input.state;
    if ('postalCode' in input)
        row.postal_code = input.postalCode;
    if ('country' in input)
        row.country = input.country;
    if ('latitude' in input)
        row.latitude = input.latitude;
    if ('longitude' in input)
        row.longitude = input.longitude;
    if ('isPrimary' in input)
        row.is_primary = input.isPrimary;
    if ('notes' in input)
        row.notes = input.notes;
    return row;
}
/**
 * Creates a new location
 */
async function createLocation(input) {
    logger.debug('Creating location', { name: input.name, clientId: input.clientId });
    try {
        const supabase = getConnection();
        const rowData = inputToRow(input);
        const { data, error } = await supabase
            .from(LOCATIONS_TABLE)
            .insert(rowData)
            .select('*, clients(name)')
            .single();
        if (error)
            throw error;
        return { success: true, data: rowToLocation(data) };
    }
    catch (error) {
        logger.error('Failed to create location', error);
        return { success: false, error: new Error(`Failed to create location: ${error.message}`) };
    }
}
/**
 * Gets a location by ID
 */
async function getLocationById(id) {
    try {
        const supabase = getConnection();
        const { data, error } = await supabase
            .from(LOCATIONS_TABLE)
            .select('*, clients(name)')
            .eq('id', id)
            .single();
        if (error)
            throw error;
        return { success: true, data: rowToLocation(data) };
    }
    catch (error) {
        logger.error('Failed to get location', error);
        return { success: false, error: new Error(`Failed to get location: ${error.message}`) };
    }
}
/**
 * Gets all locations with optional filters
 */
async function getAllLocations(filters, pagination) {
    try {
        const supabase = getConnection();
        let query = supabase
            .from(LOCATIONS_TABLE)
            .select('*, clients(name)', { count: 'exact' });
        query = query.is('deleted_at', null);
        if (filters?.type) {
            query = query.eq('location_type', filters.type);
        }
        if (filters?.clientId) {
            query = query.eq('client_id', filters.clientId);
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
        // Note: 'clients(name)' alias sorting might be tricky, sticking to main table columns for now
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        const { data, error, count } = await query;
        if (error)
            throw error;
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
    }
    catch (error) {
        logger.error('Failed to get all locations', error);
        return { success: false, error: new Error(`Failed to get all locations: ${error.message}`) };
    }
}
/**
 * Gets all locations for a client
 */
async function getClientLocations(clientId) {
    try {
        const supabase = getConnection();
        const { data, error } = await supabase
            .from(LOCATIONS_TABLE)
            .select('*, clients(name)')
            .eq('client_id', clientId)
            .is('deleted_at', null)
            .order('is_primary', { ascending: false }); // Primary first
        if (error)
            throw error;
        return { success: true, data: data.map(rowToLocation) };
    }
    catch (error) {
        logger.error('Failed to get client locations', error);
        return { success: false, error: new Error(`Failed to get client locations: ${error.message}`) };
    }
}
/**
 * Updates a location
 */
async function updateLocation(input) {
    try {
        const supabase = getConnection();
        const rowData = inputToRow(input);
        const { data, error } = await supabase
            .from(LOCATIONS_TABLE)
            .update(rowData)
            .eq('id', input.id)
            .select('*, clients(name)')
            .single();
        if (error)
            throw error;
        return { success: true, data: rowToLocation(data) };
    }
    catch (error) {
        logger.error('Failed to update location', error);
        return { success: false, error: new Error(`Failed to update location: ${error.message}`) };
    }
}
/**
 * Soft deletes a location
 */
async function deleteLocation(id) {
    try {
        const supabase = getConnection();
        const { error } = await supabase
            .from(LOCATIONS_TABLE)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);
        if (error)
            throw error;
        return { success: true };
    }
    catch (error) {
        logger.error('Failed to delete location', error);
        return { success: false, error: new Error(`Failed to delete location: ${error.message}`) };
    }
}
//# sourceMappingURL=location.service.js.map