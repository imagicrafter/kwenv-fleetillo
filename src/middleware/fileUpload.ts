import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes } from '../errors/codes.js';

/**
 * File upload middleware using multer
 * Configured for CSV file uploads with validation
 */

// Configure multer with memory storage
const storage = multer.memoryStorage();

/**
 * File filter to accept only CSV files
 * Validates both mimetype and file extension
 */
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  // Accept text/csv mimetype
  const allowedMimetypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];

  // Check file extension
  const fileExtension = file.originalname.toLowerCase().split('.').pop();

  if (allowedMimetypes.includes(file.mimetype) && fileExtension === 'csv') {
    cb(null, true);
  } else {
    cb(
      AppError.fromCode(ErrorCodes.VALIDATION_ERROR, {
        message: 'Invalid file type. Only CSV files are allowed.',
        context: {
          filename: file.originalname,
          mimetype: file.mimetype,
          allowedTypes: 'CSV (.csv)',
        },
      })
    );
  }
};

/**
 * Multer upload configuration
 * - Memory storage for processing before DB insert
 * - 10MB file size limit
 * - Single file upload with field name 'csvFile'
 * - CSV file type validation
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB in bytes
  },
});

/**
 * Middleware for single CSV file upload
 * Field name: 'csvFile'
 *
 * Usage:
 * router.post('/upload', uploadCSV, controller.handleUpload);
 *
 * Access uploaded file via: req.file
 */
export const uploadCSV = upload.single('csvFile');

/**
 * Error handler for multer errors
 * Should be used after the upload middleware in error handling chain
 */
export const handleUploadError = (error: any, req: Request, _res: any, next: any): void => {
  if (error instanceof multer.MulterError) {
    // Handle specific multer errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      const appError = AppError.fromCode(ErrorCodes.VALIDATION_ERROR, {
        message: 'File size exceeds the 10MB limit.',
        context: {
          filename: req.file?.originalname,
          maxSize: '10MB',
        },
      });
      return next(appError);
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      const appError = AppError.fromCode(ErrorCodes.VALIDATION_ERROR, {
        message: 'Unexpected field name. Use "csvFile" as the field name.',
        context: {
          expectedField: 'csvFile',
        },
      });
      return next(appError);
    }

    // Generic multer error
    const appError = AppError.fromCode(ErrorCodes.VALIDATION_ERROR, {
      message: `File upload error: ${error.message}`,
      context: { multerError: error.code },
    });
    return next(appError);
  }

  // If it's already an AppError (from fileFilter), pass it through
  if (error instanceof AppError) {
    return next(error);
  }

  // Unknown error
  next(error);
};

/**
 * Middleware to validate that a file was uploaded
 * Use after uploadCSV middleware to ensure file exists
 */
export const requireFile = (req: Request, _res: any, next: any): void => {
  if (!req.file) {
    throw AppError.fromCode(ErrorCodes.VALIDATION_ERROR, {
      message: 'No file uploaded. Please upload a CSV file.',
      context: {
        expectedField: 'csvFile',
      },
    });
  }
  next();
};
