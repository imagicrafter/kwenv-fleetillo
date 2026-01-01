/**
 * Booking Service
 *
 * Provides CRUD operations and business logic for managing bookings
 * in the RouteIQ application.
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
 * Table name for bookings in the routeiq schema
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
  if (!input.clientId || input.clientId.trim().length === 0) {
    return {
      success: false,
      error: new BookingServiceError(
        'Client ID is required',
        BookingErrorCodes.VALIDATION_FAILED,
        { field: 'clientId' }
      ),
    };
  }

  if (!input.serviceId || input.serviceId.trim().length === 0) {
    return {
      success: false,
      error: new BookingServiceError(
        'Service ID is required',
        BookingErrorCodes.VALIDATION_FAILED,
        { field: 'serviceId' }
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

  if (!input.scheduledStartTime) {
    return {
      success: false,
      error: new BookingServiceError(
        'Scheduled start time is required',
        BookingErrorCodes.VALIDATION_FAILED,
        { field: 'scheduledStartTime' }
      ),
    };
  }

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
  if (input.serviceLatitude !== undefined && (input.serviceLatitude < -90 || input.serviceLatitude > 90)) {
    return {
      success: false,
      error: new BookingServiceError(
        'Service latitude must be between -90 and 90',
        BookingErrorCodes.VALIDATION_FAILED,
        { field: 'serviceLatitude', value: input.serviceLatitude }
      ),
    };
  }

  if (input.serviceLongitude !== undefined && (input.serviceLongitude < -180 || input.serviceLongitude > 180)) {
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
  logger.debug('Creating booking', { clientId: input.clientId, serviceId: input.serviceId });

  // Validate input
  const validationResult = validateBookingInput(input);
  if (!validationResult.success) {
    return validationResult as Result<Booking>;
  }

  try {
    // Use admin client if available to bypass RLS policies
    const supabase = getAdminSupabaseClient() || getSupabaseClient();
    const rowData = convertInputToRow(input);

    const { data, error } = await supabase
      .from(BOOKINGS_TABLE)
      .insert(rowData)
      .select('*, clients(name, email), services(name, code), locations(name, latitude, longitude)')
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
      .select('*, clients(name, email), services(name, code), locations(name, latitude, longitude)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: new BookingServiceError(
            `Booking not found: ${id}`,
            BookingErrorCodes.NOT_FOUND,
            { id }
          ),
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

    let query = supabase.from(BOOKINGS_TABLE).select('*, clients(name, email), services(name, code), locations(name, latitude, longitude)', { count: 'exact' });

    // Apply filters
    if (!filters?.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (filters?.clientId) {
      query = query.eq('client_id', filters.clientId);
    }

    if (filters?.serviceId) {
      query = query.eq('service_id', filters.serviceId);
    }

    if (filters?.vehicleId) {
      query = query.eq('vehicle_id', filters.vehicleId);
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
      const dateFrom = typeof filters.scheduledDateFrom === 'string'
        ? filters.scheduledDateFrom
        : filters.scheduledDateFrom.toISOString().split('T')[0];
      query = query.gte('scheduled_date', dateFrom);
    }

    if (filters?.scheduledDateTo) {
      const dateTo = typeof filters.scheduledDateTo === 'string'
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
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

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

    // Client-side filtering for related table fields (client name, service name, location name)
    // since Supabase .or() doesn't support related table columns
    if (searchTerm) {
      bookings = bookings.filter(b => {
        const directMatch =
          b.bookingNumber?.toLowerCase().includes(searchTerm) ||
          b.specialInstructions?.toLowerCase().includes(searchTerm);
        const clientMatch = b.clientName?.toLowerCase().includes(searchTerm);
        const serviceMatch = b.serviceName?.toLowerCase().includes(searchTerm);
        const locationMatch = b.locationName?.toLowerCase().includes(searchTerm);
        return directMatch || clientMatch || serviceMatch || locationMatch;
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
export async function updateBooking(input: UpdateBookingInput): Promise<Result<Booking>> {
  logger.debug('Updating booking', { id: input.id });

  // Validate input if required fields are being updated
  if (input.clientId || input.serviceId || input.bookingType || input.scheduledDate || input.scheduledStartTime) {
    const validationInput: CreateBookingInput = {
      clientId: input.clientId ?? '',
      serviceId: input.serviceId ?? '',
      bookingType: input.bookingType ?? 'one_time',
      scheduledDate: input.scheduledDate ?? new Date(),
      scheduledStartTime: input.scheduledStartTime ?? '00:00',
      ...input,
    };
    const validationResult = validateBookingInput(validationInput);
    if (!validationResult.success) {
      return validationResult as Result<Booking>;
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
      .select('*, clients(name, email), services(name, code), locations(name, latitude, longitude)')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: new BookingServiceError(
            `Booking not found: ${id}`,
            BookingErrorCodes.NOT_FOUND,
            { id }
          ),
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

    const booking = convertRowToBooking(data as BookingRow);
    logger.info('Booking updated successfully', { bookingId: booking.id });

    return { success: true, data: booking };
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

    const { error } = await adminClient
      .from(BOOKINGS_TABLE)
      .delete()
      .eq('id', id);

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
      .select('*, clients(name, email), services(name, code), locations(name, latitude, longitude)')
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
      .select('*, clients(name, email), services(name, code), locations(name, latitude, longitude)')
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
