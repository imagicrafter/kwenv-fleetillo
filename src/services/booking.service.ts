/**
 * Booking Service
 *
 * Provides CRUD operations and business logic for managing bookings
 * in the Fleetillo application.
 */

import { getSupabaseClient, getAdminSupabaseClient } from './supabase.js';
import { createContextLogger } from '../utils/logger.js';
import type { Result, PaginationParams, PaginatedResponse } from '../types/index.js';
import type {
  Booking,
  BookingRow,
  CreateBookingInput,
  UpdateBookingInput,
  BookingFilters,
} from '../types/booking.js';
import {
  rowToBooking as convertRowToBooking,
  bookingInputToRow as convertInputToRow,
  updateBookingInputToRow as convertUpdateInputToRow,
} from '../types/booking.js';

/**
 * Logger instance for booking operations
 */
const logger = createContextLogger('BookingService');

/**
 * Table name for bookings in the fleetillo schema
 */
const BOOKINGS_TABLE = 'bookings';

/**
 * Booking service error
 */
export class BookingServiceError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'BookingServiceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Error codes for booking service errors
 */
export const BookingErrorCodes = {
  NOT_FOUND: 'BOOKING_NOT_FOUND',
  CREATE_FAILED: 'BOOKING_CREATE_FAILED',
  UPDATE_FAILED: 'BOOKING_UPDATE_FAILED',
  DELETE_FAILED: 'BOOKING_DELETE_FAILED',
  QUERY_FAILED: 'BOOKING_QUERY_FAILED',
  VALIDATION_FAILED: 'BOOKING_VALIDATION_FAILED',
} as const;

/**
 * Validates booking input data
 */
function validateBookingInput(input: CreateBookingInput): Result<void> {
  if (!input.customerId || input.customerId.trim().length === 0) {
    return {
      success: false,
      error: new BookingServiceError(
        'Customer ID is required',
        BookingErrorCodes.VALIDATION_FAILED,
        { field: 'customerId' }
      ),
    };
  }

  if (
    (!input.serviceId || input.serviceId.trim().length === 0) &&
    (!input.serviceItems || input.serviceItems.length === 0)
  ) {
    return {
      success: false,
      error: new BookingServiceError(
        'At least one service is required',
        BookingErrorCodes.VALIDATION_FAILED,
        { field: 'serviceItems' }
      ),
    };
  }

  if (!input.bookingType) {
    return {
      success: false,
      error: new BookingServiceError(
        'Booking type is required',
        BookingErrorCodes.VALIDATION_FAILED,
        { field: 'bookingType' }
      ),
    };
  }

  if (!input.scheduledDate) {
    return {
      success: false,
      error: new BookingServiceError(
        'Scheduled date is required',
        BookingErrorCodes.VALIDATION_FAILED,
        { field: 'scheduledDate' }
      ),
    };
  }

  // scheduledStartTime is now optional - route planning will set it later

  // Validate recurring booking has recurrence pattern
  if (input.bookingType === 'recurring' && !input.recurrencePattern) {
    return {
      success: false,
      error: new BookingServiceError(
        'Recurrence pattern is required for recurring bookings',
        BookingErrorCodes.VALIDATION_FAILED,
        { field: 'recurrencePattern' }
      ),
    };
  }

  // Validate one-time booking doesn't have recurrence pattern
  if (input.bookingType === 'one_time' && input.recurrencePattern) {
    return {
      success: false,
      error: new BookingServiceError(
        'One-time bookings cannot have a recurrence pattern',
        BookingErrorCodes.VALIDATION_FAILED,
        { field: 'recurrencePattern' }
      ),
    };
  }

  // Validate estimated duration if provided
  if (input.estimatedDurationMinutes !== undefined && input.estimatedDurationMinutes <= 0) {
    return {
      success: false,
      error: new BookingServiceError(
        'Estimated duration must be greater than 0',
        BookingErrorCodes.VALIDATION_FAILED,
        { field: 'estimatedDurationMinutes', value: input.estimatedDurationMinutes }
      ),
    };
  }

  // Validate pricing if provided
  if (input.quotedPrice !== undefined && input.quotedPrice < 0) {
    return {
      success: false,
      error: new BookingServiceError(
        'Quoted price cannot be negative',
        BookingErrorCodes.VALIDATION_FAILED,
        { field: 'quotedPrice', value: input.quotedPrice }
      ),
    };
  }

  if (input.finalPrice !== undefined && input.finalPrice < 0) {
    return {
      success: false,
      error: new BookingServiceError(
        'Final price cannot be negative',
        BookingErrorCodes.VALIDATION_FAILED,
        { field: 'finalPrice', value: input.finalPrice }
      ),
    };
  }

  // Validate location coordinates if provided
  if (
    input.serviceLatitude !== undefined &&
    (input.serviceLatitude < -90 || input.serviceLatitude > 90)
  ) {
    return {
      success: false,
      error: new BookingServiceError(
        'Service latitude must be between -90 and 90',
        BookingErrorCodes.VALIDATION_FAILED,
        { field: 'serviceLatitude', value: input.serviceLatitude }
      ),
    };
  }

  if (
    input.serviceLongitude !== undefined &&
    (input.serviceLongitude < -180 || input.serviceLongitude > 180)
  ) {
    return {
      success: false,
      error: new BookingServiceError(
        'Service longitude must be between -180 and 180',
        BookingErrorCodes.VALIDATION_FAILED,
        { field: 'serviceLongitude', value: input.serviceLongitude }
      ),
    };
  }

  return { success: true };
}

/**
 * Creates a new booking
 */
export async function createBooking(input: CreateBookingInput): Promise<Result<Booking>> {
  logger.debug('Creating booking', {
    customerId: input.customerId,
    serviceItemsCount: input.serviceItems?.length,
  });

  // Validate input
  const validationResult = validateBookingInput(input);
  if (!validationResult.success) {
    return { success: false, error: validationResult.error };
  }

  try {
    // Use admin client if available to bypass RLS policies
    const supabase = getAdminSupabaseClient() || getSupabaseClient();
    const rowData = convertInputToRow(input);

    // Auto-generate booking number if not provided
    if (!rowData.booking_number) {
      // Get date string either from input or fallback to today
      let dateStr: string;
      const scheduledDate = input.scheduledDate;
      if (scheduledDate) {
        const dateValue =
          typeof scheduledDate === 'string'
            ? scheduledDate
            : scheduledDate.toISOString().split('T')[0];
        dateStr = (dateValue ?? '').replace(/-/g, '');
      } else {
        dateStr = new Date().toISOString().split('T')[0]!.replace(/-/g, '');
      }
      // Count existing bookings for this date to get sequence number
      const { count: existingCount } = await supabase
        .from(BOOKINGS_TABLE)
        .select('*', { count: 'exact', head: true })
        .like('booking_number', `BK-${dateStr}-%`);
      const sequenceNum = (existingCount || 0) + 1;
      rowData.booking_number = `BK-${dateStr}-${sequenceNum.toString().padStart(3, '0')}`;
    }

    const { data, error } = await supabase
      .from(BOOKINGS_TABLE)
      .insert(rowData)
      .select(
        '*, customers(name, email), services(name, code, average_duration_minutes), locations(name, latitude, longitude), routes(route_code, vehicle_id, vehicles(unit_number))'
      )
      .single();

    if (error) {
      logger.error('Failed to create booking', error);
      return {
        success: false,
        error: new BookingServiceError(
          `Failed to create booking: ${error.message}`,
          BookingErrorCodes.CREATE_FAILED,
          error
        ),
      };
    }

    const booking = convertRowToBooking(data as BookingRow);
    logger.info('Booking created successfully', { bookingId: booking.id });

    return { success: true, data: booking };
  } catch (error) {
    logger.error('Unexpected error creating booking', error);
    return {
      success: false,
      error: new BookingServiceError(
        'Unexpected error creating booking',
        BookingErrorCodes.CREATE_FAILED,
        error
      ),
    };
  }
}

/**
 * Gets a booking by ID
 */
export async function getBookingById(id: string): Promise<Result<Booking>> {
  logger.debug('Getting booking by ID', { id });

  try {
    // Use admin client if available to bypass RLS policies
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    const { data, error } = await supabase
      .from(BOOKINGS_TABLE)
      .select(
        '*, customers(name, email), services(name, code, average_duration_minutes), locations(name, latitude, longitude), routes(route_code, vehicle_id, vehicles(unit_number))'
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: new BookingServiceError(`Booking not found: ${id}`, BookingErrorCodes.NOT_FOUND, {
            id,
          }),
        };
      }
      logger.error('Failed to get booking', error);
      return {
        success: false,
        error: new BookingServiceError(
          `Failed to get booking: ${error.message}`,
          BookingErrorCodes.QUERY_FAILED,
          error
        ),
      };
    }

    const booking = convertRowToBooking(data as BookingRow);
    return { success: true, data: booking };
  } catch (error) {
    logger.error('Unexpected error getting booking', error);
    return {
      success: false,
      error: new BookingServiceError(
        'Unexpected error getting booking',
        BookingErrorCodes.QUERY_FAILED,
        error
      ),
    };
  }
}

/**
 * Gets all bookings with optional filtering and pagination
 */
export async function getBookings(
  filters?: BookingFilters,
  pagination?: PaginationParams
): Promise<Result<PaginatedResponse<Booking>>> {
  logger.debug('Getting bookings', { filters, pagination });

  try {
    // Use admin client if available to bypass RLS policies
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    let query = supabase
      .from(BOOKINGS_TABLE)
      .select(
        '*, customers(name, email), services(name, code, average_duration_minutes), locations(name, latitude, longitude), routes(route_code, vehicle_id, vehicles(unit_number))',
        { count: 'exact' }
      );

    // Apply filters
    if (!filters?.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (filters?.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }

    if (filters?.serviceId) {
      // Filter by checking if service_ids array contains the ID
      query = query.contains('service_ids', [filters.serviceId]);
    }

    // Route-based filters
    if (filters?.routeId) {
      query = query.eq('route_id', filters.routeId);
    }

    if (filters?.routeIdIsNull === true) {
      query = query.is('route_id', null);
    }

    if (filters?.bookingType) {
      query = query.eq('booking_type', filters.bookingType);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    if (filters?.scheduledDateFrom) {
      const dateFrom =
        typeof filters.scheduledDateFrom === 'string'
          ? filters.scheduledDateFrom
          : filters.scheduledDateFrom.toISOString().split('T')[0];
      query = query.gte('scheduled_date', dateFrom);
    }

    if (filters?.scheduledDateTo) {
      const dateTo =
        typeof filters.scheduledDateTo === 'string'
          ? filters.scheduledDateTo
          : filters.scheduledDateTo.toISOString().split('T')[0];
      query = query.lte('scheduled_date', dateTo);
    }

    // Store search term for client-side filtering (including related fields like client, service, location names)
    const searchTerm = filters?.searchTerm?.toLowerCase();

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    if (filters?.ids && filters.ids.length > 0) {
      query = query.in('id', filters.ids);
    }

    // Apply pagination - fetch more rows when searching to allow client-side filtering
    const page = pagination?.page ?? 1;
    const baseLimit = pagination?.limit ?? 20;
    // When searching, fetch more rows since we'll filter client-side
    const limit = searchTerm ? Math.max(baseLimit * 5, 100) : baseLimit;
    const offset = (page - 1) * baseLimit; // Keep user's page offset based on their limit

    query = query.range(offset, offset + limit - 1);

    // Apply sorting
    const sortBy = pagination?.sortBy ?? 'scheduled_date';
    const sortOrder = pagination?.sortOrder ?? 'asc';

    // When sorting by date, also sort by time to provide a meaningful chronological order
    if (sortBy === 'scheduled_date') {
      query = query
        .order('scheduled_date', { ascending: sortOrder === 'asc' })
        .order('scheduled_start_time', { ascending: sortOrder === 'asc' });
    } else {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to get bookings', error);
      return {
        success: false,
        error: new BookingServiceError(
          `Failed to get bookings: ${error.message}`,
          BookingErrorCodes.QUERY_FAILED,
          error
        ),
      };
    }

    let bookings = (data as BookingRow[]).map(convertRowToBooking);

    // Client-side filtering for related table fields (customer name, service name, location name)
    // since Supabase .or() doesn't support related table columns
    if (searchTerm) {
      bookings = bookings.filter(b => {
        const directMatch =
          b.bookingNumber?.toLowerCase().includes(searchTerm) ||
          b.specialInstructions?.toLowerCase().includes(searchTerm);
        const customerMatch = b.customerName?.toLowerCase().includes(searchTerm);
        const serviceMatch = b.serviceName?.toLowerCase().includes(searchTerm);
        const locationMatch = b.locationName?.toLowerCase().includes(searchTerm);
        return directMatch || customerMatch || serviceMatch || locationMatch;
      });
    }

    const total = count ?? 0;

    // When searching, return the filtered results (capped at user's limit)
    const finalBookings = searchTerm ? bookings.slice(0, baseLimit) : bookings;
    const finalTotal = searchTerm ? bookings.length : total;

    return {
      success: true,
      data: {
        data: finalBookings,
        pagination: {
          page,
          limit: baseLimit,
          total: finalTotal,
          totalPages: Math.ceil(finalTotal / baseLimit),
        },
      },
    };
  } catch (error) {
    logger.error('Unexpected error getting bookings', error);
    return {
      success: false,
      error: new BookingServiceError(
        'Unexpected error getting bookings',
        BookingErrorCodes.QUERY_FAILED,
        error
      ),
    };
  }
}

/**
 * Updates an existing booking
 */
export async function updateBooking(
  input: UpdateBookingInput
): Promise<Result<Booking & { routeWasInvalidated?: boolean; invalidatedRouteId?: string }>> {
  logger.debug('Updating booking', { id: input.id });

  // Only validate core required fields if entity references are being changed
  // Skip full validation for simple updates like status or schedule time changes
  // Fetch existing booking to merge with updates for validation
  const existingResult = await getBookingById(input.id);
  if (!existingResult.success || !existingResult.data) {
    return existingResult;
  }
  const existing = existingResult.data;

  const validationInput: CreateBookingInput = {
    customerId: input.customerId ?? existing.customerId,
    serviceId: input.serviceId, // Deprecated, but keep if provided
    serviceItems: input.serviceItems ?? existing.serviceItems,
    bookingType: input.bookingType ?? existing.bookingType,
    scheduledDate: input.scheduledDate ?? existing.scheduledDate,
    scheduledStartTime: input.scheduledStartTime ?? existing.scheduledStartTime ?? '00:00',
    // Map other optional fields that might be validated
    recurrencePattern: input.recurrencePattern ?? existing.recurrencePattern,
    estimatedDurationMinutes: input.estimatedDurationMinutes ?? existing.estimatedDurationMinutes,
    quotedPrice: input.quotedPrice ?? existing.quotedPrice,
    finalPrice: input.finalPrice ?? existing.finalPrice,
    serviceLatitude: input.serviceLatitude ?? existing.serviceLatitude,
    serviceLongitude: input.serviceLongitude ?? existing.serviceLongitude,
  };

  const validationResult = validateBookingInput(validationInput);
  if (!validationResult.success) {
    return { success: false, error: validationResult.error };
  }

  // Validate estimatedDurationMinutes only if explicitly provided with a value
  if (input.estimatedDurationMinutes !== undefined && input.estimatedDurationMinutes <= 0) {
    return {
      success: false,
      error: new BookingServiceError(
        'Estimated duration must be greater than 0',
        BookingErrorCodes.VALIDATION_FAILED,
        { field: 'estimatedDurationMinutes', value: input.estimatedDurationMinutes }
      ),
    };
  }

  // --- Route-affecting change detection ---
  // Check if this booking is on a route and if the update affects route logistics
  let routeWasInvalidated = false;
  let invalidatedRouteId: string | undefined;

  if (existing.routeId) {
    const routeAffectingFieldsChanged = detectRouteAffectingChanges(existing, input);
    if (routeAffectingFieldsChanged) {
      invalidatedRouteId = existing.routeId;
      routeWasInvalidated = true;
      logger.info('Route-affecting change detected, will flag route for recalculation', {
        bookingId: input.id,
        routeId: invalidatedRouteId,
      });
    }
  }

  try {
    // Use admin client if available to bypass RLS policies
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    // Build update object from input
    const { id } = input;
    const rowData = convertUpdateInputToRow(input);

    const { data, error } = await supabase
      .from(BOOKINGS_TABLE)
      .update(rowData)
      .eq('id', id)
      .is('deleted_at', null)
      .select(
        '*, customers(name, email), services(name, code), locations(name, latitude, longitude), routes(route_code, vehicle_id, vehicles(unit_number))'
      )
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: new BookingServiceError(`Booking not found: ${id}`, BookingErrorCodes.NOT_FOUND, {
            id,
          }),
        };
      }
      logger.error('Failed to update booking', error);
      return {
        success: false,
        error: new BookingServiceError(
          `Failed to update booking: ${error.message}`,
          BookingErrorCodes.UPDATE_FAILED,
          error
        ),
      };
    }

    // If route was invalidated, flag it for recalculation
    if (routeWasInvalidated && invalidatedRouteId) {
      const { error: routeFlagError } = await supabase
        .from('routes')
        .update({
          needs_recalculation: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invalidatedRouteId)
        .is('deleted_at', null);

      if (routeFlagError) {
        logger.error('Failed to flag route for recalculation', {
          routeId: invalidatedRouteId,
          error: routeFlagError,
        });
        // Don't fail the booking update, but log the issue
      } else {
        logger.info('Route flagged for recalculation', { routeId: invalidatedRouteId });
      }
    }

    const booking = convertRowToBooking(data as BookingRow);
    logger.info('Booking updated successfully', { bookingId: booking.id });

    return {
      success: true,
      data: {
        ...booking,
        routeWasInvalidated,
        invalidatedRouteId,
      },
    };
  } catch (error) {
    logger.error('Unexpected error updating booking', error);
    return {
      success: false,
      error: new BookingServiceError(
        'Unexpected error updating booking',
        BookingErrorCodes.UPDATE_FAILED,
        error
      ),
    };
  }
}

/**
 * Detects if the update contains changes to fields that affect route logistics
 */
function detectRouteAffectingChanges(existing: Booking, input: UpdateBookingInput): boolean {
  // Helper to normalize dates for comparison
  const normalizeDate = (d: Date | string | undefined): string | undefined => {
    if (!d) return undefined;
    if (typeof d === 'string') return d.split('T')[0];
    return d.toISOString().split('T')[0];
  };

  // Check scheduledDate change
  if (input.scheduledDate !== undefined) {
    const existingDate = normalizeDate(existing.scheduledDate);
    const newDate = normalizeDate(input.scheduledDate);
    if (existingDate !== newDate) {
      logger.debug('Route-affecting change: scheduledDate', {
        existing: existingDate,
        new: newDate,
      });
      return true;
    }
  }

  // Check locationId change
  if (input.locationId !== undefined && input.locationId !== existing.locationId) {
    logger.debug('Route-affecting change: locationId', {
      existing: existing.locationId,
      new: input.locationId,
    });
    return true;
  }

  // Check service latitude/longitude change
  if (input.serviceLatitude !== undefined && input.serviceLatitude !== existing.serviceLatitude) {
    logger.debug('Route-affecting change: serviceLatitude', {
      existing: existing.serviceLatitude,
      new: input.serviceLatitude,
    });
    return true;
  }
  if (
    input.serviceLongitude !== undefined &&
    input.serviceLongitude !== existing.serviceLongitude
  ) {
    logger.debug('Route-affecting change: serviceLongitude', {
      existing: existing.serviceLongitude,
      new: input.serviceLongitude,
    });
    return true;
  }

  // Check estimatedDurationMinutes change
  if (
    input.estimatedDurationMinutes !== undefined &&
    input.estimatedDurationMinutes !== existing.estimatedDurationMinutes
  ) {
    logger.debug('Route-affecting change: estimatedDurationMinutes', {
      existing: existing.estimatedDurationMinutes,
      new: input.estimatedDurationMinutes,
    });
    return true;
  }

  // Check status change to cancelled or completed (booking effectively removed from route)
  if (
    input.status !== undefined &&
    (input.status === 'cancelled' || input.status === 'completed')
  ) {
    if (existing.status !== input.status) {
      logger.debug('Route-affecting change: status to cancelled/completed', {
        existing: existing.status,
        new: input.status,
      });
      return true;
    }
  }

  return false;
}

/**
 * Soft deletes a booking by setting deleted_at timestamp
 */
export async function deleteBooking(id: string): Promise<Result<void>> {
  logger.debug('Deleting booking', { id });

  try {
    // Use admin client if available to bypass RLS policies
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    const { error } = await supabase
      .from(BOOKINGS_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      logger.error('Failed to delete booking', error);
      return {
        success: false,
        error: new BookingServiceError(
          `Failed to delete booking: ${error.message}`,
          BookingErrorCodes.DELETE_FAILED,
          error
        ),
      };
    }

    logger.info('Booking deleted successfully', { bookingId: id });
    return { success: true };
  } catch (error) {
    logger.error('Unexpected error deleting booking', error);
    return {
      success: false,
      error: new BookingServiceError(
        'Unexpected error deleting booking',
        BookingErrorCodes.DELETE_FAILED,
        error
      ),
    };
  }
}

/**
 * Permanently deletes a booking (hard delete)
 * Use with caution - this cannot be undone
 */
export async function hardDeleteBooking(id: string): Promise<Result<void>> {
  logger.warn('Hard deleting booking', { id });

  try {
    const adminClient = getAdminSupabaseClient();

    if (!adminClient) {
      return {
        success: false,
        error: new BookingServiceError(
          'Admin client not available for hard delete operation',
          BookingErrorCodes.DELETE_FAILED
        ),
      };
    }

    const { error } = await adminClient.from(BOOKINGS_TABLE).delete().eq('id', id);

    if (error) {
      logger.error('Failed to hard delete booking', error);
      return {
        success: false,
        error: new BookingServiceError(
          `Failed to hard delete booking: ${error.message}`,
          BookingErrorCodes.DELETE_FAILED,
          error
        ),
      };
    }

    logger.info('Booking hard deleted successfully', { bookingId: id });
    return { success: true };
  } catch (error) {
    logger.error('Unexpected error hard deleting booking', error);
    return {
      success: false,
      error: new BookingServiceError(
        'Unexpected error hard deleting booking',
        BookingErrorCodes.DELETE_FAILED,
        error
      ),
    };
  }
}

/**
 * Restores a soft-deleted booking
 */
export async function restoreBooking(id: string): Promise<Result<Booking>> {
  logger.debug('Restoring booking', { id });

  try {
    // Use admin client if available to bypass RLS policies
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    const { data, error } = await supabase
      .from(BOOKINGS_TABLE)
      .update({ deleted_at: null })
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .select(
        '*, customers(name, email), services(name, code), locations(name, latitude, longitude), routes(route_code, vehicle_id, vehicles(unit_number))'
      )
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: new BookingServiceError(
            `Deleted booking not found: ${id}`,
            BookingErrorCodes.NOT_FOUND,
            { id }
          ),
        };
      }
      logger.error('Failed to restore booking', error);
      return {
        success: false,
        error: new BookingServiceError(
          `Failed to restore booking: ${error.message}`,
          BookingErrorCodes.UPDATE_FAILED,
          error
        ),
      };
    }

    const booking = convertRowToBooking(data as BookingRow);
    logger.info('Booking restored successfully', { bookingId: booking.id });

    return { success: true, data: booking };
  } catch (error) {
    logger.error('Unexpected error restoring booking', error);
    return {
      success: false,
      error: new BookingServiceError(
        'Unexpected error restoring booking',
        BookingErrorCodes.UPDATE_FAILED,
        error
      ),
    };
  }
}

/**
 * Counts bookings with optional filters
 */
export async function countBookings(filters?: BookingFilters): Promise<Result<number>> {
  logger.debug('Counting bookings', { filters });

  try {
    // Use admin client if available to bypass RLS policies
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    let query = supabase.from(BOOKINGS_TABLE).select('*', { count: 'exact', head: true });

    if (!filters?.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.bookingType) {
      query = query.eq('booking_type', filters.bookingType);
    }

    const { count, error } = await query;

    if (error) {
      logger.error('Failed to count bookings', error);
      return {
        success: false,
        error: new BookingServiceError(
          `Failed to count bookings: ${error.message}`,
          BookingErrorCodes.QUERY_FAILED,
          error
        ),
      };
    }

    return { success: true, data: count ?? 0 };
  } catch (error) {
    logger.error('Unexpected error counting bookings', error);
    return {
      success: false,
      error: new BookingServiceError(
        'Unexpected error counting bookings',
        BookingErrorCodes.QUERY_FAILED,
        error
      ),
    };
  }
}

/**
 * Gets bookings by booking number
 */
export async function getBookingByNumber(bookingNumber: string): Promise<Result<Booking>> {
  logger.debug('Getting booking by number', { bookingNumber });

  try {
    // Use admin client if available to bypass RLS policies
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    const { data, error } = await supabase
      .from(BOOKINGS_TABLE)
      .select(
        '*, customers(name, email), services(name, code), locations(name, latitude, longitude), routes(route_code, vehicle_id, vehicles(unit_number))'
      )
      .eq('booking_number', bookingNumber)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: new BookingServiceError(
            `Booking not found with number: ${bookingNumber}`,
            BookingErrorCodes.NOT_FOUND,
            { bookingNumber }
          ),
        };
      }
      logger.error('Failed to get booking by number', error);
      return {
        success: false,
        error: new BookingServiceError(
          `Failed to get booking: ${error.message}`,
          BookingErrorCodes.QUERY_FAILED,
          error
        ),
      };
    }

    const booking = convertRowToBooking(data as BookingRow);
    return { success: true, data: booking };
  } catch (error) {
    logger.error('Unexpected error getting booking by number', error);
    return {
      success: false,
      error: new BookingServiceError(
        'Unexpected error getting booking',
        BookingErrorCodes.QUERY_FAILED,
        error
      ),
    };
  }
}

/**
 * Removes a booking from its assigned route.
 * This function:
 * 1. Clears the booking's route_id and stop_order
 * 2. Renumbers remaining bookings on the route
 * 3. Flags the route as needing recalculation
 * 4. Updates the route's total_stops count
 *
 * @param bookingId - The ID of the booking to remove from its route
 * @returns Result indicating success or failure
 */
export async function removeBookingFromRoute(bookingId: string): Promise<Result<void>> {
  logger.info('Removing booking from route', { bookingId });

  try {
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    // First, get the booking to find its route_id and stop_order
    const { data: booking, error: fetchError } = await supabase
      .from(BOOKINGS_TABLE)
      .select('id, route_id, stop_order')
      .eq('id', bookingId)
      .is('deleted_at', null)
      .single();

    if (fetchError) {
      logger.error('Failed to fetch booking for route removal', fetchError);
      return {
        success: false,
        error: new BookingServiceError(
          'Failed to fetch booking',
          BookingErrorCodes.QUERY_FAILED,
          fetchError
        ),
      };
    }

    if (!booking.route_id) {
      logger.info('Booking is not assigned to any route', { bookingId });
      return { success: true }; // Nothing to do
    }

    const routeId = booking.route_id;
    const removedStopOrder = booking.stop_order;

    // Clear the booking's route assignment
    const { error: updateError } = await supabase
      .from(BOOKINGS_TABLE)
      .update({
        route_id: null,
        stop_order: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      logger.error('Failed to clear booking route assignment', updateError);
      return {
        success: false,
        error: new BookingServiceError(
          'Failed to remove booking from route',
          BookingErrorCodes.UPDATE_FAILED,
          updateError
        ),
      };
    }

    // Renumber remaining bookings on the route (decrement stop_order for those after the removed one)
    if (removedStopOrder !== null) {
      const { error: renumberError } = await supabase.rpc('renumber_route_stops', {
        p_route_id: routeId,
        p_removed_stop_order: removedStopOrder,
      });

      // If RPC doesn't exist, fall back to manual update
      if (renumberError && renumberError.code === '42883') {
        // Function doesn't exist, do manual update
        const { error: manualError } = await supabase
          .from(BOOKINGS_TABLE)
          .update({ stop_order: supabase.rpc('stop_order - 1') })
          .eq('route_id', routeId)
          .gt('stop_order', removedStopOrder)
          .is('deleted_at', null);

        // Ignore this error for now - a simple decrement isn't directly supported
        // The stops will be a bit out of order but will still work
        if (manualError) {
          logger.warn('Could not renumber stops automatically', { error: manualError });
        }
      }
    }

    // Flag the route as needing recalculation and update stop count
    const { error: routeUpdateError } = await supabase
      .from('routes')
      .update({
        needs_recalculation: true,
        total_stops: supabase.rpc('greatest', { a: 0, b: 'total_stops - 1' }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', routeId)
      .is('deleted_at', null);

    // Fallback if RPC doesn't work - just set the flag
    if (routeUpdateError) {
      const { error: flagError } = await supabase
        .from('routes')
        .update({
          needs_recalculation: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', routeId)
        .is('deleted_at', null);

      if (flagError) {
        logger.error('Failed to flag route for recalculation', flagError);
        // Don't fail the whole operation - the booking was already removed
      }
    }

    logger.info('Successfully removed booking from route', {
      bookingId,
      routeId,
      removedStopOrder,
    });

    return { success: true };
  } catch (error) {
    logger.error('Unexpected error removing booking from route', error);
    return {
      success: false,
      error: new BookingServiceError(
        'Unexpected error removing booking from route',
        BookingErrorCodes.UPDATE_FAILED,
        error
      ),
    };
  }
}

/**
 * Bulk insert error details
 */
export interface BulkInsertError {
  rowNumber: number;
  field?: string;
  message: string;
}

/**
 * Result of bulk booking creation
 */
export interface BulkInsertResult {
  created: number;
  errors: BulkInsertError[];
}

/**
 * Creates multiple bookings in a single transaction
 * All bookings are created or none are created (all-or-nothing)
 */
export async function bulkCreateBookings(
  inputs: CreateBookingInput[]
): Promise<Result<BulkInsertResult>> {
  logger.info('Bulk creating bookings', { count: inputs.length });

  // Handle empty input
  if (inputs.length === 0) {
    return {
      success: true,
      data: {
        created: 0,
        errors: [],
      },
    };
  }

  try {
    // Validate all inputs first
    const validationErrors: BulkInsertError[] = [];
    const validInputs: CreateBookingInput[] = [];

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      if (!input) continue; // Skip undefined/null entries

      const rowNumber = i + 1; // 1-indexed for user-friendly error messages
      const validation = validateBookingInput(input);

      if (!validation.success) {
        const error = validation.error as BookingServiceError;
        const details = error.details as { field?: string } | undefined;
        validationErrors.push({
          rowNumber,
          field: details?.field,
          message: error.message,
        });
      } else {
        validInputs.push(input);
      }
    }

    // If there are validation errors, return them without creating anything
    if (validationErrors.length > 0) {
      logger.warn('Bulk booking validation failed', {
        totalInputs: inputs.length,
        validationErrors: validationErrors.length,
      });
      return {
        success: true,
        data: {
          created: 0,
          errors: validationErrors,
        },
      };
    }

    // Use admin client if available to bypass RLS policies
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    // Convert all inputs to row format
    const rowsData = validInputs.map(input => {
      const rowData = convertInputToRow(input);
      // Note: We're not auto-generating booking numbers for bulk inserts
      // This should be handled by the database or provided in the input
      return rowData;
    });

    // Insert all bookings in a single batch operation
    const { data, error } = await supabase
      .from(BOOKINGS_TABLE)
      .insert(rowsData)
      .select(
        '*, customers(name, email), services(name, code, average_duration_minutes), locations(name, latitude, longitude), routes(route_code, vehicle_id, vehicles(unit_number))'
      );

    if (error) {
      logger.error('Failed to bulk create bookings', error);

      // Try to extract row-specific error information if available
      const errorDetails: BulkInsertError[] = [];

      // Check if it's a foreign key violation
      if (error.code === '23503') {
        // Foreign key violation - likely a customerId or serviceId doesn't exist
        errorDetails.push({
          rowNumber: 1, // Can't determine specific row from batch insert
          message: `Foreign key violation: ${error.message}. Check that all customerId and serviceId values exist.`,
        });
      } else {
        errorDetails.push({
          rowNumber: 1,
          message: `Database error: ${error.message}`,
        });
      }

      return {
        success: true,
        data: {
          created: 0,
          errors: errorDetails,
        },
      };
    }

    logger.info('Successfully bulk created bookings', {
      count: data?.length || 0,
    });

    return {
      success: true,
      data: {
        created: data?.length || 0,
        errors: [],
      },
    };
  } catch (error) {
    logger.error('Unexpected error in bulk create bookings', error);
    return {
      success: false,
      error: new BookingServiceError(
        'Unexpected error during bulk booking creation',
        BookingErrorCodes.CREATE_FAILED,
        error
      ),
    };
  }
}
