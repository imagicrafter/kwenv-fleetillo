/**
 * Booking Service
 *
 * Provides CRUD operations and business logic for managing bookings
 * in the RouteIQ application.
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
export declare function updateBooking(input: UpdateBookingInput): Promise<Result<Booking>>;
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
//# sourceMappingURL=booking.service.d.ts.map