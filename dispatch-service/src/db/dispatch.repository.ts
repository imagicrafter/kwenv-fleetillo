/**
 * Dispatch Repository
 *
 * Provides data access functions for dispatch and channel_dispatch records.
 * Handles conversion between snake_case (database) and camelCase (TypeScript).
 *
 * @module db/dispatch.repository
 * @requirements 8.1 - Store dispatch records in 'dispatches' table
 * @requirements 8.2 - Store channel attempts in 'channel_dispatches' table
 * @requirements 8.3 - Update dispatch status and updated_at timestamp
 * @requirements 8.4 - Update channel_dispatches record on completion/failure
 */

import { getSupabaseClient } from './supabase.js';
import { logger } from '../utils/logger.js';
import type {
  Dispatch,
  DispatchRow,
  DispatchStatus,
  ChannelDispatch,
  ChannelDispatchRow,
  ChannelDispatchStatus,
  ChannelType,
} from '../types/index.js';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Input for creating a new dispatch
 */
export interface CreateDispatchInput {
  routeId: string;
  driverId: string;
  requestedChannels: ChannelType[];
  metadata?: Record<string, unknown>;
}

/**
 * Input for creating a channel dispatch
 */
export interface CreateChannelDispatchInput {
  dispatchId: string;
  channel: ChannelType;
  status?: ChannelDispatchStatus;
}

/**
 * Input for updating a channel dispatch
 */
export interface UpdateChannelDispatchInput {
  status?: ChannelDispatchStatus;
  providerMessageId?: string;
  errorMessage?: string;
  sentAt?: Date;
  deliveredAt?: Date;
}

/**
 * Repository error class
 */
export class RepositoryError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Error codes for repository operations
 */
export const RepositoryErrorCodes = {
  CREATE_FAILED: 'DISPATCH_CREATE_FAILED',
  NOT_FOUND: 'DISPATCH_NOT_FOUND',
  UPDATE_FAILED: 'DISPATCH_UPDATE_FAILED',
  QUERY_FAILED: 'DISPATCH_QUERY_FAILED',
  CHANNEL_CREATE_FAILED: 'CHANNEL_DISPATCH_CREATE_FAILED',
  CHANNEL_UPDATE_FAILED: 'CHANNEL_DISPATCH_UPDATE_FAILED',
} as const;

// =============================================================================
// Conversion Functions
// =============================================================================

/**
 * Converts a database row to a Dispatch entity
 */
function rowToDispatch(row: DispatchRow): Dispatch {
  return {
    id: row.id,
    routeId: row.route_id,
    driverId: row.driver_id,
    status: row.status,
    requestedChannels: row.requested_channels as ChannelType[],
    metadata: row.metadata ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    driverName: row.drivers ? `${row.drivers.first_name} ${row.drivers.last_name}` : undefined,
    routeName: row.routes ? row.routes.route_name : undefined,
  };
}

/**
 * Converts a database row to a ChannelDispatch entity
 */
function rowToChannelDispatch(row: ChannelDispatchRow): ChannelDispatch {
  return {
    id: row.id,
    dispatchId: row.dispatch_id,
    channel: row.channel as ChannelType,
    status: row.status,
    providerMessageId: row.provider_message_id ?? undefined,
    errorMessage: row.error_message ?? undefined,
    sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
    deliveredAt: row.delivered_at ? new Date(row.delivered_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// =============================================================================
// Dispatch Functions
// =============================================================================

/**
 * Creates a new dispatch record
 *
 * @param input - The dispatch data to create
 * @returns The created dispatch entity
 * @throws RepositoryError if creation fails
 *
 * @requirements 8.1 - Store dispatch records with id, route_id, driver_id, status, requested_channels, timestamps
 */
export async function createDispatch(input: CreateDispatchInput): Promise<Dispatch> {
  const client = getSupabaseClient();

  logger.debug('Creating dispatch', {
    routeId: input.routeId,
    driverId: input.driverId,
    channels: input.requestedChannels,
  });

  const { data, error } = await client
    .from('dispatches')
    .insert({
      route_id: input.routeId,
      driver_id: input.driverId,
      status: 'pending' as DispatchStatus,
      requested_channels: input.requestedChannels,
      metadata: input.metadata ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create dispatch', {
      routeId: input.routeId,
      driverId: input.driverId,
      error: error.message,
    });
    throw new RepositoryError(
      `Failed to create dispatch: ${error.message}`,
      RepositoryErrorCodes.CREATE_FAILED,
      error
    );
  }

  const dispatch = rowToDispatch(data as DispatchRow);

  logger.info('Dispatch created', {
    dispatchId: dispatch.id,
    routeId: dispatch.routeId,
    driverId: dispatch.driverId,
  });

  return dispatch;
}

/**
 * Retrieves a dispatch by ID
 *
 * @param dispatchId - The dispatch ID to retrieve
 * @returns The dispatch entity or null if not found
 * @throws RepositoryError if query fails
 */
export async function getDispatch(dispatchId: string): Promise<Dispatch | null> {
  const client = getSupabaseClient();

  logger.debug('Fetching dispatch', { dispatchId });

  const { data, error } = await client
    .from('dispatches')
    .select('*')
    .eq('id', dispatchId)
    .single();

  if (error) {
    // PGRST116 means no rows found
    if (error.code === 'PGRST116') {
      logger.debug('Dispatch not found', { dispatchId });
      return null;
    }

    logger.error('Failed to fetch dispatch', {
      dispatchId,
      error: error.message,
    });
    throw new RepositoryError(
      `Failed to fetch dispatch: ${error.message}`,
      RepositoryErrorCodes.QUERY_FAILED,
      error
    );
  }

  return rowToDispatch(data as DispatchRow);
}

/**
 * Retrieves a dispatch with its channel dispatches
 *
 * @param dispatchId - The dispatch ID to retrieve
 * @returns The dispatch with channel dispatches or null if not found
 */
export async function getDispatchWithChannels(
  dispatchId: string
): Promise<{ dispatch: Dispatch; channelDispatches: ChannelDispatch[] } | null> {
  const client = getSupabaseClient();

  logger.debug('Fetching dispatch with channels', { dispatchId });

  // Fetch dispatch
  const { data: dispatchData, error: dispatchError } = await client
    .from('dispatches')
    .select('*')
    .eq('id', dispatchId)
    .single();

  if (dispatchError) {
    if (dispatchError.code === 'PGRST116') {
      return null;
    }
    throw new RepositoryError(
      `Failed to fetch dispatch: ${dispatchError.message}`,
      RepositoryErrorCodes.QUERY_FAILED,
      dispatchError
    );
  }

  // Fetch channel dispatches
  const { data: channelData, error: channelError } = await client
    .from('channel_dispatches')
    .select('*')
    .eq('dispatch_id', dispatchId)
    .order('created_at', { ascending: true });

  if (channelError) {
    throw new RepositoryError(
      `Failed to fetch channel dispatches: ${channelError.message}`,
      RepositoryErrorCodes.QUERY_FAILED,
      channelError
    );
  }

  return {
    dispatch: rowToDispatch(dispatchData as DispatchRow),
    channelDispatches: (channelData as ChannelDispatchRow[]).map(rowToChannelDispatch),
  };
}

/**
 * Updates the status of a dispatch
 *
 * @param dispatchId - The dispatch ID to update
 * @param status - The new status
 * @returns The updated dispatch entity
 * @throws RepositoryError if update fails or dispatch not found
 *
 * @requirements 8.3 - Update dispatch status and updated_at timestamp
 */
export async function updateDispatchStatus(
  dispatchId: string,
  status: DispatchStatus
): Promise<Dispatch> {
  const client = getSupabaseClient();

  logger.debug('Updating dispatch status', { dispatchId, status });

  const { data, error } = await client
    .from('dispatches')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dispatchId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new RepositoryError(
        `Dispatch not found: ${dispatchId}`,
        RepositoryErrorCodes.NOT_FOUND,
        { dispatchId }
      );
    }

    logger.error('Failed to update dispatch status', {
      dispatchId,
      status,
      error: error.message,
    });
    throw new RepositoryError(
      `Failed to update dispatch status: ${error.message}`,
      RepositoryErrorCodes.UPDATE_FAILED,
      error
    );
  }

  const dispatch = rowToDispatch(data as DispatchRow);

  logger.info('Dispatch status updated', {
    dispatchId: dispatch.id,
    status: dispatch.status,
  });

  return dispatch;
}

// =============================================================================
// Channel Dispatch Functions
// =============================================================================

/**
 * Creates a new channel dispatch record
 *
 * @param input - The channel dispatch data to create
 * @returns The created channel dispatch entity
 * @throws RepositoryError if creation fails
 *
 * @requirements 8.2 - Store channel attempts with id, dispatch_id, channel, status, timestamps
 */
export async function createChannelDispatch(
  input: CreateChannelDispatchInput
): Promise<ChannelDispatch> {
  const client = getSupabaseClient();

  logger.debug('Creating channel dispatch', {
    dispatchId: input.dispatchId,
    channel: input.channel,
  });

  const { data, error } = await client
    .from('channel_dispatches')
    .insert({
      dispatch_id: input.dispatchId,
      channel: input.channel,
      status: input.status ?? 'pending',
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create channel dispatch', {
      dispatchId: input.dispatchId,
      channel: input.channel,
      error: error.message,
    });
    throw new RepositoryError(
      `Failed to create channel dispatch: ${error.message}`,
      RepositoryErrorCodes.CHANNEL_CREATE_FAILED,
      error
    );
  }

  const channelDispatch = rowToChannelDispatch(data as ChannelDispatchRow);

  logger.info('Channel dispatch created', {
    channelDispatchId: channelDispatch.id,
    dispatchId: channelDispatch.dispatchId,
    channel: channelDispatch.channel,
  });

  return channelDispatch;
}

/**
 * Updates a channel dispatch record
 *
 * @param channelDispatchId - The channel dispatch ID to update
 * @param input - The fields to update
 * @returns The updated channel dispatch entity
 * @throws RepositoryError if update fails or record not found
 *
 * @requirements 8.4 - Update channel_dispatches record on completion/failure
 */
export async function updateChannelDispatch(
  channelDispatchId: string,
  input: UpdateChannelDispatchInput
): Promise<ChannelDispatch> {
  const client = getSupabaseClient();

  logger.debug('Updating channel dispatch', {
    channelDispatchId,
    status: input.status,
  });

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.status !== undefined) {
    updateData.status = input.status;
  }
  if (input.providerMessageId !== undefined) {
    updateData.provider_message_id = input.providerMessageId;
  }
  if (input.errorMessage !== undefined) {
    updateData.error_message = input.errorMessage;
  }
  if (input.sentAt !== undefined) {
    updateData.sent_at = input.sentAt.toISOString();
  }
  if (input.deliveredAt !== undefined) {
    updateData.delivered_at = input.deliveredAt.toISOString();
  }

  const { data, error } = await client
    .from('channel_dispatches')
    .update(updateData)
    .eq('id', channelDispatchId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new RepositoryError(
        `Channel dispatch not found: ${channelDispatchId}`,
        RepositoryErrorCodes.NOT_FOUND,
        { channelDispatchId }
      );
    }

    logger.error('Failed to update channel dispatch', {
      channelDispatchId,
      error: error.message,
    });
    throw new RepositoryError(
      `Failed to update channel dispatch: ${error.message}`,
      RepositoryErrorCodes.CHANNEL_UPDATE_FAILED,
      error
    );
  }

  const channelDispatch = rowToChannelDispatch(data as ChannelDispatchRow);

  logger.info('Channel dispatch updated', {
    channelDispatchId: channelDispatch.id,
    status: channelDispatch.status,
  });

  return channelDispatch;
}

/**
 * Retrieves all channel dispatches for a dispatch
 *
 * @param dispatchId - The dispatch ID
 * @returns Array of channel dispatch entities
 */
export async function getChannelDispatchesByDispatchId(
  dispatchId: string
): Promise<ChannelDispatch[]> {
  const client = getSupabaseClient();

  logger.debug('Fetching channel dispatches', { dispatchId });

  const { data, error } = await client
    .from('channel_dispatches')
    .select('*')
    .eq('dispatch_id', dispatchId)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('Failed to fetch channel dispatches', {
      dispatchId,
      error: error.message,
    });
    throw new RepositoryError(
      `Failed to fetch channel dispatches: ${error.message}`,
      RepositoryErrorCodes.QUERY_FAILED,
      error
    );
  }

  return (data as ChannelDispatchRow[]).map(rowToChannelDispatch);
}

/**
 * Creates multiple channel dispatch records in a single operation
 *
 * @param inputs - Array of channel dispatch data to create
 * @returns Array of created channel dispatch entities
 */
export async function createChannelDispatchBatch(
  inputs: CreateChannelDispatchInput[]
): Promise<ChannelDispatch[]> {
  if (inputs.length === 0) {
    return [];
  }

  const client = getSupabaseClient();
  const firstInput = inputs[0]!;

  logger.debug('Creating channel dispatch batch', {
    count: inputs.length,
    dispatchId: firstInput.dispatchId,
  });

  const insertData = inputs.map((input) => ({
    dispatch_id: input.dispatchId,
    channel: input.channel,
    status: input.status ?? 'pending',
  }));

  const { data, error } = await client
    .from('channel_dispatches')
    .insert(insertData)
    .select();

  if (error) {
    logger.error('Failed to create channel dispatch batch', {
      count: inputs.length,
      error: error.message,
    });
    throw new RepositoryError(
      `Failed to create channel dispatch batch: ${error.message}`,
      RepositoryErrorCodes.CHANNEL_CREATE_FAILED,
      error
    );
  }

  const channelDispatches = (data as ChannelDispatchRow[]).map(rowToChannelDispatch);

  logger.info('Channel dispatch batch created', {
    count: channelDispatches.length,
    dispatchId: firstInput.dispatchId,
  });

  return channelDispatches;
}

/**
 * Filter options for listing dispatches
 */
export interface ListDispatchesFilters {
  status?: DispatchStatus;
  driverId?: string;
  routeId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Retrieves a list of dispatches with optional filters
 *
 * @param filters - Filter options
 * @returns Array of dispatch entities and total count
 */
export async function listDispatches(
  filters: ListDispatchesFilters = {}
): Promise<{ dispatches: Dispatch[]; total: number }> {
  const client = getSupabaseClient();
  const { status, driverId, routeId, limit = 50, offset = 0 } = filters;

  logger.debug('Listing dispatches', { filters });

  let query = client
    .from('dispatches')
    .select('*, drivers(first_name, last_name), routes(route_name)', { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  }
  if (driverId) {
    query = query.eq('driver_id', driverId);
  }
  if (routeId) {
    query = query.eq('route_id', routeId);
  }

  // Order by created_at desc (newest first)
  query = query.order('created_at', { ascending: false });

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    logger.error('Failed to list dispatches', {
      filters,
      error: error.message,
    });
    throw new RepositoryError(
      `Failed to list dispatches: ${error.message}`,
      RepositoryErrorCodes.QUERY_FAILED,
      error
    );
  }

  return {
    dispatches: (data as DispatchRow[]).map(rowToDispatch),
    total: count || 0,
  };
}

/**
 * Dispatch statistics
 */
export interface DispatchStats {
  total: number;
  active: number;
  success: number;
  failed: number;
  pending: number;
}

/**
 * Retrieves statistics about dispatches
 *
 * @returns Dispatch statistics
 */
export async function getDispatchStats(): Promise<DispatchStats> {
  const client = getSupabaseClient();

  logger.debug('Fetching dispatch statistics');

  // We can't do a single simple query for all stats without multiple round trips or a stored procedure/view.
  // For now, let's just get the counts matching our status buckets.
  // Ideally, we'd use a raw SQL query or a view for performance.

  const { data, error } = await client
    .from('dispatches')
    .select('status');

  if (error) {
    logger.error('Failed to fetch dispatch stats', {
      error: error.message,
    });
    throw new RepositoryError(
      `Failed to fetch dispatch stats: ${error.message}`,
      RepositoryErrorCodes.QUERY_FAILED,
      error
    );
  }

  const stats: DispatchStats = {
    total: data.length,
    active: 0,
    success: 0,
    failed: 0,
    pending: 0,
  };

  for (const row of data) {
    const status = row.status as DispatchStatus;
    switch (status) {
      case 'sending':
      case 'partial': // Treat partial as active/warning? Or maybe active? Let's say active for now if it's not fully done?
        // Actually partial usually means some failed, some succeeded.
        // The requirement says: Active Dispatches, Success Rate, Pending, Failed.
        stats.active++;
        break;
      case 'delivered':
        stats.success++;
        break;
      case 'failed':
        stats.failed++;
        break;
      case 'pending':
        stats.pending++;
        break;
    }
  }
  // 'partial' logic check: if 'partial' is considered 'active' or 'warning', adjust.
  // For now let's map 'partial' to 'active' as it's not fully successful or failed.
  // Or maybe we treat it as its own thing, but the dashboard cards requested are specific.

  return stats;
}
