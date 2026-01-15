/**
 * Driver Service
 *
 * Provides CRUD operations and business logic for managing drivers
 * in the OptiRoute application.
 */

import { getSupabaseClient, getAdminSupabaseClient } from './supabase.js';
import { createContextLogger } from '../utils/logger.js';
import type { Result, PaginationParams, PaginatedResponse } from '../types/index.js';
import type {
  Driver,
  DriverRow,
  CreateDriverInput,
  UpdateDriverInput,
  DriverFilters,
} from '../types/driver.js';
import { rowToDriver as convertRowToDriver, driverInputToRow as convertInputToRow } from '../types/driver.js';
import type { Vehicle, VehicleRow } from '../types/vehicle.js';
import { rowToVehicle } from '../types/vehicle.js';

/**
 * Logger instance for driver operations
 */
const logger = createContextLogger('DriverService');

/**
 * Table name for drivers in the optiroute schema
 */
const DRIVERS_TABLE = 'drivers';

/**
 * Driver service error
 */
export class DriverServiceError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'DriverServiceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Error codes for driver service errors
 */
export const DriverErrorCodes = {
  NOT_FOUND: 'DRIVER_NOT_FOUND',
  CREATE_FAILED: 'DRIVER_CREATE_FAILED',
  UPDATE_FAILED: 'DRIVER_UPDATE_FAILED',
  DELETE_FAILED: 'DRIVER_DELETE_FAILED',
  QUERY_FAILED: 'DRIVER_QUERY_FAILED',
  VALIDATION_FAILED: 'DRIVER_VALIDATION_FAILED',
} as const;

/**
 * Validates driver input data
 */
function validateDriverInput(input: CreateDriverInput): Result<void> {
  if (!input.firstName || input.firstName.trim().length === 0) {
    return {
      success: false,
      error: new DriverServiceError(
        'Driver first name is required',
        DriverErrorCodes.VALIDATION_FAILED,
        { field: 'firstName' }
      ),
    };
  }

  if (!input.lastName || input.lastName.trim().length === 0) {
    return {
      success: false,
      error: new DriverServiceError(
        'Driver last name is required',
        DriverErrorCodes.VALIDATION_FAILED,
        { field: 'lastName' }
      ),
    };
  }

  if (input.email && !isValidEmail(input.email)) {
    return {
      success: false,
      error: new DriverServiceError(
        'Invalid email format',
        DriverErrorCodes.VALIDATION_FAILED,
        { field: 'email', value: input.email }
      ),
    };
  }

  return { success: true };
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper to get the appropriate Supabase client
 * Prefers admin client for privileged operations, falls back to standard client
 */
function getClient() {
  const adminClient = getAdminSupabaseClient();
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
export async function createDriver(input: CreateDriverInput): Promise<Result<Driver>> {
  logger.debug('Creating driver', { firstName: input.firstName, lastName: input.lastName });

  // Validate input
  const validationResult = validateDriverInput(input);
  if (!validationResult.success) {
    return validationResult as Result<Driver>;
  }

  try {
    const supabase = getClient();
    const rowData = convertInputToRow(input);

    const { data, error } = await supabase
      .from(DRIVERS_TABLE)
      .insert(rowData)
      .select()
      .single();

    if (error) {
      logger.error('Failed to create driver', error);
      return {
        success: false,
        error: new DriverServiceError(
          `Failed to create driver: ${error.message}`,
          DriverErrorCodes.CREATE_FAILED,
          error
        ),
      };
    }

    const driver = convertRowToDriver(data as DriverRow);
    logger.info('Driver created successfully', { driverId: driver.id, name: `${driver.firstName} ${driver.lastName}` });

    return { success: true, data: driver };
  } catch (error) {
    logger.error('Unexpected error creating driver', error);
    return {
      success: false,
      error: new DriverServiceError(
        'Unexpected error creating driver',
        DriverErrorCodes.CREATE_FAILED,
        error
      ),
    };
  }
}

/**
 * Gets a driver by ID
 */
export async function getDriverById(id: string): Promise<Result<Driver>> {
  logger.debug('Getting driver by ID', { id });

  try {
    const supabase = getSupabaseClient();

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
          error: new DriverServiceError(
            `Driver not found: ${id}`,
            DriverErrorCodes.NOT_FOUND,
            { id }
          ),
        };
      }
      logger.error('Failed to get driver', error);
      return {
        success: false,
        error: new DriverServiceError(
          `Failed to get driver: ${error.message}`,
          DriverErrorCodes.QUERY_FAILED,
          error
        ),
      };
    }

    const driver = convertRowToDriver(data as DriverRow);
    return { success: true, data: driver };
  } catch (error) {
    logger.error('Unexpected error getting driver', error);
    return {
      success: false,
      error: new DriverServiceError(
        'Unexpected error getting driver',
        DriverErrorCodes.QUERY_FAILED,
        error
      ),
    };
  }
}

/**
 * Gets all drivers with optional filtering and pagination
 * Includes LEFT JOIN with vehicles to get assigned vehicle info
 */
export async function getDrivers(
  filters?: DriverFilters,
  pagination?: PaginationParams
): Promise<Result<PaginatedResponse<Driver>>> {
  logger.debug('Getting drivers', { filters, pagination });

  try {
    const supabase = getClient();

    // Use a raw query with LEFT JOIN to get vehicle info
    let query = supabase
      .from(DRIVERS_TABLE)
      .select(`
        *,
        vehicles!vehicles_assigned_driver_id_fkey(id)
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
        error: new DriverServiceError(
          `Failed to get drivers: ${error.message}`,
          DriverErrorCodes.QUERY_FAILED,
          error
        ),
      };
    }

    // Convert rows to Driver objects and add assignedVehicleId
    const drivers = (data as any[]).map((row) => {
      const driver = convertRowToDriver(row as DriverRow);
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
  } catch (error) {
    logger.error('Unexpected error getting drivers', error);
    return {
      success: false,
      error: new DriverServiceError(
        'Unexpected error getting drivers',
        DriverErrorCodes.QUERY_FAILED,
        error
      ),
    };
  }
}

/**
 * Updates an existing driver
 */
export async function updateDriver(id: string, input: UpdateDriverInput): Promise<Result<Driver>> {
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
      return validationResult as Result<Driver>;
    }
  }

  try {
    const supabase = getClient();

    // Build update object
    const rowData = convertInputToRow(input as CreateDriverInput);

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
          error: new DriverServiceError(
            `Driver not found: ${id}`,
            DriverErrorCodes.NOT_FOUND,
            { id }
          ),
        };
      }
      logger.error('Failed to update driver', error);
      return {
        success: false,
        error: new DriverServiceError(
          `Failed to update driver: ${error.message}`,
          DriverErrorCodes.UPDATE_FAILED,
          error
        ),
      };
    }

    const driver = convertRowToDriver(data as DriverRow);
    logger.info('Driver updated successfully', { driverId: driver.id });

    return { success: true, data: driver };
  } catch (error) {
    logger.error('Unexpected error updating driver', error);
    return {
      success: false,
      error: new DriverServiceError(
        'Unexpected error updating driver',
        DriverErrorCodes.UPDATE_FAILED,
        error
      ),
    };
  }
}

/**
 * Soft deletes a driver by setting deleted_at timestamp
 */
export async function deleteDriver(id: string): Promise<Result<void>> {
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
        error: new DriverServiceError(
          `Failed to delete driver: ${error.message}`,
          DriverErrorCodes.DELETE_FAILED,
          error
        ),
      };
    }

    logger.info('Driver deleted successfully', { driverId: id });
    return { success: true };
  } catch (error) {
    logger.error('Unexpected error deleting driver', error);
    return {
      success: false,
      error: new DriverServiceError(
        'Unexpected error deleting driver',
        DriverErrorCodes.DELETE_FAILED,
        error
      ),
    };
  }
}

/**
 * Counts drivers matching the given filters
 */
export async function countDrivers(filters?: DriverFilters): Promise<Result<number>> {
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
        error: new DriverServiceError(
          `Failed to count drivers: ${error.message}`,
          DriverErrorCodes.QUERY_FAILED,
          error
        ),
      };
    }

    return { success: true, data: count ?? 0 };
  } catch (error) {
    logger.error('Unexpected error counting drivers', error);
    return {
      success: false,
      error: new DriverServiceError(
        'Unexpected error counting drivers',
        DriverErrorCodes.QUERY_FAILED,
        error
      ),
    };
  }
}

/**
 * Gets a driver with their assigned vehicle information
 */
export async function getDriverWithVehicle(id: string): Promise<Result<Driver & { assignedVehicle?: Vehicle }>> {
  logger.debug('Getting driver with vehicle', { id });

  try {
    const supabase = getClient();

    const { data, error } = await supabase
      .from(DRIVERS_TABLE)
      .select(`
        *,
        vehicles!vehicles_assigned_driver_id_fkey(*)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: new DriverServiceError(
            `Driver not found: ${id}`,
            DriverErrorCodes.NOT_FOUND,
            { id }
          ),
        };
      }
      logger.error('Failed to get driver with vehicle', error);
      return {
        success: false,
        error: new DriverServiceError(
          `Failed to get driver with vehicle: ${error.message}`,
          DriverErrorCodes.QUERY_FAILED,
          error
        ),
      };
    }

    const driver = convertRowToDriver(data as DriverRow);

    // Add vehicle information if available
    let result: Driver & { assignedVehicle?: Vehicle } = driver;

    if ((data as any).vehicles && Array.isArray((data as any).vehicles) && (data as any).vehicles.length > 0) {
      const vehicleData = (data as any).vehicles[0];
      result.assignedVehicle = rowToVehicle(vehicleData as VehicleRow);
      result.assignedVehicleId = vehicleData.id;
    }

    return { success: true, data: result };
  } catch (error) {
    logger.error('Unexpected error getting driver with vehicle', error);
    return {
      success: false,
      error: new DriverServiceError(
        'Unexpected error getting driver with vehicle',
        DriverErrorCodes.QUERY_FAILED,
        error
      ),
    };
  }
}
