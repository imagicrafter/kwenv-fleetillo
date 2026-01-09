import { Request, Response, NextFunction } from 'express';
/**
 * Vehicle Controller
 * Handles HTTP requests for vehicle management operations
 */
/**
 * Create a new vehicle
 * POST /api/v1/vehicles
 */
export declare const create: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get vehicle by ID
 * GET /api/v1/vehicles/:id
 */
export declare const getById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get all vehicles with pagination and filters
 * GET /api/v1/vehicles
 */
export declare const getAll: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update vehicle
 * PUT /api/v1/vehicles/:id
 */
export declare const update: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete vehicle (soft delete)
 * DELETE /api/v1/vehicles/:id
 */
export declare const remove: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Restore deleted vehicle
 * POST /api/v1/vehicles/:id/restore
 */
export declare const restore: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get vehicle count
 * GET /api/v1/vehicles/count
 */
export declare const count: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get vehicles by service type
 * GET /api/v1/vehicles/service-type/:serviceType
 */
export declare const getByServiceType: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update vehicle location
 * PATCH /api/v1/vehicles/:id/location
 */
export declare const patchLocation: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update vehicle status (availability)
 * PATCH /api/v1/vehicles/:id/status
 */
export declare const patchStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update vehicle service types (tagging)
 * PATCH /api/v1/vehicles/:id/service-types
 */
export declare const patchServiceTypes: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=vehicle.controller.d.ts.map