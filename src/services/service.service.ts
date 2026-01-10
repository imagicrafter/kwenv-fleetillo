/**
 * Service Service
 *
 * Provides CRUD operations and business logic for managing services
 * in the RouteIQ application.
 */

import { getSupabaseClient, getAdminSupabaseClient } from './supabase.js';
import { createContextLogger } from '../utils/logger.js';
import type { Service, ServiceFilters, CreateServiceInput, UpdateServiceInput, ServiceRow, Result, PaginationParams, PaginatedResponse } from '../types/index.js';
import { rowToService as convertRowToService, serviceInputToRow as convertInputToRow } from '../types/service.js';

/**
 * Logger instance for service operations
 */
const logger = createContextLogger('ServiceService');

/**
 * Table name for services in the routeiq schema
 */
const SERVICES_TABLE = 'services';

/**
 * Service service error
 */
export class ServiceServiceError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'ServiceServiceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Error codes for service service errors
 */
export const ServiceErrorCodes = {
  NOT_FOUND: 'SERVICE_NOT_FOUND',
  CREATE_FAILED: 'SERVICE_CREATE_FAILED',
  UPDATE_FAILED: 'SERVICE_UPDATE_FAILED',
  DELETE_FAILED: 'SERVICE_DELETE_FAILED',
  QUERY_FAILED: 'SERVICE_QUERY_FAILED',
  VALIDATION_FAILED: 'SERVICE_VALIDATION_FAILED',
  DUPLICATE_CODE: 'SERVICE_DUPLICATE_CODE',
} as const;

/**
 * Validates service input data
 */
function validateServiceInput(input: CreateServiceInput): Result<void> {
  if (!input.name || input.name.trim().length === 0) {
    return {
      success: false,
      error: new ServiceServiceError(
        'Service name is required',
        ServiceErrorCodes.VALIDATION_FAILED,
        { field: 'name' }
      ),
    };
  }

  if (!input.serviceType || input.serviceType.trim().length === 0) {
    return {
      success: false,
      error: new ServiceServiceError(
        'Service type is required',
        ServiceErrorCodes.VALIDATION_FAILED,
        { field: 'serviceType' }
      ),
    };
  }

  if (input.averageDurationMinutes === undefined || input.averageDurationMinutes <= 0) {
    return {
      success: false,
      error: new ServiceServiceError(
        'Average duration must be a positive number',
        ServiceErrorCodes.VALIDATION_FAILED,
        { field: 'averageDurationMinutes', value: input.averageDurationMinutes }
      ),
    };
  }

  if (input.minimumDurationMinutes !== undefined && input.minimumDurationMinutes <= 0) {
    return {
      success: false,
      error: new ServiceServiceError(
        'Minimum duration must be a positive number',
        ServiceErrorCodes.VALIDATION_FAILED,
        { field: 'minimumDurationMinutes', value: input.minimumDurationMinutes }
      ),
    };
  }

  if (input.maximumDurationMinutes !== undefined) {
    if (input.maximumDurationMinutes <= 0) {
      return {
        success: false,
        error: new ServiceServiceError(
          'Maximum duration must be a positive number',
          ServiceErrorCodes.VALIDATION_FAILED,
          { field: 'maximumDurationMinutes', value: input.maximumDurationMinutes }
        ),
      };
    }
    if (input.minimumDurationMinutes !== undefined && input.maximumDurationMinutes < input.minimumDurationMinutes) {
      return {
        success: false,
        error: new ServiceServiceError(
          'Maximum duration must be greater than or equal to minimum duration',
          ServiceErrorCodes.VALIDATION_FAILED,
          { field: 'maximumDurationMinutes', value: input.maximumDurationMinutes }
        ),
      };
    }
  }

  if (input.basePrice !== undefined && input.basePrice < 0) {
    return {
      success: false,
      error: new ServiceServiceError(
        'Base price cannot be negative',
        ServiceErrorCodes.VALIDATION_FAILED,
        { field: 'basePrice', value: input.basePrice }
      ),
    };
  }

  if (input.maxPerDay !== undefined && input.maxPerDay <= 0) {
    return {
      success: false,
      error: new ServiceServiceError(
        'Max per day must be a positive number',
        ServiceErrorCodes.VALIDATION_FAILED,
        { field: 'maxPerDay', value: input.maxPerDay }
      ),
    };
  }

  return { success: true };
}

/**
 * Creates a new service
 */
export async function createService(input: CreateServiceInput): Promise<Result<Service>> {
  logger.debug('Creating service', { name: input.name, serviceType: input.serviceType });

  // Validate input
  const validationResult = validateServiceInput(input);
  if (!validationResult.success) {
    return { success: false, error: validationResult.error };
  }

  try {
    // Use admin client if available to bypass RLS policies
    const supabase = getAdminSupabaseClient() || getSupabaseClient();
    const rowData = convertInputToRow(input);

    const { data, error } = await supabase
      .from(SERVICES_TABLE)
      .insert(rowData)
      .select()
      .single();

    if (error) {
      // Check for duplicate code constraint violation
      if (error.code === '23505' && error.message.includes('code')) {
        return {
          success: false,
          error: new ServiceServiceError(
            `Service code '${input.code}' already exists`,
            ServiceErrorCodes.DUPLICATE_CODE,
            { code: input.code }
          ),
        };
      }
      logger.error('Failed to create service', error);
      return {
        success: false,
        error: new ServiceServiceError(
          `Failed to create service: ${error.message}`,
          ServiceErrorCodes.CREATE_FAILED,
          error
        ),
      };
    }

    const service = convertRowToService(data as ServiceRow);
    logger.info('Service created successfully', { serviceId: service.id, name: service.name });

    return { success: true, data: service };
  } catch (error) {
    logger.error('Unexpected error creating service', error);
    return {
      success: false,
      error: new ServiceServiceError(
        'Unexpected error creating service',
        ServiceErrorCodes.CREATE_FAILED,
        error
      ),
    };
  }
}

/**
 * Gets a service by ID
 */
export async function getServiceById(id: string): Promise<Result<Service>> {
  logger.debug('Getting service by ID', { id });

  try {
    // Use admin client if available to bypass RLS permissions
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    const { data, error } = await supabase
      .from(SERVICES_TABLE)
      .select()
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: new ServiceServiceError(
            `Service not found: ${id}`,
            ServiceErrorCodes.NOT_FOUND,
            { id }
          ),
        };
      }
      logger.error('Failed to get service', error);
      return {
        success: false,
        error: new ServiceServiceError(
          `Failed to get service: ${error.message}`,
          ServiceErrorCodes.QUERY_FAILED,
          error
        ),
      };
    }

    const service = convertRowToService(data as ServiceRow);
    return { success: true, data: service };
  } catch (error) {
    logger.error('Unexpected error getting service', error);
    return {
      success: false,
      error: new ServiceServiceError(
        'Unexpected error getting service',
        ServiceErrorCodes.QUERY_FAILED,
        error
      ),
    };
  }
}

/**
 * Gets a service by code
 */
export async function getServiceByCode(code: string): Promise<Result<Service>> {
  logger.debug('Getting service by code', { code });

  try {
    // Use admin client if available to bypass RLS permissions
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    const { data, error } = await supabase
      .from(SERVICES_TABLE)
      .select()
      .eq('code', code)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: new ServiceServiceError(
            `Service not found with code: ${code}`,
            ServiceErrorCodes.NOT_FOUND,
            { code }
          ),
        };
      }
      logger.error('Failed to get service by code', error);
      return {
        success: false,
        error: new ServiceServiceError(
          `Failed to get service: ${error.message}`,
          ServiceErrorCodes.QUERY_FAILED,
          error
        ),
      };
    }

    const service = convertRowToService(data as ServiceRow);
    return { success: true, data: service };
  } catch (error) {
    logger.error('Unexpected error getting service by code', error);
    return {
      success: false,
      error: new ServiceServiceError(
        'Unexpected error getting service',
        ServiceErrorCodes.QUERY_FAILED,
        error
      ),
    };
  }
}

/**
 * Gets all services with optional filtering and pagination
 */


/**
 * Gets services by type
 */
export async function getServicesByType(
  serviceType: string,
  pagination?: PaginationParams
): Promise<Result<PaginatedResponse<Service>>> {
  return getServices({ serviceType, status: 'active' }, pagination);
}

/**
 * Updates an existing service
 */
export async function updateService(input: UpdateServiceInput): Promise<Result<Service>> {
  logger.debug('Updating service', { id: input.id });

  // Validate input if relevant fields are being updated
  if (input.name !== undefined || input.serviceType !== undefined || input.averageDurationMinutes !== undefined) {
    // Only validate fields that are being updated
    if (input.name !== undefined && (!input.name || input.name.trim().length === 0)) {
      return {
        success: false,
        error: new ServiceServiceError(
          'Service name is required',
          ServiceErrorCodes.VALIDATION_FAILED,
          { field: 'name' }
        ),
      };
    }

    if (input.averageDurationMinutes !== undefined && input.averageDurationMinutes <= 0) {
      return {
        success: false,
        error: new ServiceServiceError(
          'Average duration must be a positive number',
          ServiceErrorCodes.VALIDATION_FAILED,
          { field: 'averageDurationMinutes' }
        ),
      };
    }
  }

  try {
    // Use admin client if available to bypass RLS permissions
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    // Build update object, excluding id
    const { id, ...updateData } = input;
    const rowData = convertInputToRow(updateData as CreateServiceInput);

    // Remove undefined values
    const cleanRowData = Object.fromEntries(
      Object.entries(rowData).filter(([, value]) => value !== undefined)
    );

    const { data, error } = await supabase
      .from(SERVICES_TABLE)
      .update(cleanRowData)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: new ServiceServiceError(
            `Service not found: ${id}`,
            ServiceErrorCodes.NOT_FOUND,
            { id }
          ),
        };
      }
      // Check for duplicate code constraint violation
      if (error.code === '23505' && error.message.includes('code')) {
        return {
          success: false,
          error: new ServiceServiceError(
            `Service code '${input.code}' already exists`,
            ServiceErrorCodes.DUPLICATE_CODE,
            { code: input.code }
          ),
        };
      }
      logger.error('Failed to update service', error);
      return {
        success: false,
        error: new ServiceServiceError(
          `Failed to update service: ${error.message}`,
          ServiceErrorCodes.UPDATE_FAILED,
          error
        ),
      };
    }

    const service = convertRowToService(data as ServiceRow);
    logger.info('Service updated successfully', { serviceId: service.id });

    return { success: true, data: service };
  } catch (error) {
    logger.error('Unexpected error updating service', error);
    return {
      success: false,
      error: new ServiceServiceError(
        'Unexpected error updating service',
        ServiceErrorCodes.UPDATE_FAILED,
        error
      ),
    };
  }
}

/**
 * Soft deletes a service by setting deleted_at timestamp
 */
export async function deleteService(id: string): Promise<Result<void>> {
  logger.debug('Deleting service', { id });

  try {
    // Use admin client if available to bypass RLS permissions
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    const { error } = await supabase
      .from(SERVICES_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      logger.error('Failed to delete service', error);
      return {
        success: false,
        error: new ServiceServiceError(
          `Failed to delete service: ${error.message}`,
          ServiceErrorCodes.DELETE_FAILED,
          error
        ),
      };
    }

    logger.info('Service deleted successfully', { serviceId: id });
    return { success: true };
  } catch (error) {
    logger.error('Unexpected error deleting service', error);
    return {
      success: false,
      error: new ServiceServiceError(
        'Unexpected error deleting service',
        ServiceErrorCodes.DELETE_FAILED,
        error
      ),
    };
  }
}

/**
 * Permanently deletes a service (hard delete)
 * Use with caution - this cannot be undone
 */
export async function hardDeleteService(id: string): Promise<Result<void>> {
  logger.warn('Hard deleting service', { id });

  try {
    const adminClient = getAdminSupabaseClient();

    if (!adminClient) {
      return {
        success: false,
        error: new ServiceServiceError(
          'Admin client not available for hard delete operation',
          ServiceErrorCodes.DELETE_FAILED
        ),
      };
    }

    const { error } = await adminClient
      .from(SERVICES_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Failed to hard delete service', error);
      return {
        success: false,
        error: new ServiceServiceError(
          `Failed to hard delete service: ${error.message}`,
          ServiceErrorCodes.DELETE_FAILED,
          error
        ),
      };
    }

    logger.info('Service hard deleted successfully', { serviceId: id });
    return { success: true };
  } catch (error) {
    logger.error('Unexpected error hard deleting service', error);
    return {
      success: false,
      error: new ServiceServiceError(
        'Unexpected error hard deleting service',
        ServiceErrorCodes.DELETE_FAILED,
        error
      ),
    };
  }
}

/**
 * Restores a soft-deleted service
 */
export async function restoreService(id: string): Promise<Result<Service>> {
  logger.debug('Restoring service', { id });

  try {
    // Use admin client if available to bypass RLS permissions
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    const { data, error } = await supabase
      .from(SERVICES_TABLE)
      .update({ deleted_at: null })
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: new ServiceServiceError(
            `Deleted service not found: ${id}`,
            ServiceErrorCodes.NOT_FOUND,
            { id }
          ),
        };
      }
      logger.error('Failed to restore service', error);
      return {
        success: false,
        error: new ServiceServiceError(
          `Failed to restore service: ${error.message}`,
          ServiceErrorCodes.UPDATE_FAILED,
          error
        ),
      };
    }

    const service = convertRowToService(data as ServiceRow);
    logger.info('Service restored successfully', { serviceId: service.id });

    return { success: true, data: service };
  } catch (error) {
    logger.error('Unexpected error restoring service', error);
    return {
      success: false,
      error: new ServiceServiceError(
        'Unexpected error restoring service',
        ServiceErrorCodes.UPDATE_FAILED,
        error
      ),
    };
  }
}

/**
 * Counts services with optional filters
 */
export async function getServices(
  filters?: ServiceFilters,
  pagination?: PaginationParams
): Promise<Result<PaginatedResponse<Service>>> {
  logger.debug('Getting services', { filters, pagination });

  try {
    // Use admin client if available to bypass RLS permissions
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    let query = supabase.from(SERVICES_TABLE).select('*', { count: 'exact' });

    if (filters?.searchTerm) {
      query = query.or(`name.ilike.%${filters.searchTerm}%,code.ilike.%${filters.searchTerm}%`);
    }

    if (filters?.serviceType) {
      query = query.eq('service_type', filters.serviceType);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
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
      logger.error('Failed to get services', error);
      return {
        success: false,
        error: new ServiceServiceError(
          `Failed to get services: ${error.message}`,
          ServiceErrorCodes.QUERY_FAILED,
          error
        ),
      };
    }

    const services = (data as ServiceRow[]).map(convertRowToService);
    const total = count ?? 0;

    return {
      success: true,
      data: {
        data: services,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    logger.error('Unexpected error getting services', error);
    return {
      success: false,
      error: new ServiceServiceError(
        'Unexpected error getting services',
        ServiceErrorCodes.QUERY_FAILED,
        error
      ),
    };
  }
}

/**
 * Counts services with optional filters
 */
export async function countServices(filters?: ServiceFilters): Promise<Result<number>> {
  logger.debug('Counting services', { filters });

  try {
    // Use admin client if available to bypass RLS permissions
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    let query = supabase.from(SERVICES_TABLE).select('*', { count: 'exact', head: true });

    if (!filters?.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.serviceType) {
      query = query.eq('service_type', filters.serviceType);
    }

    const { count, error } = await query;

    if (error) {
      logger.error('Failed to count services', error);
      return {
        success: false,
        error: new ServiceServiceError(
          `Failed to count services: ${error.message}`,
          ServiceErrorCodes.QUERY_FAILED,
          error
        ),
      };
    }

    return { success: true, data: count ?? 0 };
  } catch (error) {
    logger.error('Unexpected error counting services', error);
    return {
      success: false,
      error: new ServiceServiceError(
        'Unexpected error counting services',
        ServiceErrorCodes.QUERY_FAILED,
        error
      ),
    };
  }
}
