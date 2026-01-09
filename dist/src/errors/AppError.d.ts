/**
 * Base application error class for RouteIQ
 * Provides structured error handling with codes, categories, and serialization
 */
import { ErrorCategory, ErrorSeverity, type ErrorContext, type RetryConfig, type SerializedError, type ErrorResponse, type ValidationErrorDetail, type IAppError, type AppErrorOptions } from '../types/errors.js';
import { type ErrorCodeDefinition } from './codes.js';
/**
 * Base application error class
 * All custom errors in the application should extend this class
 */
export declare class AppError extends Error implements IAppError {
    readonly code: string;
    readonly statusCode: number;
    readonly category: ErrorCategory;
    readonly severity: ErrorSeverity;
    readonly timestamp: Date;
    readonly context?: ErrorContext;
    readonly retry?: RetryConfig;
    readonly validationErrors?: ValidationErrorDetail[];
    readonly cause?: Error;
    readonly isOperational: boolean;
    constructor(options: AppErrorOptions);
    /**
     * Create an AppError from an error code definition
     */
    static fromCode(codeDefinition: ErrorCodeDefinition, overrides?: Partial<AppErrorOptions>): AppError;
    /**
     * Wrap an unknown error in an AppError
     */
    static wrap(error: unknown, codeDefinition?: ErrorCodeDefinition): AppError;
    /**
     * Serialize the error for API responses and logging
     */
    serialize(includeDebugInfo?: boolean): SerializedError;
    /**
     * Convert to API error response format
     */
    toResponse(includeDebugInfo?: boolean): ErrorResponse;
    /**
     * Convert to JSON (for logging)
     */
    toJSON(): SerializedError;
    /**
     * Check if this error is a specific error code
     */
    is(codeDefinition: ErrorCodeDefinition): boolean;
    /**
     * Check if this error belongs to a specific category
     */
    isCategory(category: ErrorCategory): boolean;
    /**
     * Check if this error is retryable
     */
    isRetryable(): boolean;
    /**
     * Add context to the error
     */
    withContext(context: ErrorContext): AppError;
    /**
     * Add a request ID to the error context
     */
    withRequestId(requestId: string): AppError;
}
/**
 * Validation error for input validation failures
 */
export declare class ValidationError extends AppError {
    constructor(message: string, validationErrors?: ValidationErrorDetail[], context?: ErrorContext);
    /**
     * Create a validation error for a single field
     */
    static forField(field: string, message: string, value?: unknown): ValidationError;
    /**
     * Create a validation error for multiple fields
     */
    static forFields(errors: ValidationErrorDetail[]): ValidationError;
    /**
     * Create a validation error for a missing required field
     */
    static missingField(field: string): ValidationError;
}
/**
 * Authentication error for auth-related failures
 */
export declare class AuthenticationError extends AppError {
    constructor(message?: string, code?: ErrorCodeDefinition, context?: ErrorContext);
    static invalidCredentials(): AuthenticationError;
    static tokenExpired(): AuthenticationError;
    static tokenInvalid(): AuthenticationError;
    static sessionExpired(): AuthenticationError;
}
/**
 * Authorization error for permission-related failures
 */
export declare class AuthorizationError extends AppError {
    constructor(message?: string, code?: ErrorCodeDefinition, context?: ErrorContext);
    static accessDenied(resource?: string): AuthorizationError;
    static insufficientPermissions(requiredPermission?: string): AuthorizationError;
}
/**
 * Resource error for resource-related failures (not found, conflicts)
 */
export declare class ResourceError extends AppError {
    constructor(message: string, code: ErrorCodeDefinition, context?: ErrorContext);
    static notFound(resourceType: string, resourceId?: string): ResourceError;
    static alreadyExists(resourceType: string, identifier?: string): ResourceError;
    static conflict(resourceType: string, reason?: string): ResourceError;
}
/**
 * Business logic error for domain-specific rule violations
 */
export declare class BusinessError extends AppError {
    constructor(message: string, code?: ErrorCodeDefinition, context?: ErrorContext);
    static ruleViolation(rule: string, details?: string): BusinessError;
    static invalidState(currentState: string, expectedState?: string): BusinessError;
    static quotaExceeded(resource: string, limit?: number): BusinessError;
}
/**
 * External service error for third-party service failures
 */
export declare class ExternalServiceError extends AppError {
    constructor(serviceName: string, message?: string, code?: ErrorCodeDefinition, cause?: Error, context?: ErrorContext);
    static unavailable(serviceName: string, cause?: Error): ExternalServiceError;
    static timeout(serviceName: string, cause?: Error): ExternalServiceError;
}
/**
 * Database error for database-related failures
 */
export declare class DatabaseError extends AppError {
    constructor(message: string, code?: ErrorCodeDefinition, cause?: Error, context?: ErrorContext);
    static connectionError(cause?: Error): DatabaseError;
    static queryError(query?: string, cause?: Error): DatabaseError;
    static transactionError(cause?: Error): DatabaseError;
}
/**
 * Configuration error for config-related failures
 */
export declare class ConfigurationError extends AppError {
    constructor(message: string, code?: ErrorCodeDefinition, context?: ErrorContext);
    static missing(configKey: string): ConfigurationError;
    static invalid(configKey: string, reason?: string): ConfigurationError;
}
/**
 * Network error for connectivity issues
 */
export declare class NetworkError extends AppError {
    constructor(message: string, code?: ErrorCodeDefinition, cause?: Error, context?: ErrorContext);
    static connectionTimeout(host?: string, cause?: Error): NetworkError;
}
/**
 * Internal error for unexpected application errors
 */
export declare class InternalError extends AppError {
    constructor(message?: string, cause?: Error, context?: ErrorContext);
    static unexpected(cause?: Error): InternalError;
    static notImplemented(feature?: string): InternalError;
}
//# sourceMappingURL=AppError.d.ts.map