/**
 * Unit tests for Dispatch API Handler
 *
 * @requirements 1.1 - Create dispatch record and initiate message delivery
 * @requirements 1.4 - Return dispatch_id and status immediately
 * @requirements 1.5 - Return 404 error if route_id or driver_id does not exist
 * @requirements 1.6 - Return 400 error for malformed or missing required fields
 * @requirements 2.1 - Process batch dispatch items and return results
 * @requirements 2.4 - Return array of results with dispatch_id and status
 * @requirements 2.5 - Return 400 error if batch array is empty
 * @requirements 2.6 - Limit batch size to maximum of 100 items
 */

import { Request, Response } from 'express';
import {
  createDispatchHandler,
  createBatchDispatchHandler,
  createGetDispatchHandler,
  validateDispatchRequest,
  validateBatchDispatchRequest,
  MAX_BATCH_SIZE,
} from '../../../src/api/handlers/dispatch.js';
import {
  DispatchOrchestrator,
  EntityNotFoundError,
  DispatchResult,
  BatchDispatchResult,
} from '../../../src/core/orchestrator.js';

// Import to get the Express Request type extension for correlationId
import '../../../src/middleware/correlation.js';

// Mock the orchestrator
jest.mock('../../../src/core/orchestrator.js', () => {
  const actual = jest.requireActual('../../../src/core/orchestrator.js');
  return {
    ...actual,
    DispatchOrchestrator: jest.fn(),
  };
});

describe('Dispatch Handler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockOrchestrator: jest.Mocked<DispatchOrchestrator>;
  let handler: ReturnType<typeof createDispatchHandler>;

  beforeEach(() => {
    mockRequest = {
      body: {},
      correlationId: 'test-correlation-id',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockOrchestrator = {
      dispatch: jest.fn(),
      dispatchBatch: jest.fn(),
      getDispatch: jest.fn(),
      registerAdapter: jest.fn(),
    } as unknown as jest.Mocked<DispatchOrchestrator>;

    handler = createDispatchHandler(mockOrchestrator);
  });

  describe('validateDispatchRequest', () => {
    describe('route_id validation', () => {
      it('should return error when route_id is missing', () => {
        const errors = validateDispatchRequest({
          driver_id: '123e4567-e89b-12d3-a456-426614174000',
        });

        expect(errors).toContainEqual({
          field: 'route_id',
          message: 'route_id is required',
        });
      });

      it('should return error when route_id is not a string', () => {
        const errors = validateDispatchRequest({
          route_id: 123,
          driver_id: '123e4567-e89b-12d3-a456-426614174000',
        });

        expect(errors).toContainEqual({
          field: 'route_id',
          message: 'route_id must be a string',
        });
      });

      it('should return error when route_id is not a valid UUID', () => {
        const errors = validateDispatchRequest({
          route_id: 'not-a-uuid',
          driver_id: '123e4567-e89b-12d3-a456-426614174000',
        });

        expect(errors).toContainEqual({
          field: 'route_id',
          message: 'route_id must be a valid UUID',
        });
      });
    });

    describe('driver_id validation', () => {
      it('should return error when driver_id is missing', () => {
        const errors = validateDispatchRequest({
          route_id: '123e4567-e89b-12d3-a456-426614174000',
        });

        expect(errors).toContainEqual({
          field: 'driver_id',
          message: 'driver_id is required',
        });
      });

      it('should return error when driver_id is not a string', () => {
        const errors = validateDispatchRequest({
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: 456,
        });

        expect(errors).toContainEqual({
          field: 'driver_id',
          message: 'driver_id must be a string',
        });
      });

      it('should return error when driver_id is not a valid UUID', () => {
        const errors = validateDispatchRequest({
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: 'invalid-uuid',
        });

        expect(errors).toContainEqual({
          field: 'driver_id',
          message: 'driver_id must be a valid UUID',
        });
      });
    });

    describe('channels validation', () => {
      it('should return error when channels is not an array', () => {
        const errors = validateDispatchRequest({
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
          channels: 'telegram',
        });

        expect(errors).toContainEqual({
          field: 'channels',
          message: 'channels must be an array',
        });
      });

      it('should return error for invalid channel type', () => {
        const errors = validateDispatchRequest({
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
          channels: ['telegram', 'invalid'],
        });

        expect(errors).toContainEqual({
          field: 'channels[1]',
          message: 'Invalid channel type: invalid. Must be one of: telegram, email, sms, push',
        });
      });

      it('should accept valid channel types', () => {
        const errors = validateDispatchRequest({
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
          channels: ['telegram', 'email'],
        });

        expect(errors).toHaveLength(0);
      });
    });

    describe('multi_channel validation', () => {
      it('should return error when multi_channel is not a boolean', () => {
        const errors = validateDispatchRequest({
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
          multi_channel: 'true',
        });

        expect(errors).toContainEqual({
          field: 'multi_channel',
          message: 'multi_channel must be a boolean',
        });
      });

      it('should accept boolean multi_channel', () => {
        const errors = validateDispatchRequest({
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
          multi_channel: true,
        });

        expect(errors).toHaveLength(0);
      });
    });

    describe('metadata validation', () => {
      it('should return error when metadata is not an object', () => {
        const errors = validateDispatchRequest({
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
          metadata: 'not-an-object',
        });

        expect(errors).toContainEqual({
          field: 'metadata',
          message: 'metadata must be an object',
        });
      });

      it('should return error when metadata is an array', () => {
        const errors = validateDispatchRequest({
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
          metadata: ['array'],
        });

        expect(errors).toContainEqual({
          field: 'metadata',
          message: 'metadata must be an object',
        });
      });

      it('should return error when metadata is null', () => {
        const errors = validateDispatchRequest({
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
          metadata: null,
        });

        expect(errors).toContainEqual({
          field: 'metadata',
          message: 'metadata must be an object',
        });
      });

      it('should accept valid metadata object', () => {
        const errors = validateDispatchRequest({
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
          metadata: { key: 'value' },
        });

        expect(errors).toHaveLength(0);
      });
    });

    describe('body validation', () => {
      it('should return error when body is null', () => {
        const errors = validateDispatchRequest(null);

        expect(errors).toContainEqual({
          field: 'body',
          message: 'Request body must be a JSON object',
        });
      });

      it('should return error when body is undefined', () => {
        const errors = validateDispatchRequest(undefined);

        expect(errors).toContainEqual({
          field: 'body',
          message: 'Request body must be a JSON object',
        });
      });

      it('should return error when body is a string', () => {
        const errors = validateDispatchRequest('string');

        expect(errors).toContainEqual({
          field: 'body',
          message: 'Request body must be a JSON object',
        });
      });
    });

    describe('valid request', () => {
      it('should return no errors for minimal valid request', () => {
        const errors = validateDispatchRequest({
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
        });

        expect(errors).toHaveLength(0);
      });

      it('should return no errors for full valid request', () => {
        const errors = validateDispatchRequest({
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
          channels: ['telegram', 'email'],
          multi_channel: true,
          metadata: { source: 'test' },
        });

        expect(errors).toHaveLength(0);
      });
    });
  });

  describe('dispatchHandler', () => {
    describe('Validation Errors (Requirement 1.6)', () => {
      it('should return 400 when route_id is missing', async () => {
        mockRequest.body = {
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
        };

        await handler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'VALIDATION_ERROR',
              message: 'route_id is required',
            }),
            requestId: 'test-correlation-id',
          })
        );
        expect(mockOrchestrator.dispatch).not.toHaveBeenCalled();
      });

      it('should return 400 when driver_id is missing', async () => {
        mockRequest.body = {
          route_id: '123e4567-e89b-12d3-a456-426614174000',
        };

        await handler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'VALIDATION_ERROR',
              message: 'driver_id is required',
            }),
          })
        );
        expect(mockOrchestrator.dispatch).not.toHaveBeenCalled();
      });

      it('should return 400 with validation details', async () => {
        mockRequest.body = {
          route_id: 'invalid',
          driver_id: 'invalid',
        };

        await handler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'VALIDATION_ERROR',
              details: expect.objectContaining({
                errors: expect.arrayContaining([
                  expect.objectContaining({ field: 'route_id' }),
                  expect.objectContaining({ field: 'driver_id' }),
                ]),
              }),
            }),
          })
        );
      });
    });

    describe('Entity Not Found (Requirement 1.5)', () => {
      it('should return 404 when route is not found', async () => {
        mockRequest.body = {
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
        };

        mockOrchestrator.dispatch.mockRejectedValue(
          new EntityNotFoundError('route', '123e4567-e89b-12d3-a456-426614174000')
        );

        await handler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'NOT_FOUND',
              message: 'Route not found: 123e4567-e89b-12d3-a456-426614174000',
              details: expect.objectContaining({
                entityType: 'route',
                entityId: '123e4567-e89b-12d3-a456-426614174000',
              }),
            }),
            requestId: 'test-correlation-id',
          })
        );
      });

      it('should return 404 when driver is not found', async () => {
        mockRequest.body = {
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
        };

        mockOrchestrator.dispatch.mockRejectedValue(
          new EntityNotFoundError('driver', '123e4567-e89b-12d3-a456-426614174001')
        );

        await handler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'NOT_FOUND',
              message: 'Driver not found: 123e4567-e89b-12d3-a456-426614174001',
              details: expect.objectContaining({
                entityType: 'driver',
                entityId: '123e4567-e89b-12d3-a456-426614174001',
              }),
            }),
          })
        );
      });
    });

    describe('Successful Dispatch (Requirements 1.1, 1.4)', () => {
      it('should return 202 Accepted with dispatch info', async () => {
        mockRequest.body = {
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
        };

        const mockResult: DispatchResult = {
          dispatchId: '123e4567-e89b-12d3-a456-426614174002',
          status: 'pending',
          requestedChannels: ['telegram'],
        };

        mockOrchestrator.dispatch.mockResolvedValue(mockResult);

        await handler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(202);
        expect(mockResponse.json).toHaveBeenCalledWith({
          dispatch_id: '123e4567-e89b-12d3-a456-426614174002',
          status: 'pending',
          requested_channels: ['telegram'],
        });
      });

      it('should pass correct parameters to orchestrator', async () => {
        mockRequest.body = {
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
          channels: ['telegram', 'email'],
          multi_channel: true,
          metadata: { source: 'test' },
        };

        const mockResult: DispatchResult = {
          dispatchId: '123e4567-e89b-12d3-a456-426614174002',
          status: 'pending',
          requestedChannels: ['telegram', 'email'],
        };

        mockOrchestrator.dispatch.mockResolvedValue(mockResult);

        await handler(mockRequest as Request, mockResponse as Response);

        expect(mockOrchestrator.dispatch).toHaveBeenCalledWith({
          routeId: '123e4567-e89b-12d3-a456-426614174000',
          driverId: '123e4567-e89b-12d3-a456-426614174001',
          channels: ['telegram', 'email'],
          multiChannel: true,
          metadata: { source: 'test' },
        });
      });

      it('should return snake_case response fields', async () => {
        mockRequest.body = {
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
        };

        const mockResult: DispatchResult = {
          dispatchId: 'dispatch-123',
          status: 'pending',
          requestedChannels: ['telegram', 'email'],
        };

        mockOrchestrator.dispatch.mockResolvedValue(mockResult);

        await handler(mockRequest as Request, mockResponse as Response);

        const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(responseBody).toHaveProperty('dispatch_id');
        expect(responseBody).toHaveProperty('requested_channels');
        expect(responseBody).not.toHaveProperty('dispatchId');
        expect(responseBody).not.toHaveProperty('requestedChannels');
      });
    });

    describe('Unexpected Errors', () => {
      it('should re-throw unexpected errors', async () => {
        mockRequest.body = {
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
        };

        const unexpectedError = new Error('Database connection failed');
        mockOrchestrator.dispatch.mockRejectedValue(unexpectedError);

        await expect(
          handler(mockRequest as Request, mockResponse as Response)
        ).rejects.toThrow('Database connection failed');
      });
    });
  });
});


describe('Batch Dispatch Handler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockOrchestrator: jest.Mocked<DispatchOrchestrator>;
  let batchHandler: ReturnType<typeof createBatchDispatchHandler>;

  beforeEach(() => {
    mockRequest = {
      body: {},
      correlationId: 'test-correlation-id',
    } as Partial<Request>;

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockOrchestrator = {
      dispatch: jest.fn(),
      dispatchBatch: jest.fn(),
      getDispatch: jest.fn(),
      registerAdapter: jest.fn(),
    } as unknown as jest.Mocked<DispatchOrchestrator>;

    batchHandler = createBatchDispatchHandler(mockOrchestrator);
  });

  describe('validateBatchDispatchRequest', () => {
    describe('dispatches array validation', () => {
      it('should return error when dispatches is missing', () => {
        const result = validateBatchDispatchRequest({});

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'dispatches',
          message: 'dispatches array is required',
        });
      });

      it('should return error when dispatches is not an array', () => {
        const result = validateBatchDispatchRequest({
          dispatches: 'not-an-array',
        });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'dispatches',
          message: 'dispatches must be an array',
        });
      });

      it('should return error when dispatches array is empty', () => {
        const result = validateBatchDispatchRequest({
          dispatches: [],
        });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'dispatches',
          message: 'dispatches array cannot be empty',
        });
      });

      it('should return error when batch size exceeds maximum', () => {
        const dispatches = Array(101).fill({
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
        });

        const result = validateBatchDispatchRequest({ dispatches });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'dispatches',
          message: `Batch size exceeds maximum of ${MAX_BATCH_SIZE} items`,
        });
      });

      it('should accept batch at maximum size limit', () => {
        const dispatches = Array(100).fill({
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
        });

        const result = validateBatchDispatchRequest({ dispatches });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('item validation', () => {
      it('should return item errors for invalid items', () => {
        const result = validateBatchDispatchRequest({
          dispatches: [
            {
              route_id: '123e4567-e89b-12d3-a456-426614174000',
              driver_id: '123e4567-e89b-12d3-a456-426614174001',
            },
            {
              route_id: 'invalid-uuid',
              driver_id: '123e4567-e89b-12d3-a456-426614174001',
            },
          ],
        });

        expect(result.isValid).toBe(false);
        expect(result.itemErrors).toBeDefined();
        expect(result.itemErrors?.has(1)).toBe(true);
        expect(result.itemErrors?.get(1)).toContainEqual({
          field: 'route_id',
          message: 'route_id must be a valid UUID',
        });
      });

      it('should return valid for all valid items', () => {
        const result = validateBatchDispatchRequest({
          dispatches: [
            {
              route_id: '123e4567-e89b-12d3-a456-426614174000',
              driver_id: '123e4567-e89b-12d3-a456-426614174001',
            },
            {
              route_id: '123e4567-e89b-12d3-a456-426614174002',
              driver_id: '123e4567-e89b-12d3-a456-426614174003',
              channels: ['telegram'],
            },
          ],
        });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.itemErrors).toBeUndefined();
      });
    });

    describe('body validation', () => {
      it('should return error when body is null', () => {
        const result = validateBatchDispatchRequest(null);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'body',
          message: 'Request body must be a JSON object',
        });
      });

      it('should return error when body is undefined', () => {
        const result = validateBatchDispatchRequest(undefined);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'body',
          message: 'Request body must be a JSON object',
        });
      });
    });
  });

  describe('batchDispatchHandler', () => {
    describe('Validation Errors (Requirements 2.5, 2.6)', () => {
      it('should return 400 when dispatches array is missing', async () => {
        mockRequest.body = {};

        await batchHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'VALIDATION_ERROR',
              message: 'dispatches array is required',
            }),
            requestId: 'test-correlation-id',
          })
        );
        expect(mockOrchestrator.dispatchBatch).not.toHaveBeenCalled();
      });

      it('should return 400 when dispatches array is empty', async () => {
        mockRequest.body = { dispatches: [] };

        await batchHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'VALIDATION_ERROR',
              message: 'dispatches array cannot be empty',
            }),
          })
        );
        expect(mockOrchestrator.dispatchBatch).not.toHaveBeenCalled();
      });

      it('should return 400 when batch size exceeds 100 items', async () => {
        mockRequest.body = {
          dispatches: Array(101).fill({
            route_id: '123e4567-e89b-12d3-a456-426614174000',
            driver_id: '123e4567-e89b-12d3-a456-426614174001',
          }),
        };

        await batchHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'VALIDATION_ERROR',
              message: `Batch size exceeds maximum of ${MAX_BATCH_SIZE} items`,
            }),
          })
        );
        expect(mockOrchestrator.dispatchBatch).not.toHaveBeenCalled();
      });

      it('should return 400 when dispatches is not an array', async () => {
        mockRequest.body = { dispatches: 'not-an-array' };

        await batchHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'VALIDATION_ERROR',
              message: 'dispatches must be an array',
            }),
          })
        );
        expect(mockOrchestrator.dispatchBatch).not.toHaveBeenCalled();
      });
    });

    describe('Successful Batch Dispatch (Requirements 2.1, 2.4)', () => {
      it('should return 202 Accepted with results and summary', async () => {
        mockRequest.body = {
          dispatches: [
            {
              route_id: '123e4567-e89b-12d3-a456-426614174000',
              driver_id: '123e4567-e89b-12d3-a456-426614174001',
            },
            {
              route_id: '123e4567-e89b-12d3-a456-426614174002',
              driver_id: '123e4567-e89b-12d3-a456-426614174003',
            },
          ],
        };

        const mockResult: BatchDispatchResult = {
          results: [
            { index: 0, success: true, dispatchId: 'dispatch-1' },
            { index: 1, success: true, dispatchId: 'dispatch-2' },
          ],
          summary: {
            total: 2,
            successful: 2,
            failed: 0,
          },
        };

        mockOrchestrator.dispatchBatch.mockResolvedValue(mockResult);

        await batchHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(202);
        expect(mockResponse.json).toHaveBeenCalledWith({
          results: [
            { index: 0, success: true, dispatch_id: 'dispatch-1', error: undefined },
            { index: 1, success: true, dispatch_id: 'dispatch-2', error: undefined },
          ],
          summary: {
            total: 2,
            successful: 2,
            failed: 0,
          },
        });
      });

      it('should return results with mixed success and failure', async () => {
        mockRequest.body = {
          dispatches: [
            {
              route_id: '123e4567-e89b-12d3-a456-426614174000',
              driver_id: '123e4567-e89b-12d3-a456-426614174001',
            },
            {
              route_id: '123e4567-e89b-12d3-a456-426614174002',
              driver_id: '123e4567-e89b-12d3-a456-426614174003',
            },
          ],
        };

        const mockResult: BatchDispatchResult = {
          results: [
            { index: 0, success: true, dispatchId: 'dispatch-1' },
            { index: 1, success: false, error: 'Route not found' },
          ],
          summary: {
            total: 2,
            successful: 1,
            failed: 1,
          },
        };

        mockOrchestrator.dispatchBatch.mockResolvedValue(mockResult);

        await batchHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(202);
        expect(mockResponse.json).toHaveBeenCalledWith({
          results: [
            { index: 0, success: true, dispatch_id: 'dispatch-1', error: undefined },
            { index: 1, success: false, dispatch_id: undefined, error: 'Route not found' },
          ],
          summary: {
            total: 2,
            successful: 1,
            failed: 1,
          },
        });
      });

      it('should pass correct parameters to orchestrator', async () => {
        mockRequest.body = {
          dispatches: [
            {
              route_id: '123e4567-e89b-12d3-a456-426614174000',
              driver_id: '123e4567-e89b-12d3-a456-426614174001',
              channels: ['telegram'],
            },
            {
              route_id: '123e4567-e89b-12d3-a456-426614174002',
              driver_id: '123e4567-e89b-12d3-a456-426614174003',
              multi_channel: true,
            },
          ],
        };

        const mockResult: BatchDispatchResult = {
          results: [
            { index: 0, success: true, dispatchId: 'dispatch-1' },
            { index: 1, success: true, dispatchId: 'dispatch-2' },
          ],
          summary: {
            total: 2,
            successful: 2,
            failed: 0,
          },
        };

        mockOrchestrator.dispatchBatch.mockResolvedValue(mockResult);

        await batchHandler(mockRequest as Request, mockResponse as Response);

        expect(mockOrchestrator.dispatchBatch).toHaveBeenCalledWith([
          {
            routeId: '123e4567-e89b-12d3-a456-426614174000',
            driverId: '123e4567-e89b-12d3-a456-426614174001',
            channels: ['telegram'],
            multiChannel: undefined,
            metadata: undefined,
          },
          {
            routeId: '123e4567-e89b-12d3-a456-426614174002',
            driverId: '123e4567-e89b-12d3-a456-426614174003',
            channels: undefined,
            multiChannel: true,
            metadata: undefined,
          },
        ]);
      });

      it('should return snake_case response fields', async () => {
        mockRequest.body = {
          dispatches: [
            {
              route_id: '123e4567-e89b-12d3-a456-426614174000',
              driver_id: '123e4567-e89b-12d3-a456-426614174001',
            },
          ],
        };

        const mockResult: BatchDispatchResult = {
          results: [{ index: 0, success: true, dispatchId: 'dispatch-1' }],
          summary: { total: 1, successful: 1, failed: 0 },
        };

        mockOrchestrator.dispatchBatch.mockResolvedValue(mockResult);

        await batchHandler(mockRequest as Request, mockResponse as Response);

        const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(responseBody.results[0]).toHaveProperty('dispatch_id');
        expect(responseBody.results[0]).not.toHaveProperty('dispatchId');
      });

      it('should handle batch at maximum size limit', async () => {
        const dispatches = Array(100)
          .fill(null)
          .map((_, i) => ({
            route_id: `123e4567-e89b-12d3-a456-42661417400${String(i).padStart(1, '0')}`,
            driver_id: `123e4567-e89b-12d3-a456-42661417500${String(i).padStart(1, '0')}`,
          }));

        // Fix UUIDs to be valid
        dispatches.forEach((d, i) => {
          d.route_id = `123e4567-e89b-12d3-a456-${String(i).padStart(12, '0')}`;
          d.driver_id = `223e4567-e89b-12d3-a456-${String(i).padStart(12, '0')}`;
        });

        mockRequest.body = { dispatches };

        const mockResult: BatchDispatchResult = {
          results: dispatches.map((_, i) => ({
            index: i,
            success: true,
            dispatchId: `dispatch-${i}`,
          })),
          summary: { total: 100, successful: 100, failed: 0 },
        };

        mockOrchestrator.dispatchBatch.mockResolvedValue(mockResult);

        await batchHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(202);
        expect(mockOrchestrator.dispatchBatch).toHaveBeenCalled();
      });
    });

    describe('Unexpected Errors', () => {
      it('should re-throw unexpected errors', async () => {
        mockRequest.body = {
          dispatches: [
            {
              route_id: '123e4567-e89b-12d3-a456-426614174000',
              driver_id: '123e4567-e89b-12d3-a456-426614174001',
            },
          ],
        };

        const unexpectedError = new Error('Database connection failed');
        mockOrchestrator.dispatchBatch.mockRejectedValue(unexpectedError);

        await expect(
          batchHandler(mockRequest as Request, mockResponse as Response)
        ).rejects.toThrow('Database connection failed');
      });
    });
  });
});


describe('Get Dispatch Handler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockOrchestrator: jest.Mocked<DispatchOrchestrator>;
  let getHandler: ReturnType<typeof createGetDispatchHandler>;

  beforeEach(() => {
    mockRequest = {
      params: {},
      correlationId: 'test-correlation-id',
    } as Partial<Request>;

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockOrchestrator = {
      dispatch: jest.fn(),
      dispatchBatch: jest.fn(),
      getDispatch: jest.fn(),
      registerAdapter: jest.fn(),
    } as unknown as jest.Mocked<DispatchOrchestrator>;

    getHandler = createGetDispatchHandler(mockOrchestrator);
  });

  describe('Validation Errors', () => {
    it('should return 400 when dispatch_id is missing', async () => {
      mockRequest.params = {};

      await getHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'dispatch_id must be a valid UUID',
          }),
          requestId: 'test-correlation-id',
        })
      );
      expect(mockOrchestrator.getDispatch).not.toHaveBeenCalled();
    });

    it('should return 400 when dispatch_id is not a valid UUID', async () => {
      mockRequest.params = { id: 'not-a-valid-uuid' };

      await getHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'dispatch_id must be a valid UUID',
            details: expect.objectContaining({
              field: 'id',
              value: 'not-a-valid-uuid',
            }),
          }),
        })
      );
      expect(mockOrchestrator.getDispatch).not.toHaveBeenCalled();
    });

    it('should return 400 when dispatch_id is empty string', async () => {
      mockRequest.params = { id: '' };

      await getHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'dispatch_id must be a valid UUID',
          }),
        })
      );
    });
  });

  describe('Dispatch Not Found (Requirement 3.3)', () => {
    it('should return 404 when dispatch is not found', async () => {
      const dispatchId = '123e4567-e89b-12d3-a456-426614174000';
      mockRequest.params = { id: dispatchId };

      mockOrchestrator.getDispatch.mockResolvedValue(null);

      await getHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            message: `Dispatch not found: ${dispatchId}`,
            details: expect.objectContaining({
              dispatchId,
            }),
          }),
          requestId: 'test-correlation-id',
        })
      );
    });
  });

  describe('Successful Dispatch Retrieval (Requirements 3.1, 3.2)', () => {
    it('should return 200 with full dispatch details', async () => {
      const dispatchId = '123e4567-e89b-12d3-a456-426614174000';
      mockRequest.params = { id: dispatchId };

      const mockDispatch = {
        id: dispatchId,
        routeId: '123e4567-e89b-12d3-a456-426614174001',
        driverId: '123e4567-e89b-12d3-a456-426614174002',
        status: 'delivered' as const,
        requestedChannels: ['telegram' as const],
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:05Z'),
      };

      const mockChannelDispatches = [
        {
          id: '123e4567-e89b-12d3-a456-426614174003',
          dispatchId,
          channel: 'telegram' as const,
          status: 'delivered' as const,
          providerMessageId: 'msg-123',
          sentAt: new Date('2024-01-15T10:30:02Z'),
          deliveredAt: new Date('2024-01-15T10:30:05Z'),
          createdAt: new Date('2024-01-15T10:30:00Z'),
          updatedAt: new Date('2024-01-15T10:30:05Z'),
        },
      ];

      mockOrchestrator.getDispatch.mockResolvedValue({
        dispatch: mockDispatch,
        channelDispatches: mockChannelDispatches,
      });

      await getHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        id: dispatchId,
        route_id: '123e4567-e89b-12d3-a456-426614174001',
        driver_id: '123e4567-e89b-12d3-a456-426614174002',
        status: 'delivered',
        requested_channels: ['telegram'],
        channel_dispatches: [
          {
            channel: 'telegram',
            status: 'delivered',
            provider_message_id: 'msg-123',
            error_message: undefined,
            sent_at: '2024-01-15T10:30:02.000Z',
            delivered_at: '2024-01-15T10:30:05.000Z',
          },
        ],
        created_at: '2024-01-15T10:30:00.000Z',
        updated_at: '2024-01-15T10:30:05.000Z',
      });
    });

    it('should return dispatch with multiple channel dispatches', async () => {
      const dispatchId = '123e4567-e89b-12d3-a456-426614174000';
      mockRequest.params = { id: dispatchId };

      const mockDispatch = {
        id: dispatchId,
        routeId: '123e4567-e89b-12d3-a456-426614174001',
        driverId: '123e4567-e89b-12d3-a456-426614174002',
        status: 'partial' as const,
        requestedChannels: ['telegram' as const, 'email' as const],
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:10Z'),
      };

      const mockChannelDispatches = [
        {
          id: '123e4567-e89b-12d3-a456-426614174003',
          dispatchId,
          channel: 'telegram' as const,
          status: 'delivered' as const,
          providerMessageId: 'msg-123',
          sentAt: new Date('2024-01-15T10:30:02Z'),
          deliveredAt: new Date('2024-01-15T10:30:05Z'),
          createdAt: new Date('2024-01-15T10:30:00Z'),
          updatedAt: new Date('2024-01-15T10:30:05Z'),
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174004',
          dispatchId,
          channel: 'email' as const,
          status: 'failed' as const,
          errorMessage: 'Email provider unavailable',
          sentAt: new Date('2024-01-15T10:30:03Z'),
          createdAt: new Date('2024-01-15T10:30:00Z'),
          updatedAt: new Date('2024-01-15T10:30:10Z'),
        },
      ];

      mockOrchestrator.getDispatch.mockResolvedValue({
        dispatch: mockDispatch,
        channelDispatches: mockChannelDispatches,
      });

      await getHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      
      expect(responseBody.channel_dispatches).toHaveLength(2);
      expect(responseBody.channel_dispatches[0]).toEqual({
        channel: 'telegram',
        status: 'delivered',
        provider_message_id: 'msg-123',
        error_message: undefined,
        sent_at: '2024-01-15T10:30:02.000Z',
        delivered_at: '2024-01-15T10:30:05.000Z',
      });
      expect(responseBody.channel_dispatches[1]).toEqual({
        channel: 'email',
        status: 'failed',
        provider_message_id: undefined,
        error_message: 'Email provider unavailable',
        sent_at: '2024-01-15T10:30:03.000Z',
        delivered_at: undefined,
      });
    });

    it('should return dispatch with empty channel dispatches', async () => {
      const dispatchId = '123e4567-e89b-12d3-a456-426614174000';
      mockRequest.params = { id: dispatchId };

      const mockDispatch = {
        id: dispatchId,
        routeId: '123e4567-e89b-12d3-a456-426614174001',
        driverId: '123e4567-e89b-12d3-a456-426614174002',
        status: 'pending' as const,
        requestedChannels: ['telegram' as const],
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
      };

      mockOrchestrator.getDispatch.mockResolvedValue({
        dispatch: mockDispatch,
        channelDispatches: [],
      });

      await getHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.channel_dispatches).toEqual([]);
    });

    it('should return snake_case response fields', async () => {
      const dispatchId = '123e4567-e89b-12d3-a456-426614174000';
      mockRequest.params = { id: dispatchId };

      const mockDispatch = {
        id: dispatchId,
        routeId: '123e4567-e89b-12d3-a456-426614174001',
        driverId: '123e4567-e89b-12d3-a456-426614174002',
        status: 'delivered' as const,
        requestedChannels: ['telegram' as const],
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:05Z'),
      };

      mockOrchestrator.getDispatch.mockResolvedValue({
        dispatch: mockDispatch,
        channelDispatches: [],
      });

      await getHandler(mockRequest as Request, mockResponse as Response);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      
      // Check snake_case fields exist
      expect(responseBody).toHaveProperty('route_id');
      expect(responseBody).toHaveProperty('driver_id');
      expect(responseBody).toHaveProperty('requested_channels');
      expect(responseBody).toHaveProperty('channel_dispatches');
      expect(responseBody).toHaveProperty('created_at');
      expect(responseBody).toHaveProperty('updated_at');
      
      // Check camelCase fields do NOT exist
      expect(responseBody).not.toHaveProperty('routeId');
      expect(responseBody).not.toHaveProperty('driverId');
      expect(responseBody).not.toHaveProperty('requestedChannels');
      expect(responseBody).not.toHaveProperty('channelDispatches');
      expect(responseBody).not.toHaveProperty('createdAt');
      expect(responseBody).not.toHaveProperty('updatedAt');
    });

    it('should call orchestrator.getDispatch with correct dispatch_id', async () => {
      const dispatchId = '123e4567-e89b-12d3-a456-426614174000';
      mockRequest.params = { id: dispatchId };

      mockOrchestrator.getDispatch.mockResolvedValue(null);

      await getHandler(mockRequest as Request, mockResponse as Response);

      expect(mockOrchestrator.getDispatch).toHaveBeenCalledWith(dispatchId);
      expect(mockOrchestrator.getDispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Unexpected Errors', () => {
    it('should re-throw unexpected errors', async () => {
      const dispatchId = '123e4567-e89b-12d3-a456-426614174000';
      mockRequest.params = { id: dispatchId };

      const unexpectedError = new Error('Database connection failed');
      mockOrchestrator.getDispatch.mockRejectedValue(unexpectedError);

      await expect(
        getHandler(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('Database connection failed');
    });
  });
});
