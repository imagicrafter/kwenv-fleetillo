import { Request } from 'express';
/**
 * Middleware for single avatar image upload
 * Field name: 'avatar'
 *
 * Usage:
 * router.post('/upload-avatar', avatarUpload, controller.handleAvatarUpload);
 *
 * Access uploaded file via: req.file
 */
export declare const avatarUpload: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
/**
 * Error handler for multer image upload errors
 * Should be used after the avatarUpload middleware in error handling chain
 */
export declare const handleImageUploadError: (error: any, req: Request, _res: any, next: any) => void;
/**
 * Middleware to validate that an image file was uploaded
 * Use after avatarUpload middleware to ensure file exists
 */
export declare const requireImage: (req: Request, _res: any, next: any) => void;
//# sourceMappingURL=imageUpload.d.ts.map