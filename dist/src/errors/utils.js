"use strict";
/**
 * Error utility functions for RouteIQ application
 * Provides error handling helpers, type guards, and async error boundaries
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAppError = isAppError;
exports.isError = isError;
exports.hasErrorCode = hasErrorCode;
exports.isErrorCategory = isErrorCategory;
exports.isOperationalError = isOperationalError;
exports.normalizeError = normalizeError;
exports.createErrorResponse = createErrorResponse;
exports.serializeErrorForLogging = serializeErrorForLogging;
exports.tryCatch = tryCatch;
exports.tryCatchSync = tryCatchSync;
exports.retryWithBackoff = retryWithBackoff;
exports.createAsyncBoundary = createAsyncBoundary;
exports.assertCondition = assertCondition;
exports.assertDefined = assertDefined;
exports.createErrorFactory = createErrorFactory;
exports.getUserFriendlyMessage = getUserFriendlyMessage;
exports.shouldLogAsError = shouldLogAsError;
const AppError_js_1 = require("./AppError.js");
const codes_js_1 = require("./codes.js");
const index_js_1 = require("../types/index.js");
/**
 * Type guard to check if a value is an AppError
 */
function isAppError(error) {
    return error instanceof AppError_js_1.AppError;
}
/**
 * Type guard to check if a value is an Error
 */
function isError(error) {
    return error instanceof Error;
}
/**
 * Type guard to check if an error has a specific code
 */
function hasErrorCode(error, code) {
    return isAppError(error) && error.code === code.code;
}
/**
 * Type guard to check if an error belongs to a category
 */
function isErrorCategory(error, category) {
    return isAppError(error) && error.category === category;
}
/**
 * Check if an error is an operational error (expected) vs a programming error
 */
function isOperationalError(error) {
    if (isAppError(error)) {
        return error.isOperational;
    }
    return false;
}
/**
 * Normalize any error to an AppError
 * This ensures consistent error handling throughout the application
 */
function normalizeError(error, defaultCode) {
    if (isAppError(error)) {
        return error;
    }
    if (isError(error)) {
        return AppError_js_1.AppError.wrap(error, defaultCode);
    }
    // Handle non-Error values (strings, objects, etc.)
    const message = typeof error === 'string' ? error : String(error);
    return new AppError_js_1.AppError({
        code: (defaultCode ?? codes_js_1.ErrorCodes.UNEXPECTED_ERROR).code,
        message,
        statusCode: (defaultCode ?? codes_js_1.ErrorCodes.UNEXPECTED_ERROR).statusCode,
        category: (defaultCode ?? codes_js_1.ErrorCodes.UNEXPECTED_ERROR).category,
        severity: (defaultCode ?? codes_js_1.ErrorCodes.UNEXPECTED_ERROR).severity,
    });
}
/**
 * Create a safe error response for API endpoints
 * Hides sensitive information in production
 */
function createErrorResponse(error, options = {}) {
    const appError = normalizeError(error);
    // Add request ID to context if provided
    if (options.requestId) {
        return appError.withRequestId(options.requestId).toResponse(options.includeDebugInfo);
    }
    return appError.toResponse(options.includeDebugInfo);
}
/**
 * Serialize an error for logging
 */
function serializeErrorForLogging(error) {
    const appError = normalizeError(error);
    return appError.serialize(true); // Always include debug info for logging
}
/**
 * Async wrapper that catches errors and returns a Result type
 * Useful for operations that may fail
 */
async function tryCatch(operation, context) {
    try {
        const data = await operation();
        return { success: true, data };
    }
    catch (error) {
        const appError = normalizeError(error);
        const errorWithContext = context ? appError.withContext(context) : appError;
        return { success: false, error: errorWithContext };
    }
}
/**
 * Sync wrapper that catches errors and returns a Result type
 */
function tryCatchSync(operation, context) {
    try {
        const data = operation();
        return { success: true, data };
    }
    catch (error) {
        const appError = normalizeError(error);
        const errorWithContext = context ? appError.withContext(context) : appError;
        return { success: false, error: errorWithContext };
    }
}
/**
 * Retry an async operation with exponential backoff
 */
async function retryWithBackoff(operation, options = {}) {
    const { maxRetries = 3, baseDelay = 1000, maxDelay = 30000, exponentialBackoff = true, shouldRetry = (error) => {
        if (isAppError(error)) {
            return error.isRetryable();
        }
        return (0, codes_js_1.isRetryableError)(String(error));
    }, onRetry, } = options;
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            // Don't retry on the last attempt
            if (attempt === maxRetries) {
                break;
            }
            // Check if we should retry
            if (!shouldRetry(error, attempt)) {
                break;
            }
            // Calculate delay
            let delay = baseDelay;
            if (exponentialBackoff) {
                delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
            }
            // Add some jitter (0-10%)
            delay = delay * (1 + Math.random() * 0.1);
            // Notify about retry
            if (onRetry) {
                onRetry(error, attempt + 1, delay);
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}
/**
 * Create an async boundary that catches and handles errors
 * Useful for top-level error handling
 */
function createAsyncBoundary(fn, errorHandler) {
    return (async (...args) => {
        try {
            return await fn(...args);
        }
        catch (error) {
            const appError = normalizeError(error);
            errorHandler(appError);
            throw appError;
        }
    });
}
/**
 * Assert a condition, throwing an AppError if false
 */
function assertCondition(condition, message, code = codes_js_1.ErrorCodes.INTERNAL_ERROR) {
    if (!condition) {
        throw AppError_js_1.AppError.fromCode(code, { message });
    }
}
/**
 * Assert a value is defined (not null or undefined)
 */
function assertDefined(value, message, code = codes_js_1.ErrorCodes.INTERNAL_ERROR) {
    if (value === null || value === undefined) {
        throw AppError_js_1.AppError.fromCode(code, { message });
    }
}
/**
 * Create an error factory function for a specific context
 * Useful for creating domain-specific error creators
 */
function createErrorFactory(defaultContext) {
    return {
        validation: (message, field) => {
            const error = AppError_js_1.AppError.fromCode(codes_js_1.ErrorCodes.VALIDATION_ERROR, { message });
            return error.withContext({ ...defaultContext, field });
        },
        notFound: (resourceType, resourceId) => {
            const message = resourceId
                ? `${resourceType} with ID '${resourceId}' not found`
                : `${resourceType} not found`;
            const error = AppError_js_1.AppError.fromCode(codes_js_1.ErrorCodes.RESOURCE_NOT_FOUND, { message });
            return error.withContext({ ...defaultContext, resourceType, resourceId });
        },
        unauthorized: (message) => {
            const error = AppError_js_1.AppError.fromCode(codes_js_1.ErrorCodes.AUTHENTICATION_REQUIRED, {
                message: message ?? codes_js_1.ErrorCodes.AUTHENTICATION_REQUIRED.message,
            });
            return error.withContext(defaultContext);
        },
        forbidden: (message) => {
            const error = AppError_js_1.AppError.fromCode(codes_js_1.ErrorCodes.ACCESS_DENIED, {
                message: message ?? codes_js_1.ErrorCodes.ACCESS_DENIED.message,
            });
            return error.withContext(defaultContext);
        },
        internal: (message, cause) => {
            return new AppError_js_1.InternalError(message, cause, defaultContext);
        },
    };
}
/**
 * Get a user-friendly error message
 * Maps technical errors to user-friendly messages
 */
function getUserFriendlyMessage(error) {
    if (!isAppError(error)) {
        return 'An unexpected error occurred. Please try again later.';
    }
    // Map categories to user-friendly messages
    const categoryMessages = {
        [index_js_1.ErrorCategory.VALIDATION]: error.message,
        [index_js_1.ErrorCategory.AUTHENTICATION]: 'Please sign in to continue.',
        [index_js_1.ErrorCategory.AUTHORIZATION]: 'You do not have permission to perform this action.',
        [index_js_1.ErrorCategory.RESOURCE]: error.message,
        [index_js_1.ErrorCategory.BUSINESS]: error.message,
        [index_js_1.ErrorCategory.EXTERNAL]: 'A service is temporarily unavailable. Please try again later.',
        [index_js_1.ErrorCategory.DATABASE]: 'A database error occurred. Please try again later.',
        [index_js_1.ErrorCategory.CONFIGURATION]: 'A system configuration error occurred. Please contact support.',
        [index_js_1.ErrorCategory.NETWORK]: 'A network error occurred. Please check your connection and try again.',
        [index_js_1.ErrorCategory.INTERNAL]: 'An unexpected error occurred. Please try again later.',
    };
    return categoryMessages[error.category] ?? error.message;
}
/**
 * Determine if an error should be logged at error level
 * Some errors are expected and should only be logged at warn/info level
 */
function shouldLogAsError(error) {
    if (!isAppError(error)) {
        return true;
    }
    // Operational errors at low severity shouldn't be logged as errors
    if (error.isOperational && error.severity === index_js_1.ErrorSeverity.LOW) {
        return false;
    }
    // Authentication/authorization errors are often expected
    if (error.category === index_js_1.ErrorCategory.AUTHENTICATION ||
        error.category === index_js_1.ErrorCategory.AUTHORIZATION) {
        return false;
    }
    // Validation errors are expected
    if (error.category === index_js_1.ErrorCategory.VALIDATION) {
        return false;
    }
    // Resource not found is often expected
    if (error.code === codes_js_1.ErrorCodes.RESOURCE_NOT_FOUND.code) {
        return false;
    }
    return true;
}
//# sourceMappingURL=utils.js.map