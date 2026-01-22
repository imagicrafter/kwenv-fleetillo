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
export { ErrorCodes, type ErrorCodeDefinition, type ErrorCodeKey, type ErrorCodeValue, getErrorCodeDefinition, getErrorCodesByCategory, getErrorCodesBySeverity, isRetryableError, } from './codes';
export { AppError, ValidationError, AuthenticationError, AuthorizationError, ResourceError, BusinessError, ExternalServiceError, DatabaseError, ConfigurationError, NetworkError, InternalError, } from './AppError';
export { isAppError, isError, hasErrorCode, isErrorCategory, isOperationalError, normalizeError, createErrorResponse, serializeErrorForLogging, tryCatch, tryCatchSync, retryWithBackoff, createAsyncBoundary, assertCondition, assertDefined, createErrorFactory, getUserFriendlyMessage, shouldLogAsError, } from './utils';
export type { ErrorSeverity, ErrorCategory, HttpStatusCode, ErrorContext, ValidationErrorDetail, RetryConfig, SerializedError, ErrorResponse, AppErrorOptions, IAppError, } from '../types/errors';
//# sourceMappingURL=index.d.ts.map