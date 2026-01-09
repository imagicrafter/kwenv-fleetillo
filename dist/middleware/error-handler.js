"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = void 0;
const AppError_js_1 = require("../errors/AppError.js");
const logger_js_1 = require("../utils/logger.js");
/**
 * Global error handling middleware for Express
 * Catches all errors and formats them into consistent API responses
 */
const errorHandler = (err, req, res, _next) => {
    // Log the error
    logger_js_1.logger.error('Error occurred:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
        params: req.params,
    });
    // Handle AppError instances (our custom errors)
    if (err instanceof AppError_js_1.AppError) {
        res.status(err.statusCode || 500).json({
            success: false,
            error: {
                code: err.code,
                message: err.message,
                context: err.context,
                validationErrors: err.validationErrors,
            },
        });
        return;
    }
    // Handle unknown errors
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: process.env.NODE_ENV === 'production'
                ? 'An unexpected error occurred'
                : err.message,
            details: process.env.NODE_ENV === 'production'
                ? undefined
                : err.stack,
        },
    });
};
exports.errorHandler = errorHandler;
/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, _next) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Cannot ${req.method} ${req.path}`,
            path: req.path,
            method: req.method,
        },
    });
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=error-handler.js.map