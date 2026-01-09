"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.count = exports.restore = exports.remove = exports.update = exports.getAll = exports.getById = exports.create = void 0;
const client_service_js_1 = require("../services/client.service.js");
/**
 * Client Controller
 * Handles HTTP requests for client operations
 */
/**
 * Create a new client
 * POST /api/v1/clients
 */
const create = async (req, res, next) => {
    try {
        const input = req.body;
        const result = await (0, client_service_js_1.createClient)(input);
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
 * Get client by ID
 * GET /api/v1/clients/:id
 */
const getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await (0, client_service_js_1.getClientById)(id);
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
 * Get all clients with pagination and filters
 * GET /api/v1/clients
 */
const getAll = async (req, res, next) => {
    try {
        const { page = '1', limit = '10', sortBy = 'createdAt', sortOrder = 'desc', ...filters } = req.query;
        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy: sortBy,
            sortOrder: sortOrder,
        };
        const result = await (0, client_service_js_1.getClients)(filters, pagination);
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
 * Update client
 * PUT /api/v1/clients/:id
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
        const result = await (0, client_service_js_1.updateClient)(input);
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
 * Delete client (soft delete)
 * DELETE /api/v1/clients/:id
 */
const remove = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await (0, client_service_js_1.deleteClient)(id);
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
 * Restore deleted client
 * POST /api/v1/clients/:id/restore
 */
const restore = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await (0, client_service_js_1.restoreClient)(id);
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
 * Get client count
 * GET /api/v1/clients/count
 */
const count = async (req, res, next) => {
    try {
        const filters = req.query;
        const result = await (0, client_service_js_1.countClients)(filters);
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
//# sourceMappingURL=client.controller.js.map