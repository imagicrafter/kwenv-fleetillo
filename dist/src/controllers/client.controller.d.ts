import { Request, Response, NextFunction } from 'express';
/**
 * Client Controller
 * Handles HTTP requests for client operations
 */
/**
 * Create a new client
 * POST /api/v1/clients
 */
export declare const create: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get client by ID
 * GET /api/v1/clients/:id
 */
export declare const getById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get all clients with pagination and filters
 * GET /api/v1/clients
 */
export declare const getAll: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update client
 * PUT /api/v1/clients/:id
 */
export declare const update: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete client (soft delete)
 * DELETE /api/v1/clients/:id
 */
export declare const remove: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Restore deleted client
 * POST /api/v1/clients/:id/restore
 */
export declare const restore: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get client count
 * GET /api/v1/clients/count
 */
export declare const count: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=client.controller.d.ts.map