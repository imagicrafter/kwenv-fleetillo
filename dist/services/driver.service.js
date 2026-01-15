"use strict";
/**
 * Driver Service
 *
 * Provides CRUD operations and business logic for managing drivers
 * in the OptiRoute application.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverErrorCodes = exports.DriverServiceError = void 0;
exports.createDriver = createDriver;
exports.getDriverById = getDriverById;
exports.getDrivers = getDrivers;
exports.updateDriver = updateDriver;
exports.deleteDriver = deleteDriver;
exports.countDrivers = countDrivers;
exports.getDriverWithVehicle = getDriverWithVehicle;
exports.assignDriverToVehicle = assignDriverToVehicle;
exports.unassignDriverFromVehicle = unassignDriverFromVehicle;
exports.getDriverVehicles = getDriverVehicles;
exports.uploadDriverAvatar = uploadDriverAvatar;
exports.getDriverAvatarUrl = getDriverAvatarUrl;
exports.deleteDriverAvatar = deleteDriverAvatar;
const supabase_js_1 = require("./supabase.js");
const logger_js_1 = require("../utils/logger.js");
const driver_js_1 = require("../types/driver.js");
const vehicle_js_1 = require("../types/vehicle.js");
/**
 * Logger instance for driver operations
 */
const logger = (0, logger_js_1.createContextLogger)('DriverService');
/**
 * Table name for drivers in the optiroute schema
 */
const DRIVERS_TABLE = 'drivers';
/**
 * Driver service error
 */
class DriverServiceError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.name = 'DriverServiceError';
        this.code = code;
        this.details = details;
    }
}
exports.DriverServiceError = DriverServiceError;
/**
 * Error codes for driver service errors
 */
exports.DriverErrorCodes = {
    NOT_FOUND: 'DRIVER_NOT_FOUND',
    CREATE_FAILED: 'DRIVER_CREATE_FAILED',
    UPDATE_FAILED: 'DRIVER_UPDATE_FAILED',
    DELETE_FAILED: 'DRIVER_DELETE_FAILED',
    QUERY_FAILED: 'DRIVER_QUERY_FAILED',
    VALIDATION_FAILED: 'DRIVER_VALIDATION_FAILED',
};
/**
 * Validates driver input data
 */
function validateDriverInput(input) {
    if (!input.firstName || input.firstName.trim().length === 0) {
        return {
            success: false,
            error: new DriverServiceError('Driver first name is required', exports.DriverErrorCodes.VALIDATION_FAILED, { field: 'firstName' }),
        };
    }
    if (!input.lastName || input.lastName.trim().length === 0) {
        return {
            success: false,
            error: new DriverServiceError('Driver last name is required', exports.DriverErrorCodes.VALIDATION_FAILED, { field: 'lastName' }),
        };
    }
    if (input.email && !isValidEmail(input.email)) {
        return {
            success: false,
            error: new DriverServiceError('Invalid email format', exports.DriverErrorCodes.VALIDATION_FAILED, { field: 'email', value: input.email }),
        };
    }
    return { success: true };
}
/**
 * Simple email validation
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
/**
 * Helper to get the appropriate Supabase client
 * Prefers admin client for privileged operations, falls back to standard client
 */
function getClient() {
    const adminClient = (0, supabase_js_1.getAdminSupabaseClient)();
    if (adminClient) {
        logger.debug('Using Admin Supabase Client');
        return adminClient;
    }
    const msg = 'CRITICAL: Admin Supabase Client is not available. This operation requires SUPABASE_SERVICE_ROLE_KEY to be set in .env';
    logger.error(msg);
    throw new Error(msg);
}
/**
 * Creates a new driver
 */
async function createDriver(input) {
    logger.debug('Creating driver', { firstName: input.firstName, lastName: input.lastName });
    // Validate input
    const validationResult = validateDriverInput(input);
    if (!validationResult.success) {
        return validationResult;
    }
    try {
        const supabase = getClient();
        const rowData = (0, driver_js_1.driverInputToRow)(input);
        const { data, error } = await supabase
            .from(DRIVERS_TABLE)
            .insert(rowData)
            .select()
            .single();
        if (error) {
            logger.error('Failed to create driver', error);
            return {
                success: false,
                error: new DriverServiceError(`Failed to create driver: ${error.message}`, exports.DriverErrorCodes.CREATE_FAILED, error),
            };
        }
        const driver = (0, driver_js_1.rowToDriver)(data);
        logger.info('Driver created successfully', { driverId: driver.id, name: `${driver.firstName} ${driver.lastName}` });
        return { success: true, data: driver };
    }
    catch (error) {
        logger.error('Unexpected error creating driver', error);
        return {
            success: false,
            error: new DriverServiceError('Unexpected error creating driver', exports.DriverErrorCodes.CREATE_FAILED, error),
        };
    }
}
/**
 * Gets a driver by ID
 */
async function getDriverById(id) {
    logger.debug('Getting driver by ID', { id });
    try {
        const supabase = getClient();
        const { data, error } = await supabase
            .from(DRIVERS_TABLE)
            .select()
            .eq('id', id)
            .is('deleted_at', null)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new DriverServiceError(`Driver not found: ${id}`, exports.DriverErrorCodes.NOT_FOUND, { id }),
                };
            }
            logger.error('Failed to get driver', error);
            return {
                success: false,
                error: new DriverServiceError(`Failed to get driver: ${error.message}`, exports.DriverErrorCodes.QUERY_FAILED, error),
            };
        }
        const driver = (0, driver_js_1.rowToDriver)(data);
        return { success: true, data: driver };
    }
    catch (error) {
        logger.error('Unexpected error getting driver', error);
        return {
            success: false,
            error: new DriverServiceError('Unexpected error getting driver', exports.DriverErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Gets all drivers with optional filtering and pagination
 * Includes LEFT JOIN with vehicles to get assigned vehicle info
 */
async function getDrivers(filters, pagination) {
    logger.debug('Getting drivers', { filters, pagination });
    try {
        const supabase = getClient();
        // Use a raw query with LEFT JOIN to get vehicle info
        let query = supabase
            .from(DRIVERS_TABLE)
            .select(`
        *,
        vehicles!fk_vehicles_driver(id)
      `, { count: 'exact' });
        // Apply filters
        if (!filters?.includeDeleted) {
            query = query.is('deleted_at', null);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.searchTerm) {
            const term = filters.searchTerm;
            query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone_number.ilike.%${term}%`);
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
            logger.error('Failed to get drivers', error);
            return {
                success: false,
                error: new DriverServiceError(`Failed to get drivers: ${error.message}`, exports.DriverErrorCodes.QUERY_FAILED, error),
            };
        }
        // Convert rows to Driver objects and add assignedVehicleId
        const drivers = data.map((row) => {
            const driver = (0, driver_js_1.rowToDriver)(row);
            // Add assignedVehicleId from the joined vehicles data
            if (row.vehicles && Array.isArray(row.vehicles) && row.vehicles.length > 0) {
                driver.assignedVehicleId = row.vehicles[0].id;
            }
            return driver;
        });
        const total = count ?? 0;
        return {
            success: true,
            data: {
                data: drivers,
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
        logger.error('Unexpected error getting drivers', error);
        return {
            success: false,
            error: new DriverServiceError('Unexpected error getting drivers', exports.DriverErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Updates an existing driver
 */
async function updateDriver(id, input) {
    logger.debug('Updating driver', { id });
    // Validate input if required fields are being updated
    if (input.firstName !== undefined || input.lastName !== undefined) {
        const validationInput = {
            firstName: input.firstName ?? 'temp',
            lastName: input.lastName ?? 'temp',
            ...input
        };
        const validationResult = validateDriverInput(validationInput);
        if (!validationResult.success && (input.firstName || input.lastName)) {
            return validationResult;
        }
    }
    try {
        const supabase = getClient();
        // Build update object
        const rowData = (0, driver_js_1.driverInputToRow)(input);
        const { data, error } = await supabase
            .from(DRIVERS_TABLE)
            .update(rowData)
            .eq('id', id)
            .is('deleted_at', null)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new DriverServiceError(`Driver not found: ${id}`, exports.DriverErrorCodes.NOT_FOUND, { id }),
                };
            }
            logger.error('Failed to update driver', error);
            return {
                success: false,
                error: new DriverServiceError(`Failed to update driver: ${error.message}`, exports.DriverErrorCodes.UPDATE_FAILED, error),
            };
        }
        const driver = (0, driver_js_1.rowToDriver)(data);
        logger.info('Driver updated successfully', { driverId: driver.id });
        return { success: true, data: driver };
    }
    catch (error) {
        logger.error('Unexpected error updating driver', error);
        return {
            success: false,
            error: new DriverServiceError('Unexpected error updating driver', exports.DriverErrorCodes.UPDATE_FAILED, error),
        };
    }
}
/**
 * Soft deletes a driver by setting deleted_at timestamp
 */
async function deleteDriver(id) {
    logger.debug('Deleting driver', { id });
    try {
        const supabase = getClient();
        const { error } = await supabase
            .from(DRIVERS_TABLE)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
            .is('deleted_at', null);
        if (error) {
            logger.error('Failed to delete driver', error);
            return {
                success: false,
                error: new DriverServiceError(`Failed to delete driver: ${error.message}`, exports.DriverErrorCodes.DELETE_FAILED, error),
            };
        }
        logger.info('Driver deleted successfully', { driverId: id });
        return { success: true };
    }
    catch (error) {
        logger.error('Unexpected error deleting driver', error);
        return {
            success: false,
            error: new DriverServiceError('Unexpected error deleting driver', exports.DriverErrorCodes.DELETE_FAILED, error),
        };
    }
}
/**
 * Counts drivers matching the given filters
 */
async function countDrivers(filters) {
    logger.debug('Counting drivers', { filters });
    try {
        const supabase = getClient();
        let query = supabase
            .from(DRIVERS_TABLE)
            .select('*', { count: 'exact', head: true });
        // Apply filters
        if (!filters?.includeDeleted) {
            query = query.is('deleted_at', null);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.searchTerm) {
            const term = filters.searchTerm;
            query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone_number.ilike.%${term}%`);
        }
        const { count, error } = await query;
        if (error) {
            logger.error('Failed to count drivers', error);
            return {
                success: false,
                error: new DriverServiceError(`Failed to count drivers: ${error.message}`, exports.DriverErrorCodes.QUERY_FAILED, error),
            };
        }
        return { success: true, data: count ?? 0 };
    }
    catch (error) {
        logger.error('Unexpected error counting drivers', error);
        return {
            success: false,
            error: new DriverServiceError('Unexpected error counting drivers', exports.DriverErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Gets a driver with their assigned vehicle information
 */
async function getDriverWithVehicle(id) {
    logger.debug('Getting driver with vehicle', { id });
    try {
        const supabase = getClient();
        const { data, error } = await supabase
            .from(DRIVERS_TABLE)
            .select(`
        *,
        vehicles!fk_vehicles_driver(*)
      `)
            .eq('id', id)
            .is('deleted_at', null)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new DriverServiceError(`Driver not found: ${id}`, exports.DriverErrorCodes.NOT_FOUND, { id }),
                };
            }
            logger.error('Failed to get driver with vehicle', error);
            return {
                success: false,
                error: new DriverServiceError(`Failed to get driver with vehicle: ${error.message}`, exports.DriverErrorCodes.QUERY_FAILED, error),
            };
        }
        const driver = (0, driver_js_1.rowToDriver)(data);
        // Add vehicle information if available
        let result = driver;
        if (data.vehicles && Array.isArray(data.vehicles) && data.vehicles.length > 0) {
            const vehicleData = data.vehicles[0];
            result.assignedVehicle = (0, vehicle_js_1.rowToVehicle)(vehicleData);
            result.assignedVehicleId = vehicleData.id;
        }
        return { success: true, data: result };
    }
    catch (error) {
        logger.error('Unexpected error getting driver with vehicle', error);
        return {
            success: false,
            error: new DriverServiceError('Unexpected error getting driver with vehicle', exports.DriverErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Assigns a driver to a vehicle
 */
async function assignDriverToVehicle(driverId, vehicleId) {
    logger.debug('Assigning driver to vehicle', { driverId, vehicleId });
    try {
        const supabase = getClient();
        // First, verify the vehicle exists and is not deleted
        const { data: vehicle, error: vehicleError } = await supabase
            .from('vehicles')
            .select('id, name')
            .eq('id', vehicleId)
            .is('deleted_at', null)
            .single();
        if (vehicleError || !vehicle) {
            return {
                success: false,
                error: new DriverServiceError(`Vehicle not found: ${vehicleId}`, exports.DriverErrorCodes.QUERY_FAILED, { vehicleId }),
            };
        }
        // Verify the driver exists and is not deleted
        const { data: driver, error: driverError } = await supabase
            .from(DRIVERS_TABLE)
            .select('id, first_name, last_name')
            .eq('id', driverId)
            .is('deleted_at', null)
            .single();
        if (driverError || !driver) {
            return {
                success: false,
                error: new DriverServiceError(`Driver not found: ${driverId}`, exports.DriverErrorCodes.NOT_FOUND, { driverId }),
            };
        }
        // Update the vehicle's assigned_driver_id
        const { error: updateError } = await supabase
            .from('vehicles')
            .update({ assigned_driver_id: driverId })
            .eq('id', vehicleId);
        if (updateError) {
            logger.error('Failed to assign driver to vehicle', updateError);
            return {
                success: false,
                error: new DriverServiceError(`Failed to assign driver to vehicle: ${updateError.message}`, exports.DriverErrorCodes.UPDATE_FAILED, updateError),
            };
        }
        logger.info('Driver assigned to vehicle successfully', {
            driverId,
            driverName: `${driver.first_name} ${driver.last_name}`,
            vehicleId,
            vehicleName: vehicle.name
        });
        return { success: true };
    }
    catch (error) {
        logger.error('Unexpected error assigning driver to vehicle', error);
        return {
            success: false,
            error: new DriverServiceError('Unexpected error assigning driver to vehicle', exports.DriverErrorCodes.UPDATE_FAILED, error),
        };
    }
}
/**
 * Unassigns a driver from a vehicle
 */
async function unassignDriverFromVehicle(vehicleId) {
    logger.debug('Unassigning driver from vehicle', { vehicleId });
    try {
        const supabase = getClient();
        // Update the vehicle's assigned_driver_id to NULL
        const { error } = await supabase
            .from('vehicles')
            .update({ assigned_driver_id: null })
            .eq('id', vehicleId);
        if (error) {
            logger.error('Failed to unassign driver from vehicle', error);
            return {
                success: false,
                error: new DriverServiceError(`Failed to unassign driver from vehicle: ${error.message}`, exports.DriverErrorCodes.UPDATE_FAILED, error),
            };
        }
        logger.info('Driver unassigned from vehicle successfully', { vehicleId });
        return { success: true };
    }
    catch (error) {
        logger.error('Unexpected error unassigning driver from vehicle', error);
        return {
            success: false,
            error: new DriverServiceError('Unexpected error unassigning driver from vehicle', exports.DriverErrorCodes.UPDATE_FAILED, error),
        };
    }
}
/**
 * Gets all vehicles assigned to a driver
 */
async function getDriverVehicles(driverId) {
    logger.debug('Getting vehicles for driver', { driverId });
    try {
        const supabase = getClient();
        const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .eq('assigned_driver_id', driverId)
            .is('deleted_at', null);
        if (error) {
            logger.error('Failed to get driver vehicles', error);
            return {
                success: false,
                error: new DriverServiceError(`Failed to get driver vehicles: ${error.message}`, exports.DriverErrorCodes.QUERY_FAILED, error),
            };
        }
        const vehicles = data.map(vehicle_js_1.rowToVehicle);
        return { success: true, data: vehicles };
    }
    catch (error) {
        logger.error('Unexpected error getting driver vehicles', error);
        return {
            success: false,
            error: new DriverServiceError('Unexpected error getting driver vehicles', exports.DriverErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Uploads an avatar image for a driver
 * Stores the image in Supabase storage and updates the driver's profile_image_url
 */
async function uploadDriverAvatar(driverId, fileBuffer, mimeType, originalName) {
    logger.debug('Uploading driver avatar', { driverId, mimeType, originalName });
    try {
        const supabase = getClient();
        // Verify driver exists
        const driverResult = await getDriverById(driverId);
        if (!driverResult.success) {
            return {
                success: false,
                error: new DriverServiceError(`Driver not found: ${driverId}`, exports.DriverErrorCodes.NOT_FOUND, { driverId }),
            };
        }
        const driver = driverResult.data;
        // Generate unique filename with extension from mime type
        const extension = mimeType.split('/')[1]; // e.g., 'jpeg' from 'image/jpeg'
        const fileName = `avatar_${Date.now()}.${extension}`;
        const filePath = `drivers/${driverId}/${fileName}`;
        // Delete previous avatar if it exists
        if (driver.profileImageUrl) {
            try {
                // Extract path from URL (assuming format: ...storage/v1/object/public/avatars/path)
                const urlParts = driver.profileImageUrl.split('/avatars/');
                if (urlParts.length > 1 && urlParts[1]) {
                    const oldPath = urlParts[1];
                    await supabase.storage.from('avatars').remove([oldPath]);
                    logger.debug('Deleted previous avatar', { oldPath });
                }
            }
            catch (deleteError) {
                logger.warn('Failed to delete previous avatar, continuing with upload', { error: deleteError });
            }
        }
        // Upload new avatar to Supabase storage
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, fileBuffer, {
            contentType: mimeType,
            upsert: true,
        });
        if (uploadError) {
            logger.error('Failed to upload avatar to storage', uploadError);
            return {
                success: false,
                error: new DriverServiceError(`Failed to upload avatar: ${uploadError.message}`, exports.DriverErrorCodes.UPDATE_FAILED, uploadError),
            };
        }
        // Get public URL for the uploaded file
        const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
        const publicUrl = publicUrlData.publicUrl;
        // Update driver record with new profile_image_url
        const { error: updateError } = await supabase
            .from(DRIVERS_TABLE)
            .update({ profile_image_url: publicUrl })
            .eq('id', driverId);
        if (updateError) {
            logger.error('Failed to update driver with avatar URL', updateError);
            return {
                success: false,
                error: new DriverServiceError(`Failed to update driver with avatar URL: ${updateError.message}`, exports.DriverErrorCodes.UPDATE_FAILED, updateError),
            };
        }
        logger.info('Driver avatar uploaded successfully', { driverId, publicUrl });
        return { success: true, data: publicUrl };
    }
    catch (error) {
        logger.error('Unexpected error uploading driver avatar', error);
        return {
            success: false,
            error: new DriverServiceError('Unexpected error uploading driver avatar', exports.DriverErrorCodes.UPDATE_FAILED, error),
        };
    }
}
/**
 * Gets the avatar URL for a driver
 * Returns the public URL if profile_image_url exists, otherwise null
 */
async function getDriverAvatarUrl(driverId) {
    logger.debug('Getting driver avatar URL', { driverId });
    try {
        const driverResult = await getDriverById(driverId);
        if (!driverResult.success) {
            return {
                success: false,
                error: new DriverServiceError(`Driver not found: ${driverId}`, exports.DriverErrorCodes.NOT_FOUND, { driverId }),
            };
        }
        const driver = driverResult.data;
        return { success: true, data: driver.profileImageUrl ?? null };
    }
    catch (error) {
        logger.error('Unexpected error getting driver avatar URL', error);
        return {
            success: false,
            error: new DriverServiceError('Unexpected error getting driver avatar URL', exports.DriverErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Deletes a driver's avatar image
 * Removes the file from Supabase storage and clears the profile_image_url field
 */
async function deleteDriverAvatar(driverId) {
    logger.debug('Deleting driver avatar', { driverId });
    try {
        const supabase = getClient();
        // Get driver to check for existing avatar
        const driverResult = await getDriverById(driverId);
        if (!driverResult.success) {
            return {
                success: false,
                error: new DriverServiceError(`Driver not found: ${driverId}`, exports.DriverErrorCodes.NOT_FOUND, { driverId }),
            };
        }
        const driver = driverResult.data;
        // If no avatar exists, return success
        if (!driver.profileImageUrl) {
            logger.debug('No avatar to delete', { driverId });
            return { success: true };
        }
        // Extract path from URL
        const urlParts = driver.profileImageUrl.split('/avatars/');
        if (urlParts.length > 1 && urlParts[1]) {
            const filePath = urlParts[1];
            // Delete from storage
            const { error: deleteError } = await supabase.storage
                .from('avatars')
                .remove([filePath]);
            if (deleteError) {
                logger.error('Failed to delete avatar from storage', deleteError);
                return {
                    success: false,
                    error: new DriverServiceError(`Failed to delete avatar from storage: ${deleteError.message}`, exports.DriverErrorCodes.UPDATE_FAILED, deleteError),
                };
            }
        }
        // Update driver record to clear profile_image_url
        const { error: updateError } = await supabase
            .from(DRIVERS_TABLE)
            .update({ profile_image_url: null })
            .eq('id', driverId);
        if (updateError) {
            logger.error('Failed to clear driver avatar URL', updateError);
            return {
                success: false,
                error: new DriverServiceError(`Failed to clear driver avatar URL: ${updateError.message}`, exports.DriverErrorCodes.UPDATE_FAILED, updateError),
            };
        }
        logger.info('Driver avatar deleted successfully', { driverId });
        return { success: true };
    }
    catch (error) {
        logger.error('Unexpected error deleting driver avatar', error);
        return {
            success: false,
            error: new DriverServiceError('Unexpected error deleting driver avatar', exports.DriverErrorCodes.UPDATE_FAILED, error),
        };
    }
}
//# sourceMappingURL=driver.service.js.map