/**
 * Unit tests for Zod Validation Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, validateBody, validateParams, validateQuery } from '../../../src/middleware/validate.js';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {},
      correlationId: 'test-correlation-id',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  describe('validate', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().int().positive(),
    });

    describe('body validation', () => {
      it('should call next when body is valid', () => {
        mockRequest.body = { name: 'John', age: 25 };

        const middleware = validate(testSchema, 'body');
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it('should return 400 when body is invalid', () => {
        mockRequest.body = { name: '', age: -5 };

        const middleware = validate(testSchema, 'body');
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'VALIDATION_ERROR',
            }),
            requestId: 'test-correlation-id',
          })
        );
        expect(nextFunction).not.toHaveBeenCalled();
      });

      it('should include field errors in response', () => {
        mockRequest.body = { name: '' };

        const middleware = validate(testSchema, 'body');
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              details: expect.objectContaining({
                errors: expect.arrayContaining([
                  expect.objectContaining({
                    field: expect.any(String),
                    message: expect.any(String),
                  }),
                ]),
              }),
            }),
          })
        );
      });

      it('should update request body with validated data', () => {
        mockRequest.body = { name: 'John', age: 25 };

        const middleware = validate(testSchema, 'body');
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockRequest.body).toEqual({ name: 'John', age: 25 });
      });
    });

    describe('params validation', () => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
      });

      it('should call next when params are valid', () => {
        mockRequest.params = { id: '550e8400-e29b-41d4-a716-446655440000' };

        const middleware = validate(paramsSchema, 'params');
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it('should return 400 when params are invalid', () => {
        mockRequest.params = { id: 'not-a-uuid' };

        const middleware = validate(paramsSchema, 'params');
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(nextFunction).not.toHaveBeenCalled();
      });
    });

    describe('query validation', () => {
      const querySchema = z.object({
        limit: z.coerce.number().int().min(1).max(100).default(10),
        offset: z.coerce.number().int().min(0).default(0),
      });

      it('should call next when query is valid', () => {
        mockRequest.query = { limit: '50', offset: '10' };

        const middleware = validate(querySchema, 'query');
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it('should coerce string numbers to actual numbers', () => {
        mockRequest.query = { limit: '50', offset: '10' };

        const middleware = validate(querySchema, 'query');
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        // Check validatedQuery was set
        const req = mockRequest as Request & { validatedQuery: { limit: number; offset: number } };
        expect(req.validatedQuery.limit).toBe(50);
        expect(req.validatedQuery.offset).toBe(10);
      });

      it('should apply defaults when values are missing', () => {
        mockRequest.query = {};

        const middleware = validate(querySchema, 'query');
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        const req = mockRequest as Request & { validatedQuery: { limit: number; offset: number } };
        expect(req.validatedQuery.limit).toBe(10);
        expect(req.validatedQuery.offset).toBe(0);
      });

      it('should return 400 when query is invalid', () => {
        mockRequest.query = { limit: '500' }; // exceeds max of 100

        const middleware = validate(querySchema, 'query');
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(nextFunction).not.toHaveBeenCalled();
      });
    });
  });

  describe('convenience functions', () => {
    const bodySchema = z.object({ name: z.string() });
    const paramsSchema = z.object({ id: z.string() });
    const querySchema = z.object({ page: z.string().optional() });

    it('validateBody should validate body', () => {
      mockRequest.body = { name: 'test' };

      const middleware = validateBody(bodySchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('validateParams should validate params', () => {
      mockRequest.params = { id: 'test-id' };

      const middleware = validateParams(paramsSchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('validateQuery should validate query', () => {
      mockRequest.query = { page: '1' };

      const middleware = validateQuery(querySchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe('error formatting', () => {
    it('should format nested field paths correctly', () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(1),
          }),
        }),
      });

      mockRequest.body = { user: { profile: { name: '' } } };

      const middleware = validate(nestedSchema, 'body');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              errors: expect.arrayContaining([
                expect.objectContaining({
                  field: 'user.profile.name',
                }),
              ]),
            }),
          }),
        })
      );
    });

    it('should use root for errors without path', () => {
      const stringSchema = z.string();

      mockRequest.body = 123; // not a string

      const middleware = validate(stringSchema, 'body');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              errors: expect.arrayContaining([
                expect.objectContaining({
                  field: 'root',
                }),
              ]),
            }),
          }),
        })
      );
    });
  });
});
