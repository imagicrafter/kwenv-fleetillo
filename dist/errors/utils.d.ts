/**
 * Error utility functions for RouteIQ application
 * Provides error handling helpers, type guards, and async error boundaries
 */
import { AppError, InternalError } from './AppError';
import { type ErrorCodeDefinition } from './codes';
import { ErrorCategory, type ErrorContext, type ErrorResponse, type SerializedError, type Result } from '../types/index';
/**
 * Type guard to check if a value is an AppError
 */
export declare function isAppError(error: unknown): error is AppError;
/**
 * Type guard to check if a value is an Error
 */
export declare function isError(error: unknown): error is Error;
/**
 * Type guard to check if an error has a specific code
 */
export declare function hasErrorCode(error: unknown, code: ErrorCodeDefinition): boolean;
/**
 * Type guard to check if an error belongs to a category
 */
export declare function isErrorCategory(error: unknown, category: ErrorCategory): boolean;
/**
 * Check if an error is an operational error (expected) vs a programming error
 */
export declare function isOperationalError(error: unknown): boolean;
/**
 * Normalize any error to an AppError
 * This ensures consistent error handling throughout the application
 */
export declare function normalizeError(error: unknown, defaultCode?: ErrorCodeDefinition): AppError;
/**
 * Create a safe error response for API endpoints
 * Hides sensitive information in production
 */
export declare function createErrorResponse(error: unknown, options?: {
    includeDebugInfo?: boolean;
    requestId?: string;
}): ErrorResponse;
/**
 * Serialize an error for logging
 */
export declare function serializeErrorForLogging(error: unknown): SerializedError;
/**
 * Async wrapper that catches errors and returns a Result type
 * Useful for operations that may fail
 */
export declare function tryCatch<T>(operation: () => Promise<T>, context?: ErrorContext): Promise<Result<T, AppError>>;
/**
 * Sync wrapper that catches errors and returns a Result type
 */
export declare function tryCatchSync<T>(operation: () => T, context?: ErrorContext): Result<T, AppError>;
/**
 * Retry an async operation with exponential backoff
 */
export declare function retryWithBackoff<T>(operation: () => Promise<T>, options?: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    exponentialBackoff?: boolean;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    onRetry?: (error: unknown, attempt: number, delay: number) => void;
}): Promise<T>;
/**
 * Create an async boundary that catches and handles errors
 * Useful for top-level error handling
 */
export declare function createAsyncBoundary<T extends (...args: unknown[]) => Promise<unknown>>(fn: T, errorHandler: (error: AppError) => void): T;
/**
 * Assert a condition, throwing an AppError if false
 */
export declare function assertCondition(condition: boolean, message: string, code?: ErrorCodeDefinition): asserts condition;
/**
 * Assert a value is defined (not null or undefined)
 */
export declare function assertDefined<T>(value: T | null | undefined, message: string, code?: ErrorCodeDefinition): asserts value is T;
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
export declare function createErrorFactory(defaultContext: ErrorContext): ErrorFactory;
/**
 * Get a user-friendly error message
 * Maps technical errors to user-friendly messages
 */
export declare function getUserFriendlyMessage(error: unknown): string;
/**
 * Determine if an error should be logged at error level
 * Some errors are expected and should only be logged at warn/info level
 */
export declare function shouldLogAsError(error: unknown): boolean;
export {};
//# sourceMappingURL=utils.d.ts.map