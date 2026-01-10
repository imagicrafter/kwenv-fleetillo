/**
 * Client Service
 *
 * Provides CRUD operations and business logic for managing clients
 * in the RouteIQ application.
 */

import { getSupabaseClient, getAdminSupabaseClient } from './supabase.js';
import { createContextLogger } from '../utils/logger.js';
import type { Result, PaginationParams, PaginatedResponse } from '../types/index.js';
import type {
  Client,
  ClientRow,
  CreateClientInput,
  UpdateClientInput,
  ClientFilters,
} from '../types/client.js';
import { rowToClient as convertRowToClient, clientInputToRow as convertInputToRow } from '../types/client.js';
import { createLocation, CreateLocationInput } from './location.service.js';

/**
 * Logger instance for client operations
 */
const logger = createContextLogger('ClientService');

/**
 * Table name for clients in the routeiq schema
 */
const CLIENTS_TABLE = 'clients';

/**
 * Client service error
 */
export class ClientServiceError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'ClientServiceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Error codes for client service errors
 */
export const ClientErrorCodes = {
  NOT_FOUND: 'CLIENT_NOT_FOUND',
  CREATE_FAILED: 'CLIENT_CREATE_FAILED',
  UPDATE_FAILED: 'CLIENT_UPDATE_FAILED',
  DELETE_FAILED: 'CLIENT_DELETE_FAILED',
  QUERY_FAILED: 'CLIENT_QUERY_FAILED',
  VALIDATION_FAILED: 'CLIENT_VALIDATION_FAILED',
} as const;

/**
 * Validates client input data
 */
function validateClientInput(input: CreateClientInput): Result<void> {
  if (!input.name || input.name.trim().length === 0) {
    return {
      success: false,
      error: new ClientServiceError(
        'Client name is required',
        ClientErrorCodes.VALIDATION_FAILED,
        { field: 'name' }
      ),
    };
  }

  if (input.email && !isValidEmail(input.email)) {
    return {
      success: false,
      error: new ClientServiceError(
        'Invalid email format',
        ClientErrorCodes.VALIDATION_FAILED,
        { field: 'email', value: input.email }
      ),
    };
  }

  if (input.latitude !== undefined && (input.latitude < -90 || input.latitude > 90)) {
    return {
      success: false,
      error: new ClientServiceError(
        'Latitude must be between -90 and 90',
        ClientErrorCodes.VALIDATION_FAILED,
        { field: 'latitude', value: input.latitude }
      ),
    };
  }

  if (input.longitude !== undefined && (input.longitude < -180 || input.longitude > 180)) {
    return {
      success: false,
      error: new ClientServiceError(
        'Longitude must be between -180 and 180',
        ClientErrorCodes.VALIDATION_FAILED,
        { field: 'longitude', value: input.longitude }
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
 * Creates a new client
 */
export async function createClient(input: CreateClientInput, options?: { skipLocationCreation?: boolean }): Promise<Result<Client>> {
  logger.debug('Creating client', { name: input.name });

  // Validate input
  const validationResult = validateClientInput(input);
  if (!validationResult.success) {
    return validationResult as Result<Client>;
  }

  try {
    const supabase = getClient();
    const rowData = convertInputToRow(input);

    const { data, error } = await supabase
      .from(CLIENTS_TABLE)
      .insert(rowData)
      .select()
      .single();

    if (error) {
      logger.error('Failed to create client', error);
      return {
        success: false,
        error: new ClientServiceError(
          `Failed to create client: ${error.message}`,
          ClientErrorCodes.CREATE_FAILED,
          error
        ),
      };
    }

    const client = convertRowToClient(data as ClientRow);
    logger.info('Client created successfully', { clientId: client.id, name: client.name });

    // Create a primary location for the client if address details are present AND not skipped
    if (!options?.skipLocationCreation && input.addressLine1 && input.city && input.state && input.postalCode) {
      try {
        const locationInput: CreateLocationInput = {
          clientId: client.id,
          name: 'Primary Address', // Default name
          locationType: 'client',
          isPrimary: true,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          country: input.country || 'USA',
          latitude: input.latitude,
          longitude: input.longitude
        };

        await createLocation(locationInput);
        logger.info('Created default primary location for client', { clientId: client.id });
      } catch (locError) {
        // Log but don't fail the client creation, as the client itself is valid
        logger.warn('Failed to create default location for new client', { error: locError, clientId: client.id });
      }
    }

    return { success: true, data: client };
  } catch (error) {
    logger.error('Unexpected error creating client', error);
    return {
      success: false,
      error: new ClientServiceError(
        'Unexpected error creating client',
        ClientErrorCodes.CREATE_FAILED,
        error
      ),
    };
  }
}

/**
 * Gets a client by ID
 */
export async function getClientById(id: string): Promise<Result<Client>> {
  logger.debug('Getting client by ID', { id });

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from(CLIENTS_TABLE)
      .select()
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: new ClientServiceError(
            `Client not found: ${id}`,
            ClientErrorCodes.NOT_FOUND,
            { id }
          ),
        };
      }
      logger.error('Failed to get client', error);
      return {
        success: false,
        error: new ClientServiceError(
          `Failed to get client: ${error.message}`,
          ClientErrorCodes.QUERY_FAILED,
          error
        ),
      };
    }

    const client = convertRowToClient(data as ClientRow);
    return { success: true, data: client };
  } catch (error) {
    logger.error('Unexpected error getting client', error);
    return {
      success: false,
      error: new ClientServiceError(
        'Unexpected error getting client',
        ClientErrorCodes.QUERY_FAILED,
        error
      ),
    };
  }
}

/**
 * Gets all clients with optional filtering and pagination
 */
export async function getClients(
  filters?: ClientFilters,
  pagination?: PaginationParams
): Promise<Result<PaginatedResponse<Client>>> {
  logger.debug('Getting clients', { filters, pagination });

  try {
    const supabase = getClient();

    let query = supabase.from(CLIENTS_TABLE).select('*', { count: 'exact' });

    // Apply filters
    if (!filters?.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.city) {
      query = query.or(`city.ilike.%${filters.city}%,service_city.ilike.%${filters.city}%`);
    }

    if (filters?.state) {
      query = query.or(`state.ilike.%${filters.state}%,service_state.ilike.%${filters.state}%`);
    }

    if (filters?.searchTerm) {
      const term = filters.searchTerm;
      query = query.or(`name.ilike.%${term}%,company_name.ilike.%${term}%,email.ilike.%${term}%`);
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
      logger.error('Failed to get clients', error);
      return {
        success: false,
        error: new ClientServiceError(
          `Failed to get clients: ${error.message}`,
          ClientErrorCodes.QUERY_FAILED,
          error
        ),
      };
    }

    const clients = (data as ClientRow[]).map(convertRowToClient);
    const total = count ?? 0;

    return {
      success: true,
      data: {
        data: clients,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    logger.error('Unexpected error getting clients', error);
    return {
      success: false,
      error: new ClientServiceError(
        'Unexpected error getting clients',
        ClientErrorCodes.QUERY_FAILED,
        error
      ),
    };
  }
}

/**
 * Updates an existing client
 */
export async function updateClient(input: UpdateClientInput): Promise<Result<Client>> {
  logger.debug('Updating client', { id: input.id });

  // Validate input if name is being updated
  if (input.name !== undefined) {
    const validationResult = validateClientInput({ name: input.name, ...input });
    if (!validationResult.success) {
      return validationResult as Result<Client>;
    }
  }

  try {
    const supabase = getClient();

    // Build update object, excluding id
    const { id, ...updateData } = input;
    const rowData = convertInputToRow(updateData as CreateClientInput);

    const { data, error } = await supabase
      .from(CLIENTS_TABLE)
      .update(rowData)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: new ClientServiceError(
            `Client not found: ${id}`,
            ClientErrorCodes.NOT_FOUND,
            { id }
          ),
        };
      }
      logger.error('Failed to update client', error);
      return {
        success: false,
        error: new ClientServiceError(
          `Failed to update client: ${error.message}`,
          ClientErrorCodes.UPDATE_FAILED,
          error
        ),
      };
    }

    const client = convertRowToClient(data as ClientRow);
    logger.info('Client updated successfully', { clientId: client.id });

    return { success: true, data: client };
  } catch (error) {
    logger.error('Unexpected error updating client', error);
    return {
      success: false,
      error: new ClientServiceError(
        'Unexpected error updating client',
        ClientErrorCodes.UPDATE_FAILED,
        error
      ),
    };
  }
}

/**
 * Soft deletes a client by setting deleted_at timestamp
 */
export async function deleteClient(id: string): Promise<Result<void>> {
  logger.debug('Deleting client', { id });

  try {
    const supabase = getClient();

    const { error } = await supabase
      .from(CLIENTS_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      logger.error('Failed to delete client', error);
      return {
        success: false,
        error: new ClientServiceError(
          `Failed to delete client: ${error.message}`,
          ClientErrorCodes.DELETE_FAILED,
          error
        ),
      };
    }

    logger.info('Client deleted successfully', { clientId: id });
    return { success: true };
  } catch (error) {
    logger.error('Unexpected error deleting client', error);
    return {
      success: false,
      error: new ClientServiceError(
        'Unexpected error deleting client',
        ClientErrorCodes.DELETE_FAILED,
        error
      ),
    };
  }
}

/**
 * Permanently deletes a client (hard delete)
 * Use with caution - this cannot be undone
 */
export async function hardDeleteClient(id: string): Promise<Result<void>> {
  logger.warn('Hard deleting client', { id });

  try {
    const adminClient = getAdminSupabaseClient();

    if (!adminClient) {
      return {
        success: false,
        error: new ClientServiceError(
          'Admin client not available for hard delete operation',
          ClientErrorCodes.DELETE_FAILED
        ),
      };
    }

    const { error } = await adminClient
      .from(CLIENTS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Failed to hard delete client', error);
      return {
        success: false,
        error: new ClientServiceError(
          `Failed to hard delete client: ${error.message}`,
          ClientErrorCodes.DELETE_FAILED,
          error
        ),
      };
    }

    logger.info('Client hard deleted successfully', { clientId: id });
    return { success: true };
  } catch (error) {
    logger.error('Unexpected error hard deleting client', error);
    return {
      success: false,
      error: new ClientServiceError(
        'Unexpected error hard deleting client',
        ClientErrorCodes.DELETE_FAILED,
        error
      ),
    };
  }
}

/**
 * Restores a soft-deleted client
 */
export async function restoreClient(id: string): Promise<Result<Client>> {
  logger.debug('Restoring client', { id });

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from(CLIENTS_TABLE)
      .update({ deleted_at: null })
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: new ClientServiceError(
            `Deleted client not found: ${id}`,
            ClientErrorCodes.NOT_FOUND,
            { id }
          ),
        };
      }
      logger.error('Failed to restore client', error);
      return {
        success: false,
        error: new ClientServiceError(
          `Failed to restore client: ${error.message}`,
          ClientErrorCodes.UPDATE_FAILED,
          error
        ),
      };
    }

    const client = convertRowToClient(data as ClientRow);
    logger.info('Client restored successfully', { clientId: client.id });

    return { success: true, data: client };
  } catch (error) {
    logger.error('Unexpected error restoring client', error);
    return {
      success: false,
      error: new ClientServiceError(
        'Unexpected error restoring client',
        ClientErrorCodes.UPDATE_FAILED,
        error
      ),
    };
  }
}

/**
 * Counts clients with optional filters
 */
export async function countClients(filters?: ClientFilters): Promise<Result<number>> {
  logger.debug('Counting clients', { filters });

  try {
    const supabase = getClient();

    let query = supabase.from(CLIENTS_TABLE).select('*', { count: 'exact', head: true });

    if (!filters?.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { count, error } = await query;

    if (error) {
      logger.error('Failed to count clients', error);
      return {
        success: false,
        error: new ClientServiceError(
          `Failed to count clients: ${error.message}`,
          ClientErrorCodes.QUERY_FAILED,
          error
        ),
      };
    }

    return { success: true, data: count ?? 0 };
  } catch (error) {
    logger.error('Unexpected error counting clients', error);
    return {
      success: false,
      error: new ClientServiceError(
        'Unexpected error counting clients',
        ClientErrorCodes.QUERY_FAILED,
        error
      ),
    };
  }
}
