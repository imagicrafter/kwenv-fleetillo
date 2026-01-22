"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveDrivers = exports.cancel = exports.getAll = exports.getById = exports.create = void 0;
const dispatch_job_service_js_1 = require("../services/dispatch-job.service.js");
/**
 * Dispatch Job Controller
 * Handles HTTP requests for dispatch job operations
 */
/**
 * Create a new dispatch job
 * POST /api/v1/dispatch-jobs
 */
const create = async (req, res, next) => {
    try {
        const input = req.body;
        const result = await dispatch_job_service_js_1.dispatchJobService.createDispatchJob(input);
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
 * Get dispatch job by ID
 * GET /api/v1/dispatch-jobs/:id
 */
const getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await dispatch_job_service_js_1.dispatchJobService.getDispatchJobById(id);
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
 * Get all dispatch jobs with optional filters
 * GET /api/v1/dispatch-jobs
 */
const getAll = async (req, res, next) => {
    try {
        const { status, driverId } = req.query;
        const filters = {};
        if (status)
            filters.status = status;
        if (driverId)
            filters.driverId = driverId;
        const result = await dispatch_job_service_js_1.dispatchJobService.getDispatchJobs(filters);
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
 * Cancel a dispatch job
 * POST /api/v1/dispatch-jobs/:id/cancel
 */
const cancel = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await dispatch_job_service_js_1.dispatchJobService.cancelDispatchJob(id);
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
exports.cancel = cancel;
/**
 * Get drivers currently in active jobs
 * GET /api/v1/dispatch-jobs/active-drivers
 */
const getActiveDrivers = async (_req, res, next) => {
    try {
        const result = await dispatch_job_service_js_1.dispatchJobService.getDriversInActiveJobs();
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
exports.getActiveDrivers = getActiveDrivers;
//# sourceMappingURL=dispatch-job.controller.js.map