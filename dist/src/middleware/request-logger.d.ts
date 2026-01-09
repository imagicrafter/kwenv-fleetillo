import { Request, Response, NextFunction } from 'express';
/**
 * Get morgan middleware based on environment
 */
export declare const requestLogger: () => (req: import("http").IncomingMessage, res: import("http").ServerResponse<import("http").IncomingMessage>, callback: (err?: Error) => void) => void;
/**
 * Custom request logging middleware for additional context
 */
export declare const logRequest: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=request-logger.d.ts.map