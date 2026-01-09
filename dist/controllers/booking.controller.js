"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.count = exports.restore = exports.remove = exports.update = exports.getAll = exports.getByNumber = exports.getById = exports.create = void 0;
const booking_service_js_1 = require("../services/booking.service.js");
/**
 * Booking Controller
 * Handles HTTP requests for booking operations
 */
/**
 * Create a new booking
 * POST /api/v1/bookings
 */
const create = async (req, res, next) => {
    try {
        const input = req.body;
        const result = await (0, booking_service_js_1.createBooking)(input);
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
    }
    catch (error) {
        next(error);
    }
};
exports.create = create;
/**
 * Get booking by ID
 * GET /api/v1/bookings/:id
 */
const getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await (0, booking_service_js_1.getBookingById)(id);
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
    }
    catch (error) {
        next(error);
    }
};
exports.getById = getById;
/**
 * Get booking by booking number
 * GET /api/v1/bookings/number/:bookingNumber
 */
const getByNumber = async (req, res, next) => {
    try {
        const { bookingNumber } = req.params;
        if (!bookingNumber) {
            res.status(400).json({ success: false, error: { message: 'Booking number is required' } });
            return;
        }
        const result = await (0, booking_service_js_1.getBookingByNumber)(bookingNumber);
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
    }
    catch (error) {
        next(error);
    }
};
exports.getByNumber = getByNumber;
/**
 * Get all bookings with pagination and filters
 * GET /api/v1/bookings
 */
const getAll = async (req, res, next) => {
    try {
        const { page = '1', limit = '20', sortBy = 'scheduledDate', sortOrder = 'asc', clientId, serviceId, vehicleId, bookingType, status, priority, scheduledDateFrom, scheduledDateTo, tags, searchTerm, includeDeleted, } = req.query;
        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy: sortBy,
            sortOrder: sortOrder,
        };
        const filters = {};
        if (clientId)
            filters.clientId = clientId;
        if (serviceId)
            filters.serviceId = serviceId;
        if (vehicleId)
            filters.vehicleId = vehicleId;
        if (bookingType)
            filters.bookingType = bookingType;
        if (status)
            filters.status = status;
        if (priority)
            filters.priority = priority;
        if (scheduledDateFrom)
            filters.scheduledDateFrom = scheduledDateFrom;
        if (scheduledDateTo)
            filters.scheduledDateTo = scheduledDateTo;
        if (searchTerm)
            filters.searchTerm = searchTerm;
        if (includeDeleted === 'true')
            filters.includeDeleted = true;
        // Handle tags - can be comma-separated string or array
        if (tags) {
            if (typeof tags === 'string') {
                filters.tags = tags.split(',').map((t) => t.trim());
            }
            else if (Array.isArray(tags)) {
                filters.tags = tags;
            }
        }
        const result = await (0, booking_service_js_1.getBookings)(filters, pagination);
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
    }
    catch (error) {
        next(error);
    }
};
exports.getAll = getAll;
/**
 * Update booking
 * PUT /api/v1/bookings/:id
 */
const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const input = {
            id,
            ...req.body,
        };
        const result = await (0, booking_service_js_1.updateBooking)(input);
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
    }
    catch (error) {
        next(error);
    }
};
exports.update = update;
/**
 * Delete booking (soft delete)
 * DELETE /api/v1/bookings/:id
 */
const remove = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await (0, booking_service_js_1.deleteBooking)(id);
        if (!result.success) {
            res.status(400).json({
                success: false,
                error: result.error,
            });
            return;
        }
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.remove = remove;
/**
 * Restore deleted booking
 * POST /api/v1/bookings/:id/restore
 */
const restore = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await (0, booking_service_js_1.restoreBooking)(id);
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
    }
    catch (error) {
        next(error);
    }
};
exports.restore = restore;
/**
 * Get booking count
 * GET /api/v1/bookings/count
 */
const count = async (req, res, next) => {
    try {
        const { status, bookingType, includeDeleted } = req.query;
        const filters = {};
        if (status)
            filters.status = status;
        if (bookingType)
            filters.bookingType = bookingType;
        if (includeDeleted === 'true')
            filters.includeDeleted = true;
        const result = await (0, booking_service_js_1.countBookings)(filters);
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
    }
    catch (error) {
        next(error);
    }
};
exports.count = count;
//# sourceMappingURL=booking.controller.js.map