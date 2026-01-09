import { Request, Response, NextFunction } from 'express';
/**
 * Validation middleware factory
 * Creates middleware that validates request data against a schema
 */
export declare const validate: (schema: {
    body?: (data: any) => boolean;
    query?: (data: any) => boolean;
    params?: (data: any) => boolean;
}) => (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Validate required fields in request body
 */
export declare const validateRequired: (fields: string[]) => (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Validate UUID format
 */
export declare const isValidUUID: (value: string) => boolean;
/**
 * Validate ID parameter middleware
 */
export declare const validateIdParam: (paramName?: string) => (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Sanitize request body by removing undefined values
 */
export declare const sanitizeBody: (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.d.ts.map