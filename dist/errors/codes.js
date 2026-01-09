"use strict";
/**
 * Error codes registry for RouteIQ application
 * Provides centralized error code definitions with associated metadata
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCodes = void 0;
exports.getErrorCodeDefinition = getErrorCodeDefinition;
exports.getErrorCodesByCategory = getErrorCodesByCategory;
exports.getErrorCodesBySeverity = getErrorCodesBySeverity;
exports.isRetryableError = isRetryableError;
const errors_js_1 = require("../types/errors.js");
/**
 * Error codes organized by category
 */
exports.ErrorCodes = {
    // ============================================
    // Validation Errors (400)
    // ============================================
    VALIDATION_ERROR: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        statusCode: errors_js_1.HttpStatusCode.BAD_REQUEST,
        category: errors_js_1.ErrorCategory.VALIDATION,
        severity: errors_js_1.ErrorSeverity.LOW,
    },
    INVALID_INPUT: {
        code: 'INVALID_INPUT',
        message: 'Invalid input provided',
        statusCode: errors_js_1.HttpStatusCode.BAD_REQUEST,
        category: errors_js_1.ErrorCategory.VALIDATION,
        severity: errors_js_1.ErrorSeverity.LOW,
    },
    MISSING_REQUIRED_FIELD: {
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Required field is missing',
        statusCode: errors_js_1.HttpStatusCode.BAD_REQUEST,
        category: errors_js_1.ErrorCategory.VALIDATION,
        severity: errors_js_1.ErrorSeverity.LOW,
    },
    INVALID_FORMAT: {
        code: 'INVALID_FORMAT',
        message: 'Invalid format',
        statusCode: errors_js_1.HttpStatusCode.BAD_REQUEST,
        category: errors_js_1.ErrorCategory.VALIDATION,
        severity: errors_js_1.ErrorSeverity.LOW,
    },
    INVALID_TYPE: {
        code: 'INVALID_TYPE',
        message: 'Invalid type provided',
        statusCode: errors_js_1.HttpStatusCode.BAD_REQUEST,
        category: errors_js_1.ErrorCategory.VALIDATION,
        severity: errors_js_1.ErrorSeverity.LOW,
    },
    VALUE_OUT_OF_RANGE: {
        code: 'VALUE_OUT_OF_RANGE',
        message: 'Value is out of allowed range',
        statusCode: errors_js_1.HttpStatusCode.BAD_REQUEST,
        category: errors_js_1.ErrorCategory.VALIDATION,
        severity: errors_js_1.ErrorSeverity.LOW,
    },
    // ============================================
    // Authentication Errors (401)
    // ============================================
    AUTHENTICATION_REQUIRED: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required',
        statusCode: errors_js_1.HttpStatusCode.UNAUTHORIZED,
        category: errors_js_1.ErrorCategory.AUTHENTICATION,
        severity: errors_js_1.ErrorSeverity.MEDIUM,
    },
    INVALID_CREDENTIALS: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials provided',
        statusCode: errors_js_1.HttpStatusCode.UNAUTHORIZED,
        category: errors_js_1.ErrorCategory.AUTHENTICATION,
        severity: errors_js_1.ErrorSeverity.MEDIUM,
    },
    TOKEN_EXPIRED: {
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired',
        statusCode: errors_js_1.HttpStatusCode.UNAUTHORIZED,
        category: errors_js_1.ErrorCategory.AUTHENTICATION,
        severity: errors_js_1.ErrorSeverity.MEDIUM,
    },
    TOKEN_INVALID: {
        code: 'TOKEN_INVALID',
        message: 'Authentication token is invalid',
        statusCode: errors_js_1.HttpStatusCode.UNAUTHORIZED,
        category: errors_js_1.ErrorCategory.AUTHENTICATION,
        severity: errors_js_1.ErrorSeverity.MEDIUM,
    },
    SESSION_EXPIRED: {
        code: 'SESSION_EXPIRED',
        message: 'Session has expired',
        statusCode: errors_js_1.HttpStatusCode.UNAUTHORIZED,
        category: errors_js_1.ErrorCategory.AUTHENTICATION,
        severity: errors_js_1.ErrorSeverity.MEDIUM,
    },
    // ============================================
    // Authorization Errors (403)
    // ============================================
    ACCESS_DENIED: {
        code: 'ACCESS_DENIED',
        message: 'Access denied',
        statusCode: errors_js_1.HttpStatusCode.FORBIDDEN,
        category: errors_js_1.ErrorCategory.AUTHORIZATION,
        severity: errors_js_1.ErrorSeverity.MEDIUM,
    },
    INSUFFICIENT_PERMISSIONS: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Insufficient permissions to perform this action',
        statusCode: errors_js_1.HttpStatusCode.FORBIDDEN,
        category: errors_js_1.ErrorCategory.AUTHORIZATION,
        severity: errors_js_1.ErrorSeverity.MEDIUM,
    },
    RESOURCE_ACCESS_DENIED: {
        code: 'RESOURCE_ACCESS_DENIED',
        message: 'Access to this resource is denied',
        statusCode: errors_js_1.HttpStatusCode.FORBIDDEN,
        category: errors_js_1.ErrorCategory.AUTHORIZATION,
        severity: errors_js_1.ErrorSeverity.MEDIUM,
    },
    // ============================================
    // Resource Errors (404, 409)
    // ============================================
    RESOURCE_NOT_FOUND: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Resource not found',
        statusCode: errors_js_1.HttpStatusCode.NOT_FOUND,
        category: errors_js_1.ErrorCategory.RESOURCE,
        severity: errors_js_1.ErrorSeverity.LOW,
    },
    RESOURCE_ALREADY_EXISTS: {
        code: 'RESOURCE_ALREADY_EXISTS',
        message: 'Resource already exists',
        statusCode: errors_js_1.HttpStatusCode.CONFLICT,
        category: errors_js_1.ErrorCategory.RESOURCE,
        severity: errors_js_1.ErrorSeverity.LOW,
    },
    RESOURCE_CONFLICT: {
        code: 'RESOURCE_CONFLICT',
        message: 'Resource conflict detected',
        statusCode: errors_js_1.HttpStatusCode.CONFLICT,
        category: errors_js_1.ErrorCategory.RESOURCE,
        severity: errors_js_1.ErrorSeverity.MEDIUM,
    },
    RESOURCE_LOCKED: {
        code: 'RESOURCE_LOCKED',
        message: 'Resource is locked',
        statusCode: errors_js_1.HttpStatusCode.CONFLICT,
        category: errors_js_1.ErrorCategory.RESOURCE,
        severity: errors_js_1.ErrorSeverity.MEDIUM,
    },
    // ============================================
    // Business Logic Errors (422)
    // ============================================
    BUSINESS_RULE_VIOLATION: {
        code: 'BUSINESS_RULE_VIOLATION',
        message: 'Business rule violation',
        statusCode: errors_js_1.HttpStatusCode.UNPROCESSABLE_ENTITY,
        category: errors_js_1.ErrorCategory.BUSINESS,
        severity: errors_js_1.ErrorSeverity.MEDIUM,
    },
    OPERATION_NOT_ALLOWED: {
        code: 'OPERATION_NOT_ALLOWED',
        message: 'Operation is not allowed',
        statusCode: errors_js_1.HttpStatusCode.UNPROCESSABLE_ENTITY,
        category: errors_js_1.ErrorCategory.BUSINESS,
        severity: errors_js_1.ErrorSeverity.MEDIUM,
    },
    INVALID_STATE: {
        code: 'INVALID_STATE',
        message: 'Invalid state for this operation',
        statusCode: errors_js_1.HttpStatusCode.UNPROCESSABLE_ENTITY,
        category: errors_js_1.ErrorCategory.BUSINESS,
        severity: errors_js_1.ErrorSeverity.MEDIUM,
    },
    QUOTA_EXCEEDED: {
        code: 'QUOTA_EXCEEDED',
        message: 'Quota exceeded',
        statusCode: errors_js_1.HttpStatusCode.TOO_MANY_REQUESTS,
        category: errors_js_1.ErrorCategory.BUSINESS,
        severity: errors_js_1.ErrorSeverity.MEDIUM,
    },
    // ============================================
    // External Service Errors (502, 503, 504)
    // ============================================
    EXTERNAL_SERVICE_ERROR: {
        code: 'EXTERNAL_SERVICE_ERROR',
        message: 'External service error',
        statusCode: errors_js_1.HttpStatusCode.BAD_GATEWAY,
        category: errors_js_1.ErrorCategory.EXTERNAL,
        severity: errors_js_1.ErrorSeverity.HIGH,
        retry: {
            retryable: true,
            maxRetries: 3,
            retryDelay: 1000,
            exponentialBackoff: true,
        },
    },
    // ============================================
    // Google Maps API Errors
    // ============================================
    GOOGLEMAPS_API_ERROR: {
        code: 'GOOGLEMAPS_API_ERROR',
        message: 'Google Maps API error',
        statusCode: errors_js_1.HttpStatusCode.BAD_GATEWAY,
        category: errors_js_1.ErrorCategory.EXTERNAL,
        severity: errors_js_1.ErrorSeverity.HIGH,
        retry: {
            retryable: true,
            maxRetries: 3,
            retryDelay: 1000,
            exponentialBackoff: true,
        },
    },
    GOOGLEMAPS_QUOTA_EXCEEDED: {
        code: 'GOOGLEMAPS_QUOTA_EXCEEDED',
        message: 'Google Maps API quota exceeded',
        statusCode: errors_js_1.HttpStatusCode.TOO_MANY_REQUESTS,
        category: errors_js_1.ErrorCategory.EXTERNAL,
        severity: errors_js_1.ErrorSeverity.HIGH,
        retry: {
            retryable: true,
            maxRetries: 2,
            retryDelay: 5000,
            exponentialBackoff: true,
        },
    },
    GOOGLEMAPS_ZERO_RESULTS: {
        code: 'GOOGLEMAPS_ZERO_RESULTS',
        message: 'No results found for the provided address',
        statusCode: errors_js_1.HttpStatusCode.NOT_FOUND,
        category: errors_js_1.ErrorCategory.EXTERNAL,
        severity: errors_js_1.ErrorSeverity.LOW,
    },
    GOOGLEMAPS_INVALID_ADDRESS: {
        code: 'GOOGLEMAPS_INVALID_ADDRESS',
        message: 'Invalid address format provided',
        statusCode: errors_js_1.HttpStatusCode.BAD_REQUEST,
        category: errors_js_1.ErrorCategory.VALIDATION,
        severity: errors_js_1.ErrorSeverity.LOW,
    },
    GOOGLEMAPS_INVALID_COORDINATES: {
        code: 'GOOGLEMAPS_INVALID_COORDINATES',
        message: 'Invalid coordinates provided',
        statusCode: errors_js_1.HttpStatusCode.BAD_REQUEST,
        category: errors_js_1.ErrorCategory.VALIDATION,
        severity: errors_js_1.ErrorSeverity.LOW,
    },
    // ============================================
    // Google Routes API Errors
    // ============================================
    GOOGLEROUTES_API_ERROR: {
        code: 'GOOGLEROUTES_API_ERROR',
        message: 'Google Routes API error',
        statusCode: errors_js_1.HttpStatusCode.BAD_GATEWAY,
        category: errors_js_1.ErrorCategory.EXTERNAL,
        severity: errors_js_1.ErrorSeverity.HIGH,
        retry: {
            retryable: true,
            maxRetries: 3,
            retryDelay: 1000,
            exponentialBackoff: true,
        },
    },
    GOOGLEROUTES_QUOTA_EXCEEDED: {
        code: 'GOOGLEROUTES_QUOTA_EXCEEDED',
        message: 'Google Routes API quota exceeded',
        statusCode: errors_js_1.HttpStatusCode.TOO_MANY_REQUESTS,
        category: errors_js_1.ErrorCategory.EXTERNAL,
        severity: errors_js_1.ErrorSeverity.HIGH,
        retry: {
            retryable: true,
            maxRetries: 2,
            retryDelay: 5000,
            exponentialBackoff: true,
        },
    },
    GOOGLEROUTES_ZERO_RESULTS: {
        code: 'GOOGLEROUTES_ZERO_RESULTS',
        message: 'No routes found for the provided waypoints',
        statusCode: errors_js_1.HttpStatusCode.NOT_FOUND,
        category: errors_js_1.ErrorCategory.EXTERNAL,
        severity: errors_js_1.ErrorSeverity.LOW,
    },
    GOOGLEROUTES_INVALID_WAYPOINT: {
        code: 'GOOGLEROUTES_INVALID_WAYPOINT',
        message: 'Invalid waypoint provided',
        statusCode: errors_js_1.HttpStatusCode.BAD_REQUEST,
        category: errors_js_1.ErrorCategory.VALIDATION,
        severity: errors_js_1.ErrorSeverity.LOW,
    },
    GOOGLEROUTES_MAX_WAYPOINTS_EXCEEDED: {
        code: 'GOOGLEROUTES_MAX_WAYPOINTS_EXCEEDED',
        message: 'Maximum number of waypoints exceeded',
        statusCode: errors_js_1.HttpStatusCode.BAD_REQUEST,
        category: errors_js_1.ErrorCategory.VALIDATION,
        severity: errors_js_1.ErrorSeverity.LOW,
    },
    GOOGLEROUTES_MAX_ROUTE_LENGTH_EXCEEDED: {
        code: 'GOOGLEROUTES_MAX_ROUTE_LENGTH_EXCEEDED',
        message: 'Route length exceeds maximum allowed distance',
        statusCode: errors_js_1.HttpStatusCode.BAD_REQUEST,
        category: errors_js_1.ErrorCategory.VALIDATION,
        severity: errors_js_1.ErrorSeverity.LOW,
    },
    GOOGLEROUTES_INVALID_REQUEST: {
        code: 'GOOGLEROUTES_INVALID_REQUEST',
        message: 'Invalid request to Google Routes API',
        statusCode: errors_js_1.HttpStatusCode.BAD_REQUEST,
        category: errors_js_1.ErrorCategory.VALIDATION,
        severity: errors_js_1.ErrorSeverity.LOW,
    },
    GOOGLEROUTES_REQUEST_DENIED: {
        code: 'GOOGLEROUTES_REQUEST_DENIED',
        message: 'Google Routes API request was denied',
        statusCode: errors_js_1.HttpStatusCode.FORBIDDEN,
        category: errors_js_1.ErrorCategory.EXTERNAL,
        severity: errors_js_1.ErrorSeverity.HIGH,
    },
    GOOGLEROUTES_MISSING_API_KEY: {
        code: 'GOOGLEROUTES_MISSING_API_KEY',
        message: 'Google Routes API key is not configured',
        statusCode: errors_js_1.HttpStatusCode.INTERNAL_SERVER_ERROR,
        category: errors_js_1.ErrorCategory.CONFIGURATION,
        severity: errors_js_1.ErrorSeverity.CRITICAL,
    },
    GOOGLEROUTES_TIMEOUT: {
        code: 'GOOGLEROUTES_TIMEOUT',
        message: 'Google Routes API request timed out',
        statusCode: errors_js_1.HttpStatusCode.GATEWAY_TIMEOUT,
        category: errors_js_1.ErrorCategory.EXTERNAL,
        severity: errors_js_1.ErrorSeverity.HIGH,
        retry: {
            retryable: true,
            maxRetries: 2,
            retryDelay: 2000,
            exponentialBackoff: true,
        },
    },
    GOOGLEROUTES_NETWORK_ERROR: {
        code: 'GOOGLEROUTES_NETWORK_ERROR',
        message: 'Network error connecting to Google Routes API',
        statusCode: errors_js_1.HttpStatusCode.SERVICE_UNAVAILABLE,
        category: errors_js_1.ErrorCategory.NETWORK,
        severity: errors_js_1.ErrorSeverity.HIGH,
        retry: {
            retryable: true,
            maxRetries: 3,
            retryDelay: 1000,
            exponentialBackoff: true,
        },
    },
    // ============================================
    // Route Generation Service Errors
    // ============================================
    ROUTE_GENERATION_INVALID_INPUT: {
        code: 'ROUTE_GENERATION_INVALID_INPUT',
        message: 'Invalid input for route generation',
        statusCode: errors_js_1.HttpStatusCode.BAD_REQUEST,
        category: errors_js_1.ErrorCategory.VALIDATION,
        severity: errors_js_1.ErrorSeverity.LOW,
    },
    ROUTE_GENERATION_NO_BOOKINGS: {
        code: 'ROUTE_GENERATION_NO_BOOKINGS',
        message: 'No valid bookings provided for route generation',
        statusCode: errors_js_1.HttpStatusCode.BAD_REQUEST,
        category: errors_js_1.ErrorCategory.VALIDATION,
        severity: errors_js_1.ErrorSeverity.LOW,
    },
    ROUTE_GENERATION_MISSING_COORDINATES: {
        code: 'ROUTE_GENERATION_MISSING_COORDINATES',
        message: 'Booking is missing required coordinates',
        statusCode: errors_js_1.HttpStatusCode.BAD_REQUEST,
        category: errors_js_1.ErrorCategory.VALIDATION,
        severity: errors_js_1.ErrorSeverity.LOW,
    },
    ROUTE_GENERATION_FETCH_BOOKING_FAILED: {
        code: 'ROUTE_GENERATION_FETCH_BOOKING_FAILED',
        message: 'Failed to fetch booking for route generation',
        statusCode: errors_js_1.HttpStatusCode.INTERNAL_SERVER_ERROR,
        category: errors_js_1.ErrorCategory.INTERNAL,
        severity: errors_js_1.ErrorSeverity.MEDIUM,
    },
    ROUTE_GENERATION_OPTIMIZATION_FAILED: {
        code: 'ROUTE_GENERATION_OPTIMIZATION_FAILED',
        message: 'Failed to optimize route',
        statusCode: errors_js_1.HttpStatusCode.INTERNAL_SERVER_ERROR,
        category: errors_js_1.ErrorCategory.INTERNAL,
        severity: errors_js_1.ErrorSeverity.MEDIUM,
    },
    ROUTE_GENERATION_BATCH_FAILED: {
        code: 'ROUTE_GENERATION_BATCH_FAILED',
        message: 'Batch route generation failed',
        statusCode: errors_js_1.HttpStatusCode.INTERNAL_SERVER_ERROR,
        category: errors_js_1.ErrorCategory.INTERNAL,
        severity: errors_js_1.ErrorSeverity.MEDIUM,
    },
    EXTERNAL_SERVICE_UNAVAILABLE: {
        code: 'EXTERNAL_SERVICE_UNAVAILABLE',
        message: 'External service is unavailable',
        statusCode: errors_js_1.HttpStatusCode.SERVICE_UNAVAILABLE,
        category: errors_js_1.ErrorCategory.EXTERNAL,
        severity: errors_js_1.ErrorSeverity.HIGH,
        retry: {
            retryable: true,
            maxRetries: 3,
            retryDelay: 2000,
            exponentialBackoff: true,
        },
    },
    EXTERNAL_SERVICE_TIMEOUT: {
        code: 'EXTERNAL_SERVICE_TIMEOUT',
        message: 'External service timeout',
        statusCode: errors_js_1.HttpStatusCode.GATEWAY_TIMEOUT,
        category: errors_js_1.ErrorCategory.EXTERNAL,
        severity: errors_js_1.ErrorSeverity.HIGH,
        retry: {
            retryable: true,
            maxRetries: 2,
            retryDelay: 3000,
            exponentialBackoff: true,
        },
    },
    // ============================================
    // Database Errors (500, 503)
    // ============================================
    DATABASE_ERROR: {
        code: 'DATABASE_ERROR',
        message: 'Database error occurred',
        statusCode: errors_js_1.HttpStatusCode.INTERNAL_SERVER_ERROR,
        category: errors_js_1.ErrorCategory.DATABASE,
        severity: errors_js_1.ErrorSeverity.HIGH,
    },
    DATABASE_CONNECTION_ERROR: {
        code: 'DATABASE_CONNECTION_ERROR',
        message: 'Database connection error',
        statusCode: errors_js_1.HttpStatusCode.SERVICE_UNAVAILABLE,
        category: errors_js_1.ErrorCategory.DATABASE,
        severity: errors_js_1.ErrorSeverity.CRITICAL,
        retry: {
            retryable: true,
            maxRetries: 3,
            retryDelay: 1000,
            exponentialBackoff: true,
        },
    },
    DATABASE_QUERY_ERROR: {
        code: 'DATABASE_QUERY_ERROR',
        message: 'Database query failed',
        statusCode: errors_js_1.HttpStatusCode.INTERNAL_SERVER_ERROR,
        category: errors_js_1.ErrorCategory.DATABASE,
        severity: errors_js_1.ErrorSeverity.HIGH,
    },
    DATABASE_TRANSACTION_ERROR: {
        code: 'DATABASE_TRANSACTION_ERROR',
        message: 'Database transaction failed',
        statusCode: errors_js_1.HttpStatusCode.INTERNAL_SERVER_ERROR,
        category: errors_js_1.ErrorCategory.DATABASE,
        severity: errors_js_1.ErrorSeverity.HIGH,
        retry: {
            retryable: true,
            maxRetries: 2,
            retryDelay: 500,
            exponentialBackoff: false,
        },
    },
    // ============================================
    // Configuration Errors (500)
    // ============================================
    CONFIGURATION_ERROR: {
        code: 'CONFIGURATION_ERROR',
        message: 'Configuration error',
        statusCode: errors_js_1.HttpStatusCode.INTERNAL_SERVER_ERROR,
        category: errors_js_1.ErrorCategory.CONFIGURATION,
        severity: errors_js_1.ErrorSeverity.CRITICAL,
    },
    MISSING_CONFIGURATION: {
        code: 'MISSING_CONFIGURATION',
        message: 'Required configuration is missing',
        statusCode: errors_js_1.HttpStatusCode.INTERNAL_SERVER_ERROR,
        category: errors_js_1.ErrorCategory.CONFIGURATION,
        severity: errors_js_1.ErrorSeverity.CRITICAL,
    },
    INVALID_CONFIGURATION: {
        code: 'INVALID_CONFIGURATION',
        message: 'Configuration is invalid',
        statusCode: errors_js_1.HttpStatusCode.INTERNAL_SERVER_ERROR,
        category: errors_js_1.ErrorCategory.CONFIGURATION,
        severity: errors_js_1.ErrorSeverity.CRITICAL,
    },
    // ============================================
    // Network Errors (503, 504)
    // ============================================
    NETWORK_ERROR: {
        code: 'NETWORK_ERROR',
        message: 'Network error occurred',
        statusCode: errors_js_1.HttpStatusCode.SERVICE_UNAVAILABLE,
        category: errors_js_1.ErrorCategory.NETWORK,
        severity: errors_js_1.ErrorSeverity.HIGH,
        retry: {
            retryable: true,
            maxRetries: 3,
            retryDelay: 1000,
            exponentialBackoff: true,
        },
    },
    CONNECTION_TIMEOUT: {
        code: 'CONNECTION_TIMEOUT',
        message: 'Connection timeout',
        statusCode: errors_js_1.HttpStatusCode.GATEWAY_TIMEOUT,
        category: errors_js_1.ErrorCategory.NETWORK,
        severity: errors_js_1.ErrorSeverity.HIGH,
        retry: {
            retryable: true,
            maxRetries: 2,
            retryDelay: 2000,
            exponentialBackoff: true,
        },
    },
    // ============================================
    // Internal Errors (500)
    // ============================================
    INTERNAL_ERROR: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        statusCode: errors_js_1.HttpStatusCode.INTERNAL_SERVER_ERROR,
        category: errors_js_1.ErrorCategory.INTERNAL,
        severity: errors_js_1.ErrorSeverity.HIGH,
    },
    UNEXPECTED_ERROR: {
        code: 'UNEXPECTED_ERROR',
        message: 'An unexpected error occurred',
        statusCode: errors_js_1.HttpStatusCode.INTERNAL_SERVER_ERROR,
        category: errors_js_1.ErrorCategory.INTERNAL,
        severity: errors_js_1.ErrorSeverity.HIGH,
    },
    NOT_IMPLEMENTED: {
        code: 'NOT_IMPLEMENTED',
        message: 'This feature is not implemented',
        statusCode: errors_js_1.HttpStatusCode.INTERNAL_SERVER_ERROR,
        category: errors_js_1.ErrorCategory.INTERNAL,
        severity: errors_js_1.ErrorSeverity.MEDIUM,
    },
};
/**
 * Get error code definition by code string
 */
function getErrorCodeDefinition(code) {
    return Object.values(exports.ErrorCodes).find(def => def.code === code);
}
/**
 * Get all error codes for a specific category
 */
function getErrorCodesByCategory(category) {
    return Object.values(exports.ErrorCodes).filter(def => def.category === category);
}
/**
 * Get all error codes for a specific severity
 */
function getErrorCodesBySeverity(severity) {
    return Object.values(exports.ErrorCodes).filter(def => def.severity === severity);
}
/**
 * Check if an error code is retryable
 */
function isRetryableError(code) {
    const definition = getErrorCodeDefinition(code);
    return definition?.retry?.retryable ?? false;
}
//# sourceMappingURL=codes.js.map