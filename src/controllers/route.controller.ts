import { Request, Response, NextFunction } from 'express';
import {
  createRoute,
  getRouteById,
  getRoutes,
  updateRoute,
  deleteRoute,
  restoreRoute,
  countRoutes,
  getRoutesByVehicle,
  getRoutesByDateRange,
  updateRouteStatus,
} from '../services/route.service';
import { generateOptimizedRoutes } from '../services/route-generation.service';
import { planRoutes } from '../services/route-planning.service';
import type { CreateRouteInput, UpdateRouteInput, RouteFilters, RouteStatus } from '../types/route';
import type { PaginationParams } from '../types/index';

/**
 * Route Controller
 * Handles HTTP requests for route operations
 */

/**
 * Create a new route
 * POST /api/v1/routes
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input: CreateRouteInput = {
      ...req.body,
      routeDate: req.body.routeDate ? new Date(req.body.routeDate) : undefined,
    };
    const result = await createRoute(input);

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
 * Get route by ID
 * GET /api/v1/routes/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'ID is required' } });
      return;
    }
    const result = await getRouteById(id);

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
 * Get all routes with pagination and filters
 * GET /api/v1/routes
 */
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      vehicleId,
      routeDate,
      routeDateFrom,
      routeDateTo,
      optimizationType,
      createdBy,
      assignedTo,
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

    const filters: RouteFilters = {};

    if (status) filters.status = status as RouteStatus;
    if (vehicleId) filters.vehicleId = vehicleId as string;
    if (routeDate) filters.routeDate = new Date(routeDate as string);
    if (routeDateFrom) filters.routeDateFrom = new Date(routeDateFrom as string);
    if (routeDateTo) filters.routeDateTo = new Date(routeDateTo as string);
    if (optimizationType) filters.optimizationType = optimizationType as RouteFilters['optimizationType'];
    if (createdBy) filters.createdBy = createdBy as string;
    if (assignedTo) filters.assignedTo = assignedTo as string;
    if (searchTerm) filters.searchTerm = searchTerm as string;
    if (includeDeleted === 'true') filters.includeDeleted = true;

    // Handle tags - can be comma-separated string or array
    if (tags) {
      if (typeof tags === 'string') {
        filters.tags = tags.split(',').map((t) => t.trim());
      } else if (Array.isArray(tags)) {
        filters.tags = tags as string[];
      }
    }

    const result = await getRoutes(filters, pagination);

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
 * Update route
 * PUT /api/v1/routes/:id
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'ID is required' } });
      return;
    }

    const input: UpdateRouteInput = {
      id,
      ...req.body,
      routeDate: req.body.routeDate ? new Date(req.body.routeDate) : undefined,
      actualStartTime: req.body.actualStartTime ? new Date(req.body.actualStartTime) : undefined,
      actualEndTime: req.body.actualEndTime ? new Date(req.body.actualEndTime) : undefined,
    };

    const result = await updateRoute(input);

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
 * Delete route (soft delete)
 * DELETE /api/v1/routes/:id
 */
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'ID is required' } });
      return;
    }
    const result = await deleteRoute(id);

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
 * Restore deleted route
 * POST /api/v1/routes/:id/restore
 */
export const restore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'ID is required' } });
      return;
    }
    const result = await restoreRoute(id);

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
 * Get route count
 * GET /api/v1/routes/count
 */
export const count = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, vehicleId, optimizationType, includeDeleted } = req.query;

    const filters: RouteFilters = {};
    if (status) filters.status = status as RouteStatus;
    if (vehicleId) filters.vehicleId = vehicleId as string;
    if (optimizationType) filters.optimizationType = optimizationType as RouteFilters['optimizationType'];
    if (includeDeleted === 'true') filters.includeDeleted = true;

    const result = await countRoutes(filters);

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
 * Get routes by vehicle
 * GET /api/v1/routes/vehicle/:vehicleId
 */
export const getByVehicle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { vehicleId } = req.params;
    if (!vehicleId) {
      res.status(400).json({ success: false, error: { message: 'Vehicle ID is required' } });
      return;
    }

    const { status, routeDate, includeDeleted } = req.query;

    const filters: Omit<RouteFilters, 'vehicleId'> = {};
    if (status) filters.status = status as RouteStatus;
    if (routeDate) filters.routeDate = new Date(routeDate as string);
    if (includeDeleted === 'true') filters.includeDeleted = true;

    const result = await getRoutesByVehicle(vehicleId, filters);

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
 * Get routes by date range
 * GET /api/v1/routes/date-range
 */
export const getByDateRange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate, status, vehicleId, includeDeleted } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: { message: 'startDate and endDate query parameters are required' },
      });
      return;
    }

    const filters: Omit<RouteFilters, 'routeDateFrom' | 'routeDateTo'> = {};
    if (status) filters.status = status as RouteStatus;
    if (vehicleId) filters.vehicleId = vehicleId as string;
    if (includeDeleted === 'true') filters.includeDeleted = true;

    const result = await getRoutesByDateRange(
      new Date(startDate as string),
      new Date(endDate as string),
      filters
    );

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
 * Update route status
 * PATCH /api/v1/routes/:id/status
 */
export const updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    const validStatuses: RouteStatus[] = [
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

    const result = await updateRouteStatus(id, status);

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
 * Generate optimized routes from bookings
 * POST /api/v1/routes/generate
 */
export const generate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { bookingIds, departureLocation, returnToStart, travelMode, routingPreference, optimizeWaypointOrder } =
      req.body;

    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      res.status(400).json({
        success: false,
        error: { message: 'bookingIds array is required and must not be empty' },
      });
      return;
    }

    const result = await generateOptimizedRoutes({
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
  } catch (error) {
    next(error);
  }
};

/**
 * Plan routes for a specific date
 * POST /api/v1/routes/plan
 */
export const plan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { routeDate, serviceId, maxStopsPerRoute, departureLocation, returnToStart, routingPreference } = req.body;

    if (!routeDate) {
      res.status(400).json({
        success: false,
        error: { message: 'routeDate is required' },
      });
      return;
    }

    const result = await planRoutes({
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
  } catch (error) {
    next(error);
  }
};
