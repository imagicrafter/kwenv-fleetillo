import { Request, Response, NextFunction } from 'express';
import {
  createService,
  getServiceById,
  getServiceByCode,
  getServices,
  updateService,
  deleteService,
  restoreService,
  countServices,
} from '../services/service.service';
import type { CreateServiceInput, UpdateServiceInput, ServiceFilters } from '../types/service';
import type { PaginationParams } from '../types/index';

/**
 * Service Controller
 * Handles HTTP requests for service catalog operations
 */

/**
 * Create a new service
 * POST /api/v1/services
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input: CreateServiceInput = req.body;
    const result = await createService(input);

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
 * Get service by ID
 * GET /api/v1/services/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'ID is required' } });
      return;
    }
    const result = await getServiceById(id);

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
 * Get service by code
 * GET /api/v1/services/code/:code
 */
export const getByCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code } = req.params;
    if (!code) {
      res.status(400).json({ success: false, error: { message: 'Code is required' } });
      return;
    }
    const result = await getServiceByCode(code);

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
 * Get all services with pagination and filters
 * GET /api/v1/services
 */
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      serviceType,
      requiresAppointment,
      tags,
      searchTerm,
      includeDeleted,
      minDuration,
      maxDuration,
    } = req.query;

    const pagination: PaginationParams = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const filters: ServiceFilters = {};

    if (status) {
      filters.status = status as ServiceFilters['status'];
    }
    if (serviceType) {
      filters.serviceType = serviceType as string;
    }
    if (requiresAppointment !== undefined) {
      filters.requiresAppointment = requiresAppointment === 'true';
    }
    if (tags) {
      filters.tags = Array.isArray(tags) ? tags as string[] : [tags as string];
    }
    if (searchTerm) {
      filters.searchTerm = searchTerm as string;
    }
    if (includeDeleted) {
      filters.includeDeleted = includeDeleted === 'true';
    }
    if (minDuration) {
      filters.minDuration = parseInt(minDuration as string);
    }
    if (maxDuration) {
      filters.maxDuration = parseInt(maxDuration as string);
    }

    const result = await getServices(filters, pagination);

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
 * Update service
 * PUT /api/v1/services/:id
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'ID is required' } });
      return;
    }
    const input: UpdateServiceInput = {
      id,
      ...req.body,
    };

    const result = await updateService(input);

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
 * Delete service (soft delete)
 * DELETE /api/v1/services/:id
 */
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'ID is required' } });
      return;
    }
    const result = await deleteService(id);

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
 * Restore deleted service
 * POST /api/v1/services/:id/restore
 */
export const restore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'ID is required' } });
      return;
    }
    const result = await restoreService(id);

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
 * Get service count
 * GET /api/v1/services/count
 */
export const count = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, serviceType, includeDeleted } = req.query;

    const filters: ServiceFilters = {};
    if (status) {
      filters.status = status as ServiceFilters['status'];
    }
    if (serviceType) {
      filters.serviceType = serviceType as string;
    }
    if (includeDeleted) {
      filters.includeDeleted = includeDeleted === 'true';
    }

    const result = await countServices(filters);

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
