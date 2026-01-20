import { Request, Response, NextFunction } from 'express';
/**
 * Booking Controller
 * Handles HTTP requests for booking operations
 */
/**
 * Create a new booking
 * POST /api/v1/bookings
 */
export declare const create: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get booking by ID
 * GET /api/v1/bookings/:id
 */
export declare const getById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get booking by booking number
 * GET /api/v1/bookings/number/:bookingNumber
 */
export declare const getByNumber: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get all bookings with pagination and filters
 * GET /api/v1/bookings
 */
export declare const getAll: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update booking
 * PUT /api/v1/bookings/:id
 */
export declare const update: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete booking (soft delete)
 * DELETE /api/v1/bookings/:id
 */
export declare const remove: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Restore deleted booking
 * POST /api/v1/bookings/:id/restore
 */
export declare const restore: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get booking count
 * GET /api/v1/bookings/count
 */
export declare const count: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Upload CSV file with bookings
 * POST /api/v1/bookings/upload
 */
export declare const uploadCSV: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Download CSV template for booking uploads
 * GET /api/v1/bookings/template
 */
export declare const downloadTemplate: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=booking.controller.d.ts.map