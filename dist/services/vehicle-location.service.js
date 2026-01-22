"use strict";
/**
 * Vehicle Location Service
 * Manages the many-to-many relationship between vehicles and locations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVehicleLocations = getVehicleLocations;
exports.getVehiclePrimaryLocation = getVehiclePrimaryLocation;
exports.setVehicleLocations = setVehicleLocations;
exports.addVehicleLocation = addVehicleLocation;
exports.removeVehicleLocation = removeVehicleLocation;
exports.setVehiclePrimaryLocation = setVehiclePrimaryLocation;
const supabase_1 = require("./supabase");
const logger_1 = require("../utils/logger");
const vehicle_location_1 = require("../types/vehicle-location");
const logger = (0, logger_1.createContextLogger)('VehicleLocationService');
/**
 * Get all locations associated with a vehicle
 */
async function getVehicleLocations(vehicleId) {
    const supabase = (0, supabase_1.getAdminSupabaseClient)() || (0, supabase_1.getSupabaseClient)();
    try {
        const { data, error } = await supabase
            .from('vehicle_locations')
            .select('*')
            .eq('vehicle_id', vehicleId)
            .order('is_primary', { ascending: false });
        if (error) {
            logger.error('Failed to fetch vehicle locations', { error, vehicleId });
            return { success: false, error };
        }
        const locations = data.map(vehicle_location_1.rowToVehicleLocation);
        return { success: true, data: locations };
    }
    catch (error) {
        logger.error('Unexpected error fetching vehicle locations', { error });
        return { success: false, error: error };
    }
}
/**
 * Get the primary location for a vehicle
 */
async function getVehiclePrimaryLocation(vehicleId) {
    const supabase = (0, supabase_1.getAdminSupabaseClient)() || (0, supabase_1.getSupabaseClient)();
    try {
        const { data, error } = await supabase
            .from('vehicle_locations')
            .select('*')
            .eq('vehicle_id', vehicleId)
            .eq('is_primary', true)
            .single();
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            logger.error('Failed to fetch primary location', { error, vehicleId });
            return { success: false, error };
        }
        if (!data) {
            return { success: true, data: null };
        }
        return { success: true, data: (0, vehicle_location_1.rowToVehicleLocation)(data) };
    }
    catch (error) {
        logger.error('Unexpected error fetching primary location', { error });
        return { success: false, error: error };
    }
}
/**
 * Set locations for a vehicle (replaces all existing associations)
 */
async function setVehicleLocations(vehicleId, locations) {
    const supabase = (0, supabase_1.getAdminSupabaseClient)() || (0, supabase_1.getSupabaseClient)();
    try {
        // Delete existing associations
        const { error: deleteError } = await supabase
            .from('vehicle_locations')
            .delete()
            .eq('vehicle_id', vehicleId);
        if (deleteError) {
            logger.error('Failed to delete existing vehicle locations', { error: deleteError, vehicleId });
            return { success: false, error: deleteError };
        }
        // If no locations to add, return empty
        if (locations.length === 0) {
            return { success: true, data: [] };
        }
        // Ensure only one primary
        const hasPrimary = locations.some(l => l.isPrimary);
        const rows = locations.map((loc, idx) => ({
            vehicle_id: vehicleId,
            location_id: loc.locationId,
            is_primary: loc.isPrimary ?? (!hasPrimary && idx === 0), // First becomes primary if none set
        }));
        const { data, error } = await supabase
            .from('vehicle_locations')
            .insert(rows)
            .select();
        if (error) {
            logger.error('Failed to insert vehicle locations', { error, vehicleId });
            return { success: false, error };
        }
        const vehicleLocations = data.map(vehicle_location_1.rowToVehicleLocation);
        return { success: true, data: vehicleLocations };
    }
    catch (error) {
        logger.error('Unexpected error setting vehicle locations', { error });
        return { success: false, error: error };
    }
}
/**
 * Add a single location to a vehicle
 */
async function addVehicleLocation(vehicleId, locationId, isPrimary = false) {
    const supabase = (0, supabase_1.getAdminSupabaseClient)() || (0, supabase_1.getSupabaseClient)();
    try {
        // If setting as primary, unset other primaries first
        if (isPrimary) {
            await supabase
                .from('vehicle_locations')
                .update({ is_primary: false })
                .eq('vehicle_id', vehicleId);
        }
        const { data, error } = await supabase
            .from('vehicle_locations')
            .insert({
            vehicle_id: vehicleId,
            location_id: locationId,
            is_primary: isPrimary,
        })
            .select()
            .single();
        if (error) {
            logger.error('Failed to add vehicle location', { error, vehicleId, locationId });
            return { success: false, error };
        }
        return { success: true, data: (0, vehicle_location_1.rowToVehicleLocation)(data) };
    }
    catch (error) {
        logger.error('Unexpected error adding vehicle location', { error });
        return { success: false, error: error };
    }
}
/**
 * Remove a location from a vehicle
 */
async function removeVehicleLocation(vehicleId, locationId) {
    const supabase = (0, supabase_1.getAdminSupabaseClient)() || (0, supabase_1.getSupabaseClient)();
    try {
        const { error } = await supabase
            .from('vehicle_locations')
            .delete()
            .eq('vehicle_id', vehicleId)
            .eq('location_id', locationId);
        if (error) {
            logger.error('Failed to remove vehicle location', { error, vehicleId, locationId });
            return { success: false, error };
        }
        return { success: true, data: undefined };
    }
    catch (error) {
        logger.error('Unexpected error removing vehicle location', { error });
        return { success: false, error: error };
    }
}
/**
 * Set primary location for a vehicle
 */
async function setVehiclePrimaryLocation(vehicleId, locationId) {
    const supabase = (0, supabase_1.getAdminSupabaseClient)() || (0, supabase_1.getSupabaseClient)();
    try {
        // Unset all primaries for this vehicle
        await supabase
            .from('vehicle_locations')
            .update({ is_primary: false })
            .eq('vehicle_id', vehicleId);
        // Set the new primary
        const { error } = await supabase
            .from('vehicle_locations')
            .update({ is_primary: true })
            .eq('vehicle_id', vehicleId)
            .eq('location_id', locationId);
        if (error) {
            logger.error('Failed to set primary location', { error, vehicleId, locationId });
            return { success: false, error };
        }
        return { success: true, data: undefined };
    }
    catch (error) {
        logger.error('Unexpected error setting primary location', { error });
        return { success: false, error: error };
    }
}
//# sourceMappingURL=vehicle-location.service.js.map