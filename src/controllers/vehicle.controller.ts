import { Request, Response, NextFunction } from 'express';
import {
  createVehicle,
  getVehicleById,
  getVehicles,
  updateVehicle,
  deleteVehicle,
  restoreVehicle,
  countVehicles,
  getVehiclesByServiceType,
  updateVehicleLocation,
  updateVehicleStatus,
} from '../services/vehicle.service.js';
import type { CreateVehicleInput, UpdateVehicleInput, VehicleFilters, VehicleStatus } from '../types/vehicle.js';
import type { PaginationParams } from '../types/index.js';

/**
 * Vehicle Controller
 * Handles HTTP requests for vehicle management operations
 */

/**
 * Create a new vehicle
 * POST /api/v1/vehicles
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input: CreateVehicleInput = req.body;
    const result = await createVehicle(input);

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
 * Get vehicle by ID
 * GET /api/v1/vehicles/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'ID is required' } });
      return;
    }
    const result = await getVehicleById(id);

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
 * Get all vehicles with pagination and filters
 * GET /api/v1/vehicles
 */
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      fuelType,
      make,
      model,
      serviceTypes,
      assignedDriverId,
      tags,
      searchTerm,
      includeDeleted,
    } = req.query;

    const pagination: PaginationParams = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const filters: VehicleFilters = {};

    if (status) {
      filters.status = status as VehicleFilters['status'];
    }
    if (fuelType) {
      filters.fuelType = fuelType as VehicleFilters['fuelType'];
    }
    if (make) {
      filters.make = make as string;
    }
    if (model) {
      filters.model = model as string;
    }
    if (serviceTypes) {
      filters.serviceTypes = Array.isArray(serviceTypes)
        ? serviceTypes as string[]
        : (serviceTypes as string).split(',');
    }
    if (assignedDriverId) {
      filters.assignedDriverId = assignedDriverId as string;
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

    const result = await getVehicles(filters, pagination);

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
 * Update vehicle
 * PUT /api/v1/vehicles/:id
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'ID is required' } });
      return;
    }
    const input: UpdateVehicleInput = {
      id,
      ...req.body,
    };

    const result = await updateVehicle(input);

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
 * Delete vehicle (soft delete)
 * DELETE /api/v1/vehicles/:id
 */
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'ID is required' } });
      return;
    }
    const result = await deleteVehicle(id);

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
 * Restore deleted vehicle
 * POST /api/v1/vehicles/:id/restore
 */
export const restore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'ID is required' } });
      return;
    }
    const result = await restoreVehicle(id);

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
 * Get vehicle count
 * GET /api/v1/vehicles/count
 */
export const count = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, fuelType, serviceTypes, includeDeleted } = req.query;

    const filters: VehicleFilters = {};
    if (status) {
      filters.status = status as VehicleFilters['status'];
    }
    if (fuelType) {
      filters.fuelType = fuelType as VehicleFilters['fuelType'];
    }
    if (serviceTypes) {
      filters.serviceTypes = Array.isArray(serviceTypes)
        ? serviceTypes as string[]
        : (serviceTypes as string).split(',');
    }
    if (includeDeleted) {
      filters.includeDeleted = includeDeleted === 'true';
    }

    const result = await countVehicles(filters);

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

/**
 * Get vehicles by service type
 * GET /api/v1/vehicles/service-type/:serviceType
 */
export const getByServiceType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { serviceType } = req.params;
    if (!serviceType) {
      res.status(400).json({ success: false, error: { message: 'Service type is required' } });
      return;
    }

    const { status, includeDeleted } = req.query;

    const filters: Omit<VehicleFilters, 'serviceTypes'> = {};
    if (status) {
      filters.status = status as VehicleFilters['status'];
    }
    if (includeDeleted) {
      filters.includeDeleted = includeDeleted === 'true';
    }

    const result = await getVehiclesByServiceType(serviceType, filters);

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
 * Update vehicle location
 * PATCH /api/v1/vehicles/:id/location
 */
export const patchLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    const result = await updateVehicleLocation(id, latitude, longitude);

    if (!result.success) {
      const statusCode = (result.error as Error & { code?: string })?.code === 'VEHICLE_NOT_FOUND' ? 404 : 400;
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
  } catch (error) {
    next(error);
  }
};

/**
 * Update vehicle status (availability)
 * PATCH /api/v1/vehicles/:id/status
 */
export const patchStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    const validStatuses: VehicleStatus[] = ['available', 'in_use', 'maintenance', 'out_of_service', 'retired'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: {
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        }
      });
      return;
    }

    const result = await updateVehicleStatus(id, status);

    if (!result.success) {
      const statusCode = (result.error as Error & { code?: string })?.code === 'VEHICLE_NOT_FOUND' ? 404 : 400;
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
  } catch (error) {
    next(error);
  }
};

/**
 * Update vehicle service types (tagging)
 * PATCH /api/v1/vehicles/:id/service-types
 */
export const patchServiceTypes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    const input: UpdateVehicleInput = {
      id,
      serviceTypes,
    };

    const result = await updateVehicle(input);

    if (!result.success) {
      const statusCode = (result.error as Error & { code?: string })?.code === 'VEHICLE_NOT_FOUND' ? 404 : 400;
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
  } catch (error) {
    next(error);
  }
};
