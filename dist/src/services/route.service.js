"use strict";
/**
 * Route Service
 *
 * Provides CRUD operations and business logic for managing routes
 * in the RouteIQ application.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteErrorCodes = exports.RouteServiceError = void 0;
exports.createRoute = createRoute;
exports.getRouteById = getRouteById;
exports.getRoutes = getRoutes;
exports.updateRoute = updateRoute;
exports.deleteRoute = deleteRoute;
exports.hardDeleteRoute = hardDeleteRoute;
exports.restoreRoute = restoreRoute;
exports.countRoutes = countRoutes;
exports.getRoutesByVehicle = getRoutesByVehicle;
exports.updateRouteStatus = updateRouteStatus;
exports.getRoutesByDateRange = getRoutesByDateRange;
exports.getNextAvailableRouteDate = getNextAvailableRouteDate;
exports.getRouteStatsByDateRange = getRouteStatsByDateRange;
const supabase_js_1 = require("./supabase.js");
const logger_js_1 = require("../utils/logger.js");
const route_js_1 = require("../types/route.js");
/**
 * Logger instance for route operations
 */
const logger = (0, logger_js_1.createContextLogger)('RouteService');
/**
 * Table name for routes
 */
const ROUTES_TABLE = 'routes';
/**
 * Route service error
 */
class RouteServiceError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.name = 'RouteServiceError';
        this.code = code;
        this.details = details;
    }
}
exports.RouteServiceError = RouteServiceError;
/**
 * Error codes for route service errors
 */
exports.RouteErrorCodes = {
    NOT_FOUND: 'ROUTE_NOT_FOUND',
    CREATE_FAILED: 'ROUTE_CREATE_FAILED',
    UPDATE_FAILED: 'ROUTE_UPDATE_FAILED',
    DELETE_FAILED: 'ROUTE_DELETE_FAILED',
    QUERY_FAILED: 'ROUTE_QUERY_FAILED',
    VALIDATION_FAILED: 'ROUTE_VALIDATION_FAILED',
};
/**
 * Validates route input data
 */
function validateRouteInput(input) {
    if (!input.routeName || input.routeName.trim().length === 0) {
        return {
            success: false,
            error: new RouteServiceError('Route name is required', exports.RouteErrorCodes.VALIDATION_FAILED, { field: 'routeName' }),
        };
    }
    if (!input.routeDate) {
        return {
            success: false,
            error: new RouteServiceError('Route date is required', exports.RouteErrorCodes.VALIDATION_FAILED, { field: 'routeDate' }),
        };
    }
    if (input.optimizationScore !== undefined && (input.optimizationScore < 0 || input.optimizationScore > 100)) {
        return {
            success: false,
            error: new RouteServiceError('Optimization score must be between 0 and 100', exports.RouteErrorCodes.VALIDATION_FAILED, { field: 'optimizationScore', value: input.optimizationScore }),
        };
    }
    if (input.totalDistanceKm !== undefined && input.totalDistanceKm < 0) {
        return {
            success: false,
            error: new RouteServiceError('Total distance cannot be negative', exports.RouteErrorCodes.VALIDATION_FAILED, { field: 'totalDistanceKm', value: input.totalDistanceKm }),
        };
    }
    if (input.totalDurationMinutes !== undefined && input.totalDurationMinutes < 0) {
        return {
            success: false,
            error: new RouteServiceError('Total duration cannot be negative', exports.RouteErrorCodes.VALIDATION_FAILED, { field: 'totalDurationMinutes', value: input.totalDurationMinutes }),
        };
    }
    return { success: true };
}
/**
 * Creates a new route
 */
async function createRoute(input) {
    logger.debug('Creating route', { name: input.routeName });
    // Validate input
    const validationResult = validateRouteInput(input);
    if (!validationResult.success) {
        return { success: false, error: validationResult.error };
    }
    try {
        // Use admin client if available to bypass RLS policies
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        const rowData = (0, route_js_1.routeInputToRow)(input);
        const { data, error } = await supabase
            .from(ROUTES_TABLE)
            .insert(rowData)
            .select()
            .single();
        if (error) {
            const errStr = JSON.stringify(error, Object.getOwnPropertyNames(error));
            logger.error(`Failed to create route: ${errStr}`);
            return {
                success: false,
                error: new RouteServiceError(`Failed to create route: ${error.message}`, exports.RouteErrorCodes.CREATE_FAILED, error),
            };
        }
        const route = (0, route_js_1.rowToRoute)(data);
        logger.info('Route created successfully', { routeId: route.id, name: route.routeName });
        return { success: true, data: route };
    }
    catch (error) {
        logger.error('Unexpected error creating route', error);
        return {
            success: false,
            error: new RouteServiceError('Unexpected error creating route', exports.RouteErrorCodes.CREATE_FAILED, error),
        };
    }
}
/**
 * Gets a route by ID
 */
async function getRouteById(id) {
    logger.debug('Getting route by ID', { id });
    try {
        // Use admin client if available to bypass RLS policies
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        const { data, error } = await supabase
            .from(ROUTES_TABLE)
            .select()
            .eq('id', id)
            .is('deleted_at', null)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new RouteServiceError(`Route not found: ${id}`, exports.RouteErrorCodes.NOT_FOUND, { id }),
                };
            }
            logger.error('Failed to get route', error);
            return {
                success: false,
                error: new RouteServiceError(`Failed to get route: ${error.message}`, exports.RouteErrorCodes.QUERY_FAILED, error),
            };
        }
        const route = (0, route_js_1.rowToRoute)(data);
        return { success: true, data: route };
    }
    catch (error) {
        logger.error('Unexpected error getting route', error);
        return {
            success: false,
            error: new RouteServiceError('Unexpected error getting route', exports.RouteErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Gets all routes with optional filtering and pagination
 */
async function getRoutes(filters, pagination) {
    logger.debug('Getting routes', { filters, pagination });
    try {
        // Use admin client if available to bypass RLS policies
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        let query = supabase.from(ROUTES_TABLE).select('*', { count: 'exact' });
        // Apply filters
        if (!filters?.includeDeleted) {
            query = query.is('deleted_at', null);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.vehicleId) {
            query = query.eq('vehicle_id', filters.vehicleId);
        }
        if (filters?.optimizationType) {
            query = query.eq('optimization_type', filters.optimizationType);
        }
        if (filters?.createdBy) {
            query = query.eq('created_by', filters.createdBy);
        }
        if (filters?.assignedTo) {
            query = query.eq('assigned_to', filters.assignedTo);
        }
        if (filters?.routeDate) {
            const d = filters.routeDate instanceof Date ? filters.routeDate : new Date(filters.routeDate);
            // Validate date
            if (!isNaN(d.getTime())) {
                const dateStr = d.toISOString().split('T')[0];
                query = query.eq('route_date', dateStr);
            }
        }
        if (filters?.routeDateFrom) {
            const d = filters.routeDateFrom instanceof Date ? filters.routeDateFrom : new Date(filters.routeDateFrom);
            if (!isNaN(d.getTime())) {
                const dateStr = d.toISOString().split('T')[0];
                query = query.gte('route_date', dateStr);
            }
        }
        if (filters?.routeDateTo) {
            const d = filters.routeDateTo instanceof Date ? filters.routeDateTo : new Date(filters.routeDateTo);
            if (!isNaN(d.getTime())) {
                const dateStr = d.toISOString().split('T')[0];
                query = query.lte('route_date', dateStr);
            }
        }
        if (filters?.searchTerm) {
            const term = filters.searchTerm;
            query = query.or(`route_name.ilike.%${term}%,route_code.ilike.%${term}%`);
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
            logger.error('Failed to get routes', error);
            return {
                success: false,
                error: new RouteServiceError(`Failed to get routes: ${error.message}`, exports.RouteErrorCodes.QUERY_FAILED, error),
            };
        }
        const routes = data.map(route_js_1.rowToRoute);
        const total = count ?? 0;
        // Fetch vehicle names and assigned driver IDs for routes that have a vehicleId
        const vehicleIds = [...new Set(routes.filter(r => r.vehicleId).map(r => r.vehicleId))];
        if (vehicleIds.length > 0) {
            const { data: vehiclesData } = await supabase
                .from('vehicles')
                .select('id, name, assigned_driver_id')
                .in('id', vehicleIds);
            if (vehiclesData) {
                const vehicleMap = new Map(vehiclesData.map(v => [v.id, v]));
                // Collect driver IDs to fetch names
                const driverIds = [...new Set(vehiclesData
                        .filter(v => v.assigned_driver_id)
                        .map(v => v.assigned_driver_id))];
                let driverMap = new Map();
                if (driverIds.length > 0) {
                    const { data: driversData } = await supabase
                        .from('drivers')
                        .select('id, first_name, last_name')
                        .in('id', driverIds);
                    if (driversData) {
                        driverMap = new Map(driversData.map(d => [
                            d.id,
                            { firstName: d.first_name, lastName: d.last_name }
                        ]));
                    }
                }
                routes.forEach(route => {
                    if (route.vehicleId) {
                        const vehicle = vehicleMap.get(route.vehicleId);
                        if (vehicle) {
                            route.vehicleName = vehicle.name;
                            route.driverId = vehicle.assigned_driver_id ?? undefined;
                            if (vehicle.assigned_driver_id) {
                                const driver = driverMap.get(vehicle.assigned_driver_id);
                                if (driver) {
                                    route.driverName = `${driver.firstName} ${driver.lastName}`;
                                }
                            }
                        }
                    }
                });
            }
        }
        return {
            success: true,
            data: {
                data: routes,
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
        logger.error('Unexpected error getting routes', error);
        return {
            success: false,
            error: new RouteServiceError('Unexpected error getting routes', exports.RouteErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Updates an existing route
 */
async function updateRoute(input) {
    logger.debug('Updating route', { id: input.id });
    // Validate input if name is being updated
    if (input.routeName !== undefined) {
        const validationResult = validateRouteInput({
            routeName: input.routeName,
            routeDate: input.routeDate ?? new Date(),
            ...input
        });
        if (!validationResult.success) {
            return { success: false, error: validationResult.error };
        }
    }
    try {
        // Use admin client if available to bypass RLS policies
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        // Build update object
        const { id } = input;
        const rowData = (0, route_js_1.updateRouteInputToRow)(input);
        const { data, error } = await supabase
            .from(ROUTES_TABLE)
            .update(rowData)
            .eq('id', id)
            .is('deleted_at', null)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new RouteServiceError(`Route not found: ${id}`, exports.RouteErrorCodes.NOT_FOUND, { id }),
                };
            }
            logger.error('Failed to update route', error);
            return {
                success: false,
                error: new RouteServiceError(`Failed to update route: ${error.message}`, exports.RouteErrorCodes.UPDATE_FAILED, error),
            };
        }
        const route = (0, route_js_1.rowToRoute)(data);
        logger.info('Route updated successfully', { routeId: route.id });
        return { success: true, data: route };
    }
    catch (error) {
        logger.error('Unexpected error updating route', error);
        return {
            success: false,
            error: new RouteServiceError('Unexpected error updating route', exports.RouteErrorCodes.UPDATE_FAILED, error),
        };
    }
}
/**
 * Soft deletes a route by setting deleted_at timestamp
 * Also resets the bookings assigned to this route so they can be re-planned
 */
async function deleteRoute(id) {
    logger.debug('Deleting route', { id });
    try {
        // Use admin client if available to bypass RLS policies
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        // First, get the route to find its booking IDs (stopSequence) and vehicle/date for fallback
        const { data: route, error: fetchError } = await supabase
            .from(ROUTES_TABLE)
            .select('stop_sequence, vehicle_id, route_date')
            .eq('id', id)
            .is('deleted_at', null)
            .single();
        if (fetchError) {
            logger.error('Failed to fetch route for deletion', fetchError);
            return {
                success: false,
                error: new RouteServiceError(`Failed to fetch route: ${fetchError.message}`, exports.RouteErrorCodes.DELETE_FAILED, fetchError),
            };
        }
        // Reset bookings - try by stop_sequence first, then fallback to vehicle_id + date
        if (route?.stop_sequence && route.stop_sequence.length > 0) {
            logger.debug('Resetting bookings for deleted route by stop_sequence', {
                routeId: id,
                bookingCount: route.stop_sequence.length
            });
            const { error: bookingError } = await supabase
                .from('bookings')
                .update({
                vehicle_id: null,
                status: 'confirmed'
            })
                .in('id', route.stop_sequence);
            if (bookingError) {
                logger.warn('Failed to reset bookings for deleted route', { error: bookingError.message });
            }
            else {
                logger.info('Reset bookings for deleted route', {
                    routeId: id,
                    bookingIds: route.stop_sequence
                });
            }
        }
        // Fallback: Also reset any bookings with matching vehicle_id and scheduled_date
        // This catches bookings that might have been missed if stop_sequence was incomplete
        if (route?.vehicle_id && route?.route_date) {
            logger.debug('Resetting bookings by vehicle_id and date as fallback', {
                routeId: id,
                vehicleId: route.vehicle_id,
                routeDate: route.route_date
            });
            const { error: fallbackError, count } = await supabase
                .from('bookings')
                .update({
                vehicle_id: null,
                status: 'confirmed'
            })
                .eq('vehicle_id', route.vehicle_id)
                .eq('scheduled_date', route.route_date)
                .is('deleted_at', null);
            if (fallbackError) {
                logger.warn('Failed fallback reset of bookings', { error: fallbackError.message });
            }
            else if (count && count > 0) {
                logger.info('Fallback reset additional bookings', { count });
            }
        }
        // Soft delete the route
        const { error } = await supabase
            .from(ROUTES_TABLE)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
            .is('deleted_at', null);
        if (error) {
            logger.error('Failed to delete route', error);
            return {
                success: false,
                error: new RouteServiceError(`Failed to delete route: ${error.message}`, exports.RouteErrorCodes.DELETE_FAILED, error),
            };
        }
        logger.info('Route deleted successfully', { routeId: id });
        return { success: true };
    }
    catch (error) {
        logger.error('Unexpected error deleting route', error);
        return {
            success: false,
            error: new RouteServiceError('Unexpected error deleting route', exports.RouteErrorCodes.DELETE_FAILED, error),
        };
    }
}
/**
 * Permanently deletes a route (hard delete)
 * Use with caution - this cannot be undone
 */
async function hardDeleteRoute(id) {
    logger.warn('Hard deleting route', { id });
    try {
        const adminClient = (0, supabase_js_1.getAdminSupabaseClient)();
        if (!adminClient) {
            return {
                success: false,
                error: new RouteServiceError('Admin client not available for hard delete operation', exports.RouteErrorCodes.DELETE_FAILED),
            };
        }
        const { error } = await adminClient
            .from(ROUTES_TABLE)
            .delete()
            .eq('id', id);
        if (error) {
            logger.error('Failed to hard delete route', error);
            return {
                success: false,
                error: new RouteServiceError(`Failed to hard delete route: ${error.message}`, exports.RouteErrorCodes.DELETE_FAILED, error),
            };
        }
        logger.info('Route hard deleted successfully', { routeId: id });
        return { success: true };
    }
    catch (error) {
        logger.error('Unexpected error hard deleting route', error);
        return {
            success: false,
            error: new RouteServiceError('Unexpected error hard deleting route', exports.RouteErrorCodes.DELETE_FAILED, error),
        };
    }
}
/**
 * Restores a soft-deleted route
 */
async function restoreRoute(id) {
    logger.debug('Restoring route', { id });
    try {
        // Use admin client if available to bypass RLS policies
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        const { data, error } = await supabase
            .from(ROUTES_TABLE)
            .update({ deleted_at: null })
            .eq('id', id)
            .not('deleted_at', 'is', null)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new RouteServiceError(`Deleted route not found: ${id}`, exports.RouteErrorCodes.NOT_FOUND, { id }),
                };
            }
            logger.error('Failed to restore route', error);
            return {
                success: false,
                error: new RouteServiceError(`Failed to restore route: ${error.message}`, exports.RouteErrorCodes.UPDATE_FAILED, error),
            };
        }
        const route = (0, route_js_1.rowToRoute)(data);
        logger.info('Route restored successfully', { routeId: route.id });
        return { success: true, data: route };
    }
    catch (error) {
        logger.error('Unexpected error restoring route', error);
        return {
            success: false,
            error: new RouteServiceError('Unexpected error restoring route', exports.RouteErrorCodes.UPDATE_FAILED, error),
        };
    }
}
/**
 * Counts routes with optional filters
 */
async function countRoutes(filters) {
    logger.debug('Counting routes', { filters });
    try {
        // Use admin client if available to bypass RLS policies
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        let query = supabase.from(ROUTES_TABLE).select('*', { count: 'exact', head: true });
        if (!filters?.includeDeleted) {
            query = query.is('deleted_at', null);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.vehicleId) {
            query = query.eq('vehicle_id', filters.vehicleId);
        }
        if (filters?.optimizationType) {
            query = query.eq('optimization_type', filters.optimizationType);
        }
        const { count, error } = await query;
        if (error) {
            logger.error('Failed to count routes', error);
            return {
                success: false,
                error: new RouteServiceError(`Failed to count routes: ${error.message}`, exports.RouteErrorCodes.QUERY_FAILED, error),
            };
        }
        return { success: true, data: count ?? 0 };
    }
    catch (error) {
        logger.error('Unexpected error counting routes', error);
        return {
            success: false,
            error: new RouteServiceError('Unexpected error counting routes', exports.RouteErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Gets routes by vehicle ID
 */
async function getRoutesByVehicle(vehicleId, filters) {
    logger.debug('Getting routes by vehicle', { vehicleId });
    try {
        // Use admin client if available to bypass RLS policies
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        let query = supabase
            .from(ROUTES_TABLE)
            .select()
            .eq('vehicle_id', vehicleId);
        if (!filters?.includeDeleted) {
            query = query.is('deleted_at', null);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.routeDate) {
            const dateStr = filters.routeDate.toISOString().split('T')[0];
            query = query.eq('route_date', dateStr);
        }
        const { data, error } = await query;
        if (error) {
            logger.error('Failed to get routes by vehicle', error);
            return {
                success: false,
                error: new RouteServiceError(`Failed to get routes by vehicle: ${error.message}`, exports.RouteErrorCodes.QUERY_FAILED, error),
            };
        }
        const routes = data.map(route_js_1.rowToRoute);
        return { success: true, data: routes };
    }
    catch (error) {
        logger.error('Unexpected error getting routes by vehicle', error);
        return {
            success: false,
            error: new RouteServiceError('Unexpected error getting routes by vehicle', exports.RouteErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Updates route status
 */
async function updateRouteStatus(id, status) {
    logger.debug('Updating route status', { id, status });
    try {
        // Use admin client if available to bypass RLS policies
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        const { data, error } = await supabase
            .from(ROUTES_TABLE)
            .update({ status })
            .eq('id', id)
            .is('deleted_at', null)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new RouteServiceError(`Route not found: ${id}`, exports.RouteErrorCodes.NOT_FOUND, { id }),
                };
            }
            logger.error('Failed to update route status', error);
            return {
                success: false,
                error: new RouteServiceError(`Failed to update route status: ${error.message}`, exports.RouteErrorCodes.UPDATE_FAILED, error),
            };
        }
        const route = (0, route_js_1.rowToRoute)(data);
        logger.info('Route status updated successfully', { routeId: route.id, status });
        return { success: true, data: route };
    }
    catch (error) {
        logger.error('Unexpected error updating route status', error);
        return {
            success: false,
            error: new RouteServiceError('Unexpected error updating route status', exports.RouteErrorCodes.UPDATE_FAILED, error),
        };
    }
}
/**
 * Gets routes for a specific date range
 */
async function getRoutesByDateRange(startDate, endDate, filters) {
    logger.debug('Getting routes by date range', { startDate, endDate });
    try {
        // Use admin client if available to bypass RLS policies
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        let query = supabase
            .from(ROUTES_TABLE)
            .select()
            .gte('route_date', startDateStr)
            .lte('route_date', endDateStr);
        if (!filters?.includeDeleted) {
            query = query.is('deleted_at', null);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.vehicleId) {
            query = query.eq('vehicle_id', filters.vehicleId);
        }
        query = query.order('route_date', { ascending: true });
        const { data, error } = await query;
        if (error) {
            logger.error('Failed to get routes by date range', error);
            return {
                success: false,
                error: new RouteServiceError(`Failed to get routes by date range: ${error.message}`, exports.RouteErrorCodes.QUERY_FAILED, error),
            };
        }
        const routes = data.map(route_js_1.rowToRoute);
        return { success: true, data: routes };
    }
    catch (error) {
        logger.error('Unexpected error getting routes by date range', error);
        return {
            success: false,
            error: new RouteServiceError('Unexpected error getting routes by date range', exports.RouteErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Gets the next available route date on or after the given date
 * Returns the date as a YYYY-MM-DD string to avoid timezone issues
 */
async function getNextAvailableRouteDate(fromDate) {
    logger.debug('Getting next available route date', { fromDate });
    try {
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        // Handle both Date objects and strings (from JSON RPC)
        const dateObj = fromDate instanceof Date ? fromDate : new Date(fromDate);
        // Default to today if invalid date passed
        const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;
        const fromDateStr = validDate.toISOString().split('T')[0];
        // Find the first date with any non-deleted route
        const { data, error } = await supabase
            .from(ROUTES_TABLE)
            .select('route_date')
            .gte('route_date', fromDateStr)
            .is('deleted_at', null)
            .order('route_date', { ascending: true })
            .limit(1)
            .maybeSingle();
        if (error) {
            logger.error('Failed to get next available route date', error);
            return {
                success: false,
                error: new RouteServiceError(`Failed to get next available route date: ${error.message}`, exports.RouteErrorCodes.QUERY_FAILED, error)
            };
        }
        if (!data) {
            return { success: true, data: null };
        }
        // Return the raw date string from DB (YYYY-MM-DD)
        return { success: true, data: data.route_date };
    }
    catch (error) {
        logger.error('Unexpected error getting next available route date', error);
        return {
            success: false,
            error: new RouteServiceError('Unexpected error getting next available route date', exports.RouteErrorCodes.QUERY_FAILED, error)
        };
    }
}
/**
 * Gets route statistics grouped by date and status for a date range
 * Accepts string dates (YYYY-MM-DD) to ensure exact range matching without timezone shifts
 */
async function getRouteStatsByDateRange(startDateStr, endDateStr) {
    logger.debug('Getting route stats by date range', { startDateStr, endDateStr });
    try {
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        const { data, error } = await supabase
            .from(ROUTES_TABLE)
            .select('route_date, status')
            .gte('route_date', startDateStr)
            .lte('route_date', endDateStr)
            .is('deleted_at', null);
        if (error) {
            logger.error('Failed to get route stats', error);
            return {
                success: false,
                error: new RouteServiceError(`Failed to get route stats: ${error.message}`, exports.RouteErrorCodes.QUERY_FAILED, error)
            };
        }
        // Aggregate stats in memory
        const stats = {};
        // Initialize dates in range to empty objects (optional, or handled by frontend)
        // We'll let the frontend handle missing dates
        data.forEach(row => {
            const date = row.route_date;
            const status = row.status;
            if (!stats[date]) {
                stats[date] = {};
            }
            if (!stats[date][status]) {
                stats[date][status] = 0;
            }
            stats[date][status]++;
        });
        return { success: true, data: stats };
    }
    catch (error) {
        logger.error('Unexpected error getting route stats', error);
        return {
            success: false,
            error: new RouteServiceError('Unexpected error getting route stats', exports.RouteErrorCodes.QUERY_FAILED, error)
        };
    }
}
//# sourceMappingURL=route.service.js.map