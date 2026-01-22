"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.count = exports.remove = exports.update = exports.getAll = exports.getById = exports.create = void 0;
const driver_service_1 = require("../services/driver.service");
/**
 * Driver Controller
 * Handles HTTP requests for driver operations
 */
/**
 * Create a new driver
 * POST /api/v1/drivers
 */
const create = async (req, res, next) => {
    try {
        const input = req.body;
        const result = await (0, driver_service_1.createDriver)(input);
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
 * Get driver by ID
 * GET /api/v1/drivers/:id
 */
const getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await (0, driver_service_1.getDriverById)(id);
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
 * Get all drivers with pagination and filters
 * GET /api/v1/drivers
 */
const getAll = async (req, res, next) => {
    try {
        const { page = '1', limit = '50', sortBy = 'createdAt', sortOrder = 'desc', status, searchTerm, includeDeleted, } = req.query;
        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy: sortBy,
            sortOrder: sortOrder,
        };
        const filters = {};
        if (status)
            filters.status = status;
        if (searchTerm)
            filters.searchTerm = searchTerm;
        if (includeDeleted === 'true')
            filters.includeDeleted = true;
        const result = await (0, driver_service_1.getDrivers)(filters, pagination);
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
 * Update driver
 * PUT /api/v1/drivers/:id
 */
const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const input = req.body;
        const result = await (0, driver_service_1.updateDriver)(id, input);
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
 * Delete driver (soft delete)
 * DELETE /api/v1/drivers/:id
 */
const remove = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await (0, driver_service_1.deleteDriver)(id);
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
 * Get driver count
 * GET /api/v1/drivers/count
 */
const count = async (req, res, next) => {
    try {
        const { status, searchTerm, includeDeleted } = req.query;
        const filters = {};
        if (status)
            filters.status = status;
        if (searchTerm)
            filters.searchTerm = searchTerm;
        if (includeDeleted === 'true')
            filters.includeDeleted = true;
        const result = await (0, driver_service_1.countDrivers)(filters);
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
//# sourceMappingURL=driver.controller.js.map