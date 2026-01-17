/**
 * Unit tests for Correlation ID Middleware
 *
 * @requirements 12.4 - Include correlation IDs in logs for request tracing
 */

import { Request, Response, NextFunction } from 'express';
import { correlationMiddleware, CORRELATION_ID_HEADER } from '../../../src/middleware/correlation.js';

describe('Correlation ID Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  describe('Correlation ID Generation', () => {
    it('should generate a UUID when no correlation ID is provided', () => {
      correlationMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.correlationId).toBeDefined();
      expect(mockRequest.correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should generate unique IDs for different requests', () => {
      const request1: Partial<Request> = { headers: {} };
      const request2: Partial<Request> = { headers: {} };

      correlationMiddleware(request1 as Request, mockResponse as Response, nextFunction);
      correlationMiddleware(request2 as Request, mockResponse as Response, nextFunction);

      expect(request1.correlationId).not.toBe(request2.correlationId);
    });
  });

  describe('Correlation ID Propagation', () => {
    it('should use existing correlation ID from header', () => {
      const existingId = 'existing-correlation-id-123';
      mockRequest.headers = {
        'x-correlation-id': existingId,
      };

      correlationMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.correlationId).toBe(existingId);
    });

    it('should handle case-insensitive header name', () => {
      const existingId = 'case-insensitive-id';
      mockRequest.headers = {
        'x-correlation-id': existingId,
      };

      correlationMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.correlationId).toBe(existingId);
    });
  });

  describe('Response Header', () => {
    it('should set correlation ID in response header', () => {
      correlationMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        CORRELATION_ID_HEADER,
        mockRequest.correlationId
      );
    });

    it('should set provided correlation ID in response header', () => {
      const existingId = 'provided-id';
      mockRequest.headers = {
        'x-correlation-id': existingId,
      };

      correlationMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        CORRELATION_ID_HEADER,
        existingId
      );
    });
  });

  describe('Middleware Chain', () => {
    it('should call next function', () => {
      correlationMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should call next without arguments', () => {
      correlationMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
    });
  });

  describe('Header Constant', () => {
    it('should export correct header name', () => {
      expect(CORRELATION_ID_HEADER).toBe('X-Correlation-ID');
    });
  });
});
