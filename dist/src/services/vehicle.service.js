"use strict";
/**
 * Vehicle Service
 *
 * Provides CRUD operations and business logic for managing vehicles
 * in the RouteIQ application.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VehicleErrorCodes = exports.VehicleServiceError = void 0;
exports.createVehicle = createVehicle;
exports.getVehicleById = getVehicleById;
exports.getVehicles = getVehicles;
exports.updateVehicle = updateVehicle;
exports.deleteVehicle = deleteVehicle;
exports.hardDeleteVehicle = hardDeleteVehicle;
exports.restoreVehicle = restoreVehicle;
exports.countVehicles = countVehicles;
exports.getVehiclesByServiceType = getVehiclesByServiceType;
exports.updateVehicleLocation = updateVehicleLocation;
exports.updateVehicleStatus = updateVehicleStatus;
const supabase_js_1 = require("./supabase.js");
const logger_js_1 = require("../utils/logger.js");
const vehicle_js_1 = require("../types/vehicle.js");
/**
 * Logger instance for vehicle operations
 */
const logger = (0, logger_js_1.createContextLogger)('VehicleService');
/**
 * Table name for vehicles
 */
const VEHICLES_TABLE = 'vehicles';
/**
 * Vehicle service error
 */
class VehicleServiceError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.name = 'VehicleServiceError';
        this.code = code;
        this.details = details;
    }
}
exports.VehicleServiceError = VehicleServiceError;
/**
 * Error codes for vehicle service errors
 */
exports.VehicleErrorCodes = {
    NOT_FOUND: 'VEHICLE_NOT_FOUND',
    CREATE_FAILED: 'VEHICLE_CREATE_FAILED',
    UPDATE_FAILED: 'VEHICLE_UPDATE_FAILED',
    DELETE_FAILED: 'VEHICLE_DELETE_FAILED',
    QUERY_FAILED: 'VEHICLE_QUERY_FAILED',
    VALIDATION_FAILED: 'VEHICLE_VALIDATION_FAILED',
};
/**
 * Validates vehicle input data
 */
function validateVehicleInput(input) {
    if (!input.name || input.name.trim().length === 0) {
        return {
            success: false,
            error: new VehicleServiceError('Vehicle name is required', exports.VehicleErrorCodes.VALIDATION_FAILED, { field: 'name' }),
        };
    }
    if (input.currentLatitude !== undefined && (input.currentLatitude < -90 || input.currentLatitude > 90)) {
        return {
            success: false,
            error: new VehicleServiceError('Latitude must be between -90 and 90', exports.VehicleErrorCodes.VALIDATION_FAILED, { field: 'currentLatitude', value: input.currentLatitude }),
        };
    }
    if (input.currentLongitude !== undefined && (input.currentLongitude < -180 || input.currentLongitude > 180)) {
        return {
            success: false,
            error: new VehicleServiceError('Longitude must be between -180 and 180', exports.VehicleErrorCodes.VALIDATION_FAILED, { field: 'currentLongitude', value: input.currentLongitude }),
        };
    }
    if (input.currentFuelLevel !== undefined && (input.currentFuelLevel < 0 || input.currentFuelLevel > 100)) {
        return {
            success: false,
            error: new VehicleServiceError('Fuel level must be between 0 and 100', exports.VehicleErrorCodes.VALIDATION_FAILED, { field: 'currentFuelLevel', value: input.currentFuelLevel }),
        };
    }
    if (input.year !== undefined && (input.year < 1900 || input.year > new Date().getFullYear() + 2)) {
        return {
            success: false,
            error: new VehicleServiceError('Year must be a valid vehicle year', exports.VehicleErrorCodes.VALIDATION_FAILED, { field: 'year', value: input.year }),
        };
    }
    return { success: true };
}
/**
 * Creates a new vehicle
 */
async function createVehicle(input) {
    logger.debug('Creating vehicle', { name: input.name });
    // Validate input
    const validationResult = validateVehicleInput(input);
    if (!validationResult.success) {
        return validationResult;
    }
    try {
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        const rowData = (0, vehicle_js_1.vehicleInputToRow)(input);
        const { data, error } = await supabase
            .from(VEHICLES_TABLE)
            .insert(rowData)
            .select()
            .single();
        if (error) {
            logger.error('Failed to create vehicle', error);
            return {
                success: false,
                error: new VehicleServiceError(`Failed to create vehicle: ${error.message}`, exports.VehicleErrorCodes.CREATE_FAILED, error),
            };
        }
        const vehicle = (0, vehicle_js_1.rowToVehicle)(data);
        logger.info('Vehicle created successfully', { vehicleId: vehicle.id, name: vehicle.name });
        return { success: true, data: vehicle };
    }
    catch (error) {
        logger.error('Unexpected error creating vehicle', error);
        return {
            success: false,
            error: new VehicleServiceError('Unexpected error creating vehicle', exports.VehicleErrorCodes.CREATE_FAILED, error),
        };
    }
}
/**
 * Gets a vehicle by ID
 */
async function getVehicleById(id) {
    logger.debug('Getting vehicle by ID', { id });
    try {
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        const { data, error } = await supabase
            .from(VEHICLES_TABLE)
            .select()
            .eq('id', id)
            .is('deleted_at', null)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new VehicleServiceError(`Vehicle not found: ${id}`, exports.VehicleErrorCodes.NOT_FOUND, { id }),
                };
            }
            logger.error('Failed to get vehicle', error);
            return {
                success: false,
                error: new VehicleServiceError(`Failed to get vehicle: ${error.message}`, exports.VehicleErrorCodes.QUERY_FAILED, error),
            };
        }
        const vehicle = (0, vehicle_js_1.rowToVehicle)(data);
        return { success: true, data: vehicle };
    }
    catch (error) {
        logger.error('Unexpected error getting vehicle', error);
        return {
            success: false,
            error: new VehicleServiceError('Unexpected error getting vehicle', exports.VehicleErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Gets all vehicles with optional filtering and pagination
 */
async function getVehicles(filters, pagination) {
    logger.debug('Getting vehicles', { filters, pagination });
    try {
        // Use admin client if available to bypass RLS policies
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        let query = supabase.from(VEHICLES_TABLE).select('*', { count: 'exact' });
        // Apply filters
        if (!filters?.includeDeleted) {
            query = query.is('deleted_at', null);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.fuelType) {
            query = query.eq('fuel_type', filters.fuelType);
        }
        if (filters?.make) {
            query = query.ilike('make', `%${filters.make}%`);
        }
        if (filters?.model) {
            query = query.ilike('model', `%${filters.model}%`);
        }
        if (filters?.assignedDriverId) {
            query = query.eq('assigned_driver_id', filters.assignedDriverId);
        }
        if (filters?.searchTerm) {
            const term = filters.searchTerm;
            query = query.or(`name.ilike.%${term}%,license_plate.ilike.%${term}%,vin.ilike.%${term}%,make.ilike.%${term}%,model.ilike.%${term}%`);
        }
        if (filters?.serviceTypes && filters.serviceTypes.length > 0) {
            query = query.overlaps('service_types', filters.serviceTypes);
        }
        if (filters?.tags && filters.tags.length > 0) {
            query = query.contains('tags', filters.tags);
        }
        // Apply pagination
        const page = pagination?.page ?? 1;
        const limit = pagination?.limit ?? 20;
        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1);
        // Apply sorting
        const sortBy = pagination?.sortBy ?? 'created_at';
        const sortOrder = pagination?.sortOrder ?? 'desc';
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        const { data, error, count } = await query;
        if (error) {
            logger.error('Failed to get vehicles', error);
            return {
                success: false,
                error: new VehicleServiceError(`Failed to get vehicles: ${error.message}`, exports.VehicleErrorCodes.QUERY_FAILED, error),
            };
        }
        const vehicles = data.map(vehicle_js_1.rowToVehicle);
        const total = count ?? 0;
        return {
            success: true,
            data: {
                data: vehicles,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        };
    }
    catch (error) {
        logger.error('Unexpected error getting vehicles', error);
        return {
            success: false,
            error: new VehicleServiceError('Unexpected error getting vehicles', exports.VehicleErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Updates an existing vehicle
 */
async function updateVehicle(input) {
    logger.debug('Updating vehicle', { id: input.id });
    // Validate input if name is being updated
    if (input.name !== undefined) {
        const validationResult = validateVehicleInput({ name: input.name, ...input });
        if (!validationResult.success) {
            return validationResult;
        }
    }
    try {
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        // Build update object, excluding id
        const { id, ...updateData } = input;
        const rowData = (0, vehicle_js_1.vehicleInputToRow)(updateData);
        const { data, error } = await supabase
            .from(VEHICLES_TABLE)
            .update(rowData)
            .eq('id', id)
            .is('deleted_at', null)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new VehicleServiceError(`Vehicle not found: ${id}`, exports.VehicleErrorCodes.NOT_FOUND, { id }),
                };
            }
            logger.error('Failed to update vehicle', error);
            return {
                success: false,
                error: new VehicleServiceError(`Failed to update vehicle: ${error.message}`, exports.VehicleErrorCodes.UPDATE_FAILED, error),
            };
        }
        const vehicle = (0, vehicle_js_1.rowToVehicle)(data);
        logger.info('Vehicle updated successfully', { vehicleId: vehicle.id });
        return { success: true, data: vehicle };
    }
    catch (error) {
        logger.error('Unexpected error updating vehicle', error);
        return {
            success: false,
            error: new VehicleServiceError('Unexpected error updating vehicle', exports.VehicleErrorCodes.UPDATE_FAILED, error),
        };
    }
}
/**
 * Soft deletes a vehicle by setting deleted_at timestamp
 */
async function deleteVehicle(id) {
    logger.debug('Deleting vehicle', { id });
    try {
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        const { error } = await supabase
            .from(VEHICLES_TABLE)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
            .is('deleted_at', null);
        if (error) {
            logger.error('Failed to delete vehicle', error);
            return {
                success: false,
                error: new VehicleServiceError(`Failed to delete vehicle: ${error.message}`, exports.VehicleErrorCodes.DELETE_FAILED, error),
            };
        }
        logger.info('Vehicle deleted successfully', { vehicleId: id });
        return { success: true };
    }
    catch (error) {
        logger.error('Unexpected error deleting vehicle', error);
        return {
            success: false,
            error: new VehicleServiceError('Unexpected error deleting vehicle', exports.VehicleErrorCodes.DELETE_FAILED, error),
        };
    }
}
/**
 * Permanently deletes a vehicle (hard delete)
 * Use with caution - this cannot be undone
 */
async function hardDeleteVehicle(id) {
    logger.warn('Hard deleting vehicle', { id });
    try {
        const adminClient = (0, supabase_js_1.getAdminSupabaseClient)();
        if (!adminClient) {
            return {
                success: false,
                error: new VehicleServiceError('Admin client not available for hard delete operation', exports.VehicleErrorCodes.DELETE_FAILED),
            };
        }
        const { error } = await adminClient
            .from(VEHICLES_TABLE)
            .delete()
            .eq('id', id);
        if (error) {
            logger.error('Failed to hard delete vehicle', error);
            return {
                success: false,
                error: new VehicleServiceError(`Failed to hard delete vehicle: ${error.message}`, exports.VehicleErrorCodes.DELETE_FAILED, error),
            };
        }
        logger.info('Vehicle hard deleted successfully', { vehicleId: id });
        return { success: true };
    }
    catch (error) {
        logger.error('Unexpected error hard deleting vehicle', error);
        return {
            success: false,
            error: new VehicleServiceError('Unexpected error hard deleting vehicle', exports.VehicleErrorCodes.DELETE_FAILED, error),
        };
    }
}
/**
 * Restores a soft-deleted vehicle
 */
async function restoreVehicle(id) {
    logger.debug('Restoring vehicle', { id });
    try {
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        const { data, error } = await supabase
            .from(VEHICLES_TABLE)
            .update({ deleted_at: null })
            .eq('id', id)
            .not('deleted_at', 'is', null)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new VehicleServiceError(`Deleted vehicle not found: ${id}`, exports.VehicleErrorCodes.NOT_FOUND, { id }),
                };
            }
            logger.error('Failed to restore vehicle', error);
            return {
                success: false,
                error: new VehicleServiceError(`Failed to restore vehicle: ${error.message}`, exports.VehicleErrorCodes.UPDATE_FAILED, error),
            };
        }
        const vehicle = (0, vehicle_js_1.rowToVehicle)(data);
        logger.info('Vehicle restored successfully', { vehicleId: vehicle.id });
        return { success: true, data: vehicle };
    }
    catch (error) {
        logger.error('Unexpected error restoring vehicle', error);
        return {
            success: false,
            error: new VehicleServiceError('Unexpected error restoring vehicle', exports.VehicleErrorCodes.UPDATE_FAILED, error),
        };
    }
}
/**
 * Gets vehicles with optional filters and pagination
 */
/**
 * Counts vehicles with optional filters
 */
async function countVehicles(filters) {
    logger.debug('Counting vehicles', { filters });
    try {
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        let query = supabase.from(VEHICLES_TABLE).select('*', { count: 'exact', head: true });
        if (!filters?.includeDeleted) {
            query = query.is('deleted_at', null);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.fuelType) {
            query = query.eq('fuel_type', filters.fuelType);
        }
        if (filters?.serviceTypes && filters.serviceTypes.length > 0) {
            query = query.overlaps('service_types', filters.serviceTypes);
        }
        const { count, error } = await query;
        if (error) {
            logger.error('Failed to count vehicles', error);
            return {
                success: false,
                error: new VehicleServiceError(`Failed to count vehicles: ${error.message}`, exports.VehicleErrorCodes.QUERY_FAILED, error),
            };
        }
        return { success: true, data: count ?? 0 };
    }
    catch (error) {
        logger.error('Unexpected error counting vehicles', error);
        return {
            success: false,
            error: new VehicleServiceError('Unexpected error counting vehicles', exports.VehicleErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Gets vehicles by service type capability
 */
async function getVehiclesByServiceType(serviceType, filters) {
    logger.debug('Getting vehicles by service type', { serviceType });
    try {
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        let query = supabase
            .from(VEHICLES_TABLE)
            .select()
            .contains('service_types', [serviceType]);
        if (!filters?.includeDeleted) {
            query = query.is('deleted_at', null);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        const { data, error } = await query;
        if (error) {
            logger.error('Failed to get vehicles by service type', error);
            return {
                success: false,
                error: new VehicleServiceError(`Failed to get vehicles by service type: ${error.message}`, exports.VehicleErrorCodes.QUERY_FAILED, error),
            };
        }
        const vehicles = data.map(vehicle_js_1.rowToVehicle);
        return { success: true, data: vehicles };
    }
    catch (error) {
        logger.error('Unexpected error getting vehicles by service type', error);
        return {
            success: false,
            error: new VehicleServiceError('Unexpected error getting vehicles by service type', exports.VehicleErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Updates vehicle location
 */
async function updateVehicleLocation(id, latitude, longitude) {
    logger.debug('Updating vehicle location', { id, latitude, longitude });
    // Validate coordinates
    if (latitude < -90 || latitude > 90) {
        return {
            success: false,
            error: new VehicleServiceError('Latitude must be between -90 and 90', exports.VehicleErrorCodes.VALIDATION_FAILED, { field: 'latitude', value: latitude }),
        };
    }
    if (longitude < -180 || longitude > 180) {
        return {
            success: false,
            error: new VehicleServiceError('Longitude must be between -180 and 180', exports.VehicleErrorCodes.VALIDATION_FAILED, { field: 'longitude', value: longitude }),
        };
    }
    try {
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        const { data, error } = await supabase
            .from(VEHICLES_TABLE)
            .update({
            current_latitude: latitude,
            current_longitude: longitude,
            last_location_update: new Date().toISOString(),
        })
            .eq('id', id)
            .is('deleted_at', null)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new VehicleServiceError(`Vehicle not found: ${id}`, exports.VehicleErrorCodes.NOT_FOUND, { id }),
                };
            }
            logger.error('Failed to update vehicle location', error);
            return {
                success: false,
                error: new VehicleServiceError(`Failed to update vehicle location: ${error.message}`, exports.VehicleErrorCodes.UPDATE_FAILED, error),
            };
        }
        const vehicle = (0, vehicle_js_1.rowToVehicle)(data);
        logger.info('Vehicle location updated successfully', { vehicleId: vehicle.id });
        return { success: true, data: vehicle };
    }
    catch (error) {
        logger.error('Unexpected error updating vehicle location', error);
        return {
            success: false,
            error: new VehicleServiceError('Unexpected error updating vehicle location', exports.VehicleErrorCodes.UPDATE_FAILED, error),
        };
    }
}
/**
 * Updates vehicle status
 */
async function updateVehicleStatus(id, status) {
    logger.debug('Updating vehicle status', { id, status });
    try {
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        const { data, error } = await supabase
            .from(VEHICLES_TABLE)
            .update({ status })
            .eq('id', id)
            .is('deleted_at', null)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new VehicleServiceError(`Vehicle not found: ${id}`, exports.VehicleErrorCodes.NOT_FOUND, { id }),
                };
            }
            logger.error('Failed to update vehicle status', error);
            return {
                success: false,
                error: new VehicleServiceError(`Failed to update vehicle status: ${error.message}`, exports.VehicleErrorCodes.UPDATE_FAILED, error),
            };
        }
        const vehicle = (0, vehicle_js_1.rowToVehicle)(data);
        logger.info('Vehicle status updated successfully', { vehicleId: vehicle.id, status });
        return { success: true, data: vehicle };
    }
    catch (error) {
        logger.error('Unexpected error updating vehicle status', error);
        return {
            success: false,
            error: new VehicleServiceError('Unexpected error updating vehicle status', exports.VehicleErrorCodes.UPDATE_FAILED, error),
        };
    }
}
//# sourceMappingURL=vehicle.service.js.map