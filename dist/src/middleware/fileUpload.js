"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireFile = exports.handleUploadError = exports.uploadCSV = void 0;
const multer_1 = __importDefault(require("multer"));
const AppError_1 = require("../errors/AppError");
const codes_1 = require("../errors/codes");
/**
 * File upload middleware using multer
 * Configured for CSV file uploads with validation
 */
// Configure multer with memory storage
const storage = multer_1.default.memoryStorage();
/**
 * File filter to accept only CSV files
 * Validates both mimetype and file extension
 */
const fileFilter = (_req, file, cb) => {
    // Accept text/csv mimetype
    const allowedMimetypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    // Check file extension
    const fileExtension = file.originalname.toLowerCase().split('.').pop();
    if (allowedMimetypes.includes(file.mimetype) && fileExtension === 'csv') {
        cb(null, true);
    }
    else {
        cb(AppError_1.AppError.fromCode(codes_1.ErrorCodes.VALIDATION_ERROR, {
            message: 'Invalid file type. Only CSV files are allowed.',
            context: {
                filename: file.originalname,
                mimetype: file.mimetype,
                allowedTypes: 'CSV (.csv)',
            },
        }));
    }
};
/**
 * Multer upload configuration
 * - Memory storage for processing before DB insert
 * - 10MB file size limit
 * - Single file upload with field name 'csvFile'
 * - CSV file type validation
 */
const upload = (0, multer_1.default)({
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
exports.uploadCSV = upload.single('csvFile');
/**
 * Error handler for multer errors
 * Should be used after the upload middleware in error handling chain
 */
const handleUploadError = (error, req, _res, next) => {
    if (error instanceof multer_1.default.MulterError) {
        // Handle specific multer errors
        if (error.code === 'LIMIT_FILE_SIZE') {
            const appError = AppError_1.AppError.fromCode(codes_1.ErrorCodes.VALIDATION_ERROR, {
                message: 'File size exceeds the 10MB limit.',
                context: {
                    filename: req.file?.originalname,
                    maxSize: '10MB',
                },
            });
            return next(appError);
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            const appError = AppError_1.AppError.fromCode(codes_1.ErrorCodes.VALIDATION_ERROR, {
                message: 'Unexpected field name. Use "csvFile" as the field name.',
                context: {
                    expectedField: 'csvFile',
                },
            });
            return next(appError);
        }
        // Generic multer error
        const appError = AppError_1.AppError.fromCode(codes_1.ErrorCodes.VALIDATION_ERROR, {
            message: `File upload error: ${error.message}`,
            context: { multerError: error.code },
        });
        return next(appError);
    }
    // If it's already an AppError (from fileFilter), pass it through
    if (error instanceof AppError_1.AppError) {
        return next(error);
    }
    // Unknown error
    next(error);
};
exports.handleUploadError = handleUploadError;
/**
 * Middleware to validate that a file was uploaded
 * Use after uploadCSV middleware to ensure file exists
 */
const requireFile = (req, _res, next) => {
    if (!req.file) {
        throw AppError_1.AppError.fromCode(codes_1.ErrorCodes.VALIDATION_ERROR, {
            message: 'No file uploaded. Please upload a CSV file.',
            context: {
                expectedField: 'csvFile',
            },
        });
    }
    next();
};
exports.requireFile = requireFile;
//# sourceMappingURL=fileUpload.js.map