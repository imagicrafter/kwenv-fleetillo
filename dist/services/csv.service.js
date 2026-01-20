"use strict";
/**
 * CSV parsing and validation service for booking uploads
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCSV = parseCSV;
exports.validateCSVHeaders = validateCSVHeaders;
exports.validateCSVRow = validateCSVRow;
exports.parseAndValidateCSV = parseAndValidateCSV;
exports.formatCSVErrors = formatCSVErrors;
const sync_1 = require("csv-parse/sync");
const validation_js_1 = require("../middleware/validation.js");
/**
 * Required CSV columns
 */
const REQUIRED_COLUMNS = ['customerId', 'bookingType', 'scheduledDate'];
/**
 * Valid booking type values
 */
const VALID_BOOKING_TYPES = ['one_time', 'recurring'];
/**
 * Valid booking status values
 */
const VALID_BOOKING_STATUSES = [
    'pending',
    'confirmed',
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
    'rescheduled',
];
/**
 * Valid booking priority values
 */
const VALID_BOOKING_PRIORITIES = ['low', 'normal', 'high', 'urgent'];
/**
 * Valid recurrence pattern values
 */
const VALID_RECURRENCE_PATTERNS = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'];
/**
 * Parse CSV buffer into raw rows
 */
async function parseCSV(buffer) {
    try {
        const records = (0, sync_1.parse)(buffer, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true, // Handle UTF-8 BOM if present
        });
        return {
            success: true,
            data: records,
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error : new Error('Failed to parse CSV file'),
        };
    }
}
/**
 * Validate that CSV has all required headers
 */
function validateCSVHeaders(headers) {
    const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
        return {
            success: false,
            error: new Error(`Missing required columns: ${missingColumns.join(', ')}. Required columns are: ${REQUIRED_COLUMNS.join(', ')}`),
        };
    }
    return { success: true };
}
/**
 * Validate a date string in YYYY-MM-DD format
 */
function isValidDate(dateString) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
        return false;
    }
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date.toISOString().startsWith(dateString);
}
/**
 * Validate a time string in HH:MM or HH:MM:SS format
 */
function isValidTime(timeString) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    return timeRegex.test(timeString);
}
/**
 * Normalize time format to HH:MM:SS
 */
function normalizeTime(timeString) {
    if (timeString.length === 5) {
        // HH:MM format, add :00 for seconds
        return `${timeString}:00`;
    }
    return timeString;
}
/**
 * Parse comma-separated UUIDs
 */
function parseUUIDs(uuidString) {
    return uuidString
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);
}
/**
 * Parse comma-separated tags
 */
function parseTags(tagString) {
    return tagString
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
}
/**
 * Validate a single CSV row and convert to CreateBookingInput
 */
function validateCSVRow(row, rowNumber) {
    const errors = [];
    // Validate required fields
    if (!row.customerId || row.customerId.trim() === '') {
        errors.push('customerId is required');
    }
    else if (!(0, validation_js_1.isValidUUID)(row.customerId.trim())) {
        errors.push(`customerId must be a valid UUID (got: ${row.customerId})`);
    }
    if (!row.bookingType || row.bookingType.trim() === '') {
        errors.push('bookingType is required');
    }
    else if (!VALID_BOOKING_TYPES.includes(row.bookingType.trim())) {
        errors.push(`bookingType must be one of: ${VALID_BOOKING_TYPES.join(', ')} (got: ${row.bookingType})`);
    }
    if (!row.scheduledDate || row.scheduledDate.trim() === '') {
        errors.push('scheduledDate is required');
    }
    else if (!isValidDate(row.scheduledDate.trim())) {
        errors.push(`scheduledDate must be in YYYY-MM-DD format (got: ${row.scheduledDate})`);
    }
    // Validate optional fields
    if (row.locationId && row.locationId.trim() !== '' && !(0, validation_js_1.isValidUUID)(row.locationId.trim())) {
        errors.push(`locationId must be a valid UUID (got: ${row.locationId})`);
    }
    if (row.serviceIds && row.serviceIds.trim() !== '') {
        const serviceIds = parseUUIDs(row.serviceIds);
        for (const serviceId of serviceIds) {
            if (!(0, validation_js_1.isValidUUID)(serviceId)) {
                errors.push(`serviceIds must be comma-separated UUIDs (invalid: ${serviceId})`);
            }
        }
    }
    if (row.scheduledStartTime && row.scheduledStartTime.trim() !== '') {
        if (!isValidTime(row.scheduledStartTime.trim())) {
            errors.push(`scheduledStartTime must be in HH:MM or HH:MM:SS format (got: ${row.scheduledStartTime})`);
        }
    }
    if (row.status && row.status.trim() !== '') {
        if (!VALID_BOOKING_STATUSES.includes(row.status.trim())) {
            errors.push(`status must be one of: ${VALID_BOOKING_STATUSES.join(', ')} (got: ${row.status})`);
        }
    }
    if (row.priority && row.priority.trim() !== '') {
        if (!VALID_BOOKING_PRIORITIES.includes(row.priority.trim())) {
            errors.push(`priority must be one of: ${VALID_BOOKING_PRIORITIES.join(', ')} (got: ${row.priority})`);
        }
    }
    if (row.quotedPrice && row.quotedPrice.trim() !== '') {
        const price = parseFloat(row.quotedPrice.trim());
        if (isNaN(price) || price < 0) {
            errors.push(`quotedPrice must be a positive number (got: ${row.quotedPrice})`);
        }
    }
    if (row.estimatedDurationMinutes && row.estimatedDurationMinutes.trim() !== '') {
        const duration = parseInt(row.estimatedDurationMinutes.trim(), 10);
        if (isNaN(duration) || duration <= 0) {
            errors.push(`estimatedDurationMinutes must be a positive integer (got: ${row.estimatedDurationMinutes})`);
        }
    }
    // Validate recurrence fields if booking type is recurring
    if (row.bookingType && row.bookingType.trim() === 'recurring') {
        if (!row.recurrencePattern || row.recurrencePattern.trim() === '') {
            errors.push('recurrencePattern is required for recurring bookings');
        }
        else if (!VALID_RECURRENCE_PATTERNS.includes(row.recurrencePattern.trim())) {
            errors.push(`recurrencePattern must be one of: ${VALID_RECURRENCE_PATTERNS.join(', ')} (got: ${row.recurrencePattern})`);
        }
    }
    if (row.recurrenceEndDate && row.recurrenceEndDate.trim() !== '') {
        if (!isValidDate(row.recurrenceEndDate.trim())) {
            errors.push(`recurrenceEndDate must be in YYYY-MM-DD format (got: ${row.recurrenceEndDate})`);
        }
    }
    // If there are validation errors, return them
    if (errors.length > 0) {
        return {
            success: false,
            error: {
                row: rowNumber,
                message: errors.join('; '),
            },
        };
    }
    // Build the CreateBookingInput object
    const bookingInput = {
        customerId: row.customerId.trim(),
        bookingType: row.bookingType.trim(),
        scheduledDate: row.scheduledDate.trim(),
        scheduledStartTime: row.scheduledStartTime?.trim()
            ? normalizeTime(row.scheduledStartTime.trim())
            : '09:00:00', // Default to 9 AM if not provided
    };
    // Add optional fields if present
    if (row.serviceIds && row.serviceIds.trim() !== '') {
        bookingInput.serviceIds = parseUUIDs(row.serviceIds);
    }
    if (row.locationId && row.locationId.trim() !== '') {
        bookingInput.locationId = row.locationId.trim();
    }
    if (row.status && row.status.trim() !== '') {
        bookingInput.status = row.status.trim();
    }
    if (row.priority && row.priority.trim() !== '') {
        bookingInput.priority = row.priority.trim();
    }
    if (row.quotedPrice && row.quotedPrice.trim() !== '') {
        bookingInput.quotedPrice = parseFloat(row.quotedPrice.trim());
    }
    if (row.estimatedDurationMinutes && row.estimatedDurationMinutes.trim() !== '') {
        bookingInput.estimatedDurationMinutes = parseInt(row.estimatedDurationMinutes.trim(), 10);
    }
    if (row.specialInstructions && row.specialInstructions.trim() !== '') {
        bookingInput.specialInstructions = row.specialInstructions.trim();
    }
    if (row.serviceAddressLine1 && row.serviceAddressLine1.trim() !== '') {
        bookingInput.serviceAddressLine1 = row.serviceAddressLine1.trim();
    }
    if (row.serviceAddressLine2 && row.serviceAddressLine2.trim() !== '') {
        bookingInput.serviceAddressLine2 = row.serviceAddressLine2.trim();
    }
    if (row.serviceCity && row.serviceCity.trim() !== '') {
        bookingInput.serviceCity = row.serviceCity.trim();
    }
    if (row.serviceState && row.serviceState.trim() !== '') {
        bookingInput.serviceState = row.serviceState.trim();
    }
    if (row.servicePostalCode && row.servicePostalCode.trim() !== '') {
        bookingInput.servicePostalCode = row.servicePostalCode.trim();
    }
    if (row.serviceCountry && row.serviceCountry.trim() !== '') {
        bookingInput.serviceCountry = row.serviceCountry.trim();
    }
    if (row.recurrencePattern && row.recurrencePattern.trim() !== '') {
        bookingInput.recurrencePattern = row.recurrencePattern.trim();
    }
    if (row.recurrenceEndDate && row.recurrenceEndDate.trim() !== '') {
        bookingInput.recurrenceEndDate = row.recurrenceEndDate.trim();
    }
    if (row.tags && row.tags.trim() !== '') {
        bookingInput.tags = parseTags(row.tags);
    }
    return {
        success: true,
        data: bookingInput,
    };
}
/**
 * Parse and validate an entire CSV file
 * Returns both valid bookings and detailed errors for invalid rows
 */
async function parseAndValidateCSV(buffer) {
    // Parse the CSV
    const parseResult = await parseCSV(buffer);
    if (!parseResult.success || !parseResult.data) {
        return {
            success: false,
            error: parseResult.error || new Error('Failed to parse CSV'),
        };
    }
    const rows = parseResult.data;
    // Validate headers
    if (rows.length === 0) {
        return {
            success: false,
            error: new Error('CSV file is empty'),
        };
    }
    const headers = Object.keys(rows[0]);
    const headerValidation = validateCSVHeaders(headers);
    if (!headerValidation.success) {
        return {
            success: false,
            error: headerValidation.error,
        };
    }
    // Validate each row
    const validBookings = [];
    const errors = [];
    rows.forEach((row, index) => {
        const rowNumber = index + 2; // +2 because index is 0-based and row 1 is headers
        const validation = validateCSVRow(row, rowNumber);
        if (validation.success && validation.data) {
            validBookings.push(validation.data);
        }
        else if (validation.error) {
            errors.push(validation.error);
        }
    });
    return {
        success: true,
        data: {
            validBookings,
            errors,
            totalRows: rows.length,
            validRows: validBookings.length,
            invalidRows: errors.length,
        },
    };
}
/**
 * Format CSV errors for API response
 */
function formatCSVErrors(errors) {
    return errors
        .map(error => {
        const rowInfo = error.row ? `Row ${error.row}` : 'Unknown row';
        const fieldInfo = error.field ? ` (${error.field})` : '';
        return `${rowInfo}${fieldInfo}: ${error.message}`;
    })
        .join('\n');
}
//# sourceMappingURL=csv.service.js.map