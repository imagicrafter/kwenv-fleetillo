/**
 * Error type definitions for RouteIQ application
 * Provides structured error types for consistent error handling
 */
/**
 * Error severity levels
 */
export declare enum ErrorSeverity {
    /** Low severity - typically user input errors that are easily recoverable */
    LOW = "low",
    /** Medium severity - operational errors that may need attention */
    MEDIUM = "medium",
    /** High severity - critical errors that need immediate attention */
    HIGH = "high",
    /** Critical severity - system-level failures */
    CRITICAL = "critical"
}
/**
 * Error category for grouping related errors
 */
export declare enum ErrorCategory {
    /** Validation errors - invalid input, schema violations */
    VALIDATION = "VALIDATION",
    /** Authentication errors - login, token issues */
    AUTHENTICATION = "AUTHENTICATION",
    /** Authorization errors - permission, access control issues */
    AUTHORIZATION = "AUTHORIZATION",
    /** Resource errors - not found, already exists */
    RESOURCE = "RESOURCE",
    /** Business logic errors - domain-specific rules */
    BUSINESS = "BUSINESS",
    /** External service errors - API, third-party failures */
    EXTERNAL = "EXTERNAL",
    /** Database errors - connection, query issues */
    DATABASE = "DATABASE",
    /** Configuration errors - missing or invalid config */
    CONFIGURATION = "CONFIGURATION",
    /** Network errors - connectivity issues */
    NETWORK = "NETWORK",
    /** Internal errors - unexpected application errors */
    INTERNAL = "INTERNAL"
}
/**
 * HTTP status codes commonly used with errors
 */
export declare enum HttpStatusCode {
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    METHOD_NOT_ALLOWED = 405,
    CONFLICT = 409,
    UNPROCESSABLE_ENTITY = 422,
    TOO_MANY_REQUESTS = 429,
    INTERNAL_SERVER_ERROR = 500,
    BAD_GATEWAY = 502,
    SERVICE_UNAVAILABLE = 503,
    GATEWAY_TIMEOUT = 504
}
/**
 * Base error context interface for additional error information
 */
export interface ErrorContext {
    /** Unique request/operation identifier for tracing */
    requestId?: string;
    /** User identifier if applicable */
    userId?: string;
    /** Resource identifier if applicable */
    resourceId?: string;
    /** Resource type (e.g., 'user', 'route', 'order') */
    resourceType?: string;
    /** Operation being performed (e.g., 'create', 'update', 'delete') */
    operation?: string;
    /** Additional metadata */
    [key: string]: unknown;
}
/**
 * Validation error detail for individual field errors
 */
export interface ValidationErrorDetail {
    /** Field that failed validation */
    field: string;
    /** Error message for this field */
    message: string;
    /** The invalid value (sanitized for security) */
    value?: unknown;
    /** Validation rule that failed */
    rule?: string;
}
/**
 * Retry configuration for transient errors
 */
export interface RetryConfig {
    /** Whether the error is retryable */
    retryable: boolean;
    /** Maximum number of retry attempts */
    maxRetries?: number;
    /** Base delay between retries in milliseconds */
    retryDelay?: number;
    /** Whether to use exponential backoff */
    exponentialBackoff?: boolean;
}
/**
 * Serialized error structure for API responses and logging
 */
export interface SerializedError {
    /** Error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND') */
    code: string;
    /** Human-readable error message */
    message: string;
    /** HTTP status code */
    statusCode: number;
    /** Error category */
    category: ErrorCategory;
    /** Error severity */
    severity: ErrorSeverity;
    /** Timestamp when the error occurred */
    timestamp: string;
    /** Request/operation ID for tracing */
    requestId?: string;
    /** Validation errors for validation failures */
    validationErrors?: ValidationErrorDetail[];
    /** Additional context (only in development) */
    context?: ErrorContext;
    /** Stack trace (only in development) */
    stack?: string;
    /** Original error message (only in development) */
    originalError?: string;
}
/**
 * Error response structure for API endpoints
 */
export interface ErrorResponse {
    /** Indicates this is an error response */
    success: false;
    /** The error details */
    error: SerializedError;
}
/**
 * Options for creating application errors
 */
export interface AppErrorOptions {
    /** Error code */
    code: string;
    /** Error message */
    message: string;
    /** HTTP status code */
    statusCode?: number;
    /** Error category */
    category?: ErrorCategory;
    /** Error severity */
    severity?: ErrorSeverity;
    /** Original error that caused this error */
    cause?: Error;
    /** Additional error context */
    context?: ErrorContext;
    /** Retry configuration */
    retry?: RetryConfig;
    /** Validation error details */
    validationErrors?: ValidationErrorDetail[];
}
/**
 * Interface for application errors
 */
export interface IAppError extends Error {
    /** Error code */
    readonly code: string;
    /** HTTP status code */
    readonly statusCode: number;
    /** Error category */
    readonly category: ErrorCategory;
    /** Error severity */
    readonly severity: ErrorSeverity;
    /** Timestamp when error was created */
    readonly timestamp: Date;
    /** Additional context */
    readonly context?: ErrorContext;
    /** Retry configuration */
    readonly retry?: RetryConfig;
    /** Validation error details */
    readonly validationErrors?: ValidationErrorDetail[];
    /** Original error */
    readonly cause?: Error;
    /** Whether this error is operational (expected) vs programming error */
    readonly isOperational: boolean;
    /** Serializes the error for response/logging */
    serialize(includeDebugInfo?: boolean): SerializedError;
    /** Converts to API error response */
    toResponse(includeDebugInfo?: boolean): ErrorResponse;
}
//# sourceMappingURL=errors.d.ts.map