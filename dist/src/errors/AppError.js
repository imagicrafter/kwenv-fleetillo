"use strict";
/**
 * Base application error class for RouteIQ
 * Provides structured error handling with codes, categories, and serialization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalError = exports.NetworkError = exports.ConfigurationError = exports.DatabaseError = exports.ExternalServiceError = exports.BusinessError = exports.ResourceError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
const errors_1 = require("../types/errors");
const codes_1 = require("./codes");
/**
 * Base application error class
 * All custom errors in the application should extend this class
 */
class AppError extends Error {
    code;
    statusCode;
    category;
    severity;
    timestamp;
    context;
    retry;
    validationErrors;
    cause;
    isOperational;
    constructor(options) {
        super(options.message);
        // Maintain proper prototype chain
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = this.constructor.name;
        this.code = options.code;
        this.statusCode = options.statusCode ?? errors_1.HttpStatusCode.INTERNAL_SERVER_ERROR;
        this.category = options.category ?? errors_1.ErrorCategory.INTERNAL;
        this.severity = options.severity ?? errors_1.ErrorSeverity.MEDIUM;
        this.timestamp = new Date();
        this.context = options.context;
        this.retry = options.retry;
        this.validationErrors = options.validationErrors;
        this.cause = options.cause;
        // Operational errors are expected errors (validation, not found, etc.)
        // Non-operational errors are programming errors (bugs)
        this.isOperational = true;
        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
    /**
     * Create an AppError from an error code definition
     */
    static fromCode(codeDefinition, overrides) {
        return new AppError({
            code: codeDefinition.code,
            message: overrides?.message ?? codeDefinition.message,
            statusCode: overrides?.statusCode ?? codeDefinition.statusCode,
            category: overrides?.category ?? codeDefinition.category,
            severity: overrides?.severity ?? codeDefinition.severity,
            retry: overrides?.retry ?? codeDefinition.retry,
            ...overrides,
        });
    }
    /**
     * Wrap an unknown error in an AppError
     */
    static wrap(error, codeDefinition) {
        // If already an AppError, return as-is
        if (error instanceof AppError) {
            return error;
        }
        const code = codeDefinition ?? codes_1.ErrorCodes.UNEXPECTED_ERROR;
        const originalError = error instanceof Error ? error : new Error(String(error));
        return new AppError({
            code: code.code,
            message: originalError.message,
            statusCode: code.statusCode,
            category: code.category,
            severity: code.severity,
            retry: 'retry' in code ? code.retry : undefined,
            cause: originalError,
        });
    }
    /**
     * Serialize the error for API responses and logging
     */
    serialize(includeDebugInfo = false) {
        const serialized = {
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            category: this.category,
            severity: this.severity,
            timestamp: this.timestamp.toISOString(),
        };
        if (this.context?.requestId) {
            serialized.requestId = this.context.requestId;
        }
        if (this.validationErrors && this.validationErrors.length > 0) {
            serialized.validationErrors = this.validationErrors;
        }
        // Include debug info only in non-production or when explicitly requested
        if (includeDebugInfo) {
            if (this.context) {
                serialized.context = this.context;
            }
            if (this.stack) {
                serialized.stack = this.stack;
            }
            if (this.cause) {
                serialized.originalError = this.cause.message;
            }
        }
        return serialized;
    }
    /**
     * Convert to API error response format
     */
    toResponse(includeDebugInfo = false) {
        return {
            success: false,
            error: this.serialize(includeDebugInfo),
        };
    }
    /**
     * Convert to JSON (for logging)
     */
    toJSON() {
        return this.serialize(true);
    }
    /**
     * Check if this error is a specific error code
     */
    is(codeDefinition) {
        return this.code === codeDefinition.code;
    }
    /**
     * Check if this error belongs to a specific category
     */
    isCategory(category) {
        return this.category === category;
    }
    /**
     * Check if this error is retryable
     */
    isRetryable() {
        return this.retry?.retryable ?? false;
    }
    /**
     * Add context to the error
     */
    withContext(context) {
        return new AppError({
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            category: this.category,
            severity: this.severity,
            cause: this.cause,
            retry: this.retry,
            validationErrors: this.validationErrors,
            context: { ...this.context, ...context },
        });
    }
    /**
     * Add a request ID to the error context
     */
    withRequestId(requestId) {
        return this.withContext({ requestId });
    }
}
exports.AppError = AppError;
// ============================================
// Specialized Error Classes
// ============================================
/**
 * Validation error for input validation failures
 */
class ValidationError extends AppError {
    constructor(message, validationErrors, context) {
        super({
            code: codes_1.ErrorCodes.VALIDATION_ERROR.code,
            message,
            statusCode: codes_1.ErrorCodes.VALIDATION_ERROR.statusCode,
            category: codes_1.ErrorCodes.VALIDATION_ERROR.category,
            severity: codes_1.ErrorCodes.VALIDATION_ERROR.severity,
            validationErrors,
            context,
        });
    }
    /**
     * Create a validation error for a single field
     */
    static forField(field, message, value) {
        return new ValidationError(`Validation failed for field: ${field}`, [
            { field, message, value },
        ]);
    }
    /**
     * Create a validation error for multiple fields
     */
    static forFields(errors) {
        const fieldNames = errors.map(e => e.field).join(', ');
        return new ValidationError(`Validation failed for fields: ${fieldNames}`, errors);
    }
    /**
     * Create a validation error for a missing required field
     */
    static missingField(field) {
        return new ValidationError(`Missing required field: ${field}`, [
            { field, message: 'This field is required', rule: 'required' },
        ]);
    }
}
exports.ValidationError = ValidationError;
/**
 * Authentication error for auth-related failures
 */
class AuthenticationError extends AppError {
    constructor(message, code, context) {
        const errorCode = code ?? codes_1.ErrorCodes.AUTHENTICATION_REQUIRED;
        super({
            code: errorCode.code,
            message: message ?? errorCode.message,
            statusCode: errorCode.statusCode,
            category: errorCode.category,
            severity: errorCode.severity,
            context,
        });
    }
    static invalidCredentials() {
        return new AuthenticationError(codes_1.ErrorCodes.INVALID_CREDENTIALS.message, codes_1.ErrorCodes.INVALID_CREDENTIALS);
    }
    static tokenExpired() {
        return new AuthenticationError(codes_1.ErrorCodes.TOKEN_EXPIRED.message, codes_1.ErrorCodes.TOKEN_EXPIRED);
    }
    static tokenInvalid() {
        return new AuthenticationError(codes_1.ErrorCodes.TOKEN_INVALID.message, codes_1.ErrorCodes.TOKEN_INVALID);
    }
    static sessionExpired() {
        return new AuthenticationError(codes_1.ErrorCodes.SESSION_EXPIRED.message, codes_1.ErrorCodes.SESSION_EXPIRED);
    }
}
exports.AuthenticationError = AuthenticationError;
/**
 * Authorization error for permission-related failures
 */
class AuthorizationError extends AppError {
    constructor(message, code, context) {
        const errorCode = code ?? codes_1.ErrorCodes.ACCESS_DENIED;
        super({
            code: errorCode.code,
            message: message ?? errorCode.message,
            statusCode: errorCode.statusCode,
            category: errorCode.category,
            severity: errorCode.severity,
            context,
        });
    }
    static accessDenied(resource) {
        const message = resource
            ? `Access denied to resource: ${resource}`
            : codes_1.ErrorCodes.ACCESS_DENIED.message;
        return new AuthorizationError(message, codes_1.ErrorCodes.ACCESS_DENIED);
    }
    static insufficientPermissions(requiredPermission) {
        const message = requiredPermission
            ? `Missing required permission: ${requiredPermission}`
            : codes_1.ErrorCodes.INSUFFICIENT_PERMISSIONS.message;
        return new AuthorizationError(message, codes_1.ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }
}
exports.AuthorizationError = AuthorizationError;
/**
 * Resource error for resource-related failures (not found, conflicts)
 */
class ResourceError extends AppError {
    constructor(message, code, context) {
        super({
            code: code.code,
            message,
            statusCode: code.statusCode,
            category: code.category,
            severity: code.severity,
            context,
        });
    }
    static notFound(resourceType, resourceId) {
        const message = resourceId
            ? `${resourceType} with ID '${resourceId}' not found`
            : `${resourceType} not found`;
        return new ResourceError(message, codes_1.ErrorCodes.RESOURCE_NOT_FOUND, {
            resourceType,
            resourceId,
        });
    }
    static alreadyExists(resourceType, identifier) {
        const message = identifier
            ? `${resourceType} '${identifier}' already exists`
            : `${resourceType} already exists`;
        return new ResourceError(message, codes_1.ErrorCodes.RESOURCE_ALREADY_EXISTS, { resourceType });
    }
    static conflict(resourceType, reason) {
        const message = reason
            ? `Conflict with ${resourceType}: ${reason}`
            : `${resourceType} conflict detected`;
        return new ResourceError(message, codes_1.ErrorCodes.RESOURCE_CONFLICT, { resourceType });
    }
}
exports.ResourceError = ResourceError;
/**
 * Business logic error for domain-specific rule violations
 */
class BusinessError extends AppError {
    constructor(message, code, context) {
        const errorCode = code ?? codes_1.ErrorCodes.BUSINESS_RULE_VIOLATION;
        super({
            code: errorCode.code,
            message,
            statusCode: errorCode.statusCode,
            category: errorCode.category,
            severity: errorCode.severity,
            context,
        });
    }
    static ruleViolation(rule, details) {
        const message = details ? `${rule}: ${details}` : rule;
        return new BusinessError(message, codes_1.ErrorCodes.BUSINESS_RULE_VIOLATION);
    }
    static invalidState(currentState, expectedState) {
        const message = expectedState
            ? `Invalid state: current '${currentState}', expected '${expectedState}'`
            : `Invalid state: '${currentState}'`;
        return new BusinessError(message, codes_1.ErrorCodes.INVALID_STATE);
    }
    static quotaExceeded(resource, limit) {
        const message = limit
            ? `Quota exceeded for ${resource}: limit is ${limit}`
            : `Quota exceeded for ${resource}`;
        return new BusinessError(message, codes_1.ErrorCodes.QUOTA_EXCEEDED);
    }
}
exports.BusinessError = BusinessError;
/**
 * External service error for third-party service failures
 */
class ExternalServiceError extends AppError {
    constructor(serviceName, message, code, cause, context) {
        const errorCode = code ?? codes_1.ErrorCodes.EXTERNAL_SERVICE_ERROR;
        super({
            code: errorCode.code,
            message: message ?? `${serviceName}: ${errorCode.message}`,
            statusCode: errorCode.statusCode,
            category: errorCode.category,
            severity: errorCode.severity,
            retry: errorCode.retry,
            cause,
            context: { ...context, serviceName },
        });
    }
    static unavailable(serviceName, cause) {
        return new ExternalServiceError(serviceName, `${serviceName} is currently unavailable`, codes_1.ErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE, cause);
    }
    static timeout(serviceName, cause) {
        return new ExternalServiceError(serviceName, `${serviceName} request timed out`, codes_1.ErrorCodes.EXTERNAL_SERVICE_TIMEOUT, cause);
    }
}
exports.ExternalServiceError = ExternalServiceError;
/**
 * Database error for database-related failures
 */
class DatabaseError extends AppError {
    constructor(message, code, cause, context) {
        const errorCode = code ?? codes_1.ErrorCodes.DATABASE_ERROR;
        super({
            code: errorCode.code,
            message,
            statusCode: errorCode.statusCode,
            category: errorCode.category,
            severity: errorCode.severity,
            retry: 'retry' in errorCode ? errorCode.retry : undefined,
            cause,
            context,
        });
    }
    static connectionError(cause) {
        return new DatabaseError('Failed to connect to database', codes_1.ErrorCodes.DATABASE_CONNECTION_ERROR, cause);
    }
    static queryError(query, cause) {
        const context = query ? { query: query.substring(0, 100) } : undefined;
        return new DatabaseError('Database query failed', codes_1.ErrorCodes.DATABASE_QUERY_ERROR, cause, context);
    }
    static transactionError(cause) {
        return new DatabaseError('Database transaction failed', codes_1.ErrorCodes.DATABASE_TRANSACTION_ERROR, cause);
    }
}
exports.DatabaseError = DatabaseError;
/**
 * Configuration error for config-related failures
 */
class ConfigurationError extends AppError {
    constructor(message, code, context) {
        const errorCode = code ?? codes_1.ErrorCodes.CONFIGURATION_ERROR;
        super({
            code: errorCode.code,
            message,
            statusCode: errorCode.statusCode,
            category: errorCode.category,
            severity: errorCode.severity,
            context,
        });
        // Configuration errors are typically programming errors, not operational
        this.isOperational = false;
    }
    static missing(configKey) {
        return new ConfigurationError(`Missing required configuration: ${configKey}`, codes_1.ErrorCodes.MISSING_CONFIGURATION, { configKey });
    }
    static invalid(configKey, reason) {
        const message = reason
            ? `Invalid configuration for '${configKey}': ${reason}`
            : `Invalid configuration: ${configKey}`;
        return new ConfigurationError(message, codes_1.ErrorCodes.INVALID_CONFIGURATION, { configKey });
    }
}
exports.ConfigurationError = ConfigurationError;
/**
 * Network error for connectivity issues
 */
class NetworkError extends AppError {
    constructor(message, code, cause, context) {
        const errorCode = code ?? codes_1.ErrorCodes.NETWORK_ERROR;
        super({
            code: errorCode.code,
            message,
            statusCode: errorCode.statusCode,
            category: errorCode.category,
            severity: errorCode.severity,
            retry: errorCode.retry,
            cause,
            context,
        });
    }
    static connectionTimeout(host, cause) {
        const message = host ? `Connection to ${host} timed out` : 'Connection timed out';
        return new NetworkError(message, codes_1.ErrorCodes.CONNECTION_TIMEOUT, cause, { host });
    }
}
exports.NetworkError = NetworkError;
/**
 * Internal error for unexpected application errors
 */
class InternalError extends AppError {
    constructor(message, cause, context) {
        super({
            code: codes_1.ErrorCodes.INTERNAL_ERROR.code,
            message: message ?? codes_1.ErrorCodes.INTERNAL_ERROR.message,
            statusCode: codes_1.ErrorCodes.INTERNAL_ERROR.statusCode,
            category: codes_1.ErrorCodes.INTERNAL_ERROR.category,
            severity: codes_1.ErrorCodes.INTERNAL_ERROR.severity,
            cause,
            context,
        });
    }
    static unexpected(cause) {
        return new InternalError('An unexpected error occurred', cause);
    }
    static notImplemented(feature) {
        const error = new InternalError(feature ? `Feature not implemented: ${feature}` : 'This feature is not implemented');
        error.code = codes_1.ErrorCodes.NOT_IMPLEMENTED.code;
        return error;
    }
}
exports.InternalError = InternalError;
//# sourceMappingURL=AppError.js.map