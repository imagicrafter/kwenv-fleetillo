import { Request, Response, NextFunction } from 'express';
/**
 * Dispatch Job Controller
 * Handles HTTP requests for dispatch job operations
 */
/**
 * Create a new dispatch job
 * POST /api/v1/dispatch-jobs
 */
export declare const create: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get dispatch job by ID
 * GET /api/v1/dispatch-jobs/:id
 */
export declare const getById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get all dispatch jobs with optional filters
 * GET /api/v1/dispatch-jobs
 */
export declare const getAll: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Cancel a dispatch job
 * POST /api/v1/dispatch-jobs/:id/cancel
 */
export declare const cancel: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get drivers currently in active jobs
 * GET /api/v1/dispatch-jobs/active-drivers
 */
export declare const getActiveDrivers: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=dispatch-job.controller.d.ts.map