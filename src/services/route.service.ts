/**
 * Route Service
 *
 * Provides CRUD operations and business logic for managing routes
 * in the RouteIQ application.
 */

import { getSupabaseClient, getAdminSupabaseClient } from './supabase.js';
import { createContextLogger } from '../utils/logger.js';
import type { Result, PaginationParams, PaginatedResponse } from '../types/index.js';
import type {
  Route,
  RouteRow,
  CreateRouteInput,
  UpdateRouteInput,
  RouteFilters,
} from '../types/route.js';
import {
  rowToRoute as convertRowToRoute,
  routeInputToRow as convertInputToRow,
  updateRouteInputToRow as convertUpdateInputToRow,
} from '../types/route.js';

/**
 * Logger instance for route operations
 */
const logger = createContextLogger('RouteService');

/**
 * Table name for routes
 */
const ROUTES_TABLE = 'routes';

/**
 * Route service error
 */
export class RouteServiceError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'RouteServiceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Error codes for route service errors
 */
export const RouteErrorCodes = {
  NOT_FOUND: 'ROUTE_NOT_FOUND',
  CREATE_FAILED: 'ROUTE_CREATE_FAILED',
  UPDATE_FAILED: 'ROUTE_UPDATE_FAILED',
  DELETE_FAILED: 'ROUTE_DELETE_FAILED',
  QUERY_FAILED: 'ROUTE_QUERY_FAILED',
  VALIDATION_FAILED: 'ROUTE_VALIDATION_FAILED',
} as const;

/**
 * Validates route input data
 */
function validateRouteInput(input: CreateRouteInput): Result<void> {
  if (!input.routeName || input.routeName.trim().length === 0) {
    return {
      success: false,
      error: new RouteServiceError(
        'Route name is required',
        RouteErrorCodes.VALIDATION_FAILED,
        { field: 'routeName' }
      ),
    };
  }

  if (!input.routeDate) {
    return {
      success: false,
      error: new RouteServiceError(
        'Route date is required',
        RouteErrorCodes.VALIDATION_FAILED,
        { field: 'routeDate' }
      ),
    };
  }

  if (input.optimizationScore !== undefined && (input.optimizationScore < 0 || input.optimizationScore > 100)) {
    return {
      success: false,
      error: new RouteServiceError(
        'Optimization score must be between 0 and 100',
        RouteErrorCodes.VALIDATION_FAILED,
        { field: 'optimizationScore', value: input.optimizationScore }
      ),
    };
  }

  if (input.totalDistanceKm !== undefined && input.totalDistanceKm < 0) {
    return {
      success: false,
      error: new RouteServiceError(
        'Total distance cannot be negative',
        RouteErrorCodes.VALIDATION_FAILED,
        { field: 'totalDistanceKm', value: input.totalDistanceKm }
      ),
    };
  }

  if (input.totalDurationMinutes !== undefined && input.totalDurationMinutes < 0) {
    return {
      success: false,
      error: new RouteServiceError(
        'Total duration cannot be negative',
        RouteErrorCodes.VALIDATION_FAILED,
        { field: 'totalDurationMinutes', value: input.totalDurationMinutes }
      ),
    };
  }

  return { success: true };
}

/**
 * Creates a new route
 */
export async function createRoute(input: CreateRouteInput): Promise<Result<Route>> {
  logger.debug('Creating route', { name: input.routeName });

  // Validate input
  const validationResult = validateRouteInput(input);
  if (!validationResult.success) {
    return { success: false, error: validationResult.error };
  }

  try {
    // Use admin client if available to bypass RLS policies
    const supabase = getAdminSupabaseClient() || getSupabaseClient();
    const rowData = convertInputToRow(input);

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
        error: new RouteServiceError(
          `Failed to create route: ${error.message}`,
          RouteErrorCodes.CREATE_FAILED,
          error
        ),
      };
    }

    const route = convertRowToRoute(data as RouteRow);
    logger.info('Route created successfully', { routeId: route.id, name: route.routeName });

    return { success: true, data: route };
  } catch (error) {
    logger.error('Unexpected error creating route', error);
    return {
      success: false,
      error: new RouteServiceError(
        'Unexpected error creating route',
        RouteErrorCodes.CREATE_FAILED,
        error
      ),
    };
  }
}

/**
 * Gets a route by ID
 */
export async function getRouteById(id: string): Promise<Result<Route>> {
  logger.debug('Getting route by ID', { id });

  try {
    // Use admin client if available to bypass RLS policies
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

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
          error: new RouteServiceError(
            `Route not found: ${id}`,
            RouteErrorCodes.NOT_FOUND,
            { id }
          ),
        };
      }
      logger.error('Failed to get route', error);
      return {
        success: false,
        error: new RouteServiceError(
          `Failed to get route: ${error.message}`,
          RouteErrorCodes.QUERY_FAILED,
          error
        ),
      };
    }

    const route = convertRowToRoute(data as RouteRow);
    return { success: true, data: route };
  } catch (error) {
    logger.error('Unexpected error getting route', error);
    return {
      success: false,
      error: new RouteServiceError(
        'Unexpected error getting route',
        RouteErrorCodes.QUERY_FAILED,
        error
      ),
    };
  }
}

/**
 * Gets all routes with optional filtering and pagination
 */
export async function getRoutes(
  filters?: RouteFilters,
  pagination?: PaginationParams
): Promise<Result<PaginatedResponse<Route>>> {
  logger.debug('Getting routes', { filters, pagination });

  try {
    // Use admin client if available to bypass RLS policies
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

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
        error: new RouteServiceError(
          `Failed to get routes: ${error.message}`,
          RouteErrorCodes.QUERY_FAILED,
          error
        ),
      };
    }

    const routes = (data as RouteRow[]).map(convertRowToRoute);
    const total = count ?? 0;

    // Fetch vehicle names for routes that have a vehicleId
    const vehicleIds = [...new Set(routes.filter(r => r.vehicleId).map(r => r.vehicleId!))] as string[];
    if (vehicleIds.length > 0) {
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('id, name')
        .in('id', vehicleIds);

      if (vehiclesData) {
        const vehicleMap = new Map(vehiclesData.map(v => [v.id, v]));
        routes.forEach(route => {
          if (route.vehicleId) {
            const vehicle = vehicleMap.get(route.vehicleId);
            if (vehicle) {
              route.vehicleName = vehicle.name;
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
  } catch (error) {
    logger.error('Unexpected error getting routes', error);
    return {
      success: false,
      error: new RouteServiceError(
        'Unexpected error getting routes',
        RouteErrorCodes.QUERY_FAILED,
        error
      ),
    };
  }
}

/**
 * Updates an existing route
 */
export async function updateRoute(input: UpdateRouteInput): Promise<Result<Route>> {
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
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    // Build update object
    const { id } = input;
    const rowData = convertUpdateInputToRow(input);

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
          error: new RouteServiceError(
            `Route not found: ${id}`,
            RouteErrorCodes.NOT_FOUND,
            { id }
          ),
        };
      }
      logger.error('Failed to update route', error);
      return {
        success: false,
        error: new RouteServiceError(
          `Failed to update route: ${error.message}`,
          RouteErrorCodes.UPDATE_FAILED,
          error
        ),
      };
    }

    const route = convertRowToRoute(data as RouteRow);
    logger.info('Route updated successfully', { routeId: route.id });

    return { success: true, data: route };
  } catch (error) {
    logger.error('Unexpected error updating route', error);
    return {
      success: false,
      error: new RouteServiceError(
        'Unexpected error updating route',
        RouteErrorCodes.UPDATE_FAILED,
        error
      ),
    };
  }
}

/**
 * Soft deletes a route by setting deleted_at timestamp
 * Also resets the bookings assigned to this route so they can be re-planned
 */
export async function deleteRoute(id: string): Promise<Result<void>> {
  logger.debug('Deleting route', { id });

  try {
    // Use admin client if available to bypass RLS policies
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

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
        error: new RouteServiceError(
          `Failed to fetch route: ${fetchError.message}`,
          RouteErrorCodes.DELETE_FAILED,
          fetchError
        ),
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
      } else {
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
      } else if (count && count > 0) {
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
        error: new RouteServiceError(
          `Failed to delete route: ${error.message}`,
          RouteErrorCodes.DELETE_FAILED,
          error
        ),
      };
    }

    logger.info('Route deleted successfully', { routeId: id });
    return { success: true };
  } catch (error) {
    logger.error('Unexpected error deleting route', error);
    return {
      success: false,
      error: new RouteServiceError(
        'Unexpected error deleting route',
        RouteErrorCodes.DELETE_FAILED,
        error
      ),
    };
  }
}

/**
 * Permanently deletes a route (hard delete)
 * Use with caution - this cannot be undone
 */
export async function hardDeleteRoute(id: string): Promise<Result<void>> {
  logger.warn('Hard deleting route', { id });

  try {
    const adminClient = getAdminSupabaseClient();

    if (!adminClient) {
      return {
        success: false,
        error: new RouteServiceError(
          'Admin client not available for hard delete operation',
          RouteErrorCodes.DELETE_FAILED
        ),
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
        error: new RouteServiceError(
          `Failed to hard delete route: ${error.message}`,
          RouteErrorCodes.DELETE_FAILED,
          error
        ),
      };
    }

    logger.info('Route hard deleted successfully', { routeId: id });
    return { success: true };
  } catch (error) {
    logger.error('Unexpected error hard deleting route', error);
    return {
      success: false,
      error: new RouteServiceError(
        'Unexpected error hard deleting route',
        RouteErrorCodes.DELETE_FAILED,
        error
      ),
    };
  }
}

/**
 * Restores a soft-deleted route
 */
export async function restoreRoute(id: string): Promise<Result<Route>> {
  logger.debug('Restoring route', { id });

  try {
    // Use admin client if available to bypass RLS policies
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

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
          error: new RouteServiceError(
            `Deleted route not found: ${id}`,
            RouteErrorCodes.NOT_FOUND,
            { id }
          ),
        };
      }
      logger.error('Failed to restore route', error);
      return {
        success: false,
        error: new RouteServiceError(
          `Failed to restore route: ${error.message}`,
          RouteErrorCodes.UPDATE_FAILED,
          error
        ),
      };
    }

    const route = convertRowToRoute(data as RouteRow);
    logger.info('Route restored successfully', { routeId: route.id });

    return { success: true, data: route };
  } catch (error) {
    logger.error('Unexpected error restoring route', error);
    return {
      success: false,
      error: new RouteServiceError(
        'Unexpected error restoring route',
        RouteErrorCodes.UPDATE_FAILED,
        error
      ),
    };
  }
}

/**
 * Counts routes with optional filters
 */
export async function countRoutes(filters?: RouteFilters): Promise<Result<number>> {
  logger.debug('Counting routes', { filters });

  try {
    // Use admin client if available to bypass RLS policies
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

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
        error: new RouteServiceError(
          `Failed to count routes: ${error.message}`,
          RouteErrorCodes.QUERY_FAILED,
          error
        ),
      };
    }

    return { success: true, data: count ?? 0 };
  } catch (error) {
    logger.error('Unexpected error counting routes', error);
    return {
      success: false,
      error: new RouteServiceError(
        'Unexpected error counting routes',
        RouteErrorCodes.QUERY_FAILED,
        error
      ),
    };
  }
}

/**
 * Gets routes by vehicle ID
 */
export async function getRoutesByVehicle(
  vehicleId: string,
  filters?: Omit<RouteFilters, 'vehicleId'>
): Promise<Result<Route[]>> {
  logger.debug('Getting routes by vehicle', { vehicleId });

  try {
    // Use admin client if available to bypass RLS policies
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

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
        error: new RouteServiceError(
          `Failed to get routes by vehicle: ${error.message}`,
          RouteErrorCodes.QUERY_FAILED,
          error
        ),
      };
    }

    const routes = (data as RouteRow[]).map(convertRowToRoute);
    return { success: true, data: routes };
  } catch (error) {
    logger.error('Unexpected error getting routes by vehicle', error);
    return {
      success: false,
      error: new RouteServiceError(
        'Unexpected error getting routes by vehicle',
        RouteErrorCodes.QUERY_FAILED,
        error
      ),
    };
  }
}

/**
 * Updates route status
 */
export async function updateRouteStatus(
  id: string,
  status: Route['status']
): Promise<Result<Route>> {
  logger.debug('Updating route status', { id, status });

  try {
    // Use admin client if available to bypass RLS policies
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

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
          error: new RouteServiceError(
            `Route not found: ${id}`,
            RouteErrorCodes.NOT_FOUND,
            { id }
          ),
        };
      }
      logger.error('Failed to update route status', error);
      return {
        success: false,
        error: new RouteServiceError(
          `Failed to update route status: ${error.message}`,
          RouteErrorCodes.UPDATE_FAILED,
          error
        ),
      };
    }

    const route = convertRowToRoute(data as RouteRow);
    logger.info('Route status updated successfully', { routeId: route.id, status });

    return { success: true, data: route };
  } catch (error) {
    logger.error('Unexpected error updating route status', error);
    return {
      success: false,
      error: new RouteServiceError(
        'Unexpected error updating route status',
        RouteErrorCodes.UPDATE_FAILED,
        error
      ),
    };
  }
}

/**
 * Gets routes for a specific date range
 */
export async function getRoutesByDateRange(
  startDate: Date,
  endDate: Date,
  filters?: Omit<RouteFilters, 'routeDateFrom' | 'routeDateTo'>
): Promise<Result<Route[]>> {
  logger.debug('Getting routes by date range', { startDate, endDate });

  try {
    // Use admin client if available to bypass RLS policies
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

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
        error: new RouteServiceError(
          `Failed to get routes by date range: ${error.message}`,
          RouteErrorCodes.QUERY_FAILED,
          error
        ),
      };
    }

    const routes = (data as RouteRow[]).map(convertRowToRoute);
    return { success: true, data: routes };
  } catch (error) {
    logger.error('Unexpected error getting routes by date range', error);
    return {
      success: false,
      error: new RouteServiceError(
        'Unexpected error getting routes by date range',
        RouteErrorCodes.QUERY_FAILED,
        error
      ),
    };
  }
}

/**
 * Gets the next available route date on or after the given date
 * Returns the date as a YYYY-MM-DD string to avoid timezone issues
 */
export async function getNextAvailableRouteDate(fromDate: Date | string): Promise<Result<string | null>> {
  logger.debug('Getting next available route date', { fromDate });

  try {
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

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
        error: new RouteServiceError(
          `Failed to get next available route date: ${error.message}`,
          RouteErrorCodes.QUERY_FAILED,
          error
        )
      };
    }

    if (!data) {
      return { success: true, data: null };
    }

    // Return the raw date string from DB (YYYY-MM-DD)
    return { success: true, data: data.route_date };
  } catch (error) {
    logger.error('Unexpected error getting next available route date', error);
    return {
      success: false,
      error: new RouteServiceError(
        'Unexpected error getting next available route date',
        RouteErrorCodes.QUERY_FAILED,
        error
      )
    };
  }
}

/**
 * Gets route statistics grouped by date and status for a date range
 * Accepts string dates (YYYY-MM-DD) to ensure exact range matching without timezone shifts
 */
export async function getRouteStatsByDateRange(
  startDateStr: string,
  endDateStr: string
): Promise<Result<Record<string, Record<string, number>>>> {
  logger.debug('Getting route stats by date range', { startDateStr, endDateStr });

  try {
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

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
        error: new RouteServiceError(
          `Failed to get route stats: ${error.message}`,
          RouteErrorCodes.QUERY_FAILED,
          error
        )
      };
    }

    // Aggregate stats in memory
    const stats: Record<string, Record<string, number>> = {};

    // Initialize dates in range to empty objects (optional, or handled by frontend)
    // We'll let the frontend handle missing dates

    (data as any[]).forEach(row => {
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

  } catch (error) {
    logger.error('Unexpected error getting route stats', error);
    return {
      success: false,
      error: new RouteServiceError(
        'Unexpected error getting route stats',
        RouteErrorCodes.QUERY_FAILED,
        error
      )
    };
  }
}
