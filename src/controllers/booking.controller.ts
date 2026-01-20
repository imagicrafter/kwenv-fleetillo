import { Request, Response, NextFunction } from 'express';
import {
  createBooking,
  getBookingById,
  getBookings,
  updateBooking,
  deleteBooking,
  restoreBooking,
  countBookings,
  getBookingByNumber,
  bulkCreateBookings,
} from '../services/booking.service.js';
import { parseAndValidateCSV } from '../services/csv.service.js';
import type { CreateBookingInput, UpdateBookingInput, BookingFilters } from '../types/booking.js';
import type { PaginationParams } from '../types/index.js';

/**
 * Booking Controller
 * Handles HTTP requests for booking operations
 */

/**
 * Create a new booking
 * POST /api/v1/bookings
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input: CreateBookingInput = req.body;
    const result = await createBooking(input);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get booking by ID
 * GET /api/v1/bookings/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'ID is required' } });
      return;
    }
    const result = await getBookingById(id);

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get booking by booking number
 * GET /api/v1/bookings/number/:bookingNumber
 */
export const getByNumber = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { bookingNumber } = req.params;
    if (!bookingNumber) {
      res.status(400).json({ success: false, error: { message: 'Booking number is required' } });
      return;
    }
    const result = await getBookingByNumber(bookingNumber);

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all bookings with pagination and filters
 * GET /api/v1/bookings
 */
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '20',
      sortBy = 'scheduledDate',
      sortOrder = 'asc',
      customerId,
      serviceId,
      bookingType,
      status,
      priority,
      scheduledDateFrom,
      scheduledDateTo,
      tags,
      searchTerm,
      includeDeleted,
    } = req.query;

    const pagination: PaginationParams = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const filters: BookingFilters = {};

    if (customerId) filters.customerId = customerId as string;
    if (serviceId) filters.serviceId = serviceId as string;
    if (bookingType) filters.bookingType = bookingType as 'one_time' | 'recurring';
    if (status) filters.status = status as BookingFilters['status'];
    if (priority) filters.priority = priority as BookingFilters['priority'];
    if (scheduledDateFrom) filters.scheduledDateFrom = scheduledDateFrom as string;
    if (scheduledDateTo) filters.scheduledDateTo = scheduledDateTo as string;
    if (searchTerm) filters.searchTerm = searchTerm as string;
    if (includeDeleted === 'true') filters.includeDeleted = true;

    // Handle tags - can be comma-separated string or array
    if (tags) {
      if (typeof tags === 'string') {
        filters.tags = tags.split(',').map((t) => t.trim());
      } else if (Array.isArray(tags)) {
        filters.tags = tags as string[];
      }
    }

    const result = await getBookings(filters, pagination);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update booking
 * PUT /api/v1/bookings/:id
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'ID is required' } });
      return;
    }
    const input: UpdateBookingInput = {
      id,
      ...req.body,
    };

    const result = await updateBooking(input);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete booking (soft delete)
 * DELETE /api/v1/bookings/:id
 */
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'ID is required' } });
      return;
    }
    const result = await deleteBooking(id);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Restore deleted booking
 * POST /api/v1/bookings/:id/restore
 */
export const restore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'ID is required' } });
      return;
    }
    const result = await restoreBooking(id);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get booking count
 * GET /api/v1/bookings/count
 */
export const count = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, bookingType, includeDeleted } = req.query;

    const filters: BookingFilters = {};
    if (status) filters.status = status as BookingFilters['status'];
    if (bookingType) filters.bookingType = bookingType as 'one_time' | 'recurring';
    if (includeDeleted === 'true') filters.includeDeleted = true;

    const result = await countBookings(filters);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        count: result.data,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload CSV file with bookings
 * POST /api/v1/bookings/upload
 */
export const uploadCSV = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          message: 'No file uploaded. Please upload a CSV file.',
        },
      });
      return;
    }

    // Parse and validate CSV
    const parseResult = await parseAndValidateCSV(req.file.buffer);

    if (!parseResult.success || !parseResult.data) {
      res.status(400).json({
        success: false,
        error: {
          message: parseResult.error?.message || 'Failed to parse CSV file',
        },
      });
      return;
    }

    const { validBookings, errors: csvErrors, totalRows, validRows, invalidRows } = parseResult.data;

    // If there are CSV validation errors, return them
    if (csvErrors.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          message: `CSV validation failed. ${invalidRows} of ${totalRows} rows have errors.`,
          details: csvErrors,
          summary: {
            totalRows,
            validRows,
            invalidRows,
          },
        },
      });
      return;
    }

    // If no valid bookings, return error
    if (validBookings.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          message: 'No valid bookings found in CSV file.',
        },
      });
      return;
    }

    // Bulk insert bookings
    const bulkResult = await bulkCreateBookings(validBookings);

    if (!bulkResult.success || !bulkResult.data) {
      res.status(500).json({
        success: false,
        error: {
          message: bulkResult.error?.message || 'Failed to create bookings',
        },
      });
      return;
    }

    const { created, errors: insertErrors } = bulkResult.data;

    // If there are insert errors, return partial success
    if (insertErrors.length > 0) {
      res.status(207).json({
        success: true,
        data: {
          created,
          total: validBookings.length,
          errors: insertErrors,
        },
        message: `Partially successful. ${created} of ${validBookings.length} bookings created.`,
      });
      return;
    }

    // Full success
    res.status(201).json({
      success: true,
      data: {
        created,
        total: totalRows,
      },
      message: `Successfully created ${created} bookings from CSV file.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download CSV template for booking uploads
 * GET /api/v1/bookings/template
 */
export const downloadTemplate = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // CSV header row with all supported columns
    const headers = [
      'customerId',
      'bookingType',
      'scheduledDate',
      'scheduledStartTime',
      'serviceIds',
      'locationId',
      'status',
      'priority',
      'quotedPrice',
      'estimatedDurationMinutes',
      'specialInstructions',
      'serviceAddressLine1',
      'serviceAddressLine2',
      'serviceCity',
      'serviceState',
      'servicePostalCode',
      'serviceCountry',
      'recurrencePattern',
      'recurrenceEndDate',
      'tags',
    ];

    // Example row showing expected formats
    const exampleRow = [
      'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // customerId (UUID)
      'one_time', // bookingType (one_time or recurring)
      '2026-01-15', // scheduledDate (YYYY-MM-DD)
      '09:00', // scheduledStartTime (HH:MM or HH:MM:SS)
      'service-id-1,service-id-2', // serviceIds (comma-separated UUIDs)
      'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // locationId (UUID, optional)
      'pending', // status (pending, confirmed, scheduled, etc.)
      'normal', // priority (low, normal, high, urgent)
      '150.00', // quotedPrice (decimal number)
      '60', // estimatedDurationMinutes (integer)
      'Please call before arrival', // specialInstructions (text)
      '123 Main Street', // serviceAddressLine1 (text)
      'Suite 100', // serviceAddressLine2 (text, optional)
      'San Francisco', // serviceCity (text)
      'CA', // serviceState (text)
      '94102', // servicePostalCode (text)
      'USA', // serviceCountry (text)
      'weekly', // recurrencePattern (daily, weekly, monthly, etc. - only for recurring bookings)
      '2026-12-31', // recurrenceEndDate (YYYY-MM-DD, optional)
      'urgent,priority', // tags (comma-separated)
    ];

    // Build CSV content
    const csvLines = [
      headers.join(','),
      exampleRow.join(','),
    ];

    const csvContent = csvLines.join('\n');

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="bookings_template.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};
