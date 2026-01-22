/**
 * Error codes registry for RouteIQ application
 * Provides centralized error code definitions with associated metadata
 */
import { ErrorCategory, ErrorSeverity, HttpStatusCode, type RetryConfig } from '../types/errors';
/**
 * Error code definition with metadata
 */
export interface ErrorCodeDefinition {
    /** The error code string */
    code: string;
    /** Default error message */
    message: string;
    /** HTTP status code */
    statusCode: HttpStatusCode;
    /** Error category */
    category: ErrorCategory;
    /** Error severity */
    severity: ErrorSeverity;
    /** Default retry configuration */
    retry?: RetryConfig;
}
/**
 * Error codes organized by category
 */
export declare const ErrorCodes: {
    readonly VALIDATION_ERROR: {
        readonly code: "VALIDATION_ERROR";
        readonly message: "Validation failed";
        readonly statusCode: HttpStatusCode.BAD_REQUEST;
        readonly category: ErrorCategory.VALIDATION;
        readonly severity: ErrorSeverity.LOW;
    };
    readonly INVALID_INPUT: {
        readonly code: "INVALID_INPUT";
        readonly message: "Invalid input provided";
        readonly statusCode: HttpStatusCode.BAD_REQUEST;
        readonly category: ErrorCategory.VALIDATION;
        readonly severity: ErrorSeverity.LOW;
    };
    readonly MISSING_REQUIRED_FIELD: {
        readonly code: "MISSING_REQUIRED_FIELD";
        readonly message: "Required field is missing";
        readonly statusCode: HttpStatusCode.BAD_REQUEST;
        readonly category: ErrorCategory.VALIDATION;
        readonly severity: ErrorSeverity.LOW;
    };
    readonly INVALID_FORMAT: {
        readonly code: "INVALID_FORMAT";
        readonly message: "Invalid format";
        readonly statusCode: HttpStatusCode.BAD_REQUEST;
        readonly category: ErrorCategory.VALIDATION;
        readonly severity: ErrorSeverity.LOW;
    };
    readonly INVALID_TYPE: {
        readonly code: "INVALID_TYPE";
        readonly message: "Invalid type provided";
        readonly statusCode: HttpStatusCode.BAD_REQUEST;
        readonly category: ErrorCategory.VALIDATION;
        readonly severity: ErrorSeverity.LOW;
    };
    readonly VALUE_OUT_OF_RANGE: {
        readonly code: "VALUE_OUT_OF_RANGE";
        readonly message: "Value is out of allowed range";
        readonly statusCode: HttpStatusCode.BAD_REQUEST;
        readonly category: ErrorCategory.VALIDATION;
        readonly severity: ErrorSeverity.LOW;
    };
    readonly AUTHENTICATION_REQUIRED: {
        readonly code: "AUTHENTICATION_REQUIRED";
        readonly message: "Authentication is required";
        readonly statusCode: HttpStatusCode.UNAUTHORIZED;
        readonly category: ErrorCategory.AUTHENTICATION;
        readonly severity: ErrorSeverity.MEDIUM;
    };
    readonly INVALID_CREDENTIALS: {
        readonly code: "INVALID_CREDENTIALS";
        readonly message: "Invalid credentials provided";
        readonly statusCode: HttpStatusCode.UNAUTHORIZED;
        readonly category: ErrorCategory.AUTHENTICATION;
        readonly severity: ErrorSeverity.MEDIUM;
    };
    readonly TOKEN_EXPIRED: {
        readonly code: "TOKEN_EXPIRED";
        readonly message: "Authentication token has expired";
        readonly statusCode: HttpStatusCode.UNAUTHORIZED;
        readonly category: ErrorCategory.AUTHENTICATION;
        readonly severity: ErrorSeverity.MEDIUM;
    };
    readonly TOKEN_INVALID: {
        readonly code: "TOKEN_INVALID";
        readonly message: "Authentication token is invalid";
        readonly statusCode: HttpStatusCode.UNAUTHORIZED;
        readonly category: ErrorCategory.AUTHENTICATION;
        readonly severity: ErrorSeverity.MEDIUM;
    };
    readonly SESSION_EXPIRED: {
        readonly code: "SESSION_EXPIRED";
        readonly message: "Session has expired";
        readonly statusCode: HttpStatusCode.UNAUTHORIZED;
        readonly category: ErrorCategory.AUTHENTICATION;
        readonly severity: ErrorSeverity.MEDIUM;
    };
    readonly ACCESS_DENIED: {
        readonly code: "ACCESS_DENIED";
        readonly message: "Access denied";
        readonly statusCode: HttpStatusCode.FORBIDDEN;
        readonly category: ErrorCategory.AUTHORIZATION;
        readonly severity: ErrorSeverity.MEDIUM;
    };
    readonly INSUFFICIENT_PERMISSIONS: {
        readonly code: "INSUFFICIENT_PERMISSIONS";
        readonly message: "Insufficient permissions to perform this action";
        readonly statusCode: HttpStatusCode.FORBIDDEN;
        readonly category: ErrorCategory.AUTHORIZATION;
        readonly severity: ErrorSeverity.MEDIUM;
    };
    readonly RESOURCE_ACCESS_DENIED: {
        readonly code: "RESOURCE_ACCESS_DENIED";
        readonly message: "Access to this resource is denied";
        readonly statusCode: HttpStatusCode.FORBIDDEN;
        readonly category: ErrorCategory.AUTHORIZATION;
        readonly severity: ErrorSeverity.MEDIUM;
    };
    readonly RESOURCE_NOT_FOUND: {
        readonly code: "RESOURCE_NOT_FOUND";
        readonly message: "Resource not found";
        readonly statusCode: HttpStatusCode.NOT_FOUND;
        readonly category: ErrorCategory.RESOURCE;
        readonly severity: ErrorSeverity.LOW;
    };
    readonly RESOURCE_ALREADY_EXISTS: {
        readonly code: "RESOURCE_ALREADY_EXISTS";
        readonly message: "Resource already exists";
        readonly statusCode: HttpStatusCode.CONFLICT;
        readonly category: ErrorCategory.RESOURCE;
        readonly severity: ErrorSeverity.LOW;
    };
    readonly RESOURCE_CONFLICT: {
        readonly code: "RESOURCE_CONFLICT";
        readonly message: "Resource conflict detected";
        readonly statusCode: HttpStatusCode.CONFLICT;
        readonly category: ErrorCategory.RESOURCE;
        readonly severity: ErrorSeverity.MEDIUM;
    };
    readonly RESOURCE_LOCKED: {
        readonly code: "RESOURCE_LOCKED";
        readonly message: "Resource is locked";
        readonly statusCode: HttpStatusCode.CONFLICT;
        readonly category: ErrorCategory.RESOURCE;
        readonly severity: ErrorSeverity.MEDIUM;
    };
    readonly BUSINESS_RULE_VIOLATION: {
        readonly code: "BUSINESS_RULE_VIOLATION";
        readonly message: "Business rule violation";
        readonly statusCode: HttpStatusCode.UNPROCESSABLE_ENTITY;
        readonly category: ErrorCategory.BUSINESS;
        readonly severity: ErrorSeverity.MEDIUM;
    };
    readonly OPERATION_NOT_ALLOWED: {
        readonly code: "OPERATION_NOT_ALLOWED";
        readonly message: "Operation is not allowed";
        readonly statusCode: HttpStatusCode.UNPROCESSABLE_ENTITY;
        readonly category: ErrorCategory.BUSINESS;
        readonly severity: ErrorSeverity.MEDIUM;
    };
    readonly INVALID_STATE: {
        readonly code: "INVALID_STATE";
        readonly message: "Invalid state for this operation";
        readonly statusCode: HttpStatusCode.UNPROCESSABLE_ENTITY;
        readonly category: ErrorCategory.BUSINESS;
        readonly severity: ErrorSeverity.MEDIUM;
    };
    readonly QUOTA_EXCEEDED: {
        readonly code: "QUOTA_EXCEEDED";
        readonly message: "Quota exceeded";
        readonly statusCode: HttpStatusCode.TOO_MANY_REQUESTS;
        readonly category: ErrorCategory.BUSINESS;
        readonly severity: ErrorSeverity.MEDIUM;
    };
    readonly EXTERNAL_SERVICE_ERROR: {
        readonly code: "EXTERNAL_SERVICE_ERROR";
        readonly message: "External service error";
        readonly statusCode: HttpStatusCode.BAD_GATEWAY;
        readonly category: ErrorCategory.EXTERNAL;
        readonly severity: ErrorSeverity.HIGH;
        readonly retry: {
            readonly retryable: true;
            readonly maxRetries: 3;
            readonly retryDelay: 1000;
            readonly exponentialBackoff: true;
        };
    };
    readonly GOOGLEMAPS_API_ERROR: {
        readonly code: "GOOGLEMAPS_API_ERROR";
        readonly message: "Google Maps API error";
        readonly statusCode: HttpStatusCode.BAD_GATEWAY;
        readonly category: ErrorCategory.EXTERNAL;
        readonly severity: ErrorSeverity.HIGH;
        readonly retry: {
            readonly retryable: true;
            readonly maxRetries: 3;
            readonly retryDelay: 1000;
            readonly exponentialBackoff: true;
        };
    };
    readonly GOOGLEMAPS_QUOTA_EXCEEDED: {
        readonly code: "GOOGLEMAPS_QUOTA_EXCEEDED";
        readonly message: "Google Maps API quota exceeded";
        readonly statusCode: HttpStatusCode.TOO_MANY_REQUESTS;
        readonly category: ErrorCategory.EXTERNAL;
        readonly severity: ErrorSeverity.HIGH;
        readonly retry: {
            readonly retryable: true;
            readonly maxRetries: 2;
            readonly retryDelay: 5000;
            readonly exponentialBackoff: true;
        };
    };
    readonly GOOGLEMAPS_ZERO_RESULTS: {
        readonly code: "GOOGLEMAPS_ZERO_RESULTS";
        readonly message: "No results found for the provided address";
        readonly statusCode: HttpStatusCode.NOT_FOUND;
        readonly category: ErrorCategory.EXTERNAL;
        readonly severity: ErrorSeverity.LOW;
    };
    readonly GOOGLEMAPS_INVALID_ADDRESS: {
        readonly code: "GOOGLEMAPS_INVALID_ADDRESS";
        readonly message: "Invalid address format provided";
        readonly statusCode: HttpStatusCode.BAD_REQUEST;
        readonly category: ErrorCategory.VALIDATION;
        readonly severity: ErrorSeverity.LOW;
    };
    readonly GOOGLEMAPS_INVALID_COORDINATES: {
        readonly code: "GOOGLEMAPS_INVALID_COORDINATES";
        readonly message: "Invalid coordinates provided";
        readonly statusCode: HttpStatusCode.BAD_REQUEST;
        readonly category: ErrorCategory.VALIDATION;
        readonly severity: ErrorSeverity.LOW;
    };
    readonly GOOGLEROUTES_API_ERROR: {
        readonly code: "GOOGLEROUTES_API_ERROR";
        readonly message: "Google Routes API error";
        readonly statusCode: HttpStatusCode.BAD_GATEWAY;
        readonly category: ErrorCategory.EXTERNAL;
        readonly severity: ErrorSeverity.HIGH;
        readonly retry: {
            readonly retryable: true;
            readonly maxRetries: 3;
            readonly retryDelay: 1000;
            readonly exponentialBackoff: true;
        };
    };
    readonly GOOGLEROUTES_QUOTA_EXCEEDED: {
        readonly code: "GOOGLEROUTES_QUOTA_EXCEEDED";
        readonly message: "Google Routes API quota exceeded";
        readonly statusCode: HttpStatusCode.TOO_MANY_REQUESTS;
        readonly category: ErrorCategory.EXTERNAL;
        readonly severity: ErrorSeverity.HIGH;
        readonly retry: {
            readonly retryable: true;
            readonly maxRetries: 2;
            readonly retryDelay: 5000;
            readonly exponentialBackoff: true;
        };
    };
    readonly GOOGLEROUTES_ZERO_RESULTS: {
        readonly code: "GOOGLEROUTES_ZERO_RESULTS";
        readonly message: "No routes found for the provided waypoints";
        readonly statusCode: HttpStatusCode.NOT_FOUND;
        readonly category: ErrorCategory.EXTERNAL;
        readonly severity: ErrorSeverity.LOW;
    };
    readonly GOOGLEROUTES_INVALID_WAYPOINT: {
        readonly code: "GOOGLEROUTES_INVALID_WAYPOINT";
        readonly message: "Invalid waypoint provided";
        readonly statusCode: HttpStatusCode.BAD_REQUEST;
        readonly category: ErrorCategory.VALIDATION;
        readonly severity: ErrorSeverity.LOW;
    };
    readonly GOOGLEROUTES_MAX_WAYPOINTS_EXCEEDED: {
        readonly code: "GOOGLEROUTES_MAX_WAYPOINTS_EXCEEDED";
        readonly message: "Maximum number of waypoints exceeded";
        readonly statusCode: HttpStatusCode.BAD_REQUEST;
        readonly category: ErrorCategory.VALIDATION;
        readonly severity: ErrorSeverity.LOW;
    };
    readonly GOOGLEROUTES_MAX_ROUTE_LENGTH_EXCEEDED: {
        readonly code: "GOOGLEROUTES_MAX_ROUTE_LENGTH_EXCEEDED";
        readonly message: "Route length exceeds maximum allowed distance";
        readonly statusCode: HttpStatusCode.BAD_REQUEST;
        readonly category: ErrorCategory.VALIDATION;
        readonly severity: ErrorSeverity.LOW;
    };
    readonly GOOGLEROUTES_INVALID_REQUEST: {
        readonly code: "GOOGLEROUTES_INVALID_REQUEST";
        readonly message: "Invalid request to Google Routes API";
        readonly statusCode: HttpStatusCode.BAD_REQUEST;
        readonly category: ErrorCategory.VALIDATION;
        readonly severity: ErrorSeverity.LOW;
    };
    readonly GOOGLEROUTES_REQUEST_DENIED: {
        readonly code: "GOOGLEROUTES_REQUEST_DENIED";
        readonly message: "Google Routes API request was denied";
        readonly statusCode: HttpStatusCode.FORBIDDEN;
        readonly category: ErrorCategory.EXTERNAL;
        readonly severity: ErrorSeverity.HIGH;
    };
    readonly GOOGLEROUTES_MISSING_API_KEY: {
        readonly code: "GOOGLEROUTES_MISSING_API_KEY";
        readonly message: "Google Routes API key is not configured";
        readonly statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR;
        readonly category: ErrorCategory.CONFIGURATION;
        readonly severity: ErrorSeverity.CRITICAL;
    };
    readonly GOOGLEROUTES_TIMEOUT: {
        readonly code: "GOOGLEROUTES_TIMEOUT";
        readonly message: "Google Routes API request timed out";
        readonly statusCode: HttpStatusCode.GATEWAY_TIMEOUT;
        readonly category: ErrorCategory.EXTERNAL;
        readonly severity: ErrorSeverity.HIGH;
        readonly retry: {
            readonly retryable: true;
            readonly maxRetries: 2;
            readonly retryDelay: 2000;
            readonly exponentialBackoff: true;
        };
    };
    readonly GOOGLEROUTES_NETWORK_ERROR: {
        readonly code: "GOOGLEROUTES_NETWORK_ERROR";
        readonly message: "Network error connecting to Google Routes API";
        readonly statusCode: HttpStatusCode.SERVICE_UNAVAILABLE;
        readonly category: ErrorCategory.NETWORK;
        readonly severity: ErrorSeverity.HIGH;
        readonly retry: {
            readonly retryable: true;
            readonly maxRetries: 3;
            readonly retryDelay: 1000;
            readonly exponentialBackoff: true;
        };
    };
    readonly ROUTE_GENERATION_INVALID_INPUT: {
        readonly code: "ROUTE_GENERATION_INVALID_INPUT";
        readonly message: "Invalid input for route generation";
        readonly statusCode: HttpStatusCode.BAD_REQUEST;
        readonly category: ErrorCategory.VALIDATION;
        readonly severity: ErrorSeverity.LOW;
    };
    readonly ROUTE_GENERATION_NO_BOOKINGS: {
        readonly code: "ROUTE_GENERATION_NO_BOOKINGS";
        readonly message: "No valid bookings provided for route generation";
        readonly statusCode: HttpStatusCode.BAD_REQUEST;
        readonly category: ErrorCategory.VALIDATION;
        readonly severity: ErrorSeverity.LOW;
    };
    readonly ROUTE_GENERATION_MISSING_COORDINATES: {
        readonly code: "ROUTE_GENERATION_MISSING_COORDINATES";
        readonly message: "Booking is missing required coordinates";
        readonly statusCode: HttpStatusCode.BAD_REQUEST;
        readonly category: ErrorCategory.VALIDATION;
        readonly severity: ErrorSeverity.LOW;
    };
    readonly ROUTE_GENERATION_FETCH_BOOKING_FAILED: {
        readonly code: "ROUTE_GENERATION_FETCH_BOOKING_FAILED";
        readonly message: "Failed to fetch booking for route generation";
        readonly statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR;
        readonly category: ErrorCategory.INTERNAL;
        readonly severity: ErrorSeverity.MEDIUM;
    };
    readonly ROUTE_GENERATION_OPTIMIZATION_FAILED: {
        readonly code: "ROUTE_GENERATION_OPTIMIZATION_FAILED";
        readonly message: "Failed to optimize route";
        readonly statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR;
        readonly category: ErrorCategory.INTERNAL;
        readonly severity: ErrorSeverity.MEDIUM;
    };
    readonly ROUTE_GENERATION_BATCH_FAILED: {
        readonly code: "ROUTE_GENERATION_BATCH_FAILED";
        readonly message: "Batch route generation failed";
        readonly statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR;
        readonly category: ErrorCategory.INTERNAL;
        readonly severity: ErrorSeverity.MEDIUM;
    };
    readonly EXTERNAL_SERVICE_UNAVAILABLE: {
        readonly code: "EXTERNAL_SERVICE_UNAVAILABLE";
        readonly message: "External service is unavailable";
        readonly statusCode: HttpStatusCode.SERVICE_UNAVAILABLE;
        readonly category: ErrorCategory.EXTERNAL;
        readonly severity: ErrorSeverity.HIGH;
        readonly retry: {
            readonly retryable: true;
            readonly maxRetries: 3;
            readonly retryDelay: 2000;
            readonly exponentialBackoff: true;
        };
    };
    readonly EXTERNAL_SERVICE_TIMEOUT: {
        readonly code: "EXTERNAL_SERVICE_TIMEOUT";
        readonly message: "External service timeout";
        readonly statusCode: HttpStatusCode.GATEWAY_TIMEOUT;
        readonly category: ErrorCategory.EXTERNAL;
        readonly severity: ErrorSeverity.HIGH;
        readonly retry: {
            readonly retryable: true;
            readonly maxRetries: 2;
            readonly retryDelay: 3000;
            readonly exponentialBackoff: true;
        };
    };
    readonly DATABASE_ERROR: {
        readonly code: "DATABASE_ERROR";
        readonly message: "Database error occurred";
        readonly statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR;
        readonly category: ErrorCategory.DATABASE;
        readonly severity: ErrorSeverity.HIGH;
    };
    readonly DATABASE_CONNECTION_ERROR: {
        readonly code: "DATABASE_CONNECTION_ERROR";
        readonly message: "Database connection error";
        readonly statusCode: HttpStatusCode.SERVICE_UNAVAILABLE;
        readonly category: ErrorCategory.DATABASE;
        readonly severity: ErrorSeverity.CRITICAL;
        readonly retry: {
            readonly retryable: true;
            readonly maxRetries: 3;
            readonly retryDelay: 1000;
            readonly exponentialBackoff: true;
        };
    };
    readonly DATABASE_QUERY_ERROR: {
        readonly code: "DATABASE_QUERY_ERROR";
        readonly message: "Database query failed";
        readonly statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR;
        readonly category: ErrorCategory.DATABASE;
        readonly severity: ErrorSeverity.HIGH;
    };
    readonly DATABASE_TRANSACTION_ERROR: {
        readonly code: "DATABASE_TRANSACTION_ERROR";
        readonly message: "Database transaction failed";
        readonly statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR;
        readonly category: ErrorCategory.DATABASE;
        readonly severity: ErrorSeverity.HIGH;
        readonly retry: {
            readonly retryable: true;
            readonly maxRetries: 2;
            readonly retryDelay: 500;
            readonly exponentialBackoff: false;
        };
    };
    readonly CONFIGURATION_ERROR: {
        readonly code: "CONFIGURATION_ERROR";
        readonly message: "Configuration error";
        readonly statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR;
        readonly category: ErrorCategory.CONFIGURATION;
        readonly severity: ErrorSeverity.CRITICAL;
    };
    readonly MISSING_CONFIGURATION: {
        readonly code: "MISSING_CONFIGURATION";
        readonly message: "Required configuration is missing";
        readonly statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR;
        readonly category: ErrorCategory.CONFIGURATION;
        readonly severity: ErrorSeverity.CRITICAL;
    };
    readonly INVALID_CONFIGURATION: {
        readonly code: "INVALID_CONFIGURATION";
        readonly message: "Configuration is invalid";
        readonly statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR;
        readonly category: ErrorCategory.CONFIGURATION;
        readonly severity: ErrorSeverity.CRITICAL;
    };
    readonly NETWORK_ERROR: {
        readonly code: "NETWORK_ERROR";
        readonly message: "Network error occurred";
        readonly statusCode: HttpStatusCode.SERVICE_UNAVAILABLE;
        readonly category: ErrorCategory.NETWORK;
        readonly severity: ErrorSeverity.HIGH;
        readonly retry: {
            readonly retryable: true;
            readonly maxRetries: 3;
            readonly retryDelay: 1000;
            readonly exponentialBackoff: true;
        };
    };
    readonly CONNECTION_TIMEOUT: {
        readonly code: "CONNECTION_TIMEOUT";
        readonly message: "Connection timeout";
        readonly statusCode: HttpStatusCode.GATEWAY_TIMEOUT;
        readonly category: ErrorCategory.NETWORK;
        readonly severity: ErrorSeverity.HIGH;
        readonly retry: {
            readonly retryable: true;
            readonly maxRetries: 2;
            readonly retryDelay: 2000;
            readonly exponentialBackoff: true;
        };
    };
    readonly INTERNAL_ERROR: {
        readonly code: "INTERNAL_ERROR";
        readonly message: "An internal error occurred";
        readonly statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR;
        readonly category: ErrorCategory.INTERNAL;
        readonly severity: ErrorSeverity.HIGH;
    };
    readonly UNEXPECTED_ERROR: {
        readonly code: "UNEXPECTED_ERROR";
        readonly message: "An unexpected error occurred";
        readonly statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR;
        readonly category: ErrorCategory.INTERNAL;
        readonly severity: ErrorSeverity.HIGH;
    };
    readonly NOT_IMPLEMENTED: {
        readonly code: "NOT_IMPLEMENTED";
        readonly message: "This feature is not implemented";
        readonly statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR;
        readonly category: ErrorCategory.INTERNAL;
        readonly severity: ErrorSeverity.MEDIUM;
    };
};
/**
 * Type for all error code keys
 */
export type ErrorCodeKey = keyof typeof ErrorCodes;
/**
 * Type for error code values
 */
export type ErrorCodeValue = (typeof ErrorCodes)[ErrorCodeKey];
/**
 * Get error code definition by code string
 */
export declare function getErrorCodeDefinition(code: string): ErrorCodeDefinition | undefined;
/**
 * Get all error codes for a specific category
 */
export declare function getErrorCodesByCategory(category: ErrorCategory): ErrorCodeDefinition[];
/**
 * Get all error codes for a specific severity
 */
export declare function getErrorCodesBySeverity(severity: ErrorSeverity): ErrorCodeDefinition[];
/**
 * Check if an error code is retryable
 */
export declare function isRetryableError(code: string): boolean;
//# sourceMappingURL=codes.d.ts.map