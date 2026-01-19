"use strict";
/**
 * Centralized error handling module for RouteIQ application
 *
 * This module provides:
 * - Custom error classes for different error types
 * - Error codes with associated metadata
 * - Error utilities for handling, wrapping, and transforming errors
 * - Type guards and assertions
 * - Retry logic with exponential backoff
 *
 * @example
 * ```typescript
 * import {
 *   ValidationError,
 *   ResourceError,
 *   ErrorCodes,
 *   tryCatch,
 *   normalizeError
 * } from '@/errors';
 *
 * // Throw a validation error
 * throw ValidationError.forField('email', 'Invalid email format');
 *
 * // Throw a not found error
 * throw ResourceError.notFound('User', userId);
 *
 * // Use try-catch wrapper
 * const result = await tryCatch(() => fetchUser(id));
 * if (!result.success) {
 *   logger.error('Failed to fetch user', result.error);
 * }
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldLogAsError = exports.getUserFriendlyMessage = exports.createErrorFactory = exports.assertDefined = exports.assertCondition = exports.createAsyncBoundary = exports.retryWithBackoff = exports.tryCatchSync = exports.tryCatch = exports.serializeErrorForLogging = exports.createErrorResponse = exports.normalizeError = exports.isOperationalError = exports.isErrorCategory = exports.hasErrorCode = exports.isError = exports.isAppError = exports.InternalError = exports.NetworkError = exports.ConfigurationError = exports.DatabaseError = exports.ExternalServiceError = exports.BusinessError = exports.ResourceError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = exports.isRetryableError = exports.getErrorCodesBySeverity = exports.getErrorCodesByCategory = exports.getErrorCodeDefinition = exports.ErrorCodes = void 0;
// Export error codes and related utilities
var codes_js_1 = require("./codes.js");
Object.defineProperty(exports, "ErrorCodes", { enumerable: true, get: function () { return codes_js_1.ErrorCodes; } });
Object.defineProperty(exports, "getErrorCodeDefinition", { enumerable: true, get: function () { return codes_js_1.getErrorCodeDefinition; } });
Object.defineProperty(exports, "getErrorCodesByCategory", { enumerable: true, get: function () { return codes_js_1.getErrorCodesByCategory; } });
Object.defineProperty(exports, "getErrorCodesBySeverity", { enumerable: true, get: function () { return codes_js_1.getErrorCodesBySeverity; } });
Object.defineProperty(exports, "isRetryableError", { enumerable: true, get: function () { return codes_js_1.isRetryableError; } });
// Export main error class and specialized error classes
var AppError_js_1 = require("./AppError.js");
Object.defineProperty(exports, "AppError", { enumerable: true, get: function () { return AppError_js_1.AppError; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return AppError_js_1.ValidationError; } });
Object.defineProperty(exports, "AuthenticationError", { enumerable: true, get: function () { return AppError_js_1.AuthenticationError; } });
Object.defineProperty(exports, "AuthorizationError", { enumerable: true, get: function () { return AppError_js_1.AuthorizationError; } });
Object.defineProperty(exports, "ResourceError", { enumerable: true, get: function () { return AppError_js_1.ResourceError; } });
Object.defineProperty(exports, "BusinessError", { enumerable: true, get: function () { return AppError_js_1.BusinessError; } });
Object.defineProperty(exports, "ExternalServiceError", { enumerable: true, get: function () { return AppError_js_1.ExternalServiceError; } });
Object.defineProperty(exports, "DatabaseError", { enumerable: true, get: function () { return AppError_js_1.DatabaseError; } });
Object.defineProperty(exports, "ConfigurationError", { enumerable: true, get: function () { return AppError_js_1.ConfigurationError; } });
Object.defineProperty(exports, "NetworkError", { enumerable: true, get: function () { return AppError_js_1.NetworkError; } });
Object.defineProperty(exports, "InternalError", { enumerable: true, get: function () { return AppError_js_1.InternalError; } });
// Export error utilities
var utils_js_1 = require("./utils.js");
// Type guards
Object.defineProperty(exports, "isAppError", { enumerable: true, get: function () { return utils_js_1.isAppError; } });
Object.defineProperty(exports, "isError", { enumerable: true, get: function () { return utils_js_1.isError; } });
Object.defineProperty(exports, "hasErrorCode", { enumerable: true, get: function () { return utils_js_1.hasErrorCode; } });
Object.defineProperty(exports, "isErrorCategory", { enumerable: true, get: function () { return utils_js_1.isErrorCategory; } });
Object.defineProperty(exports, "isOperationalError", { enumerable: true, get: function () { return utils_js_1.isOperationalError; } });
// Error transformation
Object.defineProperty(exports, "normalizeError", { enumerable: true, get: function () { return utils_js_1.normalizeError; } });
Object.defineProperty(exports, "createErrorResponse", { enumerable: true, get: function () { return utils_js_1.createErrorResponse; } });
Object.defineProperty(exports, "serializeErrorForLogging", { enumerable: true, get: function () { return utils_js_1.serializeErrorForLogging; } });
// Async utilities
Object.defineProperty(exports, "tryCatch", { enumerable: true, get: function () { return utils_js_1.tryCatch; } });
Object.defineProperty(exports, "tryCatchSync", { enumerable: true, get: function () { return utils_js_1.tryCatchSync; } });
Object.defineProperty(exports, "retryWithBackoff", { enumerable: true, get: function () { return utils_js_1.retryWithBackoff; } });
Object.defineProperty(exports, "createAsyncBoundary", { enumerable: true, get: function () { return utils_js_1.createAsyncBoundary; } });
// Assertions
Object.defineProperty(exports, "assertCondition", { enumerable: true, get: function () { return utils_js_1.assertCondition; } });
Object.defineProperty(exports, "assertDefined", { enumerable: true, get: function () { return utils_js_1.assertDefined; } });
// Factories
Object.defineProperty(exports, "createErrorFactory", { enumerable: true, get: function () { return utils_js_1.createErrorFactory; } });
// Helpers
Object.defineProperty(exports, "getUserFriendlyMessage", { enumerable: true, get: function () { return utils_js_1.getUserFriendlyMessage; } });
Object.defineProperty(exports, "shouldLogAsError", { enumerable: true, get: function () { return utils_js_1.shouldLogAsError; } });
//# sourceMappingURL=index.js.map