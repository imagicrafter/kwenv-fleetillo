/**
 * Error codes registry for RouteIQ application
 * Provides centralized error code definitions with associated metadata
 */

import { ErrorCategory, ErrorSeverity, HttpStatusCode, type RetryConfig } from '../types/errors.js';

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
export const ErrorCodes = {
  // ============================================
  // Validation Errors (400)
  // ============================================
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    statusCode: HttpStatusCode.BAD_REQUEST,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
  },
  INVALID_INPUT: {
    code: 'INVALID_INPUT',
    message: 'Invalid input provided',
    statusCode: HttpStatusCode.BAD_REQUEST,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
  },
  MISSING_REQUIRED_FIELD: {
    code: 'MISSING_REQUIRED_FIELD',
    message: 'Required field is missing',
    statusCode: HttpStatusCode.BAD_REQUEST,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
  },
  INVALID_FORMAT: {
    code: 'INVALID_FORMAT',
    message: 'Invalid format',
    statusCode: HttpStatusCode.BAD_REQUEST,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
  },
  INVALID_TYPE: {
    code: 'INVALID_TYPE',
    message: 'Invalid type provided',
    statusCode: HttpStatusCode.BAD_REQUEST,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
  },
  VALUE_OUT_OF_RANGE: {
    code: 'VALUE_OUT_OF_RANGE',
    message: 'Value is out of allowed range',
    statusCode: HttpStatusCode.BAD_REQUEST,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
  },

  // ============================================
  // Authentication Errors (401)
  // ============================================
  AUTHENTICATION_REQUIRED: {
    code: 'AUTHENTICATION_REQUIRED',
    message: 'Authentication is required',
    statusCode: HttpStatusCode.UNAUTHORIZED,
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
  },
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid credentials provided',
    statusCode: HttpStatusCode.UNAUTHORIZED,
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
  },
  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED',
    message: 'Authentication token has expired',
    statusCode: HttpStatusCode.UNAUTHORIZED,
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
  },
  TOKEN_INVALID: {
    code: 'TOKEN_INVALID',
    message: 'Authentication token is invalid',
    statusCode: HttpStatusCode.UNAUTHORIZED,
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
  },
  SESSION_EXPIRED: {
    code: 'SESSION_EXPIRED',
    message: 'Session has expired',
    statusCode: HttpStatusCode.UNAUTHORIZED,
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
  },

  // ============================================
  // Authorization Errors (403)
  // ============================================
  ACCESS_DENIED: {
    code: 'ACCESS_DENIED',
    message: 'Access denied',
    statusCode: HttpStatusCode.FORBIDDEN,
    category: ErrorCategory.AUTHORIZATION,
    severity: ErrorSeverity.MEDIUM,
  },
  INSUFFICIENT_PERMISSIONS: {
    code: 'INSUFFICIENT_PERMISSIONS',
    message: 'Insufficient permissions to perform this action',
    statusCode: HttpStatusCode.FORBIDDEN,
    category: ErrorCategory.AUTHORIZATION,
    severity: ErrorSeverity.MEDIUM,
  },
  RESOURCE_ACCESS_DENIED: {
    code: 'RESOURCE_ACCESS_DENIED',
    message: 'Access to this resource is denied',
    statusCode: HttpStatusCode.FORBIDDEN,
    category: ErrorCategory.AUTHORIZATION,
    severity: ErrorSeverity.MEDIUM,
  },

  // ============================================
  // Resource Errors (404, 409)
  // ============================================
  RESOURCE_NOT_FOUND: {
    code: 'RESOURCE_NOT_FOUND',
    message: 'Resource not found',
    statusCode: HttpStatusCode.NOT_FOUND,
    category: ErrorCategory.RESOURCE,
    severity: ErrorSeverity.LOW,
  },
  RESOURCE_ALREADY_EXISTS: {
    code: 'RESOURCE_ALREADY_EXISTS',
    message: 'Resource already exists',
    statusCode: HttpStatusCode.CONFLICT,
    category: ErrorCategory.RESOURCE,
    severity: ErrorSeverity.LOW,
  },
  RESOURCE_CONFLICT: {
    code: 'RESOURCE_CONFLICT',
    message: 'Resource conflict detected',
    statusCode: HttpStatusCode.CONFLICT,
    category: ErrorCategory.RESOURCE,
    severity: ErrorSeverity.MEDIUM,
  },
  RESOURCE_LOCKED: {
    code: 'RESOURCE_LOCKED',
    message: 'Resource is locked',
    statusCode: HttpStatusCode.CONFLICT,
    category: ErrorCategory.RESOURCE,
    severity: ErrorSeverity.MEDIUM,
  },

  // ============================================
  // Business Logic Errors (422)
  // ============================================
  BUSINESS_RULE_VIOLATION: {
    code: 'BUSINESS_RULE_VIOLATION',
    message: 'Business rule violation',
    statusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.MEDIUM,
  },
  OPERATION_NOT_ALLOWED: {
    code: 'OPERATION_NOT_ALLOWED',
    message: 'Operation is not allowed',
    statusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.MEDIUM,
  },
  INVALID_STATE: {
    code: 'INVALID_STATE',
    message: 'Invalid state for this operation',
    statusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.MEDIUM,
  },
  QUOTA_EXCEEDED: {
    code: 'QUOTA_EXCEEDED',
    message: 'Quota exceeded',
    statusCode: HttpStatusCode.TOO_MANY_REQUESTS,
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.MEDIUM,
  },

  // ============================================
  // External Service Errors (502, 503, 504)
  // ============================================
  EXTERNAL_SERVICE_ERROR: {
    code: 'EXTERNAL_SERVICE_ERROR',
    message: 'External service error',
    statusCode: HttpStatusCode.BAD_GATEWAY,
    category: ErrorCategory.EXTERNAL,
    severity: ErrorSeverity.HIGH,
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
    statusCode: HttpStatusCode.BAD_GATEWAY,
    category: ErrorCategory.EXTERNAL,
    severity: ErrorSeverity.HIGH,
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
    statusCode: HttpStatusCode.TOO_MANY_REQUESTS,
    category: ErrorCategory.EXTERNAL,
    severity: ErrorSeverity.HIGH,
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
    statusCode: HttpStatusCode.NOT_FOUND,
    category: ErrorCategory.EXTERNAL,
    severity: ErrorSeverity.LOW,
  },
  GOOGLEMAPS_INVALID_ADDRESS: {
    code: 'GOOGLEMAPS_INVALID_ADDRESS',
    message: 'Invalid address format provided',
    statusCode: HttpStatusCode.BAD_REQUEST,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
  },
  GOOGLEMAPS_INVALID_COORDINATES: {
    code: 'GOOGLEMAPS_INVALID_COORDINATES',
    message: 'Invalid coordinates provided',
    statusCode: HttpStatusCode.BAD_REQUEST,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
  },

  // ============================================
  // Google Routes API Errors
  // ============================================
  GOOGLEROUTES_API_ERROR: {
    code: 'GOOGLEROUTES_API_ERROR',
    message: 'Google Routes API error',
    statusCode: HttpStatusCode.BAD_GATEWAY,
    category: ErrorCategory.EXTERNAL,
    severity: ErrorSeverity.HIGH,
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
    statusCode: HttpStatusCode.TOO_MANY_REQUESTS,
    category: ErrorCategory.EXTERNAL,
    severity: ErrorSeverity.HIGH,
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
    statusCode: HttpStatusCode.NOT_FOUND,
    category: ErrorCategory.EXTERNAL,
    severity: ErrorSeverity.LOW,
  },
  GOOGLEROUTES_INVALID_WAYPOINT: {
    code: 'GOOGLEROUTES_INVALID_WAYPOINT',
    message: 'Invalid waypoint provided',
    statusCode: HttpStatusCode.BAD_REQUEST,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
  },
  GOOGLEROUTES_MAX_WAYPOINTS_EXCEEDED: {
    code: 'GOOGLEROUTES_MAX_WAYPOINTS_EXCEEDED',
    message: 'Maximum number of waypoints exceeded',
    statusCode: HttpStatusCode.BAD_REQUEST,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
  },
  GOOGLEROUTES_MAX_ROUTE_LENGTH_EXCEEDED: {
    code: 'GOOGLEROUTES_MAX_ROUTE_LENGTH_EXCEEDED',
    message: 'Route length exceeds maximum allowed distance',
    statusCode: HttpStatusCode.BAD_REQUEST,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
  },
  GOOGLEROUTES_INVALID_REQUEST: {
    code: 'GOOGLEROUTES_INVALID_REQUEST',
    message: 'Invalid request to Google Routes API',
    statusCode: HttpStatusCode.BAD_REQUEST,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
  },
  GOOGLEROUTES_REQUEST_DENIED: {
    code: 'GOOGLEROUTES_REQUEST_DENIED',
    message: 'Google Routes API request was denied',
    statusCode: HttpStatusCode.FORBIDDEN,
    category: ErrorCategory.EXTERNAL,
    severity: ErrorSeverity.HIGH,
  },
  GOOGLEROUTES_MISSING_API_KEY: {
    code: 'GOOGLEROUTES_MISSING_API_KEY',
    message: 'Google Routes API key is not configured',
    statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.CONFIGURATION,
    severity: ErrorSeverity.CRITICAL,
  },
  GOOGLEROUTES_TIMEOUT: {
    code: 'GOOGLEROUTES_TIMEOUT',
    message: 'Google Routes API request timed out',
    statusCode: HttpStatusCode.GATEWAY_TIMEOUT,
    category: ErrorCategory.EXTERNAL,
    severity: ErrorSeverity.HIGH,
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
    statusCode: HttpStatusCode.SERVICE_UNAVAILABLE,
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.HIGH,
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
    statusCode: HttpStatusCode.BAD_REQUEST,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
  },
  ROUTE_GENERATION_NO_BOOKINGS: {
    code: 'ROUTE_GENERATION_NO_BOOKINGS',
    message: 'No valid bookings provided for route generation',
    statusCode: HttpStatusCode.BAD_REQUEST,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
  },
  ROUTE_GENERATION_MISSING_COORDINATES: {
    code: 'ROUTE_GENERATION_MISSING_COORDINATES',
    message: 'Booking is missing required coordinates',
    statusCode: HttpStatusCode.BAD_REQUEST,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
  },
  ROUTE_GENERATION_FETCH_BOOKING_FAILED: {
    code: 'ROUTE_GENERATION_FETCH_BOOKING_FAILED',
    message: 'Failed to fetch booking for route generation',
    statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTERNAL,
    severity: ErrorSeverity.MEDIUM,
  },
  ROUTE_GENERATION_OPTIMIZATION_FAILED: {
    code: 'ROUTE_GENERATION_OPTIMIZATION_FAILED',
    message: 'Failed to optimize route',
    statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTERNAL,
    severity: ErrorSeverity.MEDIUM,
  },
  ROUTE_GENERATION_BATCH_FAILED: {
    code: 'ROUTE_GENERATION_BATCH_FAILED',
    message: 'Batch route generation failed',
    statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTERNAL,
    severity: ErrorSeverity.MEDIUM,
  },

  EXTERNAL_SERVICE_UNAVAILABLE: {
    code: 'EXTERNAL_SERVICE_UNAVAILABLE',
    message: 'External service is unavailable',
    statusCode: HttpStatusCode.SERVICE_UNAVAILABLE,
    category: ErrorCategory.EXTERNAL,
    severity: ErrorSeverity.HIGH,
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
    statusCode: HttpStatusCode.GATEWAY_TIMEOUT,
    category: ErrorCategory.EXTERNAL,
    severity: ErrorSeverity.HIGH,
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
    statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.HIGH,
  },
  DATABASE_CONNECTION_ERROR: {
    code: 'DATABASE_CONNECTION_ERROR',
    message: 'Database connection error',
    statusCode: HttpStatusCode.SERVICE_UNAVAILABLE,
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.CRITICAL,
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
    statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.HIGH,
  },
  DATABASE_TRANSACTION_ERROR: {
    code: 'DATABASE_TRANSACTION_ERROR',
    message: 'Database transaction failed',
    statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.HIGH,
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
    statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.CONFIGURATION,
    severity: ErrorSeverity.CRITICAL,
  },
  MISSING_CONFIGURATION: {
    code: 'MISSING_CONFIGURATION',
    message: 'Required configuration is missing',
    statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.CONFIGURATION,
    severity: ErrorSeverity.CRITICAL,
  },
  INVALID_CONFIGURATION: {
    code: 'INVALID_CONFIGURATION',
    message: 'Configuration is invalid',
    statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.CONFIGURATION,
    severity: ErrorSeverity.CRITICAL,
  },

  // ============================================
  // Network Errors (503, 504)
  // ============================================
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network error occurred',
    statusCode: HttpStatusCode.SERVICE_UNAVAILABLE,
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.HIGH,
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
    statusCode: HttpStatusCode.GATEWAY_TIMEOUT,
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.HIGH,
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
    statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTERNAL,
    severity: ErrorSeverity.HIGH,
  },
  UNEXPECTED_ERROR: {
    code: 'UNEXPECTED_ERROR',
    message: 'An unexpected error occurred',
    statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTERNAL,
    severity: ErrorSeverity.HIGH,
  },
  NOT_IMPLEMENTED: {
    code: 'NOT_IMPLEMENTED',
    message: 'This feature is not implemented',
    statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTERNAL,
    severity: ErrorSeverity.MEDIUM,
  },
} as const;

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
export function getErrorCodeDefinition(code: string): ErrorCodeDefinition | undefined {
  return Object.values(ErrorCodes).find(def => def.code === code);
}

/**
 * Get all error codes for a specific category
 */
export function getErrorCodesByCategory(category: ErrorCategory): ErrorCodeDefinition[] {
  return Object.values(ErrorCodes).filter(def => def.category === category);
}

/**
 * Get all error codes for a specific severity
 */
export function getErrorCodesBySeverity(severity: ErrorSeverity): ErrorCodeDefinition[] {
  return Object.values(ErrorCodes).filter(def => def.severity === severity);
}

/**
 * Check if an error code is retryable
 */
export function isRetryableError(code: string): boolean {
  const definition = getErrorCodeDefinition(code);
  return definition?.retry?.retryable ?? false;
}
