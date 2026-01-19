"use strict";
/**
 * Error type definitions for RouteIQ application
 * Provides structured error types for consistent error handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpStatusCode = exports.ErrorCategory = exports.ErrorSeverity = void 0;
/**
 * Error severity levels
 */
var ErrorSeverity;
(function (ErrorSeverity) {
    /** Low severity - typically user input errors that are easily recoverable */
    ErrorSeverity["LOW"] = "low";
    /** Medium severity - operational errors that may need attention */
    ErrorSeverity["MEDIUM"] = "medium";
    /** High severity - critical errors that need immediate attention */
    ErrorSeverity["HIGH"] = "high";
    /** Critical severity - system-level failures */
    ErrorSeverity["CRITICAL"] = "critical";
})(ErrorSeverity || (exports.ErrorSeverity = ErrorSeverity = {}));
/**
 * Error category for grouping related errors
 */
var ErrorCategory;
(function (ErrorCategory) {
    /** Validation errors - invalid input, schema violations */
    ErrorCategory["VALIDATION"] = "VALIDATION";
    /** Authentication errors - login, token issues */
    ErrorCategory["AUTHENTICATION"] = "AUTHENTICATION";
    /** Authorization errors - permission, access control issues */
    ErrorCategory["AUTHORIZATION"] = "AUTHORIZATION";
    /** Resource errors - not found, already exists */
    ErrorCategory["RESOURCE"] = "RESOURCE";
    /** Business logic errors - domain-specific rules */
    ErrorCategory["BUSINESS"] = "BUSINESS";
    /** External service errors - API, third-party failures */
    ErrorCategory["EXTERNAL"] = "EXTERNAL";
    /** Database errors - connection, query issues */
    ErrorCategory["DATABASE"] = "DATABASE";
    /** Configuration errors - missing or invalid config */
    ErrorCategory["CONFIGURATION"] = "CONFIGURATION";
    /** Network errors - connectivity issues */
    ErrorCategory["NETWORK"] = "NETWORK";
    /** Internal errors - unexpected application errors */
    ErrorCategory["INTERNAL"] = "INTERNAL";
})(ErrorCategory || (exports.ErrorCategory = ErrorCategory = {}));
/**
 * HTTP status codes commonly used with errors
 */
var HttpStatusCode;
(function (HttpStatusCode) {
    HttpStatusCode[HttpStatusCode["BAD_REQUEST"] = 400] = "BAD_REQUEST";
    HttpStatusCode[HttpStatusCode["UNAUTHORIZED"] = 401] = "UNAUTHORIZED";
    HttpStatusCode[HttpStatusCode["FORBIDDEN"] = 403] = "FORBIDDEN";
    HttpStatusCode[HttpStatusCode["NOT_FOUND"] = 404] = "NOT_FOUND";
    HttpStatusCode[HttpStatusCode["METHOD_NOT_ALLOWED"] = 405] = "METHOD_NOT_ALLOWED";
    HttpStatusCode[HttpStatusCode["CONFLICT"] = 409] = "CONFLICT";
    HttpStatusCode[HttpStatusCode["UNPROCESSABLE_ENTITY"] = 422] = "UNPROCESSABLE_ENTITY";
    HttpStatusCode[HttpStatusCode["TOO_MANY_REQUESTS"] = 429] = "TOO_MANY_REQUESTS";
    HttpStatusCode[HttpStatusCode["INTERNAL_SERVER_ERROR"] = 500] = "INTERNAL_SERVER_ERROR";
    HttpStatusCode[HttpStatusCode["BAD_GATEWAY"] = 502] = "BAD_GATEWAY";
    HttpStatusCode[HttpStatusCode["SERVICE_UNAVAILABLE"] = 503] = "SERVICE_UNAVAILABLE";
    HttpStatusCode[HttpStatusCode["GATEWAY_TIMEOUT"] = 504] = "GATEWAY_TIMEOUT";
})(HttpStatusCode || (exports.HttpStatusCode = HttpStatusCode = {}));
//# sourceMappingURL=errors.js.map