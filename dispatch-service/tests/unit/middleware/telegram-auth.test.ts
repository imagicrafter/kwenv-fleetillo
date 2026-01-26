/**
 * Unit tests for Telegram Webhook Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { telegramAuthMiddleware } from '../../../src/middleware/telegram-auth.js';

describe('Telegram Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let originalEnv: { secret?: string; nodeEnv?: string };

  const VALID_SECRET = 'test-webhook-secret-token-12345';

  beforeEach(() => {
    // Save original env
    originalEnv = {
      secret: process.env.TELEGRAM_WEBHOOK_SECRET,
      nodeEnv: process.env.NODE_ENV,
    };

    mockRequest = {
      headers: {},
      correlationId: 'test-correlation-id',
      path: '/api/v1/telegram/webhook',
      method: 'POST',
      ip: '127.0.0.1',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv.secret !== undefined) {
      process.env.TELEGRAM_WEBHOOK_SECRET = originalEnv.secret;
    } else {
      delete process.env.TELEGRAM_WEBHOOK_SECRET;
    }
    if (originalEnv.nodeEnv !== undefined) {
      process.env.NODE_ENV = originalEnv.nodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe('when TELEGRAM_WEBHOOK_SECRET is not configured', () => {
    beforeEach(() => {
      delete process.env.TELEGRAM_WEBHOOK_SECRET;
    });

    it('should skip validation in development mode', () => {
      process.env.NODE_ENV = 'development';

      telegramAuthMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should skip validation in production mode but allow requests through', () => {
      process.env.NODE_ENV = 'production';

      telegramAuthMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe('when TELEGRAM_WEBHOOK_SECRET is configured', () => {
    beforeEach(() => {
      process.env.TELEGRAM_WEBHOOK_SECRET = VALID_SECRET;
    });

    it('should return 401 when secret token header is missing', () => {
      telegramAuthMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
            message: expect.stringContaining('Missing webhook authentication token'),
          }),
          requestId: 'test-correlation-id',
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when secret token is invalid', () => {
      mockRequest.headers = {
        'x-telegram-bot-api-secret-token': 'invalid-secret',
      };

      telegramAuthMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
            message: expect.stringContaining('Invalid webhook authentication token'),
          }),
          requestId: 'test-correlation-id',
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should call next when secret token is valid', () => {
      mockRequest.headers = {
        'x-telegram-bot-api-secret-token': VALID_SECRET,
      };

      telegramAuthMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should use timing-safe comparison', () => {
      // Test that same-length but different tokens are rejected
      const wrongToken = 'x'.repeat(VALID_SECRET.length);
      mockRequest.headers = {
        'x-telegram-bot-api-secret-token': wrongToken,
      };

      telegramAuthMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle different length tokens', () => {
      mockRequest.headers = {
        'x-telegram-bot-api-secret-token': 'short',
      };

      telegramAuthMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('error response format', () => {
    beforeEach(() => {
      process.env.TELEGRAM_WEBHOOK_SECRET = VALID_SECRET;
    });

    it('should include requestId in error response', () => {
      telegramAuthMiddleware(
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

    it('should include error code UNAUTHORIZED', () => {
      telegramAuthMiddleware(
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
