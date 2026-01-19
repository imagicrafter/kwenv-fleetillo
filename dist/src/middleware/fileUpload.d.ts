import { Request } from 'express';
/**
 * Middleware for single CSV file upload
 * Field name: 'csvFile'
 *
 * Usage:
 * router.post('/upload', uploadCSV, controller.handleUpload);
 *
 * Access uploaded file via: req.file
 */
export declare const uploadCSV: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
/**
 * Error handler for multer errors
 * Should be used after the upload middleware in error handling chain
 */
export declare const handleUploadError: (error: any, req: Request, _res: any, next: any) => void;
/**
 * Middleware to validate that a file was uploaded
 * Use after uploadCSV middleware to ensure file exists
 */
export declare const requireFile: (req: Request, _res: any, next: any) => void;
//# sourceMappingURL=fileUpload.d.ts.map