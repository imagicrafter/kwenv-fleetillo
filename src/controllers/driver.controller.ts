import { Request, Response, NextFunction } from 'express';
import {
    createDriver,
    getDriverById,
    getDrivers,
    updateDriver,
    deleteDriver,
    countDrivers,
} from '../services/driver.service.js';
import type { CreateDriverInput, UpdateDriverInput, DriverFilters } from '../types/driver.js';
import type { PaginationParams } from '../types/index.js';

/**
 * Driver Controller
 * Handles HTTP requests for driver operations
 */

/**
 * Create a new driver
 * POST /api/v1/drivers
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const input: CreateDriverInput = req.body;
        const result = await createDriver(input);

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
 * Get driver by ID
 * GET /api/v1/drivers/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await getDriverById(id);

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
 * Get all drivers with pagination and filters
 * GET /api/v1/drivers
 */
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {
            page = '1',
            limit = '50',
            sortBy = 'createdAt',
            sortOrder = 'desc',
            status,
            searchTerm,
            includeDeleted,
        } = req.query;

        const pagination: PaginationParams = {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            sortBy: sortBy as string,
            sortOrder: sortOrder as 'asc' | 'desc',
        };

        const filters: DriverFilters = {};
        if (status) filters.status = status as DriverFilters['status'];
        if (searchTerm) filters.searchTerm = searchTerm as string;
        if (includeDeleted === 'true') filters.includeDeleted = true;

        const result = await getDrivers(filters, pagination);

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
 * Update driver
 * PUT /api/v1/drivers/:id
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const input: UpdateDriverInput = req.body;

        const result = await updateDriver(id, input);

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
 * Delete driver (soft delete)
 * DELETE /api/v1/drivers/:id
 */
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, error: { message: 'ID is required' } });
            return;
        }
        const result = await deleteDriver(id);

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
 * Get driver count
 * GET /api/v1/drivers/count
 */
export const count = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { status, searchTerm, includeDeleted } = req.query;

        const filters: DriverFilters = {};
        if (status) filters.status = status as DriverFilters['status'];
        if (searchTerm) filters.searchTerm = searchTerm as string;
        if (includeDeleted === 'true') filters.includeDeleted = true;

        const result = await countDrivers(filters);

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
