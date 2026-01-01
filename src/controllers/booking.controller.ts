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
} from '../services/booking.service.js';
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
      clientId,
      serviceId,
      vehicleId,
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

    if (clientId) filters.clientId = clientId as string;
    if (serviceId) filters.serviceId = serviceId as string;
    if (vehicleId) filters.vehicleId = vehicleId as string;
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
