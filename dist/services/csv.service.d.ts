/**
 * CSV parsing and validation service for booking uploads
 */
import type { Result } from '../types/index.js';
import type { CreateBookingInput } from '../types/booking.js';
/**
 * Expected CSV columns for booking import
 */
export interface CSVBookingRow {
    customerId: string;
    bookingType: string;
    scheduledDate: string;
    serviceIds?: string;
    scheduledStartTime?: string;
    locationId?: string;
    status?: string;
    priority?: string;
    quotedPrice?: string;
    estimatedDurationMinutes?: string;
    specialInstructions?: string;
    serviceAddressLine1?: string;
    serviceAddressLine2?: string;
    serviceCity?: string;
    serviceState?: string;
    servicePostalCode?: string;
    serviceCountry?: string;
    recurrencePattern?: string;
    recurrenceEndDate?: string;
    tags?: string;
}
/**
 * CSV parsing error details
 */
export interface CSVError {
    row?: number;
    field?: string;
    message: string;
    value?: any;
}
/**
 * CSV parsing result with detailed errors
 */
export interface CSVParseResult {
    validBookings: CreateBookingInput[];
    errors: CSVError[];
    totalRows: number;
    validRows: number;
    invalidRows: number;
}
/**
 * Parse CSV buffer into raw rows
 */
export declare function parseCSV(buffer: Buffer): Promise<Result<CSVBookingRow[]>>;
/**
 * Validate that CSV has all required headers
 */
export declare function validateCSVHeaders(headers: string[]): Result<void>;
/**
 * Validate a single CSV row and convert to CreateBookingInput
 */
export declare function validateCSVRow(row: CSVBookingRow, rowNumber: number): Result<CreateBookingInput, CSVError>;
/**
 * Parse and validate an entire CSV file
 * Returns both valid bookings and detailed errors for invalid rows
 */
export declare function parseAndValidateCSV(buffer: Buffer): Promise<Result<CSVParseResult>>;
/**
 * Format CSV errors for API response
 */
export declare function formatCSVErrors(errors: CSVError[]): string;
//# sourceMappingURL=csv.service.d.ts.map