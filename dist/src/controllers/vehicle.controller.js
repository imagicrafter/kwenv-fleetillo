"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchServiceTypes = exports.patchStatus = exports.patchLocation = exports.getByServiceType = exports.count = exports.restore = exports.remove = exports.update = exports.getAll = exports.getById = exports.create = void 0;
const vehicle_service_1 = require("../services/vehicle.service");
/**
 * Vehicle Controller
 * Handles HTTP requests for vehicle management operations
 */
/**
 * Create a new vehicle
 * POST /api/v1/vehicles
 */
const create = async (req, res, next) => {
    try {
        const input = req.body;
        const result = await (0, vehicle_service_1.createVehicle)(input);
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
 * Get vehicle by ID
 * GET /api/v1/vehicles/:id
 */
const getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await (0, vehicle_service_1.getVehicleById)(id);
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
 * Get all vehicles with pagination and filters
 * GET /api/v1/vehicles
 */
const getAll = async (req, res, next) => {
    try {
        const { page = '1', limit = '10', sortBy = 'createdAt', sortOrder = 'desc', status, fuelType, make, model, serviceTypes, assignedDriverId, tags, searchTerm, includeDeleted, } = req.query;
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
        if (fuelType) {
            filters.fuelType = fuelType;
        }
        if (make) {
            filters.make = make;
        }
        if (model) {
            filters.model = model;
        }
        if (serviceTypes) {
            filters.serviceTypes = Array.isArray(serviceTypes)
                ? serviceTypes
                : serviceTypes.split(',');
        }
        if (assignedDriverId) {
            filters.assignedDriverId = assignedDriverId;
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
        const result = await (0, vehicle_service_1.getVehicles)(filters, pagination);
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
 * Update vehicle
 * PUT /api/v1/vehicles/:id
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
        const result = await (0, vehicle_service_1.updateVehicle)(input);
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
 * Delete vehicle (soft delete)
 * DELETE /api/v1/vehicles/:id
 */
const remove = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await (0, vehicle_service_1.deleteVehicle)(id);
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
 * Restore deleted vehicle
 * POST /api/v1/vehicles/:id/restore
 */
const restore = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await (0, vehicle_service_1.restoreVehicle)(id);
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
 * Get vehicle count
 * GET /api/v1/vehicles/count
 */
const count = async (req, res, next) => {
    try {
        const { status, fuelType, serviceTypes, includeDeleted } = req.query;
        const filters = {};
        if (status) {
            filters.status = status;
        }
        if (fuelType) {
            filters.fuelType = fuelType;
        }
        if (serviceTypes) {
            filters.serviceTypes = Array.isArray(serviceTypes)
                ? serviceTypes
                : serviceTypes.split(',');
        }
        if (includeDeleted) {
            filters.includeDeleted = includeDeleted === 'true';
        }
        const result = await (0, vehicle_service_1.countVehicles)(filters);
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
/**
 * Get vehicles by service type
 * GET /api/v1/vehicles/service-type/:serviceType
 */
const getByServiceType = async (req, res, next) => {
    try {
        const { serviceType } = req.params;
        if (!serviceType) {
            res.status(400).json({ success: false, error: { message: 'Service type is required' } });
            return;
        }
        const { status, includeDeleted } = req.query;
        const filters = {};
        if (status) {
            filters.status = status;
        }
        if (includeDeleted) {
            filters.includeDeleted = includeDeleted === 'true';
        }
        const result = await (0, vehicle_service_1.getVehiclesByServiceType)(serviceType, filters);
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
exports.getByServiceType = getByServiceType;
/**
 * Update vehicle location
 * PATCH /api/v1/vehicles/:id/location
 */
const patchLocation = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const { latitude, longitude } = req.body;
        if (latitude === undefined || longitude === undefined) {
            res.status(400).json({
                success: false,
                error: { message: 'Latitude and longitude are required' }
            });
            return;
        }
        const result = await (0, vehicle_service_1.updateVehicleLocation)(id, latitude, longitude);
        if (!result.success) {
            const statusCode = result.error?.code === 'VEHICLE_NOT_FOUND' ? 404 : 400;
            res.status(statusCode).json({
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
exports.patchLocation = patchLocation;
/**
 * Update vehicle status (availability)
 * PATCH /api/v1/vehicles/:id/status
 */
const patchStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const { status } = req.body;
        if (!status) {
            res.status(400).json({
                success: false,
                error: { message: 'Status is required' }
            });
            return;
        }
        const validStatuses = ['available', 'in_use', 'maintenance', 'out_of_service', 'retired'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({
                success: false,
                error: {
                    message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                }
            });
            return;
        }
        const result = await (0, vehicle_service_1.updateVehicleStatus)(id, status);
        if (!result.success) {
            const statusCode = result.error?.code === 'VEHICLE_NOT_FOUND' ? 404 : 400;
            res.status(statusCode).json({
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
exports.patchStatus = patchStatus;
/**
 * Update vehicle service types (tagging)
 * PATCH /api/v1/vehicles/:id/service-types
 */
const patchServiceTypes = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const { serviceTypes } = req.body;
        if (!serviceTypes || !Array.isArray(serviceTypes)) {
            res.status(400).json({
                success: false,
                error: { message: 'serviceTypes must be an array' }
            });
            return;
        }
        const input = {
            id,
            serviceTypes,
        };
        const result = await (0, vehicle_service_1.updateVehicle)(input);
        if (!result.success) {
            const statusCode = result.error?.code === 'VEHICLE_NOT_FOUND' ? 404 : 400;
            res.status(statusCode).json({
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
exports.patchServiceTypes = patchServiceTypes;
//# sourceMappingURL=vehicle.controller.js.map