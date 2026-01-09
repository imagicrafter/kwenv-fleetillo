"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.count = exports.restore = exports.remove = exports.update = exports.getAll = exports.getByCode = exports.getById = exports.create = void 0;
const service_service_js_1 = require("../services/service.service.js");
/**
 * Service Controller
 * Handles HTTP requests for service catalog operations
 */
/**
 * Create a new service
 * POST /api/v1/services
 */
const create = async (req, res, next) => {
    try {
        const input = req.body;
        const result = await (0, service_service_js_1.createService)(input);
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
 * Get service by ID
 * GET /api/v1/services/:id
 */
const getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await (0, service_service_js_1.getServiceById)(id);
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
 * Get service by code
 * GET /api/v1/services/code/:code
 */
const getByCode = async (req, res, next) => {
    try {
        const { code } = req.params;
        if (!code) {
            res.status(400).json({ success: false, error: { message: 'Code is required' } });
            return;
        }
        const result = await (0, service_service_js_1.getServiceByCode)(code);
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
exports.getByCode = getByCode;
/**
 * Get all services with pagination and filters
 * GET /api/v1/services
 */
const getAll = async (req, res, next) => {
    try {
        const { page = '1', limit = '10', sortBy = 'createdAt', sortOrder = 'desc', status, serviceType, requiresAppointment, tags, searchTerm, includeDeleted, minDuration, maxDuration, } = req.query;
        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy: sortBy,
            sortOrder: sortOrder,
        };
        const filters = {};
        if (status) {
            filters.status = status;
        }
        if (serviceType) {
            filters.serviceType = serviceType;
        }
        if (requiresAppointment !== undefined) {
            filters.requiresAppointment = requiresAppointment === 'true';
        }
        if (tags) {
            filters.tags = Array.isArray(tags) ? tags : [tags];
        }
        if (searchTerm) {
            filters.searchTerm = searchTerm;
        }
        if (includeDeleted) {
            filters.includeDeleted = includeDeleted === 'true';
        }
        if (minDuration) {
            filters.minDuration = parseInt(minDuration);
        }
        if (maxDuration) {
            filters.maxDuration = parseInt(maxDuration);
        }
        const result = await (0, service_service_js_1.getServices)(filters, pagination);
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
 * Update service
 * PUT /api/v1/services/:id
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
        const result = await (0, service_service_js_1.updateService)(input);
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
 * Delete service (soft delete)
 * DELETE /api/v1/services/:id
 */
const remove = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await (0, service_service_js_1.deleteService)(id);
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
 * Restore deleted service
 * POST /api/v1/services/:id/restore
 */
const restore = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await (0, service_service_js_1.restoreService)(id);
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
 * Get service count
 * GET /api/v1/services/count
 */
const count = async (req, res, next) => {
    try {
        const { status, serviceType, includeDeleted } = req.query;
        const filters = {};
        if (status) {
            filters.status = status;
        }
        if (serviceType) {
            filters.serviceType = serviceType;
        }
        if (includeDeleted) {
            filters.includeDeleted = includeDeleted === 'true';
        }
        const result = await (0, service_service_js_1.countServices)(filters);
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
//# sourceMappingURL=service.controller.js.map