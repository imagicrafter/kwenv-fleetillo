import { Request, Response, NextFunction } from 'express';
/**
 * Customer Controller
 * Handles HTTP requests for customer operations
 */
/**
 * Create a new customer
 * POST /api/v1/customers
 */
export declare const create: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get customer by ID
 * GET /api/v1/customers/:id
 */
export declare const getById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get all customers with pagination and filters
 * GET /api/v1/customers
 */
export declare const getAll: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update customer
 * PUT /api/v1/customers/:id
 */
export declare const update: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete customer (soft delete)
 * DELETE /api/v1/customers/:id
 */
export declare const remove: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Restore deleted customer
 * POST /api/v1/customers/:id/restore
 */
export declare const restore: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get customer count
 * GET /api/v1/customers/count
 */
export declare const count: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=customer.controller.d.ts.map