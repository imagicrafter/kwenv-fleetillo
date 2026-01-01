/**
 * Unit tests for the centralized error handling framework
 * Tests custom error classes, error codes, and utilities
 */

import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ResourceError,
  BusinessError,
  ExternalServiceError,
  DatabaseError,
  ConfigurationError,
  NetworkError,
  InternalError,
  ErrorCodes,
  isAppError,
  isError,
  hasErrorCode,
  isErrorCategory,
  normalizeError,
  tryCatchSync,
  assertCondition,
  assertDefined,
  getUserFriendlyMessage,
  shouldLogAsError,
  createErrorFactory,
} from '../../../src/errors/index';
import { ErrorCategory, ErrorSeverity, HttpStatusCode } from '../../../src/types/errors';

describe('Error Handling Framework', () => {
  describe('AppError', () => {
    it('should create an error with all required properties', () => {
      const error = new AppError({
        code: 'TEST_ERROR',
        message: 'Test error message',
        statusCode: HttpStatusCode.BAD_REQUEST,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
      });

      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.statusCode).toBe(400);
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('AppError');
    });

    it('should create an error from an error code definition', () => {
      const error = AppError.fromCode(ErrorCodes.VALIDATION_ERROR);

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(HttpStatusCode.BAD_REQUEST);
      expect(error.category).toBe(ErrorCategory.VALIDATION);
    });

    it('should wrap an unknown error into AppError', () => {
      const originalError = new Error('Original error');
      const wrapped = AppError.wrap(originalError);

      expect(wrapped).toBeInstanceOf(AppError);
      expect(wrapped.message).toBe('Original error');
      expect(wrapped.cause).toBe(originalError);
      expect(wrapped.code).toBe('UNEXPECTED_ERROR');
    });

    it('should not double-wrap an AppError', () => {
      const original = AppError.fromCode(ErrorCodes.VALIDATION_ERROR);
      const wrapped = AppError.wrap(original);

      expect(wrapped).toBe(original);
    });

    it('should serialize the error correctly', () => {
      const error = new AppError({
        code: 'TEST_ERROR',
        message: 'Test message',
        statusCode: HttpStatusCode.BAD_REQUEST,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        context: { requestId: 'req-123' },
      });

      const serialized = error.serialize();

      expect(serialized.code).toBe('TEST_ERROR');
      expect(serialized.message).toBe('Test message');
      expect(serialized.statusCode).toBe(400);
      expect(serialized.category).toBe(ErrorCategory.VALIDATION);
      expect(serialized.severity).toBe(ErrorSeverity.LOW);
      expect(serialized.requestId).toBe('req-123');
      expect(serialized.timestamp).toBeDefined();
    });

    it('should include debug info when requested', () => {
      const cause = new Error('Cause error');
      const error = new AppError({
        code: 'TEST_ERROR',
        message: 'Test message',
        statusCode: HttpStatusCode.BAD_REQUEST,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        cause,
        context: { userId: 'user-123' },
      });

      const serializedWithDebug = error.serialize(true);
      const serializedWithoutDebug = error.serialize(false);

      expect(serializedWithDebug.stack).toBeDefined();
      expect(serializedWithDebug.originalError).toBe('Cause error');
      expect(serializedWithDebug.context).toBeDefined();

      expect(serializedWithoutDebug.stack).toBeUndefined();
      expect(serializedWithoutDebug.originalError).toBeUndefined();
      expect(serializedWithoutDebug.context).toBeUndefined();
    });

    it('should add context with withContext', () => {
      const error = AppError.fromCode(ErrorCodes.VALIDATION_ERROR);
      const withContext = error.withContext({ resourceId: '123' });

      expect(withContext.context?.resourceId).toBe('123');
      expect(withContext).not.toBe(error); // Should be a new instance
    });

    it('should check if error is a specific code', () => {
      const error = AppError.fromCode(ErrorCodes.VALIDATION_ERROR);

      expect(error.is(ErrorCodes.VALIDATION_ERROR)).toBe(true);
      expect(error.is(ErrorCodes.RESOURCE_NOT_FOUND)).toBe(false);
    });

    it('should convert to API response format', () => {
      const error = AppError.fromCode(ErrorCodes.VALIDATION_ERROR);
      const response = error.toResponse();

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error for a single field', () => {
      const error = ValidationError.forField('email', 'Invalid email format', 'not-an-email');

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(HttpStatusCode.BAD_REQUEST);
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.validationErrors).toHaveLength(1);
      const firstError = error.validationErrors?.[0];
      expect(firstError?.field).toBe('email');
      expect(firstError?.message).toBe('Invalid email format');
      expect(firstError?.value).toBe('not-an-email');
    });

    it('should create a validation error for multiple fields', () => {
      const error = ValidationError.forFields([
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' },
      ]);

      expect(error.validationErrors).toHaveLength(2);
      expect(error.message).toContain('email');
      expect(error.message).toContain('password');
    });

    it('should create a missing field error', () => {
      const error = ValidationError.missingField('username');

      expect(error.message).toContain('username');
      expect(error.validationErrors?.[0]?.rule).toBe('required');
    });
  });

  describe('AuthenticationError', () => {
    it('should create an invalid credentials error', () => {
      const error = AuthenticationError.invalidCredentials();

      expect(error.code).toBe('INVALID_CREDENTIALS');
      expect(error.statusCode).toBe(HttpStatusCode.UNAUTHORIZED);
      expect(error.category).toBe(ErrorCategory.AUTHENTICATION);
    });

    it('should create a token expired error', () => {
      const error = AuthenticationError.tokenExpired();

      expect(error.code).toBe('TOKEN_EXPIRED');
      expect(error.statusCode).toBe(HttpStatusCode.UNAUTHORIZED);
    });
  });

  describe('AuthorizationError', () => {
    it('should create an access denied error', () => {
      const error = AuthorizationError.accessDenied('admin dashboard');

      expect(error.code).toBe('ACCESS_DENIED');
      expect(error.statusCode).toBe(HttpStatusCode.FORBIDDEN);
      expect(error.message).toContain('admin dashboard');
    });

    it('should create an insufficient permissions error', () => {
      const error = AuthorizationError.insufficientPermissions('delete:users');

      expect(error.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(error.message).toContain('delete:users');
    });
  });

  describe('ResourceError', () => {
    it('should create a not found error', () => {
      const error = ResourceError.notFound('User', '12345');

      expect(error.code).toBe('RESOURCE_NOT_FOUND');
      expect(error.statusCode).toBe(HttpStatusCode.NOT_FOUND);
      expect(error.message).toContain('User');
      expect(error.message).toContain('12345');
      expect(error.context?.resourceType).toBe('User');
      expect(error.context?.resourceId).toBe('12345');
    });

    it('should create an already exists error', () => {
      const error = ResourceError.alreadyExists('Email', 'test@example.com');

      expect(error.code).toBe('RESOURCE_ALREADY_EXISTS');
      expect(error.statusCode).toBe(HttpStatusCode.CONFLICT);
    });
  });

  describe('BusinessError', () => {
    it('should create a rule violation error', () => {
      const error = BusinessError.ruleViolation('Maximum items exceeded', 'Cannot add more than 10 items');

      expect(error.code).toBe('BUSINESS_RULE_VIOLATION');
      expect(error.statusCode).toBe(HttpStatusCode.UNPROCESSABLE_ENTITY);
    });

    it('should create a quota exceeded error', () => {
      const error = BusinessError.quotaExceeded('API requests', 1000);

      expect(error.code).toBe('QUOTA_EXCEEDED');
      expect(error.message).toContain('1000');
    });
  });

  describe('ExternalServiceError', () => {
    it('should create an unavailable service error', () => {
      const error = ExternalServiceError.unavailable('Google Maps API');

      expect(error.code).toBe('EXTERNAL_SERVICE_UNAVAILABLE');
      expect(error.statusCode).toBe(HttpStatusCode.SERVICE_UNAVAILABLE);
      expect(error.isRetryable()).toBe(true);
    });

    it('should create a timeout error', () => {
      const error = ExternalServiceError.timeout('Payment Gateway');

      expect(error.code).toBe('EXTERNAL_SERVICE_TIMEOUT');
      expect(error.isRetryable()).toBe(true);
    });
  });

  describe('DatabaseError', () => {
    it('should create a connection error', () => {
      const error = DatabaseError.connectionError();

      expect(error.code).toBe('DATABASE_CONNECTION_ERROR');
      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
      expect(error.isRetryable()).toBe(true);
    });

    it('should create a query error', () => {
      const error = DatabaseError.queryError('SELECT * FROM users');

      expect(error.code).toBe('DATABASE_QUERY_ERROR');
      expect(error.context?.query).toBeDefined();
    });
  });

  describe('ConfigurationError', () => {
    it('should create a missing config error', () => {
      const error = ConfigurationError.missing('DATABASE_URL');

      expect(error.code).toBe('MISSING_CONFIGURATION');
      expect(error.isOperational).toBe(false); // Configuration errors are programming errors
    });

    it('should create an invalid config error', () => {
      const error = ConfigurationError.invalid('PORT', 'Must be a number');

      expect(error.code).toBe('INVALID_CONFIGURATION');
      expect(error.message).toContain('PORT');
      expect(error.message).toContain('Must be a number');
    });
  });

  describe('NetworkError', () => {
    it('should create a connection timeout error', () => {
      const error = NetworkError.connectionTimeout('api.example.com');

      expect(error.code).toBe('CONNECTION_TIMEOUT');
      expect(error.isRetryable()).toBe(true);
      expect(error.context?.host).toBe('api.example.com');
    });
  });

  describe('InternalError', () => {
    it('should create an unexpected error', () => {
      const cause = new Error('Something went wrong');
      const error = InternalError.unexpected(cause);

      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.cause).toBe(cause);
    });

    it('should create a not implemented error', () => {
      const error = InternalError.notImplemented('feature-xyz');

      expect(error.code).toBe('NOT_IMPLEMENTED');
      expect(error.message).toContain('feature-xyz');
    });
  });

  describe('Error Utilities', () => {
    describe('Type Guards', () => {
      it('isAppError should correctly identify AppError', () => {
        expect(isAppError(AppError.fromCode(ErrorCodes.VALIDATION_ERROR))).toBe(true);
        expect(isAppError(new Error('Regular error'))).toBe(false);
        expect(isAppError('string error')).toBe(false);
      });

      it('isError should correctly identify Error', () => {
        expect(isError(new Error('test'))).toBe(true);
        expect(isError(new AppError({ code: 'TEST', message: 'test', category: ErrorCategory.INTERNAL, severity: ErrorSeverity.LOW }))).toBe(true);
        expect(isError('not an error')).toBe(false);
      });

      it('hasErrorCode should check error codes', () => {
        const error = AppError.fromCode(ErrorCodes.VALIDATION_ERROR);
        expect(hasErrorCode(error, ErrorCodes.VALIDATION_ERROR)).toBe(true);
        expect(hasErrorCode(error, ErrorCodes.RESOURCE_NOT_FOUND)).toBe(false);
      });

      it('isErrorCategory should check error categories', () => {
        const error = AppError.fromCode(ErrorCodes.VALIDATION_ERROR);
        expect(isErrorCategory(error, ErrorCategory.VALIDATION)).toBe(true);
        expect(isErrorCategory(error, ErrorCategory.INTERNAL)).toBe(false);
      });
    });

    describe('normalizeError', () => {
      it('should return AppError as-is', () => {
        const original = AppError.fromCode(ErrorCodes.VALIDATION_ERROR);
        const normalized = normalizeError(original);
        expect(normalized).toBe(original);
      });

      it('should wrap regular Error', () => {
        const normalized = normalizeError(new Error('Regular error'));
        expect(normalized).toBeInstanceOf(AppError);
        expect(normalized.message).toBe('Regular error');
      });

      it('should handle string errors', () => {
        const normalized = normalizeError('Something went wrong');
        expect(normalized).toBeInstanceOf(AppError);
        expect(normalized.message).toBe('Something went wrong');
      });
    });

    describe('tryCatchSync', () => {
      it('should return success result on successful operation', () => {
        const result = tryCatchSync(() => 42);

        expect(result.success).toBe(true);
        expect(result.data).toBe(42);
        expect(result.error).toBeUndefined();
      });

      it('should return error result on failed operation', () => {
        const result = tryCatchSync(() => {
          throw new Error('Failed');
        });

        expect(result.success).toBe(false);
        expect(result.data).toBeUndefined();
        expect(result.error).toBeInstanceOf(AppError);
        expect(result.error?.message).toBe('Failed');
      });
    });

    describe('Assertions', () => {
      it('assertCondition should throw on false condition', () => {
        expect(() => assertCondition(false, 'Condition failed')).toThrow(AppError);
        expect(() => assertCondition(true, 'Should not throw')).not.toThrow();
      });

      it('assertDefined should throw on null/undefined', () => {
        expect(() => assertDefined(null, 'Value is null')).toThrow(AppError);
        expect(() => assertDefined(undefined, 'Value is undefined')).toThrow(AppError);
        expect(() => assertDefined('value', 'Should not throw')).not.toThrow();
        expect(() => assertDefined(0, 'Zero is defined')).not.toThrow();
      });
    });

    describe('getUserFriendlyMessage', () => {
      it('should return user-friendly messages for different categories', () => {
        const authError = AuthenticationError.tokenExpired();
        expect(getUserFriendlyMessage(authError)).toContain('sign in');

        const authzError = AuthorizationError.accessDenied();
        expect(getUserFriendlyMessage(authzError)).toContain('permission');

        const networkError = NetworkError.connectionTimeout();
        expect(getUserFriendlyMessage(networkError)).toContain('network');
      });

      it('should return generic message for non-AppError', () => {
        expect(getUserFriendlyMessage(new Error('test'))).toContain('unexpected error');
      });
    });

    describe('shouldLogAsError', () => {
      it('should return false for expected errors', () => {
        expect(shouldLogAsError(ValidationError.forField('test', 'invalid'))).toBe(false);
        expect(shouldLogAsError(AuthenticationError.tokenExpired())).toBe(false);
        expect(shouldLogAsError(ResourceError.notFound('User', '123'))).toBe(false);
      });

      it('should return true for unexpected errors', () => {
        expect(shouldLogAsError(InternalError.unexpected())).toBe(true);
        expect(shouldLogAsError(DatabaseError.connectionError())).toBe(true);
        expect(shouldLogAsError(new Error('Regular error'))).toBe(true);
      });
    });

    describe('createErrorFactory', () => {
      it('should create error factory with default context', () => {
        const factory = createErrorFactory({ operation: 'createUser' });

        const validationError = factory.validation('Invalid email');
        expect(validationError.context?.operation).toBe('createUser');

        const notFoundError = factory.notFound('User', '123');
        expect(notFoundError.context?.operation).toBe('createUser');
        expect(notFoundError.context?.resourceType).toBe('User');
      });
    });
  });

  describe('ErrorCodes', () => {
    it('should have correct HTTP status codes', () => {
      expect(ErrorCodes.VALIDATION_ERROR.statusCode).toBe(400);
      expect(ErrorCodes.AUTHENTICATION_REQUIRED.statusCode).toBe(401);
      expect(ErrorCodes.ACCESS_DENIED.statusCode).toBe(403);
      expect(ErrorCodes.RESOURCE_NOT_FOUND.statusCode).toBe(404);
      expect(ErrorCodes.RESOURCE_ALREADY_EXISTS.statusCode).toBe(409);
      expect(ErrorCodes.BUSINESS_RULE_VIOLATION.statusCode).toBe(422);
      expect(ErrorCodes.INTERNAL_ERROR.statusCode).toBe(500);
    });

    it('should have correct categories', () => {
      expect(ErrorCodes.VALIDATION_ERROR.category).toBe(ErrorCategory.VALIDATION);
      expect(ErrorCodes.AUTHENTICATION_REQUIRED.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(ErrorCodes.ACCESS_DENIED.category).toBe(ErrorCategory.AUTHORIZATION);
      expect(ErrorCodes.RESOURCE_NOT_FOUND.category).toBe(ErrorCategory.RESOURCE);
      expect(ErrorCodes.DATABASE_ERROR.category).toBe(ErrorCategory.DATABASE);
    });

    it('should have retry config for transient errors', () => {
      expect(ErrorCodes.EXTERNAL_SERVICE_ERROR.retry?.retryable).toBe(true);
      expect(ErrorCodes.DATABASE_CONNECTION_ERROR.retry?.retryable).toBe(true);
      expect(ErrorCodes.NETWORK_ERROR.retry?.retryable).toBe(true);
    });
  });
});
