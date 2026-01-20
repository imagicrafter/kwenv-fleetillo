import { Request, Response, NextFunction } from 'express';
/**
 * Route Controller
 * Handles HTTP requests for route operations
 */
/**
 * Create a new route
 * POST /api/v1/routes
 */
export declare const create: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get route by ID
 * GET /api/v1/routes/:id
 */
export declare const getById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get all routes with pagination and filters
 * GET /api/v1/routes
 */
export declare const getAll: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update route
 * PUT /api/v1/routes/:id
 */
export declare const update: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete route (soft delete)
 * DELETE /api/v1/routes/:id
 */
export declare const remove: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Restore deleted route
 * POST /api/v1/routes/:id/restore
 */
export declare const restore: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get route count
 * GET /api/v1/routes/count
 */
export declare const count: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get routes by vehicle
 * GET /api/v1/routes/vehicle/:vehicleId
 */
export declare const getByVehicle: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get routes by date range
 * GET /api/v1/routes/date-range
 */
export declare const getByDateRange: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update route status
 * PATCH /api/v1/routes/:id/status
 */
export declare const updateStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Generate optimized routes from bookings
 * POST /api/v1/routes/generate
 */
export declare const generate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Plan routes for a specific date
 * POST /api/v1/routes/plan
 */
export declare const plan: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=route.controller.d.ts.map