/**
 * Booking Service
 *
 * Provides CRUD operations and business logic for managing bookings
 * in the Fleetillo application.
 */
import type { Result, PaginationParams, PaginatedResponse } from '../types/index.js';
import type { Booking, CreateBookingInput, UpdateBookingInput, BookingFilters } from '../types/booking.js';
/**
 * Booking service error
 */
export declare class BookingServiceError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, code: string, details?: unknown);
}
/**
 * Error codes for booking service errors
 */
export declare const BookingErrorCodes: {
    readonly NOT_FOUND: "BOOKING_NOT_FOUND";
    readonly CREATE_FAILED: "BOOKING_CREATE_FAILED";
    readonly UPDATE_FAILED: "BOOKING_UPDATE_FAILED";
    readonly DELETE_FAILED: "BOOKING_DELETE_FAILED";
    readonly QUERY_FAILED: "BOOKING_QUERY_FAILED";
    readonly VALIDATION_FAILED: "BOOKING_VALIDATION_FAILED";
};
/**
 * Creates a new booking
 */
export declare function createBooking(input: CreateBookingInput): Promise<Result<Booking>>;
/**
 * Gets a booking by ID
 */
export declare function getBookingById(id: string): Promise<Result<Booking>>;
/**
 * Gets all bookings with optional filtering and pagination
 */
export declare function getBookings(filters?: BookingFilters, pagination?: PaginationParams): Promise<Result<PaginatedResponse<Booking>>>;
/**
 * Updates an existing booking
 */
export declare function updateBooking(input: UpdateBookingInput): Promise<Result<Booking & {
    routeWasInvalidated?: boolean;
    invalidatedRouteId?: string;
}>>;
/**
 * Soft deletes a booking by setting deleted_at timestamp
 */
export declare function deleteBooking(id: string): Promise<Result<void>>;
/**
 * Permanently deletes a booking (hard delete)
 * Use with caution - this cannot be undone
 */
export declare function hardDeleteBooking(id: string): Promise<Result<void>>;
/**
 * Restores a soft-deleted booking
 */
export declare function restoreBooking(id: string): Promise<Result<Booking>>;
/**
 * Counts bookings with optional filters
 */
export declare function countBookings(filters?: BookingFilters): Promise<Result<number>>;
/**
 * Gets bookings by booking number
 */
export declare function getBookingByNumber(bookingNumber: string): Promise<Result<Booking>>;
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
export declare function removeBookingFromRoute(bookingId: string): Promise<Result<void>>;
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
export declare function bulkCreateBookings(inputs: CreateBookingInput[]): Promise<Result<BulkInsertResult>>;
//# sourceMappingURL=booking.service.d.ts.map