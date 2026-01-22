import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { AppError } from '../errors/AppError';
import { ErrorCodes } from '../errors/codes';

/**
 * Image upload middleware using multer
 * Configured for avatar image uploads with validation
 */

// Configure multer with memory storage (for Supabase upload)
const storage = multer.memoryStorage();

/**
 * File filter to accept only image files
 * Validates mimetype for JPEG, PNG, and WebP images
 */
const imageFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  // Accept image mimetypes
  const allowedMimetypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedMimetypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      AppError.fromCode(ErrorCodes.VALIDATION_ERROR, {
        message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
        context: {
          filename: file.originalname,
          mimetype: file.mimetype,
          allowedTypes: 'JPEG, PNG, WebP',
        },
      })
    );
  }
};

/**
 * Multer upload configuration for images
 * - Memory storage for Supabase upload
 * - 5MB file size limit
 * - Single file upload with field name 'avatar'
 * - Image file type validation (JPEG, PNG, WebP)
 */
const imageUpload = multer({
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
export const avatarUpload = imageUpload.single('avatar');

/**
 * Error handler for multer image upload errors
 * Should be used after the avatarUpload middleware in error handling chain
 */
export const handleImageUploadError = (error: any, req: Request, _res: any, next: any): void => {
  if (error instanceof multer.MulterError) {
    // Handle specific multer errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      const appError = AppError.fromCode(ErrorCodes.VALIDATION_ERROR, {
        message: 'Image size exceeds the 5MB limit.',
        context: {
          filename: req.file?.originalname,
          maxSize: '5MB',
        },
      });
      return next(appError);
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      const appError = AppError.fromCode(ErrorCodes.VALIDATION_ERROR, {
        message: 'Unexpected field name. Use "avatar" as the field name.',
        context: {
          expectedField: 'avatar',
        },
      });
      return next(appError);
    }

    // Generic multer error
    const appError = AppError.fromCode(ErrorCodes.VALIDATION_ERROR, {
      message: `Image upload error: ${error.message}`,
      context: { multerError: error.code },
    });
    return next(appError);
  }

  // If it's already an AppError (from imageFilter), pass it through
  if (error instanceof AppError) {
    return next(error);
  }

  // Unknown error
  next(error);
};

/**
 * Middleware to validate that an image file was uploaded
 * Use after avatarUpload middleware to ensure file exists
 */
export const requireImage = (req: Request, _res: any, next: any): void => {
  if (!req.file) {
    throw AppError.fromCode(ErrorCodes.VALIDATION_ERROR, {
      message: 'No image uploaded. Please upload an avatar image.',
      context: {
        expectedField: 'avatar',
      },
    });
  }
  next();
};
