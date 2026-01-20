"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireImage = exports.handleImageUploadError = exports.avatarUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const AppError_js_1 = require("../errors/AppError.js");
const codes_js_1 = require("../errors/codes.js");
/**
 * Image upload middleware using multer
 * Configured for avatar image uploads with validation
 */
// Configure multer with memory storage (for Supabase upload)
const storage = multer_1.default.memoryStorage();
/**
 * File filter to accept only image files
 * Validates mimetype for JPEG, PNG, and WebP images
 */
const imageFilter = (_req, file, cb) => {
    // Accept image mimetypes
    const allowedMimetypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimetypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(AppError_js_1.AppError.fromCode(codes_js_1.ErrorCodes.VALIDATION_ERROR, {
            message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
            context: {
                filename: file.originalname,
                mimetype: file.mimetype,
                allowedTypes: 'JPEG, PNG, WebP',
            },
        }));
    }
};
/**
 * Multer upload configuration for images
 * - Memory storage for Supabase upload
 * - 5MB file size limit
 * - Single file upload with field name 'avatar'
 * - Image file type validation (JPEG, PNG, WebP)
 */
const imageUpload = (0, multer_1.default)({
    storage: storage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB in bytes
    },
});
/**
 * Middleware for single avatar image upload
 * Field name: 'avatar'
 *
 * Usage:
 * router.post('/upload-avatar', avatarUpload, controller.handleAvatarUpload);
 *
 * Access uploaded file via: req.file
 */
exports.avatarUpload = imageUpload.single('avatar');
/**
 * Error handler for multer image upload errors
 * Should be used after the avatarUpload middleware in error handling chain
 */
const handleImageUploadError = (error, req, _res, next) => {
    if (error instanceof multer_1.default.MulterError) {
        // Handle specific multer errors
        if (error.code === 'LIMIT_FILE_SIZE') {
            const appError = AppError_js_1.AppError.fromCode(codes_js_1.ErrorCodes.VALIDATION_ERROR, {
                message: 'Image size exceeds the 5MB limit.',
                context: {
                    filename: req.file?.originalname,
                    maxSize: '5MB',
                },
            });
            return next(appError);
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            const appError = AppError_js_1.AppError.fromCode(codes_js_1.ErrorCodes.VALIDATION_ERROR, {
                message: 'Unexpected field name. Use "avatar" as the field name.',
                context: {
                    expectedField: 'avatar',
                },
            });
            return next(appError);
        }
        // Generic multer error
        const appError = AppError_js_1.AppError.fromCode(codes_js_1.ErrorCodes.VALIDATION_ERROR, {
            message: `Image upload error: ${error.message}`,
            context: { multerError: error.code },
        });
        return next(appError);
    }
    // If it's already an AppError (from imageFilter), pass it through
    if (error instanceof AppError_js_1.AppError) {
        return next(error);
    }
    // Unknown error
    next(error);
};
exports.handleImageUploadError = handleImageUploadError;
/**
 * Middleware to validate that an image file was uploaded
 * Use after avatarUpload middleware to ensure file exists
 */
const requireImage = (req, _res, next) => {
    if (!req.file) {
        throw AppError_js_1.AppError.fromCode(codes_js_1.ErrorCodes.VALIDATION_ERROR, {
            message: 'No image uploaded. Please upload an avatar image.',
            context: {
                expectedField: 'avatar',
            },
        });
    }
    next();
};
exports.requireImage = requireImage;
//# sourceMappingURL=imageUpload.js.map