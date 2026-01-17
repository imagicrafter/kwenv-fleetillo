/**
 * Property-Based Tests for Invalid Entity Error Handling
 *
 * Feature: dispatch-service, Property 4: Invalid Entity Error Handling
 *
 * **Validates: Requirements 1.5, 3.3**
 *
 * Property 4 from design.md states:
 * "For any dispatch request with a non-existent route_id or driver_id, the API SHALL
 * return HTTP 404 with an error message identifying which entity was not found."
 *
 * This test verifies:
 * 1. Non-existent route_id returns 404 with error type "not_found"
 * 2. Non-existent driver_id returns 404 with error type "not_found"
 * 3. Non-existent dispatch_id returns 404 when getting dispatch
 * 4. Error response contains proper structure with entity identification
 */

import * as fc from 'fast-check';
import { Request, Response } from 'express';
import {
  createDispatchHandler,
  createGetDispatchHandler,
} from '../../src/api/handlers/dispatch.js';
import {
  DispatchOrchestrator,
  EntityNotFoundError,
} from '../../src/core/orchestrator.js';

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

describe('Feature: dispatch-service, Property 4: Invalid Entity Error Handling', () => {
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
   * Arbitrary generator for entity types (route or driver).
   */
  const arbitraryEntityType = (): fc.Arbitrary<'route' | 'driver'> =>
    fc.constantFrom('route', 'driver');

  // =============================================================================
  // Mock Helpers
  // =============================================================================

  /**
   * Helper to create a mock request with dispatch body.
   */
  function createMockDispatchRequest(
    routeId: string,
    driverId: string,
    correlationId: string
  ): Partial<Request> {
    return {
      body: {
        route_id: routeId,
        driver_id: driverId,
      },
      correlationId,
      path: '/api/v1/dispatch',
      method: 'POST',
    };
  }

  /**
   * Helper to create a mock request for getting dispatch by ID.
   */
  function createMockGetDispatchRequest(
    dispatchId: string,
    correlationId: string
  ): Partial<Request> {
    return {
      params: { id: dispatchId },
      correlationId,
      path: `/api/v1/dispatch/${dispatchId}`,
      method: 'GET',
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
   * Create a mock orchestrator that throws EntityNotFoundError for specified entity.
   */
  function createMockOrchestratorWithEntityNotFound(
    entityType: 'route' | 'driver',
    entityId: string
  ): jest.Mocked<DispatchOrchestrator> {
    return {
      dispatch: jest.fn().mockRejectedValue(new EntityNotFoundError(entityType, entityId)),
      dispatchBatch: jest.fn(),
      getDispatch: jest.fn(),
      registerAdapter: jest.fn(),
    } as unknown as jest.Mocked<DispatchOrchestrator>;
  }

  /**
   * Create a mock orchestrator that returns null for getDispatch (not found).
   */
  function createMockOrchestratorWithDispatchNotFound(): jest.Mocked<DispatchOrchestrator> {
    return {
      dispatch: jest.fn(),
      dispatchBatch: jest.fn(),
      getDispatch: jest.fn().mockResolvedValue(null),
      registerAdapter: jest.fn(),
    } as unknown as jest.Mocked<DispatchOrchestrator>;
  }

  // =============================================================================
  // Property Tests - Requirement 1.5: Non-existent route_id returns 404
  // =============================================================================

  describe('Requirement 1.5: Non-existent route_id returns 404', () => {
    /**
     * Property: For any dispatch request with a non-existent route_id,
     * the API SHALL return HTTP 404.
     */
    it('should always return 404 when route_id does not exist', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryUuid(),
          arbitraryUuid(),
          arbitraryCorrelationId(),
          async (routeId, driverId, correlationId) => {
            // Create mock orchestrator that throws EntityNotFoundError for route
            const mockOrchestrator = createMockOrchestratorWithEntityNotFound('route', routeId);
            const handler = createDispatchHandler(mockOrchestrator);

            // Create mock request and response
            const mockRequest = createMockDispatchRequest(routeId, driverId, correlationId);
            const { response, getStatus, getJson } = createMockResponse();

            // Execute handler
            await handler(mockRequest as Request, response as Response);

            // Assert: Should return 404
            expect(getStatus()).toBe(404);

            // Assert: Response should have proper error structure
            const jsonResponse = getJson() as {
              error: { code: string; message: string; details?: Record<string, unknown> };
              requestId: string;
            };

            expect(jsonResponse).toHaveProperty('error');
            expect(jsonResponse.error).toHaveProperty('code', 'NOT_FOUND');
            expect(jsonResponse.error).toHaveProperty('message');
            expect(jsonResponse.error.message).toContain('Route not found');
            expect(jsonResponse.error.message).toContain(routeId);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any non-existent route_id, the error response SHALL
     * identify the entity type as 'route'.
     */
    it('should identify entity type as route in error details', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryUuid(),
          arbitraryUuid(),
          arbitraryCorrelationId(),
          async (routeId, driverId, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithEntityNotFound('route', routeId);
            const handler = createDispatchHandler(mockOrchestrator);

            const mockRequest = createMockDispatchRequest(routeId, driverId, correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as {
              error: { code: string; message: string; details?: { entityType: string; entityId: string } };
              requestId: string;
            };

            // Assert: Error details should identify entity type
            expect(jsonResponse.error.details).toBeDefined();
            expect(jsonResponse.error.details?.entityType).toBe('route');
            expect(jsonResponse.error.details?.entityId).toBe(routeId);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =============================================================================
  // Property Tests - Requirement 1.5: Non-existent driver_id returns 404
  // =============================================================================

  describe('Requirement 1.5: Non-existent driver_id returns 404', () => {
    /**
     * Property: For any dispatch request with a non-existent driver_id,
     * the API SHALL return HTTP 404.
     */
    it('should always return 404 when driver_id does not exist', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryUuid(),
          arbitraryUuid(),
          arbitraryCorrelationId(),
          async (routeId, driverId, correlationId) => {
            // Create mock orchestrator that throws EntityNotFoundError for driver
            const mockOrchestrator = createMockOrchestratorWithEntityNotFound('driver', driverId);
            const handler = createDispatchHandler(mockOrchestrator);

            // Create mock request and response
            const mockRequest = createMockDispatchRequest(routeId, driverId, correlationId);
            const { response, getStatus, getJson } = createMockResponse();

            // Execute handler
            await handler(mockRequest as Request, response as Response);

            // Assert: Should return 404
            expect(getStatus()).toBe(404);

            // Assert: Response should have proper error structure
            const jsonResponse = getJson() as {
              error: { code: string; message: string; details?: Record<string, unknown> };
              requestId: string;
            };

            expect(jsonResponse).toHaveProperty('error');
            expect(jsonResponse.error).toHaveProperty('code', 'NOT_FOUND');
            expect(jsonResponse.error).toHaveProperty('message');
            expect(jsonResponse.error.message).toContain('Driver not found');
            expect(jsonResponse.error.message).toContain(driverId);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any non-existent driver_id, the error response SHALL
     * identify the entity type as 'driver'.
     */
    it('should identify entity type as driver in error details', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryUuid(),
          arbitraryUuid(),
          arbitraryCorrelationId(),
          async (routeId, driverId, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithEntityNotFound('driver', driverId);
            const handler = createDispatchHandler(mockOrchestrator);

            const mockRequest = createMockDispatchRequest(routeId, driverId, correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as {
              error: { code: string; message: string; details?: { entityType: string; entityId: string } };
              requestId: string;
            };

            // Assert: Error details should identify entity type
            expect(jsonResponse.error.details).toBeDefined();
            expect(jsonResponse.error.details?.entityType).toBe('driver');
            expect(jsonResponse.error.details?.entityId).toBe(driverId);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =============================================================================
  // Property Tests - Requirement 3.3: Non-existent dispatch_id returns 404
  // =============================================================================

  describe('Requirement 3.3: Non-existent dispatch_id returns 404', () => {
    /**
     * Property: For any GET dispatch request with a non-existent dispatch_id,
     * the API SHALL return HTTP 404.
     */
    it('should always return 404 when dispatch_id does not exist', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryUuid(),
          arbitraryCorrelationId(),
          async (dispatchId, correlationId) => {
            // Create mock orchestrator that returns null for getDispatch
            const mockOrchestrator = createMockOrchestratorWithDispatchNotFound();
            const handler = createGetDispatchHandler(mockOrchestrator);

            // Create mock request and response
            const mockRequest = createMockGetDispatchRequest(dispatchId, correlationId);
            const { response, getStatus, getJson } = createMockResponse();

            // Execute handler
            await handler(mockRequest as Request, response as Response);

            // Assert: Should return 404
            expect(getStatus()).toBe(404);

            // Assert: Response should have proper error structure
            const jsonResponse = getJson() as {
              error: { code: string; message: string; details?: Record<string, unknown> };
              requestId: string;
            };

            expect(jsonResponse).toHaveProperty('error');
            expect(jsonResponse.error).toHaveProperty('code', 'NOT_FOUND');
            expect(jsonResponse.error).toHaveProperty('message');
            expect(jsonResponse.error.message).toContain('Dispatch not found');
            expect(jsonResponse.error.message).toContain(dispatchId);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any non-existent dispatch_id, the error response SHALL
     * include the dispatch_id in the details.
     */
    it('should include dispatch_id in error details', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryUuid(),
          arbitraryCorrelationId(),
          async (dispatchId, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithDispatchNotFound();
            const handler = createGetDispatchHandler(mockOrchestrator);

            const mockRequest = createMockGetDispatchRequest(dispatchId, correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as {
              error: { code: string; message: string; details?: { dispatchId: string } };
              requestId: string;
            };

            // Assert: Error details should include dispatch_id
            expect(jsonResponse.error.details).toBeDefined();
            expect(jsonResponse.error.details?.dispatchId).toBe(dispatchId);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =============================================================================
  // Property Tests - Error Response Structure Consistency
  // =============================================================================

  describe('Error Response Structure Consistency', () => {
    /**
     * Property: For any entity not found error, the response SHALL have
     * a consistent structure with error.code, error.message, and requestId.
     */
    it('should return consistent error structure for all entity not found errors', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryUuid(),
          arbitraryUuid(),
          arbitraryCorrelationId(),
          arbitraryEntityType(),
          async (routeId, driverId, correlationId, entityType) => {
            // Create mock orchestrator that throws EntityNotFoundError
            const entityId = entityType === 'route' ? routeId : driverId;
            const mockOrchestrator = createMockOrchestratorWithEntityNotFound(entityType, entityId);
            const handler = createDispatchHandler(mockOrchestrator);

            const mockRequest = createMockDispatchRequest(routeId, driverId, correlationId);
            const { response, getStatus, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Assert: Status is 404
            expect(getStatus()).toBe(404);

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

            // Assert: Code is NOT_FOUND
            expect(jsonResponse.error.code).toBe('NOT_FOUND');

            // Assert: requestId matches correlation ID
            expect(jsonResponse.requestId).toBe(correlationId);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any entity not found error, the error message SHALL
     * contain the entity ID for debugging purposes.
     */
    it('should include entity ID in error message for debugging', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryUuid(),
          arbitraryUuid(),
          arbitraryCorrelationId(),
          arbitraryEntityType(),
          async (routeId, driverId, correlationId, entityType) => {
            const entityId = entityType === 'route' ? routeId : driverId;
            const mockOrchestrator = createMockOrchestratorWithEntityNotFound(entityType, entityId);
            const handler = createDispatchHandler(mockOrchestrator);

            const mockRequest = createMockDispatchRequest(routeId, driverId, correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as {
              error: { code: string; message: string };
              requestId: string;
            };

            // Assert: Error message contains the entity ID
            expect(jsonResponse.error.message).toContain(entityId);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =============================================================================
  // Property Tests - Orchestrator Call Verification
  // =============================================================================

  describe('Orchestrator Call Verification', () => {
    /**
     * Property: For any dispatch request, the orchestrator.dispatch() method
     * SHALL be called with the correct parameters before returning 404.
     */
    it('should call orchestrator.dispatch before returning 404 for route/driver not found', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryUuid(),
          arbitraryUuid(),
          arbitraryCorrelationId(),
          arbitraryEntityType(),
          async (routeId, driverId, correlationId, entityType) => {
            const entityId = entityType === 'route' ? routeId : driverId;
            const mockOrchestrator = createMockOrchestratorWithEntityNotFound(entityType, entityId);
            const handler = createDispatchHandler(mockOrchestrator);

            const mockRequest = createMockDispatchRequest(routeId, driverId, correlationId);
            const { response } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Assert: orchestrator.dispatch was called
            expect(mockOrchestrator.dispatch).toHaveBeenCalledTimes(1);

            // Assert: Called with correct parameters
            expect(mockOrchestrator.dispatch).toHaveBeenCalledWith(
              expect.objectContaining({
                routeId,
                driverId,
              })
            );

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any get dispatch request, the orchestrator.getDispatch() method
     * SHALL be called with the dispatch_id before returning 404.
     */
    it('should call orchestrator.getDispatch before returning 404 for dispatch not found', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryUuid(),
          arbitraryCorrelationId(),
          async (dispatchId, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithDispatchNotFound();
            const handler = createGetDispatchHandler(mockOrchestrator);

            const mockRequest = createMockGetDispatchRequest(dispatchId, correlationId);
            const { response } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Assert: orchestrator.getDispatch was called
            expect(mockOrchestrator.getDispatch).toHaveBeenCalledTimes(1);

            // Assert: Called with correct dispatch_id
            expect(mockOrchestrator.getDispatch).toHaveBeenCalledWith(dispatchId);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =============================================================================
  // Property Tests - Determinism
  // =============================================================================

  describe('Determinism of 404 Responses', () => {
    /**
     * Property: For any given non-existent entity, calling the handler multiple
     * times SHALL consistently return 404 with the same error structure.
     */
    it('should return consistent 404 responses across multiple calls', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryUuid(),
          arbitraryUuid(),
          arbitraryCorrelationId(),
          async (routeId, driverId, correlationId) => {
            const responses: Array<{
              status: number | undefined;
              json: unknown;
            }> = [];

            // Call handler multiple times
            for (let i = 0; i < 3; i++) {
              const mockOrchestrator = createMockOrchestratorWithEntityNotFound('route', routeId);
              const handler = createDispatchHandler(mockOrchestrator);

              const mockRequest = createMockDispatchRequest(routeId, driverId, correlationId);
              const { response, getStatus, getJson } = createMockResponse();

              await handler(mockRequest as Request, response as Response);

              responses.push({
                status: getStatus(),
                json: getJson(),
              });
            }

            // Assert: All responses have the same status
            for (const resp of responses) {
              expect(resp.status).toBe(404);
            }

            // Assert: All responses have the same error code
            for (const resp of responses) {
              const json = resp.json as { error: { code: string } };
              expect(json.error.code).toBe('NOT_FOUND');
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
