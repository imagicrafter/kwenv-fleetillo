import { Request, Response, NextFunction } from 'express';
import { dispatchJobService } from '../services/dispatch-job.service.js';
import type { CreateDispatchJobInput, DispatchJobFilters } from '../types/dispatch-job.js';

/**
 * Dispatch Job Controller
 * Handles HTTP requests for dispatch job operations
 */

/**
 * Create a new dispatch job
 * POST /api/v1/dispatch-jobs
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const input: CreateDispatchJobInput = req.body;
        const result = await dispatchJobService.createDispatchJob(input);

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
 * Get dispatch job by ID
 * GET /api/v1/dispatch-jobs/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await dispatchJobService.getDispatchJobById(id);

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
 * Get all dispatch jobs with optional filters
 * GET /api/v1/dispatch-jobs
 */
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { status, driverId } = req.query;

        const filters: DispatchJobFilters = {};
        if (status) filters.status = status as DispatchJobFilters['status'];
        if (driverId) filters.driverId = driverId as string;

        const result = await dispatchJobService.getDispatchJobs(filters);

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
 * Cancel a dispatch job
 * POST /api/v1/dispatch-jobs/:id/cancel
 */
export const cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await dispatchJobService.cancelDispatchJob(id);

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
 * Get drivers currently in active jobs
 * GET /api/v1/dispatch-jobs/active-drivers
 */
export const getActiveDrivers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await dispatchJobService.getDriversInActiveJobs();

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
