/**
 * Error utility functions for RouteIQ application
 * Provides error handling helpers, type guards, and async error boundaries
 */

import { AppError, InternalError } from './AppError.js';
import { ErrorCodes, type ErrorCodeDefinition, isRetryableError } from './codes.js';
import {
  ErrorCategory,
  ErrorSeverity,
  type ErrorContext,
  type ErrorResponse,
  type SerializedError,
  type Result,
} from '../types/index.js';

/**
 * Type guard to check if a value is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if a value is an Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard to check if an error has a specific code
 */
export function hasErrorCode(error: unknown, code: ErrorCodeDefinition): boolean {
  return isAppError(error) && error.code === code.code;
}

/**
 * Type guard to check if an error belongs to a category
 */
export function isErrorCategory(error: unknown, category: ErrorCategory): boolean {
  return isAppError(error) && error.category === category;
}

/**
 * Check if an error is an operational error (expected) vs a programming error
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

/**
 * Normalize any error to an AppError
 * This ensures consistent error handling throughout the application
 */
export function normalizeError(error: unknown, defaultCode?: ErrorCodeDefinition): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (isError(error)) {
    return AppError.wrap(error, defaultCode);
  }

  // Handle non-Error values (strings, objects, etc.)
  const message = typeof error === 'string' ? error : String(error);
  return new AppError({
    code: (defaultCode ?? ErrorCodes.UNEXPECTED_ERROR).code,
    message,
    statusCode: (defaultCode ?? ErrorCodes.UNEXPECTED_ERROR).statusCode,
    category: (defaultCode ?? ErrorCodes.UNEXPECTED_ERROR).category,
    severity: (defaultCode ?? ErrorCodes.UNEXPECTED_ERROR).severity,
  });
}

/**
 * Create a safe error response for API endpoints
 * Hides sensitive information in production
 */
export function createErrorResponse(
  error: unknown,
  options: { includeDebugInfo?: boolean; requestId?: string } = {}
): ErrorResponse {
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
export function serializeErrorForLogging(error: unknown): SerializedError {
  const appError = normalizeError(error);
  return appError.serialize(true); // Always include debug info for logging
}

/**
 * Async wrapper that catches errors and returns a Result type
 * Useful for operations that may fail
 */
export async function tryCatch<T>(
  operation: () => Promise<T>,
  context?: ErrorContext
): Promise<Result<T, AppError>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const appError = normalizeError(error);
    const errorWithContext = context ? appError.withContext(context) : appError;
    return { success: false, error: errorWithContext };
  }
}

/**
 * Sync wrapper that catches errors and returns a Result type
 */
export function tryCatchSync<T>(operation: () => T, context?: ErrorContext): Result<T, AppError> {
  try {
    const data = operation();
    return { success: true, data };
  } catch (error) {
    const appError = normalizeError(error);
    const errorWithContext = context ? appError.withContext(context) : appError;
    return { success: false, error: errorWithContext };
  }
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    exponentialBackoff?: boolean;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    onRetry?: (error: unknown, attempt: number, delay: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    exponentialBackoff = true,
    shouldRetry = (error: unknown): boolean => {
      if (isAppError(error)) {
        return error.isRetryable();
      }
      return isRetryableError(String(error));
    },
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
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
export function createAsyncBoundary<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  errorHandler: (error: AppError) => void
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = normalizeError(error);
      errorHandler(appError);
      throw appError;
    }
  }) as T;
}

/**
 * Assert a condition, throwing an AppError if false
 */
export function assertCondition(
  condition: boolean,
  message: string,
  code: ErrorCodeDefinition = ErrorCodes.INTERNAL_ERROR
): asserts condition {
  if (!condition) {
    throw AppError.fromCode(code, { message });
  }
}

/**
 * Assert a value is defined (not null or undefined)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string,
  code: ErrorCodeDefinition = ErrorCodes.INTERNAL_ERROR
): asserts value is T {
  if (value === null || value === undefined) {
    throw AppError.fromCode(code, { message });
  }
}

/**
 * Error factory interface for domain-specific error creators
 */
interface ErrorFactory {
  validation: (message: string, field?: string) => AppError;
  notFound: (resourceType: string, resourceId?: string) => AppError;
  unauthorized: (message?: string) => AppError;
  forbidden: (message?: string) => AppError;
  internal: (message?: string, cause?: Error) => InternalError;
}

/**
 * Create an error factory function for a specific context
 * Useful for creating domain-specific error creators
 */
export function createErrorFactory(defaultContext: ErrorContext): ErrorFactory {
  return {
    validation: (message: string, field?: string): AppError => {
      const error = AppError.fromCode(ErrorCodes.VALIDATION_ERROR, { message });
      return error.withContext({ ...defaultContext, field });
    },
    notFound: (resourceType: string, resourceId?: string): AppError => {
      const message = resourceId
        ? `${resourceType} with ID '${resourceId}' not found`
        : `${resourceType} not found`;
      const error = AppError.fromCode(ErrorCodes.RESOURCE_NOT_FOUND, { message });
      return error.withContext({ ...defaultContext, resourceType, resourceId });
    },
    unauthorized: (message?: string): AppError => {
      const error = AppError.fromCode(ErrorCodes.AUTHENTICATION_REQUIRED, {
        message: message ?? ErrorCodes.AUTHENTICATION_REQUIRED.message,
      });
      return error.withContext(defaultContext);
    },
    forbidden: (message?: string): AppError => {
      const error = AppError.fromCode(ErrorCodes.ACCESS_DENIED, {
        message: message ?? ErrorCodes.ACCESS_DENIED.message,
      });
      return error.withContext(defaultContext);
    },
    internal: (message?: string, cause?: Error): InternalError => {
      return new InternalError(message, cause, defaultContext);
    },
  };
}

/**
 * Get a user-friendly error message
 * Maps technical errors to user-friendly messages
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (!isAppError(error)) {
    return 'An unexpected error occurred. Please try again later.';
  }

  // Map categories to user-friendly messages
  const categoryMessages: Record<ErrorCategory, string> = {
    [ErrorCategory.VALIDATION]: error.message,
    [ErrorCategory.AUTHENTICATION]: 'Please sign in to continue.',
    [ErrorCategory.AUTHORIZATION]: 'You do not have permission to perform this action.',
    [ErrorCategory.RESOURCE]: error.message,
    [ErrorCategory.BUSINESS]: error.message,
    [ErrorCategory.EXTERNAL]: 'A service is temporarily unavailable. Please try again later.',
    [ErrorCategory.DATABASE]: 'A database error occurred. Please try again later.',
    [ErrorCategory.CONFIGURATION]: 'A system configuration error occurred. Please contact support.',
    [ErrorCategory.NETWORK]:
      'A network error occurred. Please check your connection and try again.',
    [ErrorCategory.INTERNAL]: 'An unexpected error occurred. Please try again later.',
  };

  return categoryMessages[error.category] ?? error.message;
}

/**
 * Determine if an error should be logged at error level
 * Some errors are expected and should only be logged at warn/info level
 */
export function shouldLogAsError(error: unknown): boolean {
  if (!isAppError(error)) {
    return true;
  }

  // Operational errors at low severity shouldn't be logged as errors
  if (error.isOperational && error.severity === ErrorSeverity.LOW) {
    return false;
  }

  // Authentication/authorization errors are often expected
  if (
    error.category === ErrorCategory.AUTHENTICATION ||
    error.category === ErrorCategory.AUTHORIZATION
  ) {
    return false;
  }

  // Validation errors are expected
  if (error.category === ErrorCategory.VALIDATION) {
    return false;
  }

  // Resource not found is often expected
  if (error.code === ErrorCodes.RESOURCE_NOT_FOUND.code) {
    return false;
  }

  return true;
}
