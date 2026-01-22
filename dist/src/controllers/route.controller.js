"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plan = exports.generate = exports.updateStatus = exports.getByDateRange = exports.getByVehicle = exports.count = exports.restore = exports.remove = exports.update = exports.getAll = exports.getById = exports.create = void 0;
const route_service_1 = require("../services/route.service");
const route_generation_service_1 = require("../services/route-generation.service");
const route_planning_service_1 = require("../services/route-planning.service");
/**
 * Route Controller
 * Handles HTTP requests for route operations
 */
/**
 * Create a new route
 * POST /api/v1/routes
 */
const create = async (req, res, next) => {
    try {
        const input = {
            ...req.body,
            routeDate: req.body.routeDate ? new Date(req.body.routeDate) : undefined,
        };
        const result = await (0, route_service_1.createRoute)(input);
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
 * Get route by ID
 * GET /api/v1/routes/:id
 */
const getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await (0, route_service_1.getRouteById)(id);
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
 * Get all routes with pagination and filters
 * GET /api/v1/routes
 */
const getAll = async (req, res, next) => {
    try {
        const { page = '1', limit = '20', sortBy = 'createdAt', sortOrder = 'desc', status, vehicleId, routeDate, routeDateFrom, routeDateTo, optimizationType, createdBy, assignedTo, tags, searchTerm, includeDeleted, } = req.query;
        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy: sortBy,
            sortOrder: sortOrder,
        };
        const filters = {};
        if (status)
            filters.status = status;
        if (vehicleId)
            filters.vehicleId = vehicleId;
        if (routeDate)
            filters.routeDate = new Date(routeDate);
        if (routeDateFrom)
            filters.routeDateFrom = new Date(routeDateFrom);
        if (routeDateTo)
            filters.routeDateTo = new Date(routeDateTo);
        if (optimizationType)
            filters.optimizationType = optimizationType;
        if (createdBy)
            filters.createdBy = createdBy;
        if (assignedTo)
            filters.assignedTo = assignedTo;
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
        const result = await (0, route_service_1.getRoutes)(filters, pagination);
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
 * Update route
 * PUT /api/v1/routes/:id
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
            routeDate: req.body.routeDate ? new Date(req.body.routeDate) : undefined,
            actualStartTime: req.body.actualStartTime ? new Date(req.body.actualStartTime) : undefined,
            actualEndTime: req.body.actualEndTime ? new Date(req.body.actualEndTime) : undefined,
        };
        const result = await (0, route_service_1.updateRoute)(input);
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
 * Delete route (soft delete)
 * DELETE /api/v1/routes/:id
 */
const remove = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await (0, route_service_1.deleteRoute)(id);
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
 * Restore deleted route
 * POST /api/v1/routes/:id/restore
 */
const restore = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await (0, route_service_1.restoreRoute)(id);
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
 * Get route count
 * GET /api/v1/routes/count
 */
const count = async (req, res, next) => {
    try {
        const { status, vehicleId, optimizationType, includeDeleted } = req.query;
        const filters = {};
        if (status)
            filters.status = status;
        if (vehicleId)
            filters.vehicleId = vehicleId;
        if (optimizationType)
            filters.optimizationType = optimizationType;
        if (includeDeleted === 'true')
            filters.includeDeleted = true;
        const result = await (0, route_service_1.countRoutes)(filters);
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
 * Get routes by vehicle
 * GET /api/v1/routes/vehicle/:vehicleId
 */
const getByVehicle = async (req, res, next) => {
    try {
        const { vehicleId } = req.params;
        if (!vehicleId) {
            res.status(400).json({ success: false, error: { message: 'Vehicle ID is required' } });
            return;
        }
        const { status, routeDate, includeDeleted } = req.query;
        const filters = {};
        if (status)
            filters.status = status;
        if (routeDate)
            filters.routeDate = new Date(routeDate);
        if (includeDeleted === 'true')
            filters.includeDeleted = true;
        const result = await (0, route_service_1.getRoutesByVehicle)(vehicleId, filters);
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
exports.getByVehicle = getByVehicle;
/**
 * Get routes by date range
 * GET /api/v1/routes/date-range
 */
const getByDateRange = async (req, res, next) => {
    try {
        const { startDate, endDate, status, vehicleId, includeDeleted } = req.query;
        if (!startDate || !endDate) {
            res.status(400).json({
                success: false,
                error: { message: 'startDate and endDate query parameters are required' },
            });
            return;
        }
        const filters = {};
        if (status)
            filters.status = status;
        if (vehicleId)
            filters.vehicleId = vehicleId;
        if (includeDeleted === 'true')
            filters.includeDeleted = true;
        const result = await (0, route_service_1.getRoutesByDateRange)(new Date(startDate), new Date(endDate), filters);
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
exports.getByDateRange = getByDateRange;
/**
 * Update route status
 * PATCH /api/v1/routes/:id/status
 */
const updateStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const { status } = req.body;
        if (!status) {
            res.status(400).json({ success: false, error: { message: 'status is required in request body' } });
            return;
        }
        const validStatuses = [
            'draft',
            'planned',
            'optimized',
            'assigned',
            'in_progress',
            'completed',
            'cancelled',
            'failed',
        ];
        if (!validStatuses.includes(status)) {
            res.status(400).json({
                success: false,
                error: { message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
            });
            return;
        }
        const result = await (0, route_service_1.updateRouteStatus)(id, status);
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
exports.updateStatus = updateStatus;
/**
 * Generate optimized routes from bookings
 * POST /api/v1/routes/generate
 */
const generate = async (req, res, next) => {
    try {
        const { bookingIds, departureLocation, returnToStart, travelMode, routingPreference, optimizeWaypointOrder } = req.body;
        if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
            res.status(400).json({
                success: false,
                error: { message: 'bookingIds array is required and must not be empty' },
            });
            return;
        }
        const result = await (0, route_generation_service_1.generateOptimizedRoutes)({
            bookingIds,
            departureLocation,
            returnToStart,
            travelMode,
            routingPreference,
            optimizeWaypointOrder,
        });
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
exports.generate = generate;
/**
 * Plan routes for a specific date
 * POST /api/v1/routes/plan
 */
const plan = async (req, res, next) => {
    try {
        const { routeDate, serviceId, maxStopsPerRoute, departureLocation, returnToStart, routingPreference } = req.body;
        if (!routeDate) {
            res.status(400).json({
                success: false,
                error: { message: 'routeDate is required' },
            });
            return;
        }
        const result = await (0, route_planning_service_1.planRoutes)({
            routeDate: typeof routeDate === 'string' ? new Date(routeDate) : routeDate,
            serviceId,
            maxStopsPerRoute,
            departureLocation,
            returnToStart,
            routingPreference,
        });
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
exports.plan = plan;
//# sourceMappingURL=route.controller.js.map