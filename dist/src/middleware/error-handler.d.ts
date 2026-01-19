import { Request, Response, NextFunction } from 'express';
/**
 * Global error handling middleware for Express
 * Catches all errors and formats them into consistent API responses
 */
export declare const errorHandler: (err: Error, req: Request, res: Response, _next: NextFunction) => void;
/**
 * 404 Not Found handler
 */
export declare const notFoundHandler: (req: Request, res: Response, _next: NextFunction) => void;
//# sourceMappingURL=error-handler.d.ts.map