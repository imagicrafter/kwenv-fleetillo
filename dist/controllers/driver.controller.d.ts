import { Request, Response, NextFunction } from 'express';
/**
 * Driver Controller
 * Handles HTTP requests for driver operations
 */
/**
 * Create a new driver
 * POST /api/v1/drivers
 */
export declare const create: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get driver by ID
 * GET /api/v1/drivers/:id
 */
export declare const getById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get all drivers with pagination and filters
 * GET /api/v1/drivers
 */
export declare const getAll: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update driver
 * PUT /api/v1/drivers/:id
 */
export declare const update: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete driver (soft delete)
 * DELETE /api/v1/drivers/:id
 */
export declare const remove: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get driver count
 * GET /api/v1/drivers/count
 */
export declare const count: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=driver.controller.d.ts.map