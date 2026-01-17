/**
 * Unit tests for API Key Authentication Middleware
 *
 * @requirements 9.1 - Return 401 Unauthorized for missing API key
 * @requirements 9.2 - Return 401 Unauthorized for invalid API key
 * @requirements 9.3 - Process requests with valid API key in X-API-Key header
 * @requirements 9.4 - Support multiple API keys for different client applications
 */

import { Request, Response, NextFunction } from 'express';
import {
  authMiddleware,
  API_KEY_HEADER,
  getConfiguredApiKeys,
  isValidApiKey,
} from '../../../src/middleware/auth.js';

describe('API Key Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Save original env
    originalEnv = process.env.DISPATCH_API_KEYS;

    mockRequest = {
      headers: {},
      correlationId: 'test-correlation-id',
      path: '/api/v1/dispatch',
      method: 'POST',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv !== undefined) {
      process.env.DISPATCH_API_KEYS = originalEnv;
    } else {
      delete process.env.DISPATCH_API_KEYS;
    }
  });

  describe('getConfiguredApiKeys', () => {
    it('should return empty set when DISPATCH_API_KEYS is not set', () => {
      delete process.env.DISPATCH_API_KEYS;
      const keys = getConfiguredApiKeys();
      expect(keys.size).toBe(0);
    });

    it('should return empty set when DISPATCH_API_KEYS is empty string', () => {
      process.env.DISPATCH_API_KEYS = '';
      const keys = getConfiguredApiKeys();
      expect(keys.size).toBe(0);
    });

    it('should parse single API key', () => {
      process.env.DISPATCH_API_KEYS = 'key1';
      const keys = getConfiguredApiKeys();
      expect(keys.size).toBe(1);
      expect(keys.has('key1')).toBe(true);
    });

    it('should parse multiple comma-separated API keys', () => {
      process.env.DISPATCH_API_KEYS = 'key1,key2,key3';
      const keys = getConfiguredApiKeys();
      expect(keys.size).toBe(3);
      expect(keys.has('key1')).toBe(true);
      expect(keys.has('key2')).toBe(true);
      expect(keys.has('key3')).toBe(true);
    });

    it('should trim whitespace from API keys', () => {
      process.env.DISPATCH_API_KEYS = ' key1 , key2 , key3 ';
      const keys = getConfiguredApiKeys();
      expect(keys.size).toBe(3);
      expect(keys.has('key1')).toBe(true);
      expect(keys.has('key2')).toBe(true);
      expect(keys.has('key3')).toBe(true);
    });

    it('should filter out empty keys', () => {
      process.env.DISPATCH_API_KEYS = 'key1,,key2,  ,key3';
      const keys = getConfiguredApiKeys();
      expect(keys.size).toBe(3);
      expect(keys.has('')).toBe(false);
    });
  });

  describe('isValidApiKey', () => {
    beforeEach(() => {
      process.env.DISPATCH_API_KEYS = 'valid-key-1,valid-key-2';
    });

    it('should return false for undefined API key', () => {
      expect(isValidApiKey(undefined)).toBe(false);
    });

    it('should return false for empty string API key', () => {
      expect(isValidApiKey('')).toBe(false);
    });

    it('should return false for whitespace-only API key', () => {
      expect(isValidApiKey('   ')).toBe(false);
    });

    it('should return false for invalid API key', () => {
      expect(isValidApiKey('invalid-key')).toBe(false);
    });

    it('should return true for valid API key', () => {
      expect(isValidApiKey('valid-key-1')).toBe(true);
      expect(isValidApiKey('valid-key-2')).toBe(true);
    });

    it('should return false when no API keys are configured', () => {
      delete process.env.DISPATCH_API_KEYS;
      expect(isValidApiKey('any-key')).toBe(false);
    });

    it('should trim whitespace from provided API key', () => {
      expect(isValidApiKey(' valid-key-1 ')).toBe(true);
    });
  });

  describe('authMiddleware', () => {
    describe('Missing API Key (Requirement 9.1)', () => {
      beforeEach(() => {
        process.env.DISPATCH_API_KEYS = 'valid-key';
      });

      it('should return 401 when X-API-Key header is missing', () => {
        authMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'UNAUTHORIZED',
              message: expect.stringContaining('Missing API key'),
            }),
            requestId: 'test-correlation-id',
          })
        );
        expect(nextFunction).not.toHaveBeenCalled();
      });

      it('should not call next when API key is missing', () => {
        authMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).not.toHaveBeenCalled();
      });
    });

    describe('Invalid API Key (Requirement 9.2)', () => {
      beforeEach(() => {
        process.env.DISPATCH_API_KEYS = 'valid-key';
      });

      it('should return 401 when API key is invalid', () => {
        mockRequest.headers = {
          'x-api-key': 'invalid-key',
        };

        authMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'UNAUTHORIZED',
              message: expect.stringContaining('Invalid API key'),
            }),
            requestId: 'test-correlation-id',
          })
        );
        expect(nextFunction).not.toHaveBeenCalled();
      });

      it('should return 401 when no API keys are configured', () => {
        delete process.env.DISPATCH_API_KEYS;
        mockRequest.headers = {
          'x-api-key': 'any-key',
        };

        authMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(nextFunction).not.toHaveBeenCalled();
      });
    });

    describe('Valid API Key (Requirement 9.3)', () => {
      beforeEach(() => {
        process.env.DISPATCH_API_KEYS = 'valid-key-1,valid-key-2';
      });

      it('should call next when API key is valid', () => {
        mockRequest.headers = {
          'x-api-key': 'valid-key-1',
        };

        authMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalledTimes(1);
        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).not.toHaveBeenCalled();
      });

      it('should handle case-insensitive header name', () => {
        mockRequest.headers = {
          'x-api-key': 'valid-key-1',
        };

        authMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });
    });

    describe('Multiple API Keys (Requirement 9.4)', () => {
      beforeEach(() => {
        process.env.DISPATCH_API_KEYS = 'client-a-key,client-b-key,client-c-key';
      });

      it('should accept first configured API key', () => {
        mockRequest.headers = {
          'x-api-key': 'client-a-key',
        };

        authMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it('should accept second configured API key', () => {
        mockRequest.headers = {
          'x-api-key': 'client-b-key',
        };

        authMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it('should accept third configured API key', () => {
        mockRequest.headers = {
          'x-api-key': 'client-c-key',
        };

        authMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it('should reject key not in configured list', () => {
        mockRequest.headers = {
          'x-api-key': 'unknown-client-key',
        };

        authMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(nextFunction).not.toHaveBeenCalled();
      });
    });

    describe('Error Response Format', () => {
      beforeEach(() => {
        process.env.DISPATCH_API_KEYS = 'valid-key';
      });

      it('should include requestId in error response', () => {
        authMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            requestId: 'test-correlation-id',
          })
        );
      });

      it('should include error code in error response', () => {
        authMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'UNAUTHORIZED',
            }),
          })
        );
      });
    });
  });

  describe('Header Constant', () => {
    it('should export correct header name', () => {
      expect(API_KEY_HEADER).toBe('X-API-Key');
    });
  });
});
