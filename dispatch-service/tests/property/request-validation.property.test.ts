/**
 * Property-Based Tests for Request Validation
 *
 * Feature: dispatch-service, Property 5: Request Validation
 *
 * **Validates: Requirements 1.6, 2.5**
 *
 * Property 5 from design.md states:
 * "For any malformed dispatch request (missing required fields, invalid types, empty batch array),
 * the API SHALL return HTTP 400 with validation error details before any database operations occur."
 *
 * This test verifies:
 * 1. Missing required fields (route_id, driver_id) return 400
 * 2. Invalid types for fields return 400
 * 3. Empty batch array returns 400
 * 4. Malformed request body returns 400
 * 5. No database operations occur before validation
 * 6. Error response contains validation details
 */

import * as fc from 'fast-check';
import { Request, Response } from 'express';
import {
  createDispatchHandler,
  createBatchDispatchHandler,
} from '../../src/api/handlers/dispatch.js';
import { DispatchOrchestrator } from '../../src/core/orchestrator.js';
import {
  singleDispatchBodySchema,
  batchDispatchBodySchema,
} from '../../src/validation/schemas.js';

// Import to get the Express Request type extension for correlationId
import '../../src/middleware/correlation.js';

// Mock the logger to avoid console output during tests
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Feature: dispatch-service, Property 5: Request Validation', () => {
  // =============================================================================
  // Arbitrary Generators
  // =============================================================================

  /**
   * Arbitrary generator for valid UUID strings.
   */
  const arbitraryUuid = (): fc.Arbitrary<string> => fc.uuid();

  /**
   * Arbitrary generator for non-empty correlation IDs.
   */
  const arbitraryCorrelationId = (): fc.Arbitrary<string> =>
    fc.string({ minLength: 1, maxLength: 36 }).filter((s) => s.trim().length > 0);

  /**
   * Arbitrary generator for invalid UUID strings (not valid UUID format).
   */
  const arbitraryInvalidUuid = (): fc.Arbitrary<string> =>
    fc.oneof(
      fc.string({ minLength: 1, maxLength: 30 }).filter((s) => {
        // Filter out strings that happen to be valid UUIDs
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return !uuidRegex.test(s);
      }),
      fc.constant('not-a-uuid'),
      fc.constant('12345'),
      fc.constant('abc-def-ghi'),
      fc.integer().map((n) => n.toString())
    );

  /**
   * Arbitrary generator for non-string values.
   */
  const arbitraryNonString = (): fc.Arbitrary<unknown> =>
    fc.oneof(
      fc.integer(),
      fc.boolean(),
      fc.constant(null),
      fc.array(fc.string()),
      fc.dictionary(fc.string(), fc.string())
    );

  /**
   * Arbitrary generator for invalid channel types.
   */
  const arbitraryInvalidChannelType = (): fc.Arbitrary<string> =>
    fc.string({ minLength: 1, maxLength: 20 }).filter(
      (s) => !['telegram', 'email', 'sms', 'push'].includes(s)
    );

  /**
   * Arbitrary generator for valid channel types.
   */
  const arbitraryValidChannelType = (): fc.Arbitrary<string> =>
    fc.constantFrom('telegram', 'email', 'sms', 'push');

  // =============================================================================
  // Mock Helpers
  // =============================================================================

  /**
   * Helper to create a mock request with given body.
   */
  function createMockRequest(
    body: unknown,
    correlationId: string,
    path: string = '/api/v1/dispatch'
  ): Partial<Request> {
    return {
      body,
      correlationId,
      path,
      method: 'POST',
    };
  }

  /**
   * Helper to create a mock response that tracks status and json calls.
   */
  function createMockResponse(): {
    response: Partial<Response>;
    getStatus: () => number | undefined;
    getJson: () => unknown;
  } {
    let statusCode: number | undefined;
    let jsonBody: unknown;

    const response: Partial<Response> = {
      status: jest.fn().mockImplementation((code: number) => {
        statusCode = code;
        return response;
      }),
      json: jest.fn().mockImplementation((body: unknown) => {
        jsonBody = body;
        return response;
      }),
    };

    return {
      response,
      getStatus: () => statusCode,
      getJson: () => jsonBody,
    };
  }

  /**
   * Create a mock orchestrator that tracks method calls.
   * The orchestrator should NOT be called when validation fails.
   */
  function createMockOrchestrator(): jest.Mocked<DispatchOrchestrator> {
    return {
      dispatch: jest.fn(),
      dispatchBatch: jest.fn(),
      getDispatch: jest.fn(),
      registerAdapter: jest.fn(),
    } as unknown as jest.Mocked<DispatchOrchestrator>;
  }

  // =============================================================================
  // Property Tests - Requirement 1.6: Missing Required Fields
  // =============================================================================

  describe('Requirement 1.6: Missing required fields return 400', () => {
    /**
     * Property: For any request missing route_id, the API SHALL return HTTP 400.
     */
    it('should return 400 when route_id is missing', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryUuid(),
          arbitraryCorrelationId(),
          async (driverId, correlationId) => {
            const mockOrchestrator = createMockOrchestrator();
            const handler = createDispatchHandler(mockOrchestrator);

            // Create request without route_id
            const body = { driver_id: driverId };
            const mockRequest = createMockRequest(body, correlationId);
            const { response, getStatus, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Assert: Should return 400
            expect(getStatus()).toBe(400);

            // Assert: Response should have validation error structure
            const jsonResponse = getJson() as {
              error: { code: string; message: string; details?: Record<string, unknown> };
              requestId: string;
            };

            expect(jsonResponse.error.code).toBe('VALIDATION_ERROR');
            expect(jsonResponse.error.message).toContain('route_id');

            // Assert: Orchestrator should NOT be called
            expect(mockOrchestrator.dispatch).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any request missing driver_id, the API SHALL return HTTP 400.
     */
    it('should return 400 when driver_id is missing', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryUuid(),
          arbitraryCorrelationId(),
          async (routeId, correlationId) => {
            const mockOrchestrator = createMockOrchestrator();
            const handler = createDispatchHandler(mockOrchestrator);

            // Create request without driver_id
            const body = { route_id: routeId };
            const mockRequest = createMockRequest(body, correlationId);
            const { response, getStatus, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Assert: Should return 400
            expect(getStatus()).toBe(400);

            // Assert: Response should have validation error structure
            const jsonResponse = getJson() as {
              error: { code: string; message: string; details?: Record<string, unknown> };
              requestId: string;
            };

            expect(jsonResponse.error.code).toBe('VALIDATION_ERROR');
            expect(jsonResponse.error.message).toContain('driver_id');

            // Assert: Orchestrator should NOT be called
            expect(mockOrchestrator.dispatch).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any request missing both route_id and driver_id, the API SHALL return HTTP 400.
     */
    it('should return 400 when both route_id and driver_id are missing', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryCorrelationId(),
          async (correlationId) => {
            const mockOrchestrator = createMockOrchestrator();
            const handler = createDispatchHandler(mockOrchestrator);

            // Create request without required fields
            const body = {};
            const mockRequest = createMockRequest(body, correlationId);
            const { response, getStatus, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Assert: Should return 400
            expect(getStatus()).toBe(400);

            // Assert: Response should have validation error structure
            const jsonResponse = getJson() as {
              error: { code: string; message: string; details?: Record<string, unknown> };
              requestId: string;
            };

            expect(jsonResponse.error.code).toBe('VALIDATION_ERROR');

            // Assert: Orchestrator should NOT be called
            expect(mockOrchestrator.dispatch).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =============================================================================
  // Property Tests - Requirement 1.6: Invalid Types
  // =============================================================================

  describe('Requirement 1.6: Invalid types return 400', () => {
    /**
     * Property: For any request with non-string route_id, the API SHALL return HTTP 400.
     */
    it('should return 400 when route_id is not a string', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryNonString(),
          arbitraryUuid(),
          arbitraryCorrelationId(),
          async (invalidRouteId, driverId, correlationId) => {
            const mockOrchestrator = createMockOrchestrator();
            const handler = createDispatchHandler(mockOrchestrator);

            const body = { route_id: invalidRouteId, driver_id: driverId };
            const mockRequest = createMockRequest(body, correlationId);
            const { response, getStatus, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Assert: Should return 400
            expect(getStatus()).toBe(400);

            const jsonResponse = getJson() as {
              error: { code: string; message: string };
              requestId: string;
            };

            expect(jsonResponse.error.code).toBe('VALIDATION_ERROR');

            // Assert: Orchestrator should NOT be called
            expect(mockOrchestrator.dispatch).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any request with non-string driver_id, the API SHALL return HTTP 400.
     */
    it('should return 400 when driver_id is not a string', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryUuid(),
          arbitraryNonString(),
          arbitraryCorrelationId(),
          async (routeId, invalidDriverId, correlationId) => {
            const mockOrchestrator = createMockOrchestrator();
            const handler = createDispatchHandler(mockOrchestrator);

            const body = { route_id: routeId, driver_id: invalidDriverId };
            const mockRequest = createMockRequest(body, correlationId);
            const { response, getStatus, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Assert: Should return 400
            expect(getStatus()).toBe(400);

            const jsonResponse = getJson() as {
              error: { code: string; message: string };
              requestId: string;
            };

            expect(jsonResponse.error.code).toBe('VALIDATION_ERROR');

            // Assert: Orchestrator should NOT be called
            expect(mockOrchestrator.dispatch).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any request with invalid UUID format for route_id, the API SHALL return HTTP 400.
     */
    it('should return 400 when route_id is not a valid UUID', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryInvalidUuid(),
          arbitraryUuid(),
          arbitraryCorrelationId(),
          async (invalidRouteId, driverId, correlationId) => {
            const mockOrchestrator = createMockOrchestrator();
            const handler = createDispatchHandler(mockOrchestrator);

            const body = { route_id: invalidRouteId, driver_id: driverId };
            const mockRequest = createMockRequest(body, correlationId);
            const { response, getStatus, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Assert: Should return 400
            expect(getStatus()).toBe(400);

            const jsonResponse = getJson() as {
              error: { code: string; message: string };
              requestId: string;
            };

            expect(jsonResponse.error.code).toBe('VALIDATION_ERROR');
            expect(jsonResponse.error.message).toContain('UUID');

            // Assert: Orchestrator should NOT be called
            expect(mockOrchestrator.dispatch).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any request with invalid UUID format for driver_id, the API SHALL return HTTP 400.
     */
    it('should return 400 when driver_id is not a valid UUID', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryUuid(),
          arbitraryInvalidUuid(),
          arbitraryCorrelationId(),
          async (routeId, invalidDriverId, correlationId) => {
            const mockOrchestrator = createMockOrchestrator();
            const handler = createDispatchHandler(mockOrchestrator);

            const body = { route_id: routeId, driver_id: invalidDriverId };
            const mockRequest = createMockRequest(body, correlationId);
            const { response, getStatus, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Assert: Should return 400
            expect(getStatus()).toBe(400);

            const jsonResponse = getJson() as {
              error: { code: string; message: string };
              requestId: string;
            };

            expect(jsonResponse.error.code).toBe('VALIDATION_ERROR');
            expect(jsonResponse.error.message).toContain('UUID');

            // Assert: Orchestrator should NOT be called
            expect(mockOrchestrator.dispatch).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any request with invalid channel type, the API SHALL return HTTP 400.
     */
    it('should return 400 when channels contains invalid channel type', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryUuid(),
          arbitraryUuid(),
          arbitraryInvalidChannelType(),
          arbitraryCorrelationId(),
          async (routeId, driverId, invalidChannel, correlationId) => {
            const mockOrchestrator = createMockOrchestrator();
            const handler = createDispatchHandler(mockOrchestrator);

            const body = {
              route_id: routeId,
              driver_id: driverId,
              channels: [invalidChannel],
            };
            const mockRequest = createMockRequest(body, correlationId);
            const { response, getStatus, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Assert: Should return 400
            expect(getStatus()).toBe(400);

            const jsonResponse = getJson() as {
              error: { code: string; message: string };
              requestId: string;
            };

            expect(jsonResponse.error.code).toBe('VALIDATION_ERROR');

            // Assert: Orchestrator should NOT be called
            expect(mockOrchestrator.dispatch).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any request with non-array channels, the API SHALL return HTTP 400.
     */
    it('should return 400 when channels is not an array', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryUuid(),
          arbitraryUuid(),
          fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.dictionary(fc.string(), fc.string())),
          arbitraryCorrelationId(),
          async (routeId, driverId, invalidChannels, correlationId) => {
            const mockOrchestrator = createMockOrchestrator();
            const handler = createDispatchHandler(mockOrchestrator);

            const body = {
              route_id: routeId,
              driver_id: driverId,
              channels: invalidChannels,
            };
            const mockRequest = createMockRequest(body, correlationId);
            const { response, getStatus, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Assert: Should return 400
            expect(getStatus()).toBe(400);

            const jsonResponse = getJson() as {
              error: { code: string; message: string };
              requestId: string;
            };

            expect(jsonResponse.error.code).toBe('VALIDATION_ERROR');
            expect(jsonResponse.error.message).toContain('channels');

            // Assert: Orchestrator should NOT be called
            expect(mockOrchestrator.dispatch).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any request with non-boolean multi_channel, the API SHALL return HTTP 400.
     */
    it('should return 400 when multi_channel is not a boolean', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryUuid(),
          arbitraryUuid(),
          fc.oneof(fc.string(), fc.integer(), fc.array(fc.string())),
          arbitraryCorrelationId(),
          async (routeId, driverId, invalidMultiChannel, correlationId) => {
            const mockOrchestrator = createMockOrchestrator();
            const handler = createDispatchHandler(mockOrchestrator);

            const body = {
              route_id: routeId,
              driver_id: driverId,
              multi_channel: invalidMultiChannel,
            };
            const mockRequest = createMockRequest(body, correlationId);
            const { response, getStatus, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Assert: Should return 400
            expect(getStatus()).toBe(400);

            const jsonResponse = getJson() as {
              error: { code: string; message: string };
              requestId: string;
            };

            expect(jsonResponse.error.code).toBe('VALIDATION_ERROR');
            expect(jsonResponse.error.message).toContain('multi_channel');

            // Assert: Orchestrator should NOT be called
            expect(mockOrchestrator.dispatch).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =============================================================================
  // Property Tests - Requirement 1.6: Malformed Request Body
  // =============================================================================

  describe('Requirement 1.6: Malformed request body returns 400', () => {
    /**
     * Property: For any non-object request body, the API SHALL return HTTP 400.
     */
    it('should return 400 when request body is not an object', () => {
      fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.array(fc.string()),
            fc.constant(null),
            fc.constant(undefined)
          ),
          arbitraryCorrelationId(),
          async (invalidBody, correlationId) => {
            const mockOrchestrator = createMockOrchestrator();
            const handler = createDispatchHandler(mockOrchestrator);

            const mockRequest = createMockRequest(invalidBody, correlationId);
            const { response, getStatus, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Assert: Should return 400
            expect(getStatus()).toBe(400);

            const jsonResponse = getJson() as {
              error: { code: string; message: string };
              requestId: string;
            };

            expect(jsonResponse.error.code).toBe('VALIDATION_ERROR');

            // Assert: Orchestrator should NOT be called
            expect(mockOrchestrator.dispatch).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =============================================================================
  // Property Tests - Requirement 2.5: Empty Batch Array
  // =============================================================================

  describe('Requirement 2.5: Empty batch array returns 400', () => {
    /**
     * Property: For any batch request with empty dispatches array, the API SHALL return HTTP 400.
     */
    it('should return 400 when dispatches array is empty', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryCorrelationId(),
          async (correlationId) => {
            const mockOrchestrator = createMockOrchestrator();
            const handler = createBatchDispatchHandler(mockOrchestrator);

            const body = { dispatches: [] };
            const mockRequest = createMockRequest(body, correlationId, '/api/v1/dispatch/batch');
            const { response, getStatus, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Assert: Should return 400
            expect(getStatus()).toBe(400);

            const jsonResponse = getJson() as {
              error: { code: string; message: string };
              requestId: string;
            };

            expect(jsonResponse.error.code).toBe('VALIDATION_ERROR');
            expect(jsonResponse.error.message).toContain('empty');

            // Assert: Orchestrator should NOT be called
            expect(mockOrchestrator.dispatchBatch).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any batch request missing dispatches field, the API SHALL return HTTP 400.
     */
    it('should return 400 when dispatches field is missing', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryCorrelationId(),
          async (correlationId) => {
            const mockOrchestrator = createMockOrchestrator();
            const handler = createBatchDispatchHandler(mockOrchestrator);

            const body = {};
            const mockRequest = createMockRequest(body, correlationId, '/api/v1/dispatch/batch');
            const { response, getStatus, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Assert: Should return 400
            expect(getStatus()).toBe(400);

            const jsonResponse = getJson() as {
              error: { code: string; message: string };
              requestId: string;
            };

            expect(jsonResponse.error.code).toBe('VALIDATION_ERROR');
            expect(jsonResponse.error.message).toContain('dispatches');

            // Assert: Orchestrator should NOT be called
            expect(mockOrchestrator.dispatchBatch).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any batch request with non-array dispatches, the API SHALL return HTTP 400.
     */
    it('should return 400 when dispatches is not an array', () => {
      fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.dictionary(fc.string(), fc.string())
          ),
          arbitraryCorrelationId(),
          async (invalidDispatches, correlationId) => {
            const mockOrchestrator = createMockOrchestrator();
            const handler = createBatchDispatchHandler(mockOrchestrator);

            const body = { dispatches: invalidDispatches };
            const mockRequest = createMockRequest(body, correlationId, '/api/v1/dispatch/batch');
            const { response, getStatus, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Assert: Should return 400
            expect(getStatus()).toBe(400);

            const jsonResponse = getJson() as {
              error: { code: string; message: string };
              requestId: string;
            };

            expect(jsonResponse.error.code).toBe('VALIDATION_ERROR');
            expect(jsonResponse.error.message).toContain('dispatches');

            // Assert: Orchestrator should NOT be called
            expect(mockOrchestrator.dispatchBatch).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =============================================================================
  // Property Tests - No Database Operations Before Validation
  // =============================================================================

  describe('No database operations before validation', () => {
    /**
     * Property: For any malformed request, the orchestrator SHALL NOT be called.
     */
    it('should not call orchestrator for any malformed single dispatch request', () => {
      fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // Missing route_id
            fc.record({ driver_id: arbitraryUuid() }),
            // Missing driver_id
            fc.record({ route_id: arbitraryUuid() }),
            // Invalid route_id type
            fc.record({ route_id: fc.integer(), driver_id: arbitraryUuid() }),
            // Invalid driver_id type
            fc.record({ route_id: arbitraryUuid(), driver_id: fc.integer() }),
            // Empty object
            fc.constant({})
          ),
          arbitraryCorrelationId(),
          async (malformedBody, correlationId) => {
            const mockOrchestrator = createMockOrchestrator();
            const handler = createDispatchHandler(mockOrchestrator);

            const mockRequest = createMockRequest(malformedBody, correlationId);
            const { response, getStatus } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Assert: Should return 400
            expect(getStatus()).toBe(400);

            // Assert: Orchestrator should NOT be called
            expect(mockOrchestrator.dispatch).not.toHaveBeenCalled();
            expect(mockOrchestrator.dispatchBatch).not.toHaveBeenCalled();
            expect(mockOrchestrator.getDispatch).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any malformed batch request, the orchestrator SHALL NOT be called.
     */
    it('should not call orchestrator for any malformed batch dispatch request', () => {
      fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // Empty dispatches array
            fc.constant({ dispatches: [] }),
            // Missing dispatches field
            fc.constant({}),
            // Non-array dispatches
            fc.constant({ dispatches: 'not-an-array' }),
            fc.constant({ dispatches: 123 }),
            fc.constant({ dispatches: { key: 'value' } })
          ),
          arbitraryCorrelationId(),
          async (malformedBody, correlationId) => {
            const mockOrchestrator = createMockOrchestrator();
            const handler = createBatchDispatchHandler(mockOrchestrator);

            const mockRequest = createMockRequest(malformedBody, correlationId, '/api/v1/dispatch/batch');
            const { response, getStatus } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Assert: Should return 400
            expect(getStatus()).toBe(400);

            // Assert: Orchestrator should NOT be called
            expect(mockOrchestrator.dispatch).not.toHaveBeenCalled();
            expect(mockOrchestrator.dispatchBatch).not.toHaveBeenCalled();
            expect(mockOrchestrator.getDispatch).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =============================================================================
  // Property Tests - Error Response Structure
  // =============================================================================

  describe('Error response structure consistency', () => {
    /**
     * Property: For any validation error, the response SHALL have consistent structure.
     */
    it('should return consistent error structure for all validation errors', () => {
      fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // Various malformed bodies
            fc.constant({}),
            fc.constant({ route_id: 'not-uuid' }),
            fc.constant({ driver_id: 'not-uuid' }),
            fc.constant({ route_id: 123, driver_id: 456 }),
            fc.constant(null),
            fc.constant('string-body')
          ),
          arbitraryCorrelationId(),
          async (malformedBody, correlationId) => {
            const mockOrchestrator = createMockOrchestrator();
            const handler = createDispatchHandler(mockOrchestrator);

            const mockRequest = createMockRequest(malformedBody, correlationId);
            const { response, getStatus, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Assert: Should return 400
            expect(getStatus()).toBe(400);

            const jsonResponse = getJson() as {
              error: { code: string; message: string; details?: Record<string, unknown> };
              requestId: string;
            };

            // Assert: Required fields are present
            expect(jsonResponse).toHaveProperty('error');
            expect(jsonResponse).toHaveProperty('requestId');
            expect(jsonResponse.error).toHaveProperty('code');
            expect(jsonResponse.error).toHaveProperty('message');

            // Assert: Field types are correct
            expect(typeof jsonResponse.error.code).toBe('string');
            expect(typeof jsonResponse.error.message).toBe('string');
            expect(typeof jsonResponse.requestId).toBe('string');

            // Assert: Code is VALIDATION_ERROR
            expect(jsonResponse.error.code).toBe('VALIDATION_ERROR');

            // Assert: requestId matches correlation ID
            expect(jsonResponse.requestId).toBe(correlationId);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any batch validation error, the response SHALL have consistent structure.
     */
    it('should return consistent error structure for batch validation errors', () => {
      fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant({ dispatches: [] }),
            fc.constant({}),
            fc.constant({ dispatches: 'not-array' }),
            fc.constant(null)
          ),
          arbitraryCorrelationId(),
          async (malformedBody, correlationId) => {
            const mockOrchestrator = createMockOrchestrator();
            const handler = createBatchDispatchHandler(mockOrchestrator);

            const mockRequest = createMockRequest(malformedBody, correlationId, '/api/v1/dispatch/batch');
            const { response, getStatus, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Assert: Should return 400
            expect(getStatus()).toBe(400);

            const jsonResponse = getJson() as {
              error: { code: string; message: string; details?: Record<string, unknown> };
              requestId: string;
            };

            // Assert: Required fields are present
            expect(jsonResponse).toHaveProperty('error');
            expect(jsonResponse).toHaveProperty('requestId');
            expect(jsonResponse.error).toHaveProperty('code');
            expect(jsonResponse.error).toHaveProperty('message');

            // Assert: Code is VALIDATION_ERROR
            expect(jsonResponse.error.code).toBe('VALIDATION_ERROR');

            // Assert: requestId matches correlation ID
            expect(jsonResponse.requestId).toBe(correlationId);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =============================================================================
  // Property Tests - Validation Schema Unit Tests (using Zod schemas)
  // =============================================================================

  describe('singleDispatchBodySchema properties', () => {
    /**
     * Property: For any valid request, singleDispatchBodySchema SHALL parse successfully.
     */
    it('should parse successfully for valid requests', () => {
      fc.assert(
        fc.property(
          arbitraryUuid(),
          arbitraryUuid(),
          fc.option(fc.array(arbitraryValidChannelType(), { minLength: 1, maxLength: 2 })),
          fc.option(fc.boolean()),
          (routeId, driverId, channels, multiChannel) => {
            const body: Record<string, unknown> = {
              route_id: routeId,
              driver_id: driverId,
            };

            if (channels !== null) {
              body.channels = channels;
            }
            if (multiChannel !== null) {
              body.multi_channel = multiChannel;
            }

            const result = singleDispatchBodySchema.safeParse(body);
            expect(result.success).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any request missing route_id, singleDispatchBodySchema SHALL fail.
     */
    it('should fail when route_id is missing', () => {
      fc.assert(
        fc.property(arbitraryUuid(), (driverId) => {
          const body = { driver_id: driverId };
          const result = singleDispatchBodySchema.safeParse(body);

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some((e) => e.path.includes('route_id'))).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any request missing driver_id, singleDispatchBodySchema SHALL fail.
     */
    it('should fail when driver_id is missing', () => {
      fc.assert(
        fc.property(arbitraryUuid(), (routeId) => {
          const body = { route_id: routeId };
          const result = singleDispatchBodySchema.safeParse(body);

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some((e) => e.path.includes('driver_id'))).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('batchDispatchBodySchema properties', () => {
    /**
     * Property: For any valid batch request, batchDispatchBodySchema SHALL parse successfully.
     */
    it('should parse successfully for valid batch requests', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              route_id: arbitraryUuid(),
              driver_id: arbitraryUuid(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (dispatches) => {
            const body = { dispatches };
            const result = batchDispatchBodySchema.safeParse(body);

            expect(result.success).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any empty dispatches array, batchDispatchBodySchema SHALL fail.
     */
    it('should fail for empty dispatches array', () => {
      fc.assert(
        fc.property(fc.constant({ dispatches: [] }), (body) => {
          const result = batchDispatchBodySchema.safeParse(body);

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some((e) => e.message.includes('empty'))).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any missing dispatches field, batchDispatchBodySchema SHALL fail.
     */
    it('should fail when dispatches field is missing', () => {
      fc.assert(
        fc.property(fc.constant({}), (body) => {
          const result = batchDispatchBodySchema.safeParse(body);

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some((e) => e.path.includes('dispatches'))).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  // =============================================================================
  // Property Tests - Determinism
  // =============================================================================

  describe('Determinism of validation responses', () => {
    /**
     * Property: For any given malformed request, calling the handler multiple
     * times SHALL consistently return 400 with the same error structure.
     */
    it('should return consistent 400 responses across multiple calls', () => {
      fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant({}),
            fc.constant({ route_id: 'invalid' }),
            fc.constant({ driver_id: 'invalid' }),
            fc.constant(null)
          ),
          arbitraryCorrelationId(),
          async (malformedBody, correlationId) => {
            const responses: Array<{
              status: number | undefined;
              code: string;
            }> = [];

            // Call handler multiple times
            for (let i = 0; i < 3; i++) {
              const mockOrchestrator = createMockOrchestrator();
              const handler = createDispatchHandler(mockOrchestrator);

              const mockRequest = createMockRequest(malformedBody, correlationId);
              const { response, getStatus, getJson } = createMockResponse();

              await handler(mockRequest as Request, response as Response);

              const json = getJson() as { error: { code: string } };
              responses.push({
                status: getStatus(),
                code: json.error.code,
              });
            }

            // Assert: All responses have the same status
            for (const resp of responses) {
              expect(resp.status).toBe(400);
              expect(resp.code).toBe('VALIDATION_ERROR');
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
