/**
 * Base application error class for RouteIQ
 * Provides structured error handling with codes, categories, and serialization
 */

import {
  ErrorCategory,
  ErrorSeverity,
  HttpStatusCode,
  type ErrorContext,
  type RetryConfig,
  type SerializedError,
  type ErrorResponse,
  type ValidationErrorDetail,
  type IAppError,
  type AppErrorOptions,
} from '../types/errors';
import { ErrorCodes, type ErrorCodeDefinition } from './codes';

/**
 * Base application error class
 * All custom errors in the application should extend this class
 */
export class AppError extends Error implements IAppError {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly timestamp: Date;
  public readonly context?: ErrorContext;
  public readonly retry?: RetryConfig;
  public readonly validationErrors?: ValidationErrorDetail[];
  public readonly cause?: Error;
  public readonly isOperational: boolean;

  constructor(options: AppErrorOptions) {
    super(options.message);

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.code = options.code;
    this.statusCode = options.statusCode ?? HttpStatusCode.INTERNAL_SERVER_ERROR;
    this.category = options.category ?? ErrorCategory.INTERNAL;
    this.severity = options.severity ?? ErrorSeverity.MEDIUM;
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
  static fromCode(
    codeDefinition: ErrorCodeDefinition,
    overrides?: Partial<AppErrorOptions>
  ): AppError {
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
  static wrap(error: unknown, codeDefinition?: ErrorCodeDefinition): AppError {
    // If already an AppError, return as-is
    if (error instanceof AppError) {
      return error;
    }

    const code = codeDefinition ?? ErrorCodes.UNEXPECTED_ERROR;
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
  serialize(includeDebugInfo = false): SerializedError {
    const serialized: SerializedError = {
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
  toResponse(includeDebugInfo = false): ErrorResponse {
    return {
      success: false,
      error: this.serialize(includeDebugInfo),
    };
  }

  /**
   * Convert to JSON (for logging)
   */
  toJSON(): SerializedError {
    return this.serialize(true);
  }

  /**
   * Check if this error is a specific error code
   */
  is(codeDefinition: ErrorCodeDefinition): boolean {
    return this.code === codeDefinition.code;
  }

  /**
   * Check if this error belongs to a specific category
   */
  isCategory(category: ErrorCategory): boolean {
    return this.category === category;
  }

  /**
   * Check if this error is retryable
   */
  isRetryable(): boolean {
    return this.retry?.retryable ?? false;
  }

  /**
   * Add context to the error
   */
  withContext(context: ErrorContext): AppError {
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
  withRequestId(requestId: string): AppError {
    return this.withContext({ requestId });
  }
}

// ============================================
// Specialized Error Classes
// ============================================

/**
 * Validation error for input validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, validationErrors?: ValidationErrorDetail[], context?: ErrorContext) {
    super({
      code: ErrorCodes.VALIDATION_ERROR.code,
      message,
      statusCode: ErrorCodes.VALIDATION_ERROR.statusCode,
      category: ErrorCodes.VALIDATION_ERROR.category,
      severity: ErrorCodes.VALIDATION_ERROR.severity,
      validationErrors,
      context,
    });
  }

  /**
   * Create a validation error for a single field
   */
  static forField(field: string, message: string, value?: unknown): ValidationError {
    return new ValidationError(`Validation failed for field: ${field}`, [
      { field, message, value },
    ]);
  }

  /**
   * Create a validation error for multiple fields
   */
  static forFields(errors: ValidationErrorDetail[]): ValidationError {
    const fieldNames = errors.map(e => e.field).join(', ');
    return new ValidationError(`Validation failed for fields: ${fieldNames}`, errors);
  }

  /**
   * Create a validation error for a missing required field
   */
  static missingField(field: string): ValidationError {
    return new ValidationError(`Missing required field: ${field}`, [
      { field, message: 'This field is required', rule: 'required' },
    ]);
  }
}

/**
 * Authentication error for auth-related failures
 */
export class AuthenticationError extends AppError {
  constructor(message?: string, code?: ErrorCodeDefinition, context?: ErrorContext) {
    const errorCode = code ?? ErrorCodes.AUTHENTICATION_REQUIRED;
    super({
      code: errorCode.code,
      message: message ?? errorCode.message,
      statusCode: errorCode.statusCode,
      category: errorCode.category,
      severity: errorCode.severity,
      context,
    });
  }

  static invalidCredentials(): AuthenticationError {
    return new AuthenticationError(
      ErrorCodes.INVALID_CREDENTIALS.message,
      ErrorCodes.INVALID_CREDENTIALS
    );
  }

  static tokenExpired(): AuthenticationError {
    return new AuthenticationError(ErrorCodes.TOKEN_EXPIRED.message, ErrorCodes.TOKEN_EXPIRED);
  }

  static tokenInvalid(): AuthenticationError {
    return new AuthenticationError(ErrorCodes.TOKEN_INVALID.message, ErrorCodes.TOKEN_INVALID);
  }

  static sessionExpired(): AuthenticationError {
    return new AuthenticationError(ErrorCodes.SESSION_EXPIRED.message, ErrorCodes.SESSION_EXPIRED);
  }
}

/**
 * Authorization error for permission-related failures
 */
export class AuthorizationError extends AppError {
  constructor(message?: string, code?: ErrorCodeDefinition, context?: ErrorContext) {
    const errorCode = code ?? ErrorCodes.ACCESS_DENIED;
    super({
      code: errorCode.code,
      message: message ?? errorCode.message,
      statusCode: errorCode.statusCode,
      category: errorCode.category,
      severity: errorCode.severity,
      context,
    });
  }

  static accessDenied(resource?: string): AuthorizationError {
    const message = resource
      ? `Access denied to resource: ${resource}`
      : ErrorCodes.ACCESS_DENIED.message;
    return new AuthorizationError(message, ErrorCodes.ACCESS_DENIED);
  }

  static insufficientPermissions(requiredPermission?: string): AuthorizationError {
    const message = requiredPermission
      ? `Missing required permission: ${requiredPermission}`
      : ErrorCodes.INSUFFICIENT_PERMISSIONS.message;
    return new AuthorizationError(message, ErrorCodes.INSUFFICIENT_PERMISSIONS);
  }
}

/**
 * Resource error for resource-related failures (not found, conflicts)
 */
export class ResourceError extends AppError {
  constructor(message: string, code: ErrorCodeDefinition, context?: ErrorContext) {
    super({
      code: code.code,
      message,
      statusCode: code.statusCode,
      category: code.category,
      severity: code.severity,
      context,
    });
  }

  static notFound(resourceType: string, resourceId?: string): ResourceError {
    const message = resourceId
      ? `${resourceType} with ID '${resourceId}' not found`
      : `${resourceType} not found`;
    return new ResourceError(message, ErrorCodes.RESOURCE_NOT_FOUND, {
      resourceType,
      resourceId,
    });
  }

  static alreadyExists(resourceType: string, identifier?: string): ResourceError {
    const message = identifier
      ? `${resourceType} '${identifier}' already exists`
      : `${resourceType} already exists`;
    return new ResourceError(message, ErrorCodes.RESOURCE_ALREADY_EXISTS, { resourceType });
  }

  static conflict(resourceType: string, reason?: string): ResourceError {
    const message = reason
      ? `Conflict with ${resourceType}: ${reason}`
      : `${resourceType} conflict detected`;
    return new ResourceError(message, ErrorCodes.RESOURCE_CONFLICT, { resourceType });
  }
}

/**
 * Business logic error for domain-specific rule violations
 */
export class BusinessError extends AppError {
  constructor(message: string, code?: ErrorCodeDefinition, context?: ErrorContext) {
    const errorCode = code ?? ErrorCodes.BUSINESS_RULE_VIOLATION;
    super({
      code: errorCode.code,
      message,
      statusCode: errorCode.statusCode,
      category: errorCode.category,
      severity: errorCode.severity,
      context,
    });
  }

  static ruleViolation(rule: string, details?: string): BusinessError {
    const message = details ? `${rule}: ${details}` : rule;
    return new BusinessError(message, ErrorCodes.BUSINESS_RULE_VIOLATION);
  }

  static invalidState(currentState: string, expectedState?: string): BusinessError {
    const message = expectedState
      ? `Invalid state: current '${currentState}', expected '${expectedState}'`
      : `Invalid state: '${currentState}'`;
    return new BusinessError(message, ErrorCodes.INVALID_STATE);
  }

  static quotaExceeded(resource: string, limit?: number): BusinessError {
    const message = limit
      ? `Quota exceeded for ${resource}: limit is ${limit}`
      : `Quota exceeded for ${resource}`;
    return new BusinessError(message, ErrorCodes.QUOTA_EXCEEDED);
  }
}

/**
 * External service error for third-party service failures
 */
export class ExternalServiceError extends AppError {
  constructor(
    serviceName: string,
    message?: string,
    code?: ErrorCodeDefinition,
    cause?: Error,
    context?: ErrorContext
  ) {
    const errorCode = code ?? ErrorCodes.EXTERNAL_SERVICE_ERROR;
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

  static unavailable(serviceName: string, cause?: Error): ExternalServiceError {
    return new ExternalServiceError(
      serviceName,
      `${serviceName} is currently unavailable`,
      ErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE,
      cause
    );
  }

  static timeout(serviceName: string, cause?: Error): ExternalServiceError {
    return new ExternalServiceError(
      serviceName,
      `${serviceName} request timed out`,
      ErrorCodes.EXTERNAL_SERVICE_TIMEOUT,
      cause
    );
  }
}

/**
 * Database error for database-related failures
 */
export class DatabaseError extends AppError {
  constructor(message: string, code?: ErrorCodeDefinition, cause?: Error, context?: ErrorContext) {
    const errorCode = code ?? ErrorCodes.DATABASE_ERROR;
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

  static connectionError(cause?: Error): DatabaseError {
    return new DatabaseError(
      'Failed to connect to database',
      ErrorCodes.DATABASE_CONNECTION_ERROR,
      cause
    );
  }

  static queryError(query?: string, cause?: Error): DatabaseError {
    const context = query ? { query: query.substring(0, 100) } : undefined;
    return new DatabaseError(
      'Database query failed',
      ErrorCodes.DATABASE_QUERY_ERROR,
      cause,
      context
    );
  }

  static transactionError(cause?: Error): DatabaseError {
    return new DatabaseError(
      'Database transaction failed',
      ErrorCodes.DATABASE_TRANSACTION_ERROR,
      cause
    );
  }
}

/**
 * Configuration error for config-related failures
 */
export class ConfigurationError extends AppError {
  constructor(message: string, code?: ErrorCodeDefinition, context?: ErrorContext) {
    const errorCode = code ?? ErrorCodes.CONFIGURATION_ERROR;
    super({
      code: errorCode.code,
      message,
      statusCode: errorCode.statusCode,
      category: errorCode.category,
      severity: errorCode.severity,
      context,
    });
    // Configuration errors are typically programming errors, not operational
    (this as { isOperational: boolean }).isOperational = false;
  }

  static missing(configKey: string): ConfigurationError {
    return new ConfigurationError(
      `Missing required configuration: ${configKey}`,
      ErrorCodes.MISSING_CONFIGURATION,
      { configKey }
    );
  }

  static invalid(configKey: string, reason?: string): ConfigurationError {
    const message = reason
      ? `Invalid configuration for '${configKey}': ${reason}`
      : `Invalid configuration: ${configKey}`;
    return new ConfigurationError(message, ErrorCodes.INVALID_CONFIGURATION, { configKey });
  }
}

/**
 * Network error for connectivity issues
 */
export class NetworkError extends AppError {
  constructor(message: string, code?: ErrorCodeDefinition, cause?: Error, context?: ErrorContext) {
    const errorCode = code ?? ErrorCodes.NETWORK_ERROR;
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

  static connectionTimeout(host?: string, cause?: Error): NetworkError {
    const message = host ? `Connection to ${host} timed out` : 'Connection timed out';
    return new NetworkError(message, ErrorCodes.CONNECTION_TIMEOUT, cause, { host });
  }
}

/**
 * Internal error for unexpected application errors
 */
export class InternalError extends AppError {
  constructor(message?: string, cause?: Error, context?: ErrorContext) {
    super({
      code: ErrorCodes.INTERNAL_ERROR.code,
      message: message ?? ErrorCodes.INTERNAL_ERROR.message,
      statusCode: ErrorCodes.INTERNAL_ERROR.statusCode,
      category: ErrorCodes.INTERNAL_ERROR.category,
      severity: ErrorCodes.INTERNAL_ERROR.severity,
      cause,
      context,
    });
  }

  static unexpected(cause?: Error): InternalError {
    return new InternalError('An unexpected error occurred', cause);
  }

  static notImplemented(feature?: string): InternalError {
    const error = new InternalError(
      feature ? `Feature not implemented: ${feature}` : 'This feature is not implemented'
    );
    (error as { code: string }).code = ErrorCodes.NOT_IMPLEMENTED.code;
    return error;
  }
}
