/**
 * Unit tests for Request Logger Middleware
 *
 * @requirements 12.2 - Structured JSON logging for all log entries
 * @requirements 12.4 - Include correlation IDs in logs for request tracing
 */

import { Request, Response, NextFunction } from 'express';
import { EventEmitter } from 'events';
import { requestLoggerMiddleware } from '../../../src/middleware/request-logger.js';
import { logger } from '../../../src/utils/logger.js';

// Mock the logger
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Request Logger Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: EventEmitter & { statusCode: number };
  let nextFunction: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      correlationId: 'test-correlation-id',
      method: 'GET',
      path: '/api/v1/test',
      query: {},
      get: jest.fn().mockReturnValue('test-user-agent'),
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as any,
    };

    // Create response as EventEmitter to support 'finish' event
    const emitter = new EventEmitter();
    mockResponse = Object.assign(emitter, {
      statusCode: 200,
    });

    nextFunction = jest.fn();
  });

  describe('Request Logging', () => {
    it('should log incoming request', () => {
      requestLoggerMiddleware(
        mockRequest as Request,
        mockResponse as unknown as Response,
        nextFunction
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          correlationId: 'test-correlation-id',
          method: 'GET',
          path: '/api/v1/test',
        })
      );
    });

    it('should include user agent in request log', () => {
      requestLoggerMiddleware(
        mockRequest as Request,
        mockResponse as unknown as Response,
        nextFunction
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          userAgent: 'test-user-agent',
        })
      );
    });

    it('should include IP address in request log', () => {
      requestLoggerMiddleware(
        mockRequest as Request,
        mockResponse as unknown as Response,
        nextFunction
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          ip: '127.0.0.1',
        })
      );
    });

    it('should include query parameters when present', () => {
      mockRequest.query = { page: '1', limit: '10' };

      requestLoggerMiddleware(
        mockRequest as Request,
        mockResponse as unknown as Response,
        nextFunction
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          query: { page: '1', limit: '10' },
        })
      );
    });

    it('should not include query when empty', () => {
      mockRequest.query = {};

      requestLoggerMiddleware(
        mockRequest as Request,
        mockResponse as unknown as Response,
        nextFunction
      );

      const logCall = (logger.info as jest.Mock).mock.calls[0];
      expect(logCall[1].query).toBeUndefined();
    });
  });

  describe('Response Logging', () => {
    it('should log response on finish event', () => {
      requestLoggerMiddleware(
        mockRequest as Request,
        mockResponse as unknown as Response,
        nextFunction
      );

      // Simulate response finish
      mockResponse.emit('finish');

      expect(logger.info).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          correlationId: 'test-correlation-id',
          method: 'GET',
          path: '/api/v1/test',
          statusCode: 200,
        })
      );
    });

    it('should include duration in response log', () => {
      requestLoggerMiddleware(
        mockRequest as Request,
        mockResponse as unknown as Response,
        nextFunction
      );

      // Simulate response finish
      mockResponse.emit('finish');

      expect(logger.info).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          durationMs: expect.any(Number),
        })
      );
    });

    it('should log warning for 4xx status codes', () => {
      mockResponse.statusCode = 404;

      requestLoggerMiddleware(
        mockRequest as Request,
        mockResponse as unknown as Response,
        nextFunction
      );

      mockResponse.emit('finish');

      expect(logger.warn).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          statusCode: 404,
        })
      );
    });

    it('should log warning for 5xx status codes', () => {
      mockResponse.statusCode = 500;

      requestLoggerMiddleware(
        mockRequest as Request,
        mockResponse as unknown as Response,
        nextFunction
      );

      mockResponse.emit('finish');

      expect(logger.warn).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          statusCode: 500,
        })
      );
    });

    it('should log info for successful status codes', () => {
      mockResponse.statusCode = 201;

      requestLoggerMiddleware(
        mockRequest as Request,
        mockResponse as unknown as Response,
        nextFunction
      );

      mockResponse.emit('finish');

      // Second call should be for response (first is for request)
      const responseCalls = (logger.info as jest.Mock).mock.calls.filter(
        (call) => call[0] === 'Request completed'
      );
      expect(responseCalls.length).toBe(1);
    });
  });

  describe('Middleware Chain', () => {
    it('should call next function', () => {
      requestLoggerMiddleware(
        mockRequest as Request,
        mockResponse as unknown as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should call next without arguments', () => {
      requestLoggerMiddleware(
        mockRequest as Request,
        mockResponse as unknown as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
    });
  });

  describe('Different HTTP Methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    methods.forEach((method) => {
      it(`should log ${method} requests`, () => {
        mockRequest.method = method;

        requestLoggerMiddleware(
          mockRequest as Request,
          mockResponse as unknown as Response,
          nextFunction
        );

        expect(logger.info).toHaveBeenCalledWith(
          'Incoming request',
          expect.objectContaining({
            method,
          })
        );
      });
    });
  });
});
