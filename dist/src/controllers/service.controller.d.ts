import { Request, Response, NextFunction } from 'express';
/**
 * Service Controller
 * Handles HTTP requests for service catalog operations
 */
/**
 * Create a new service
 * POST /api/v1/services
 */
export declare const create: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get service by ID
 * GET /api/v1/services/:id
 */
export declare const getById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get service by code
 * GET /api/v1/services/code/:code
 */
export declare const getByCode: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get all services with pagination and filters
 * GET /api/v1/services
 */
export declare const getAll: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update service
 * PUT /api/v1/services/:id
 */
export declare const update: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete service (soft delete)
 * DELETE /api/v1/services/:id
 */
export declare const remove: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Restore deleted service
 * POST /api/v1/services/:id/restore
 */
export declare const restore: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get service count
 * GET /api/v1/services/count
 */
export declare const count: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=service.controller.d.ts.map