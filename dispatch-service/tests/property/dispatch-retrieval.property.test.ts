/**
 * Property-Based Tests for Dispatch Retrieval Consistency
 *
 * Feature: dispatch-service, Property 8: Dispatch Retrieval Consistency
 *
 * **Validates: Requirements 3.1, 3.2**
 *
 * Property 8 from design.md states:
 * "For any dispatch that has been created, GET /api/v1/dispatch/:id SHALL return
 * the dispatch with all channel_dispatch records, and the returned data SHALL
 * match the database state."
 *
 * This test verifies:
 * 1. Retrieved dispatch has matching id, route_id, driver_id, status
 * 2. Retrieved dispatch includes all channel_dispatch records
 * 3. Each channel_dispatch has correct status and details
 * 4. Response structure matches DispatchDetailResponse format
 */

import * as fc from 'fast-check';
import { Request, Response } from 'express';
import { createGetDispatchHandler } from '../../src/api/handlers/dispatch.js';
import type {
  ChannelType,
  ChannelDispatchStatus,
  DispatchStatus,
  Dispatch,
  ChannelDispatch,
  DispatchDetailResponse,
} from '../../src/types/index.js';
import { DispatchOrchestrator } from '../../src/core/orchestrator.js';

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


describe('Feature: dispatch-service, Property 8: Dispatch Retrieval Consistency', () => {
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
   * Arbitrary generator for valid channel types.
   */
  const arbitraryChannelType = (): fc.Arbitrary<ChannelType> =>
    fc.constantFrom('telegram', 'email') as fc.Arbitrary<ChannelType>;

  /**
   * Arbitrary generator for dispatch status.
   */
  const arbitraryDispatchStatus = (): fc.Arbitrary<DispatchStatus> =>
    fc.constantFrom('pending', 'sending', 'delivered', 'partial', 'failed') as fc.Arbitrary<DispatchStatus>;

  /**
   * Arbitrary generator for channel dispatch status.
   */
  const arbitraryChannelDispatchStatus = (): fc.Arbitrary<ChannelDispatchStatus> =>
    fc.constantFrom('pending', 'sending', 'delivered', 'failed') as fc.Arbitrary<ChannelDispatchStatus>;

  /**
   * Arbitrary generator for a non-empty array of unique channel types.
   */
  const arbitraryChannelArray = (): fc.Arbitrary<ChannelType[]> =>
    fc
      .array(arbitraryChannelType(), { minLength: 1, maxLength: 2 })
      .map((channels) => [...new Set(channels)] as ChannelType[]);


  /**
   * Arbitrary generator for optional provider message ID.
   */
  const arbitraryProviderMessageId = (): fc.Arbitrary<string | undefined> =>
    fc.option(fc.string({ minLength: 5, maxLength: 50 }), { nil: undefined });

  /**
   * Arbitrary generator for optional error message.
   */
  const arbitraryErrorMessage = (): fc.Arbitrary<string | undefined> =>
    fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined });

  /**
   * Arbitrary generator for a Dispatch entity.
   */
  const arbitraryDispatch = (): fc.Arbitrary<Dispatch> =>
    fc.record({
      id: arbitraryUuid(),
      routeId: arbitraryUuid(),
      driverId: arbitraryUuid(),
      status: arbitraryDispatchStatus(),
      requestedChannels: arbitraryChannelArray(),
      metadata: fc.option(
        fc.record({
          priority: fc.constantFrom('low', 'normal', 'high'),
          source: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        { nil: undefined }
      ),
      createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
      updatedAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
    });


  /**
   * Arbitrary generator for a ChannelDispatch entity.
   */
  const arbitraryChannelDispatch = (dispatchId: string): fc.Arbitrary<ChannelDispatch> =>
    fc.record({
      id: arbitraryUuid(),
      dispatchId: fc.constant(dispatchId),
      channel: arbitraryChannelType(),
      status: arbitraryChannelDispatchStatus(),
      providerMessageId: arbitraryProviderMessageId(),
      errorMessage: arbitraryErrorMessage(),
      sentAt: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }), { nil: undefined }),
      deliveredAt: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }), { nil: undefined }),
      createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
      updatedAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
    });

  /**
   * Arbitrary generator for a dispatch with its channel dispatches.
   */
  const arbitraryDispatchWithChannels = (): fc.Arbitrary<{
    dispatch: Dispatch;
    channelDispatches: ChannelDispatch[];
  }> =>
    arbitraryDispatch().chain((dispatch) =>
      fc
        .array(arbitraryChannelDispatch(dispatch.id), { minLength: 0, maxLength: 3 })
        .map((channelDispatches) => ({
          dispatch,
          channelDispatches,
        }))
    );


  // =============================================================================
  // Mock Helpers
  // =============================================================================

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
   * Create a mock orchestrator that returns the given dispatch data.
   */
  function createMockOrchestratorWithDispatch(
    dispatch: Dispatch,
    channelDispatches: ChannelDispatch[]
  ): jest.Mocked<DispatchOrchestrator> {
    return {
      dispatch: jest.fn(),
      dispatchBatch: jest.fn(),
      getDispatch: jest.fn().mockResolvedValue({ dispatch, channelDispatches }),
      registerAdapter: jest.fn(),
    } as unknown as jest.Mocked<DispatchOrchestrator>;
  }

  // =============================================================================
  // Property Tests - Requirement 3.1: Return dispatch with current status
  // =============================================================================

  describe('Requirement 3.1: Return dispatch record with current status and channel delivery details', () => {
    /**
     * Property: For any created dispatch, GET /api/v1/dispatch/:id SHALL return
     * HTTP 200 with the dispatch data.
     */
    it('should return 200 for any existing dispatch', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchWithChannels(),
          arbitraryCorrelationId(),
          async ({ dispatch, channelDispatches }, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithDispatch(dispatch, channelDispatches);
            const handler = createGetDispatchHandler(mockOrchestrator);

            const mockRequest = createMockGetDispatchRequest(dispatch.id, correlationId);
            const { response, getStatus } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            expect(getStatus()).toBe(200);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });


    /**
     * Property: For any created dispatch, the returned id SHALL match the dispatch id.
     */
    it('should return dispatch with matching id', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchWithChannels(),
          arbitraryCorrelationId(),
          async ({ dispatch, channelDispatches }, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithDispatch(dispatch, channelDispatches);
            const handler = createGetDispatchHandler(mockOrchestrator);

            const mockRequest = createMockGetDispatchRequest(dispatch.id, correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as DispatchDetailResponse;
            expect(jsonResponse.id).toBe(dispatch.id);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any created dispatch, the returned route_id SHALL match the database state.
     */
    it('should return dispatch with matching route_id', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchWithChannels(),
          arbitraryCorrelationId(),
          async ({ dispatch, channelDispatches }, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithDispatch(dispatch, channelDispatches);
            const handler = createGetDispatchHandler(mockOrchestrator);

            const mockRequest = createMockGetDispatchRequest(dispatch.id, correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as DispatchDetailResponse;
            expect(jsonResponse.route_id).toBe(dispatch.routeId);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });


    /**
     * Property: For any created dispatch, the returned driver_id SHALL match the database state.
     */
    it('should return dispatch with matching driver_id', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchWithChannels(),
          arbitraryCorrelationId(),
          async ({ dispatch, channelDispatches }, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithDispatch(dispatch, channelDispatches);
            const handler = createGetDispatchHandler(mockOrchestrator);

            const mockRequest = createMockGetDispatchRequest(dispatch.id, correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as DispatchDetailResponse;
            expect(jsonResponse.driver_id).toBe(dispatch.driverId);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any created dispatch, the returned status SHALL match the database state.
     */
    it('should return dispatch with matching status', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchWithChannels(),
          arbitraryCorrelationId(),
          async ({ dispatch, channelDispatches }, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithDispatch(dispatch, channelDispatches);
            const handler = createGetDispatchHandler(mockOrchestrator);

            const mockRequest = createMockGetDispatchRequest(dispatch.id, correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as DispatchDetailResponse;
            expect(jsonResponse.status).toBe(dispatch.status);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });


    /**
     * Property: For any created dispatch, the returned requested_channels SHALL match the database state.
     */
    it('should return dispatch with matching requested_channels', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchWithChannels(),
          arbitraryCorrelationId(),
          async ({ dispatch, channelDispatches }, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithDispatch(dispatch, channelDispatches);
            const handler = createGetDispatchHandler(mockOrchestrator);

            const mockRequest = createMockGetDispatchRequest(dispatch.id, correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as DispatchDetailResponse;
            expect(jsonResponse.requested_channels).toEqual(dispatch.requestedChannels);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any created dispatch, the returned timestamps SHALL be valid ISO strings.
     */
    it('should return dispatch with valid ISO timestamp strings', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchWithChannels(),
          arbitraryCorrelationId(),
          async ({ dispatch, channelDispatches }, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithDispatch(dispatch, channelDispatches);
            const handler = createGetDispatchHandler(mockOrchestrator);

            const mockRequest = createMockGetDispatchRequest(dispatch.id, correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as DispatchDetailResponse;

            // Verify created_at is a valid ISO string
            expect(typeof jsonResponse.created_at).toBe('string');
            expect(new Date(jsonResponse.created_at).toISOString()).toBe(jsonResponse.created_at);

            // Verify updated_at is a valid ISO string
            expect(typeof jsonResponse.updated_at).toBe('string');
            expect(new Date(jsonResponse.updated_at).toISOString()).toBe(jsonResponse.updated_at);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  // =============================================================================
  // Property Tests - Requirement 3.2: Include status for each channel_dispatch
  // =============================================================================

  describe('Requirement 3.2: Include status for each channel_dispatch in the response', () => {
    /**
     * Property: For any dispatch with channel dispatches, the response SHALL include
     * all channel_dispatch records.
     */
    it('should return all channel_dispatch records', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchWithChannels(),
          arbitraryCorrelationId(),
          async ({ dispatch, channelDispatches }, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithDispatch(dispatch, channelDispatches);
            const handler = createGetDispatchHandler(mockOrchestrator);

            const mockRequest = createMockGetDispatchRequest(dispatch.id, correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as DispatchDetailResponse;

            // Verify channel_dispatches array has correct length
            expect(jsonResponse.channel_dispatches).toHaveLength(channelDispatches.length);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });


    /**
     * Property: For any channel_dispatch, the returned channel SHALL match the database state.
     */
    it('should return channel_dispatches with matching channel types', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchWithChannels(),
          arbitraryCorrelationId(),
          async ({ dispatch, channelDispatches }, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithDispatch(dispatch, channelDispatches);
            const handler = createGetDispatchHandler(mockOrchestrator);

            const mockRequest = createMockGetDispatchRequest(dispatch.id, correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as DispatchDetailResponse;

            // Verify each channel_dispatch has matching channel
            const returnedChannels = jsonResponse.channel_dispatches.map((cd) => cd.channel);
            const expectedChannels = channelDispatches.map((cd) => cd.channel);
            expect(returnedChannels).toEqual(expectedChannels);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any channel_dispatch, the returned status SHALL match the database state.
     */
    it('should return channel_dispatches with matching status', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchWithChannels(),
          arbitraryCorrelationId(),
          async ({ dispatch, channelDispatches }, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithDispatch(dispatch, channelDispatches);
            const handler = createGetDispatchHandler(mockOrchestrator);

            const mockRequest = createMockGetDispatchRequest(dispatch.id, correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as DispatchDetailResponse;

            // Verify each channel_dispatch has matching status
            for (let i = 0; i < channelDispatches.length; i++) {
              expect(jsonResponse.channel_dispatches[i]?.status).toBe(channelDispatches[i]?.status);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });


    /**
     * Property: For any channel_dispatch with provider_message_id, the returned value SHALL match.
     */
    it('should return channel_dispatches with matching provider_message_id', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchWithChannels(),
          arbitraryCorrelationId(),
          async ({ dispatch, channelDispatches }, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithDispatch(dispatch, channelDispatches);
            const handler = createGetDispatchHandler(mockOrchestrator);

            const mockRequest = createMockGetDispatchRequest(dispatch.id, correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as DispatchDetailResponse;

            // Verify each channel_dispatch has matching provider_message_id
            for (let i = 0; i < channelDispatches.length; i++) {
              expect(jsonResponse.channel_dispatches[i]?.provider_message_id).toBe(
                channelDispatches[i]?.providerMessageId
              );
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any channel_dispatch with error_message, the returned value SHALL match.
     */
    it('should return channel_dispatches with matching error_message', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchWithChannels(),
          arbitraryCorrelationId(),
          async ({ dispatch, channelDispatches }, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithDispatch(dispatch, channelDispatches);
            const handler = createGetDispatchHandler(mockOrchestrator);

            const mockRequest = createMockGetDispatchRequest(dispatch.id, correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as DispatchDetailResponse;

            // Verify each channel_dispatch has matching error_message
            for (let i = 0; i < channelDispatches.length; i++) {
              expect(jsonResponse.channel_dispatches[i]?.error_message).toBe(
                channelDispatches[i]?.errorMessage
              );
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });


    /**
     * Property: For any channel_dispatch with timestamps, the returned values SHALL be valid ISO strings.
     */
    it('should return channel_dispatches with valid timestamp strings', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchWithChannels(),
          arbitraryCorrelationId(),
          async ({ dispatch, channelDispatches }, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithDispatch(dispatch, channelDispatches);
            const handler = createGetDispatchHandler(mockOrchestrator);

            const mockRequest = createMockGetDispatchRequest(dispatch.id, correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as DispatchDetailResponse;

            // Verify each channel_dispatch has valid timestamp strings
            for (let i = 0; i < channelDispatches.length; i++) {
              const cd = channelDispatches[i]!;
              const returnedCd = jsonResponse.channel_dispatches[i]!;

              // sent_at should be ISO string if present
              if (cd.sentAt) {
                expect(typeof returnedCd.sent_at).toBe('string');
                expect(new Date(returnedCd.sent_at!).toISOString()).toBe(returnedCd.sent_at);
              } else {
                expect(returnedCd.sent_at).toBeUndefined();
              }

              // delivered_at should be ISO string if present
              if (cd.deliveredAt) {
                expect(typeof returnedCd.delivered_at).toBe('string');
                expect(new Date(returnedCd.delivered_at!).toISOString()).toBe(returnedCd.delivered_at);
              } else {
                expect(returnedCd.delivered_at).toBeUndefined();
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  // =============================================================================
  // Property Tests - Response Structure Consistency
  // =============================================================================

  describe('Response Structure Consistency', () => {
    /**
     * Property: For any dispatch retrieval, the response SHALL have all required fields.
     */
    it('should return response with all required fields', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchWithChannels(),
          arbitraryCorrelationId(),
          async ({ dispatch, channelDispatches }, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithDispatch(dispatch, channelDispatches);
            const handler = createGetDispatchHandler(mockOrchestrator);

            const mockRequest = createMockGetDispatchRequest(dispatch.id, correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as DispatchDetailResponse;

            // Verify all required fields are present
            expect(jsonResponse).toHaveProperty('id');
            expect(jsonResponse).toHaveProperty('route_id');
            expect(jsonResponse).toHaveProperty('driver_id');
            expect(jsonResponse).toHaveProperty('status');
            expect(jsonResponse).toHaveProperty('requested_channels');
            expect(jsonResponse).toHaveProperty('channel_dispatches');
            expect(jsonResponse).toHaveProperty('created_at');
            expect(jsonResponse).toHaveProperty('updated_at');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });


    /**
     * Property: For any channel_dispatch in the response, it SHALL have all required fields.
     */
    it('should return channel_dispatches with all required fields', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchWithChannels().filter(({ channelDispatches }) => channelDispatches.length > 0),
          arbitraryCorrelationId(),
          async ({ dispatch, channelDispatches }, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithDispatch(dispatch, channelDispatches);
            const handler = createGetDispatchHandler(mockOrchestrator);

            const mockRequest = createMockGetDispatchRequest(dispatch.id, correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as DispatchDetailResponse;

            // Verify each channel_dispatch has required fields
            for (const cd of jsonResponse.channel_dispatches) {
              expect(cd).toHaveProperty('channel');
              expect(cd).toHaveProperty('status');
              // Optional fields may or may not be present
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch retrieval, the channel_dispatches SHALL be an array.
     */
    it('should return channel_dispatches as an array', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchWithChannels(),
          arbitraryCorrelationId(),
          async ({ dispatch, channelDispatches }, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithDispatch(dispatch, channelDispatches);
            const handler = createGetDispatchHandler(mockOrchestrator);

            const mockRequest = createMockGetDispatchRequest(dispatch.id, correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as DispatchDetailResponse;

            expect(Array.isArray(jsonResponse.channel_dispatches)).toBe(true);

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
     * Property: For any dispatch retrieval, the orchestrator.getDispatch() method
     * SHALL be called with the correct dispatch_id.
     */
    it('should call orchestrator.getDispatch with correct dispatch_id', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchWithChannels(),
          arbitraryCorrelationId(),
          async ({ dispatch, channelDispatches }, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithDispatch(dispatch, channelDispatches);
            const handler = createGetDispatchHandler(mockOrchestrator);

            const mockRequest = createMockGetDispatchRequest(dispatch.id, correlationId);
            const { response } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            // Verify orchestrator.getDispatch was called with correct ID
            expect(mockOrchestrator.getDispatch).toHaveBeenCalledTimes(1);
            expect(mockOrchestrator.getDispatch).toHaveBeenCalledWith(dispatch.id);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  // =============================================================================
  // Property Tests - Data Consistency Between Database and Response
  // =============================================================================

  describe('Data Consistency Between Database and Response', () => {
    /**
     * Property: For any dispatch, the complete response SHALL be derivable from
     * the database state (dispatch + channel_dispatches).
     */
    it('should return response that exactly matches database state', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchWithChannels(),
          arbitraryCorrelationId(),
          async ({ dispatch, channelDispatches }, correlationId) => {
            const mockOrchestrator = createMockOrchestratorWithDispatch(dispatch, channelDispatches);
            const handler = createGetDispatchHandler(mockOrchestrator);

            const mockRequest = createMockGetDispatchRequest(dispatch.id, correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as DispatchDetailResponse;

            // Verify complete data consistency
            expect(jsonResponse.id).toBe(dispatch.id);
            expect(jsonResponse.route_id).toBe(dispatch.routeId);
            expect(jsonResponse.driver_id).toBe(dispatch.driverId);
            expect(jsonResponse.status).toBe(dispatch.status);
            expect(jsonResponse.requested_channels).toEqual(dispatch.requestedChannels);
            expect(jsonResponse.created_at).toBe(dispatch.createdAt.toISOString());
            expect(jsonResponse.updated_at).toBe(dispatch.updatedAt.toISOString());

            // Verify channel_dispatches consistency
            expect(jsonResponse.channel_dispatches.length).toBe(channelDispatches.length);
            for (let i = 0; i < channelDispatches.length; i++) {
              const dbCd = channelDispatches[i]!;
              const responseCd = jsonResponse.channel_dispatches[i]!;

              expect(responseCd.channel).toBe(dbCd.channel);
              expect(responseCd.status).toBe(dbCd.status);
              expect(responseCd.provider_message_id).toBe(dbCd.providerMessageId);
              expect(responseCd.error_message).toBe(dbCd.errorMessage);
              expect(responseCd.sent_at).toBe(dbCd.sentAt?.toISOString());
              expect(responseCd.delivered_at).toBe(dbCd.deliveredAt?.toISOString());
            }

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

  describe('Determinism of Dispatch Retrieval', () => {
    /**
     * Property: For any given dispatch, calling the handler multiple times
     * SHALL consistently return the same data.
     */
    it('should return consistent responses across multiple calls', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchWithChannels(),
          arbitraryCorrelationId(),
          async ({ dispatch, channelDispatches }, correlationId) => {
            const responses: DispatchDetailResponse[] = [];

            // Call handler multiple times
            for (let i = 0; i < 3; i++) {
              const mockOrchestrator = createMockOrchestratorWithDispatch(dispatch, channelDispatches);
              const handler = createGetDispatchHandler(mockOrchestrator);

              const mockRequest = createMockGetDispatchRequest(dispatch.id, correlationId);
              const { response, getJson } = createMockResponse();

              await handler(mockRequest as Request, response as Response);

              responses.push(getJson() as DispatchDetailResponse);
            }

            // Verify all responses are identical
            const firstResponse = responses[0]!;
            for (const resp of responses) {
              expect(resp.id).toBe(firstResponse.id);
              expect(resp.route_id).toBe(firstResponse.route_id);
              expect(resp.driver_id).toBe(firstResponse.driver_id);
              expect(resp.status).toBe(firstResponse.status);
              expect(resp.requested_channels).toEqual(firstResponse.requested_channels);
              expect(resp.channel_dispatches.length).toBe(firstResponse.channel_dispatches.length);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
