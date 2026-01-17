/**
 * Property-Based Tests for Async Response Immediacy
 *
 * Feature: dispatch-service, Property 3: Async Response Immediacy
 *
 * **Validates: Requirements 1.4**
 *
 * Property 3 from design.md states:
 * "For any dispatch request, the API response SHALL contain a dispatch_id and status
 * before any channel delivery completes. The response time SHALL not depend on
 * external provider response times."
 *
 * This test verifies:
 * 1. dispatch() returns immediately with dispatch_id and status
 * 2. Response time is independent of adapter send time
 * 3. Response contains valid dispatch_id (UUID format)
 * 4. Response contains valid status ('pending')
 * 5. Async channel processing does not block the response
 */

import * as fc from 'fast-check';
import {
  DispatchRequest,
  DispatchResult,
  createDispatchOrchestrator,
} from '../../src/core/orchestrator.js';
import {
  ChannelAdapter,
  DispatchContext,
  ChannelResult,
  HealthStatus,
} from '../../src/adapters/interface.js';
import type { ChannelType, Driver, Route, Vehicle, Booking, Dispatch, DispatchStatus, ChannelDispatchStatus } from '../../src/types/index.js';
import type { UpdateChannelDispatchInput } from '../../src/db/dispatch.repository.js';

// Mock the database modules
jest.mock('../../src/db/dispatch.repository.js', () => ({
  createDispatch: jest.fn(),
  updateDispatchStatus: jest.fn(),
  createChannelDispatch: jest.fn(),
  updateChannelDispatch: jest.fn(),
  getDispatchWithChannels: jest.fn(),
}));

jest.mock('../../src/db/entities.repository.js', () => ({
  getRoute: jest.fn(),
  getDriver: jest.fn(),
  getVehicle: jest.fn(),
  getBookingsForRoute: jest.fn(),
}));

// Mock the logger to avoid console output during tests
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import mocked modules
import * as dispatchRepo from '../../src/db/dispatch.repository.js';
import * as entitiesRepo from '../../src/db/entities.repository.js';

describe('Feature: dispatch-service, Property 3: Async Response Immediacy', () => {
  // =============================================================================
  // Arbitrary Generators
  // =============================================================================

  /**
   * Arbitrary generator for non-empty strings.
   */
  const arbitraryNonEmptyString = (): fc.Arbitrary<string> =>
    fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

  /**
   * Arbitrary generator for supported channel types.
   */
  const arbitraryChannelType = (): fc.Arbitrary<ChannelType> =>
    fc.constantFrom('telegram', 'email') as fc.Arbitrary<ChannelType>;

  /**
   * Arbitrary generator for telegram chat IDs (valid format).
   */
  const arbitraryTelegramChatId = (): fc.Arbitrary<string> =>
    fc.integer({ min: 1, max: 9999999999 }).map((n) => n.toString());

  /**
   * Arbitrary generator for email addresses.
   */
  const arbitraryEmail = (): fc.Arbitrary<string> => fc.emailAddress();

  /**
   * Arbitrary generator for valid UUID strings.
   */
  const arbitraryUuid = (): fc.Arbitrary<string> => fc.uuid();

  /**
   * Arbitrary generator for driver with both channels configured.
   */
  const arbitraryDriverWithBothChannels = (): fc.Arbitrary<Driver> =>
    fc.record({
      id: arbitraryUuid(),
      firstName: arbitraryNonEmptyString(),
      lastName: arbitraryNonEmptyString(),
      email: arbitraryEmail(),
      telegramChatId: arbitraryTelegramChatId(),
      preferredChannel: fc.option(arbitraryChannelType(), { nil: undefined }),
      fallbackEnabled: fc.boolean(),
      status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
    });

  /**
   * Arbitrary generator for route.
   */
  const arbitraryRoute = (): fc.Arbitrary<Route> =>
    fc.record({
      id: arbitraryUuid(),
      name: arbitraryNonEmptyString(),
      code: fc.option(arbitraryNonEmptyString(), { nil: undefined }),
      date: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
        .map((d) => d.toISOString().split('T')[0] as string),
      plannedStartTime: fc.option(fc.constantFrom('08:00', '09:00', '10:00'), { nil: undefined }),
      plannedEndTime: fc.option(fc.constantFrom('16:00', '17:00', '18:00'), { nil: undefined }),
      totalStops: fc.integer({ min: 1, max: 50 }),
      totalDistanceKm: fc.option(fc.float({ min: 1, max: 500 }), { nil: undefined }),
      totalDurationMinutes: fc.option(fc.integer({ min: 30, max: 600 }), { nil: undefined }),
      vehicleId: fc.option(arbitraryUuid(), { nil: undefined }),
      driverId: fc.option(arbitraryUuid(), { nil: undefined }),
    }) as fc.Arbitrary<Route>;

  /**
   * Arbitrary generator for vehicle.
   */
  const arbitraryVehicle = (): fc.Arbitrary<Vehicle> =>
    fc.record({
      id: arbitraryUuid(),
      name: arbitraryNonEmptyString(),
      licensePlate: fc.option(arbitraryNonEmptyString(), { nil: undefined }),
      make: fc.option(arbitraryNonEmptyString(), { nil: undefined }),
      model: fc.option(arbitraryNonEmptyString(), { nil: undefined }),
    });

  /**
   * Arbitrary generator for dispatch request.
   */
  const arbitraryDispatchRequest = (): fc.Arbitrary<DispatchRequest> =>
    fc.record({
      routeId: arbitraryUuid(),
      driverId: arbitraryUuid(),
      channels: fc.option(fc.array(arbitraryChannelType(), { minLength: 1, maxLength: 2 }), {
        nil: undefined,
      }),
      multiChannel: fc.option(fc.boolean(), { nil: undefined }),
      metadata: fc.option(fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), fc.jsonValue()), {
        nil: undefined,
      }),
    });

  /**
   * Arbitrary generator for adapter delay in milliseconds.
   * Simulates various network/provider response times.
   */
  const arbitraryAdapterDelayMs = (): fc.Arbitrary<number> =>
    fc.integer({ min: 100, max: 5000 }); // 100ms to 5 seconds

  // =============================================================================
  // Mock Adapter with Configurable Delay
  // =============================================================================

  /**
   * Mock adapter that simulates a slow external provider.
   * The delay simulates network latency and provider processing time.
   */
  class SlowMockAdapter implements ChannelAdapter {
    readonly channelType: ChannelType;
    private delayMs: number;
    public sendStarted: boolean = false;
    public sendCompleted: boolean = false;

    constructor(channelType: ChannelType, delayMs: number) {
      this.channelType = channelType;
      this.delayMs = delayMs;
    }

    canSend(driver: Driver): boolean {
      if (this.channelType === 'telegram') {
        return !!driver.telegramChatId;
      }
      if (this.channelType === 'email') {
        return !!driver.email;
      }
      return false;
    }

    async send(_context: DispatchContext): Promise<ChannelResult> {
      this.sendStarted = true;
      
      // Simulate slow external provider
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
      
      this.sendCompleted = true;
      
      return {
        success: true,
        channelType: this.channelType,
        providerMessageId: `msg-${Date.now()}`,
        sentAt: new Date(),
      };
    }

    async healthCheck(): Promise<HealthStatus> {
      return { healthy: true, message: 'Mock adapter healthy' };
    }
  }

  /**
   * Mock adapter that returns immediately (fast adapter).
   */
  class FastMockAdapter implements ChannelAdapter {
    readonly channelType: ChannelType;

    constructor(channelType: ChannelType) {
      this.channelType = channelType;
    }

    canSend(driver: Driver): boolean {
      if (this.channelType === 'telegram') {
        return !!driver.telegramChatId;
      }
      if (this.channelType === 'email') {
        return !!driver.email;
      }
      return false;
    }

    async send(_context: DispatchContext): Promise<ChannelResult> {
      return {
        success: true,
        channelType: this.channelType,
        providerMessageId: `msg-${Date.now()}`,
        sentAt: new Date(),
      };
    }

    async healthCheck(): Promise<HealthStatus> {
      return { healthy: true, message: 'Mock adapter healthy' };
    }
  }

  // =============================================================================
  // Helper Functions
  // =============================================================================

  /**
   * Setup mock database responses for a dispatch request.
   */
  function setupMocks(
    route: Route,
    driver: Driver,
    vehicle: Vehicle | null,
    bookings: Booking[],
    dispatchId: string
  ): void {
    const mockDispatch: Dispatch = {
      id: dispatchId,
      routeId: route.id,
      driverId: driver.id,
      status: 'pending',
      requestedChannels: ['telegram'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (entitiesRepo.getRoute as jest.Mock).mockResolvedValue(route);
    (entitiesRepo.getDriver as jest.Mock).mockResolvedValue(driver);
    (entitiesRepo.getVehicle as jest.Mock).mockResolvedValue(vehicle);
    (entitiesRepo.getBookingsForRoute as jest.Mock).mockResolvedValue(bookings);

    (dispatchRepo.createDispatch as jest.Mock).mockResolvedValue(mockDispatch);
    (dispatchRepo.updateDispatchStatus as jest.Mock).mockResolvedValue({
      ...mockDispatch,
      status: 'delivered',
    });
    (dispatchRepo.createChannelDispatch as jest.Mock).mockResolvedValue({
      id: 'channel-dispatch-123',
      dispatchId: dispatchId,
      channel: 'telegram',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (dispatchRepo.updateChannelDispatch as jest.Mock).mockResolvedValue({
      id: 'channel-dispatch-123',
      dispatchId: dispatchId,
      channel: 'telegram',
      status: 'delivered',
      providerMessageId: 'msg-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * UUID regex pattern for validation.
   */
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // =============================================================================
  // Setup
  // =============================================================================

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =============================================================================
  // Property Tests
  // =============================================================================

  describe('Requirement 1.4: Return dispatch_id and status immediately', () => {
    /**
     * Property: For any valid dispatch request, the dispatch() method SHALL
     * return a response containing dispatch_id and status.
     */
    it('should return response with dispatch_id and status for any valid request', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchRequest(),
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          async (request, driver, route, vehicle, dispatchId) => {
            // Generate bookings for the route
            const bookings: Booking[] = [];
            
            // Setup mocks
            setupMocks(route, driver, vehicle, bookings, dispatchId);

            // Create orchestrator with fast adapter
            const adapter = new FastMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute dispatch
            const result = await orchestrator.dispatch({
              ...request,
              routeId: route.id,
              driverId: driver.id,
            });

            // Assert: response contains dispatch_id
            expect(result).toHaveProperty('dispatchId');
            expect(typeof result.dispatchId).toBe('string');
            expect(result.dispatchId.length).toBeGreaterThan(0);

            // Assert: response contains status
            expect(result).toHaveProperty('status');
            expect(typeof result.status).toBe('string');

            // Assert: response contains requestedChannels
            expect(result).toHaveProperty('requestedChannels');
            expect(Array.isArray(result.requestedChannels)).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any valid dispatch request, the dispatch_id SHALL be
     * a valid UUID.
     */
    it('should return valid UUID as dispatch_id', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchRequest(),
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          async (request, driver, route, vehicle, dispatchId) => {
            // Setup mocks
            setupMocks(route, driver, vehicle, [], dispatchId);

            // Create orchestrator with fast adapter
            const adapter = new FastMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute dispatch
            const result = await orchestrator.dispatch({
              ...request,
              routeId: route.id,
              driverId: driver.id,
            });

            // Assert: dispatch_id is a valid UUID
            expect(result.dispatchId).toMatch(UUID_REGEX);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any valid dispatch request, the initial status SHALL
     * be 'pending'.
     */
    it('should return status pending initially', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchRequest(),
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          async (request, driver, route, vehicle, dispatchId) => {
            // Setup mocks
            setupMocks(route, driver, vehicle, [], dispatchId);

            // Create orchestrator with fast adapter
            const adapter = new FastMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute dispatch
            const result = await orchestrator.dispatch({
              ...request,
              routeId: route.id,
              driverId: driver.id,
            });

            // Assert: status is 'pending'
            expect(result.status).toBe('pending');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Response time independence from adapter behavior', () => {
    /**
     * Property: For any dispatch request, the response time SHALL NOT depend
     * on the adapter's send time. The dispatch() method SHALL return before
     * the adapter completes sending.
     */
    it('should return before adapter completes sending', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchRequest(),
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          arbitraryAdapterDelayMs(),
          async (request, driver, route, vehicle, dispatchId, adapterDelayMs) => {
            // Setup mocks
            setupMocks(route, driver, vehicle, [], dispatchId);

            // Create orchestrator with slow adapter
            const slowAdapter = new SlowMockAdapter('telegram', adapterDelayMs);
            const orchestrator = createDispatchOrchestrator([slowAdapter]);

            // Record start time
            const startTime = Date.now();

            // Execute dispatch
            const result = await orchestrator.dispatch({
              ...request,
              routeId: route.id,
              driverId: driver.id,
            });

            // Record end time
            const endTime = Date.now();
            const responseTime = endTime - startTime;

            // Assert: response was received
            expect(result).toBeDefined();
            expect(result.dispatchId).toBeDefined();

            // Assert: response time is much less than adapter delay
            // The response should return almost immediately (within 100ms typically)
            // while the adapter takes adapterDelayMs (100-5000ms)
            // We use a generous threshold of 50ms to account for test overhead
            expect(responseTime).toBeLessThan(50);

            // Assert: adapter send has NOT completed yet
            // (it's running asynchronously in the background)
            expect(slowAdapter.sendCompleted).toBe(false);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any number of channels, the response time SHALL remain
     * bounded and independent of the number of channels.
     */
    it('should return quickly regardless of number of channels', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchRequest(),
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          async (request, driver, route, vehicle, dispatchId) => {
            // Setup mocks
            setupMocks(route, driver, vehicle, [], dispatchId);

            // Create orchestrator with multiple slow adapters
            const telegramAdapter = new SlowMockAdapter('telegram', 1000);
            const emailAdapter = new SlowMockAdapter('email', 2000);
            const orchestrator = createDispatchOrchestrator([telegramAdapter, emailAdapter]);

            // Record start time
            const startTime = Date.now();

            // Execute dispatch with multi-channel
            const result = await orchestrator.dispatch({
              ...request,
              routeId: route.id,
              driverId: driver.id,
              multiChannel: true,
            });

            // Record end time
            const endTime = Date.now();
            const responseTime = endTime - startTime;

            // Assert: response was received quickly
            expect(result).toBeDefined();
            expect(responseTime).toBeLessThan(50);

            // Assert: neither adapter has completed
            expect(telegramAdapter.sendCompleted).toBe(false);
            expect(emailAdapter.sendCompleted).toBe(false);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Response structure completeness', () => {
    /**
     * Property: For any valid dispatch request, the response SHALL contain
     * all required fields: dispatchId, status, and requestedChannels.
     */
    it('should return complete response structure', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchRequest(),
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          async (request, driver, route, vehicle, dispatchId) => {
            // Setup mocks
            setupMocks(route, driver, vehicle, [], dispatchId);

            // Create orchestrator
            const adapter = new FastMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute dispatch
            const result = await orchestrator.dispatch({
              ...request,
              routeId: route.id,
              driverId: driver.id,
            });

            // Assert: all required fields are present
            expect(result).toHaveProperty('dispatchId');
            expect(result).toHaveProperty('status');
            expect(result).toHaveProperty('requestedChannels');

            // Assert: field types are correct
            expect(typeof result.dispatchId).toBe('string');
            expect(typeof result.status).toBe('string');
            expect(Array.isArray(result.requestedChannels)).toBe(true);

            // Assert: dispatchId is not empty
            expect(result.dispatchId.length).toBeGreaterThan(0);

            // Assert: status is a valid dispatch status
            const validStatuses = ['pending', 'sending', 'delivered', 'partial', 'failed'];
            expect(validStatuses).toContain(result.status);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch request with channel override, the
     * requestedChannels in the response SHALL match the override.
     */
    it('should include requested channels in response', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          fc.array(arbitraryChannelType(), { minLength: 1, maxLength: 2 }),
          async (driver, route, vehicle, dispatchId, channels) => {
            // Setup mocks
            setupMocks(route, driver, vehicle, [], dispatchId);

            // Create orchestrator with adapters for all channels
            const telegramAdapter = new FastMockAdapter('telegram');
            const emailAdapter = new FastMockAdapter('email');
            const orchestrator = createDispatchOrchestrator([telegramAdapter, emailAdapter]);

            // Execute dispatch with channel override
            const result = await orchestrator.dispatch({
              routeId: route.id,
              driverId: driver.id,
              channels: channels,
            });

            // Assert: requestedChannels is present
            expect(result.requestedChannels).toBeDefined();
            expect(Array.isArray(result.requestedChannels)).toBe(true);

            // Assert: requestedChannels contains only valid channel types
            const validChannels: ChannelType[] = ['telegram', 'email', 'sms', 'push'];
            for (const channel of result.requestedChannels) {
              expect(validChannels).toContain(channel);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Async processing verification', () => {
    /**
     * Property: For any dispatch request, the async channel processing
     * SHALL be initiated but not awaited before returning.
     */
    it('should initiate async processing without blocking', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchRequest(),
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          async (request, driver, route, vehicle, dispatchId) => {
            // Setup mocks
            setupMocks(route, driver, vehicle, [], dispatchId);

            // Create orchestrator with slow adapter
            const slowAdapter = new SlowMockAdapter('telegram', 500);
            const orchestrator = createDispatchOrchestrator([slowAdapter]);

            // Execute dispatch
            const result = await orchestrator.dispatch({
              ...request,
              routeId: route.id,
              driverId: driver.id,
            });

            // Assert: response was received
            expect(result).toBeDefined();
            expect(result.dispatchId).toBeDefined();

            // Assert: dispatch record was created (sync operation)
            expect(dispatchRepo.createDispatch).toHaveBeenCalled();

            // Give a small delay to allow async processing to start
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Assert: adapter send was started (async operation initiated)
            // Note: sendStarted may or may not be true depending on timing,
            // but the key property is that we returned before sendCompleted
            expect(slowAdapter.sendCompleted).toBe(false);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Determinism of immediate response', () => {
    /**
     * Property: For any given dispatch request, calling dispatch() multiple
     * times SHALL consistently return responses with the same structure
     * (though dispatch_id will differ).
     */
    it('should return consistent response structure across calls', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchRequest(),
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          async (request, driver, route, vehicle) => {
            // Create orchestrator
            const adapter = new FastMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute dispatch multiple times
            const results: DispatchResult[] = [];
            for (let i = 0; i < 3; i++) {
              const dispatchId = `dispatch-${i}-${Date.now()}`;
              setupMocks(route, driver, vehicle, [], dispatchId);

              const result = await orchestrator.dispatch({
                ...request,
                routeId: route.id,
                driverId: driver.id,
              });
              results.push(result);
            }

            // Assert: all responses have the same structure
            for (const result of results) {
              expect(result).toHaveProperty('dispatchId');
              expect(result).toHaveProperty('status');
              expect(result).toHaveProperty('requestedChannels');
              expect(result.status).toBe('pending');
            }

            // Assert: dispatch_ids are different (unique per call)
            const dispatchIds = results.map((r) => r.dispatchId);
            const uniqueIds = new Set(dispatchIds);
            expect(uniqueIds.size).toBe(results.length);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Property-Based Tests for Batch Processing Completeness
 *
 * Feature: dispatch-service, Property 6: Batch Processing Completeness
 *
 * **Validates: Requirements 2.1, 2.3, 2.4**
 *
 * Property 6 from design.md states:
 * "For any batch of N dispatch requests, the response SHALL contain exactly N results.
 * Each result SHALL have an index matching its position in the input array.
 * Results SHALL be returned even if individual dispatches fail."
 *
 * This test verifies:
 * 1. Batch results count matches input count
 * 2. Results maintain order (index matches position)
 * 3. Failures don't prevent other items from processing
 * 4. Each result has either dispatchId (success) or error (failure)
 */
describe('Feature: dispatch-service, Property 6: Batch Processing Completeness', () => {
  // =============================================================================
  // Arbitrary Generators (only batch size is used with fast-check)
  // =============================================================================

  /**
   * Arbitrary generator for batch size (1 to 100 items).
   */
  const arbitraryBatchSize = (): fc.Arbitrary<number> =>
    fc.integer({ min: 1, max: 100 });

  // =============================================================================
  // Mock Adapter for Batch Tests
  // =============================================================================

  /**
   * Mock adapter that returns immediately for batch testing.
   */
  class BatchTestMockAdapter implements ChannelAdapter {
    readonly channelType: ChannelType;

    constructor(channelType: ChannelType) {
      this.channelType = channelType;
    }

    canSend(driver: Driver): boolean {
      if (this.channelType === 'telegram') {
        return !!driver.telegramChatId;
      }
      if (this.channelType === 'email') {
        return !!driver.email;
      }
      return false;
    }

    async send(_context: DispatchContext): Promise<ChannelResult> {
      return {
        success: true,
        channelType: this.channelType,
        providerMessageId: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        sentAt: new Date(),
      };
    }

    async healthCheck(): Promise<HealthStatus> {
      return { healthy: true, message: 'Mock adapter healthy' };
    }
  }

  // =============================================================================
  // Helper Functions
  // =============================================================================

  /**
   * Setup mock database responses for batch dispatch requests.
   * Allows configuring which items should succeed or fail.
   */
  function setupBatchMocks(
    routes: Route[],
    drivers: Driver[],
    vehicles: (Vehicle | null)[],
    dispatchIds: string[],
    failingIndices: Set<number> = new Set()
  ): void {
    // Setup route mocks - return null for failing indices
    (entitiesRepo.getRoute as jest.Mock).mockImplementation((routeId: string) => {
      const index = routes.findIndex((r) => r.id === routeId);
      if (index === -1 || failingIndices.has(index)) {
        return Promise.resolve(null);
      }
      return Promise.resolve(routes[index]);
    });

    // Setup driver mocks - return driver for all valid routes
    (entitiesRepo.getDriver as jest.Mock).mockImplementation((driverId: string) => {
      const index = drivers.findIndex((d) => d.id === driverId);
      if (index === -1) {
        return Promise.resolve(null);
      }
      return Promise.resolve(drivers[index]);
    });

    // Setup vehicle mocks
    (entitiesRepo.getVehicle as jest.Mock).mockImplementation((vehicleId: string) => {
      const vehicle = vehicles.find((v) => v?.id === vehicleId);
      return Promise.resolve(vehicle || null);
    });

    // Setup bookings mock - return empty array
    (entitiesRepo.getBookingsForRoute as jest.Mock).mockResolvedValue([]);

    // Setup dispatch creation mock - generate unique dispatch IDs
    let dispatchIndex = 0;
    (dispatchRepo.createDispatch as jest.Mock).mockImplementation((data: { routeId: string; driverId: string }) => {
      const routeIndex = routes.findIndex((r) => r.id === data.routeId);
      const id = dispatchIds[routeIndex] || `dispatch-${dispatchIndex++}`;
      return Promise.resolve({
        id,
        routeId: data.routeId,
        driverId: data.driverId,
        status: 'pending',
        requestedChannels: ['telegram'],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Setup other dispatch repository mocks
    (dispatchRepo.updateDispatchStatus as jest.Mock).mockImplementation((id: string, status: string) =>
      Promise.resolve({ id, status })
    );
    (dispatchRepo.createChannelDispatch as jest.Mock).mockImplementation((data: { dispatchId: string; channel: string }) =>
      Promise.resolve({
        id: `channel-${data.dispatchId}-${data.channel}`,
        dispatchId: data.dispatchId,
        channel: data.channel,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
    (dispatchRepo.updateChannelDispatch as jest.Mock).mockResolvedValue({});
  }

  /**
   * Helper function to generate a single route for testing.
   */
  function generateRoute(): Route {
    return {
      id: `route-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: `Test Route ${Math.random().toString(36).substring(7)}`,
      date: '2024-06-15',
      totalStops: Math.floor(Math.random() * 10) + 1,
    };
  }

  /**
   * Helper function to generate a single driver for testing.
   */
  function generateDriver(id: string): Driver {
    return {
      id,
      firstName: `First${Math.random().toString(36).substring(7)}`,
      lastName: `Last${Math.random().toString(36).substring(7)}`,
      email: `driver${Math.random().toString(36).substring(7)}@test.com`,
      telegramChatId: `${Math.floor(Math.random() * 1000000000)}`,
      fallbackEnabled: true,
      status: 'active',
    };
  }

  /**
   * Helper function to generate a single vehicle for testing.
   */
  function generateVehicle(): Vehicle {
    return {
      id: `vehicle-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: `Vehicle ${Math.random().toString(36).substring(7)}`,
    };
  }

  // =============================================================================
  // Setup
  // =============================================================================

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =============================================================================
  // Property Tests
  // =============================================================================

  describe('Requirement 2.1: Accept array of dispatch requests', () => {
    /**
     * Property: For any batch of N dispatch requests (1 ≤ N ≤ 100),
     * the response SHALL contain exactly N results.
     */
    it('should return exactly N results for N input requests', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryBatchSize(),
          async (batchSize) => {
            // Generate batch data
            const routes: Route[] = [];
            const drivers: Driver[] = [];
            const vehicles: (Vehicle | null)[] = [];
            const dispatchIds: string[] = [];
            const requests: DispatchRequest[] = [];

            for (let i = 0; i < batchSize; i++) {
              const route = generateRoute();
              const driver = generateDriver(`driver-${i}`);
              const vehicle = generateVehicle();
              const dispatchId = `dispatch-${i}-${Date.now()}`;

              routes.push(route);
              drivers.push(driver);
              vehicles.push(vehicle);
              dispatchIds.push(dispatchId);
              requests.push({
                routeId: route.id,
                driverId: driver.id,
              });
            }

            // Setup mocks
            setupBatchMocks(routes, drivers, vehicles, dispatchIds);

            // Create orchestrator
            const adapter = new BatchTestMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute batch dispatch
            const result = await orchestrator.dispatchBatch(requests);

            // Assert: results count matches input count
            expect(result.results.length).toBe(batchSize);

            // Assert: summary total matches input count
            expect(result.summary.total).toBe(batchSize);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 2.3: Process all items even if some fail', () => {
    /**
     * Property: When one or more items in a batch fail validation,
     * the service SHALL continue processing other items and include
     * all results (successes and failures) in the response.
     */
    it('should process all items and include failures in response', () => {
      fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 50 }), // Need at least 2 items to test mixed results
          fc.integer({ min: 1, max: 25 }), // Number of items to fail (up to half)
          async (batchSize, failCount) => {
            // Ensure failCount doesn't exceed batchSize - 1 (at least one success)
            const actualFailCount = Math.min(failCount, batchSize - 1);

            // Generate batch data
            const routes: Route[] = [];
            const drivers: Driver[] = [];
            const vehicles: (Vehicle | null)[] = [];
            const dispatchIds: string[] = [];
            const requests: DispatchRequest[] = [];

            // Randomly select indices to fail
            const allIndices = Array.from({ length: batchSize }, (_, i) => i);
            const shuffled = allIndices.sort(() => Math.random() - 0.5);
            const failingIndices = new Set(shuffled.slice(0, actualFailCount));

            for (let i = 0; i < batchSize; i++) {
              const route = generateRoute();
              const driver = generateDriver(`driver-${i}`);
              const vehicle = generateVehicle();
              const dispatchId = `dispatch-${i}-${Date.now()}`;

              routes.push(route);
              drivers.push(driver);
              vehicles.push(vehicle);
              dispatchIds.push(dispatchId);
              requests.push({
                routeId: route.id,
                driverId: driver.id,
              });
            }

            // Setup mocks with failing indices
            setupBatchMocks(routes, drivers, vehicles, dispatchIds, failingIndices);

            // Create orchestrator
            const adapter = new BatchTestMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute batch dispatch
            const result = await orchestrator.dispatchBatch(requests);

            // Assert: results count matches input count (all items processed)
            expect(result.results.length).toBe(batchSize);

            // Assert: summary total matches input count
            expect(result.summary.total).toBe(batchSize);

            // Assert: failed count matches expected failures
            expect(result.summary.failed).toBe(actualFailCount);

            // Assert: successful count matches expected successes
            expect(result.summary.successful).toBe(batchSize - actualFailCount);

            // Assert: successful + failed = total
            expect(result.summary.successful + result.summary.failed).toBe(result.summary.total);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Failures in one item SHALL NOT prevent other items from processing.
     */
    it('should not let failures prevent other items from processing', () => {
      fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 3, max: 20 }),
          async (batchSize) => {
            // Generate batch data
            const routes: Route[] = [];
            const drivers: Driver[] = [];
            const vehicles: (Vehicle | null)[] = [];
            const dispatchIds: string[] = [];
            const requests: DispatchRequest[] = [];

            // Make the middle item fail
            const failingIndex = Math.floor(batchSize / 2);
            const failingIndices = new Set([failingIndex]);

            for (let i = 0; i < batchSize; i++) {
              const route = generateRoute();
              const driver = generateDriver(`driver-${i}`);
              const vehicle = generateVehicle();
              const dispatchId = `dispatch-${i}-${Date.now()}`;

              routes.push(route);
              drivers.push(driver);
              vehicles.push(vehicle);
              dispatchIds.push(dispatchId);
              requests.push({
                routeId: route.id,
                driverId: driver.id,
              });
            }

            // Setup mocks with one failing item
            setupBatchMocks(routes, drivers, vehicles, dispatchIds, failingIndices);

            // Create orchestrator
            const adapter = new BatchTestMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute batch dispatch
            const result = await orchestrator.dispatchBatch(requests);

            // Assert: all items were processed
            expect(result.results.length).toBe(batchSize);

            // Assert: items before the failure succeeded
            for (let i = 0; i < failingIndex; i++) {
              const itemResult = result.results.find((r) => r.index === i);
              expect(itemResult).toBeDefined();
              expect(itemResult!.success).toBe(true);
              expect(itemResult!.dispatchId).toBeDefined();
            }

            // Assert: the failing item has an error
            const failedResult = result.results.find((r) => r.index === failingIndex);
            expect(failedResult).toBeDefined();
            expect(failedResult!.success).toBe(false);
            expect(failedResult!.error).toBeDefined();

            // Assert: items after the failure succeeded
            for (let i = failingIndex + 1; i < batchSize; i++) {
              const itemResult = result.results.find((r) => r.index === i);
              expect(itemResult).toBeDefined();
              expect(itemResult!.success).toBe(true);
              expect(itemResult!.dispatchId).toBeDefined();
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 2.4: Return results array with dispatch_id and status', () => {
    /**
     * Property: Each result SHALL have an index matching its position in the input array.
     */
    it('should maintain order with index matching input position', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryBatchSize(),
          async (batchSize) => {
            // Generate batch data
            const routes: Route[] = [];
            const drivers: Driver[] = [];
            const vehicles: (Vehicle | null)[] = [];
            const dispatchIds: string[] = [];
            const requests: DispatchRequest[] = [];

            for (let i = 0; i < batchSize; i++) {
              const route = generateRoute();
              const driver = generateDriver(`driver-${i}`);
              const vehicle = generateVehicle();
              const dispatchId = `dispatch-${i}-${Date.now()}`;

              routes.push(route);
              drivers.push(driver);
              vehicles.push(vehicle);
              dispatchIds.push(dispatchId);
              requests.push({
                routeId: route.id,
                driverId: driver.id,
              });
            }

            // Setup mocks
            setupBatchMocks(routes, drivers, vehicles, dispatchIds);

            // Create orchestrator
            const adapter = new BatchTestMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute batch dispatch
            const result = await orchestrator.dispatchBatch(requests);

            // Assert: each result has an index
            for (const itemResult of result.results) {
              expect(itemResult).toHaveProperty('index');
              expect(typeof itemResult.index).toBe('number');
            }

            // Assert: indices are sequential from 0 to N-1
            const indices = result.results.map((r) => r.index).sort((a, b) => a - b);
            for (let i = 0; i < batchSize; i++) {
              expect(indices[i]).toBe(i);
            }

            // Assert: no duplicate indices
            const uniqueIndices = new Set(indices);
            expect(uniqueIndices.size).toBe(batchSize);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Each successful result SHALL have a dispatch_id.
     */
    it('should include dispatch_id for successful results', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryBatchSize(),
          async (batchSize) => {
            // Generate batch data
            const routes: Route[] = [];
            const drivers: Driver[] = [];
            const vehicles: (Vehicle | null)[] = [];
            const dispatchIds: string[] = [];
            const requests: DispatchRequest[] = [];

            for (let i = 0; i < batchSize; i++) {
              const route = generateRoute();
              const driver = generateDriver(`driver-${i}`);
              const vehicle = generateVehicle();
              const dispatchId = `dispatch-${i}-${Date.now()}`;

              routes.push(route);
              drivers.push(driver);
              vehicles.push(vehicle);
              dispatchIds.push(dispatchId);
              requests.push({
                routeId: route.id,
                driverId: driver.id,
              });
            }

            // Setup mocks (all succeed)
            setupBatchMocks(routes, drivers, vehicles, dispatchIds);

            // Create orchestrator
            const adapter = new BatchTestMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute batch dispatch
            const result = await orchestrator.dispatchBatch(requests);

            // Assert: all successful results have dispatch_id
            for (const itemResult of result.results) {
              if (itemResult.success) {
                expect(itemResult.dispatchId).toBeDefined();
                expect(typeof itemResult.dispatchId).toBe('string');
                expect(itemResult.dispatchId!.length).toBeGreaterThan(0);
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Each failed result SHALL have an error message.
     */
    it('should include error message for failed results', () => {
      fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 20 }),
          async (batchSize) => {
            // Generate batch data
            const routes: Route[] = [];
            const drivers: Driver[] = [];
            const vehicles: (Vehicle | null)[] = [];
            const dispatchIds: string[] = [];
            const requests: DispatchRequest[] = [];

            // Make first item fail
            const failingIndices = new Set([0]);

            for (let i = 0; i < batchSize; i++) {
              const route = generateRoute();
              const driver = generateDriver(`driver-${i}`);
              const vehicle = generateVehicle();
              const dispatchId = `dispatch-${i}-${Date.now()}`;

              routes.push(route);
              drivers.push(driver);
              vehicles.push(vehicle);
              dispatchIds.push(dispatchId);
              requests.push({
                routeId: route.id,
                driverId: driver.id,
              });
            }

            // Setup mocks with failing item
            setupBatchMocks(routes, drivers, vehicles, dispatchIds, failingIndices);

            // Create orchestrator
            const adapter = new BatchTestMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute batch dispatch
            const result = await orchestrator.dispatchBatch(requests);

            // Assert: all failed results have error message
            for (const itemResult of result.results) {
              if (!itemResult.success) {
                expect(itemResult.error).toBeDefined();
                expect(typeof itemResult.error).toBe('string');
                expect(itemResult.error!.length).toBeGreaterThan(0);
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Each result SHALL have either dispatchId (success) or error (failure).
     */
    it('should have either dispatchId or error for each result', () => {
      fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 30 }),
          fc.integer({ min: 0, max: 15 }),
          async (batchSize, failCount) => {
            // Ensure failCount doesn't exceed batchSize
            const actualFailCount = Math.min(failCount, batchSize);

            // Generate batch data
            const routes: Route[] = [];
            const drivers: Driver[] = [];
            const vehicles: (Vehicle | null)[] = [];
            const dispatchIds: string[] = [];
            const requests: DispatchRequest[] = [];

            // Randomly select indices to fail
            const allIndices = Array.from({ length: batchSize }, (_, i) => i);
            const shuffled = allIndices.sort(() => Math.random() - 0.5);
            const failingIndices = new Set(shuffled.slice(0, actualFailCount));

            for (let i = 0; i < batchSize; i++) {
              const route = generateRoute();
              const driver = generateDriver(`driver-${i}`);
              const vehicle = generateVehicle();
              const dispatchId = `dispatch-${i}-${Date.now()}`;

              routes.push(route);
              drivers.push(driver);
              vehicles.push(vehicle);
              dispatchIds.push(dispatchId);
              requests.push({
                routeId: route.id,
                driverId: driver.id,
              });
            }

            // Setup mocks with failing indices
            setupBatchMocks(routes, drivers, vehicles, dispatchIds, failingIndices);

            // Create orchestrator
            const adapter = new BatchTestMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute batch dispatch
            const result = await orchestrator.dispatchBatch(requests);

            // Assert: each result has either dispatchId or error
            for (const itemResult of result.results) {
              if (itemResult.success) {
                expect(itemResult.dispatchId).toBeDefined();
                // Error may or may not be present for success
              } else {
                expect(itemResult.error).toBeDefined();
                // dispatchId should not be present for failure
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Summary statistics correctness', () => {
    /**
     * Property: The summary SHALL accurately reflect the results.
     */
    it('should have accurate summary statistics', () => {
      fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }),
          fc.integer({ min: 0, max: 25 }),
          async (batchSize, failCount) => {
            // Ensure failCount doesn't exceed batchSize
            const actualFailCount = Math.min(failCount, batchSize);

            // Generate batch data
            const routes: Route[] = [];
            const drivers: Driver[] = [];
            const vehicles: (Vehicle | null)[] = [];
            const dispatchIds: string[] = [];
            const requests: DispatchRequest[] = [];

            // Randomly select indices to fail
            const allIndices = Array.from({ length: batchSize }, (_, i) => i);
            const shuffled = allIndices.sort(() => Math.random() - 0.5);
            const failingIndices = new Set(shuffled.slice(0, actualFailCount));

            for (let i = 0; i < batchSize; i++) {
              const route = generateRoute();
              const driver = generateDriver(`driver-${i}`);
              const vehicle = generateVehicle();
              const dispatchId = `dispatch-${i}-${Date.now()}`;

              routes.push(route);
              drivers.push(driver);
              vehicles.push(vehicle);
              dispatchIds.push(dispatchId);
              requests.push({
                routeId: route.id,
                driverId: driver.id,
              });
            }

            // Setup mocks with failing indices
            setupBatchMocks(routes, drivers, vehicles, dispatchIds, failingIndices);

            // Create orchestrator
            const adapter = new BatchTestMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute batch dispatch
            const result = await orchestrator.dispatchBatch(requests);

            // Count actual successes and failures from results
            const actualSuccessful = result.results.filter((r) => r.success).length;
            const actualFailed = result.results.filter((r) => !r.success).length;

            // Assert: summary matches actual counts
            expect(result.summary.total).toBe(batchSize);
            expect(result.summary.successful).toBe(actualSuccessful);
            expect(result.summary.failed).toBe(actualFailed);
            expect(result.summary.successful + result.summary.failed).toBe(result.summary.total);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property-Based Tests for Batch Size Limit
 *
 * Feature: dispatch-service, Property 7: Batch Size Limit
 *
 * **Validates: Requirements 2.6**
 *
 * Property 7 from design.md states:
 * "For any batch request with more than 100 items, the API SHALL reject with 400 error.
 * For any batch request with 100 or fewer items, the API SHALL accept and process."
 *
 * Note: The 100+ item rejection is enforced at the API handler layer (tested in task 9.7).
 * This test verifies the orchestrator's behavior with various batch sizes up to 100 items.
 *
 * This test verifies:
 * 1. Batches of 100 or fewer items are processed successfully
 * 2. The orchestrator handles the maximum batch size (100 items) correctly
 * 3. Batch processing scales correctly with size
 */
describe('Feature: dispatch-service, Property 7: Batch Size Limit', () => {
  // =============================================================================
  // Arbitrary Generators
  // =============================================================================

  /**
   * Arbitrary generator for valid batch sizes (1 to 100 items).
   * This represents the valid range that the orchestrator should accept.
   */
  const arbitraryValidBatchSize = (): fc.Arbitrary<number> =>
    fc.integer({ min: 1, max: 100 });

  /**
   * Arbitrary generator for small batch sizes (1 to 10 items).
   * Used for quick tests.
   */
  const arbitrarySmallBatchSize = (): fc.Arbitrary<number> =>
    fc.integer({ min: 1, max: 10 });

  /**
   * Arbitrary generator for medium batch sizes (11 to 50 items).
   */
  const arbitraryMediumBatchSize = (): fc.Arbitrary<number> =>
    fc.integer({ min: 11, max: 50 });

  /**
   * Arbitrary generator for large batch sizes (51 to 100 items).
   */
  const arbitraryLargeBatchSize = (): fc.Arbitrary<number> =>
    fc.integer({ min: 51, max: 100 });

  // =============================================================================
  // Mock Adapter for Batch Size Tests
  // =============================================================================

  /**
   * Mock adapter that returns immediately for batch size testing.
   */
  class BatchSizeTestMockAdapter implements ChannelAdapter {
    readonly channelType: ChannelType;

    constructor(channelType: ChannelType) {
      this.channelType = channelType;
    }

    canSend(driver: Driver): boolean {
      if (this.channelType === 'telegram') {
        return !!driver.telegramChatId;
      }
      if (this.channelType === 'email') {
        return !!driver.email;
      }
      return false;
    }

    async send(_context: DispatchContext): Promise<ChannelResult> {
      return {
        success: true,
        channelType: this.channelType,
        providerMessageId: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        sentAt: new Date(),
      };
    }

    async healthCheck(): Promise<HealthStatus> {
      return { healthy: true, message: 'Mock adapter healthy' };
    }
  }

  // =============================================================================
  // Helper Functions
  // =============================================================================

  /**
   * Helper function to generate a single route for testing.
   */
  function generateTestRoute(): Route {
    return {
      id: `route-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: `Test Route ${Math.random().toString(36).substring(7)}`,
      date: '2024-06-15',
      totalStops: Math.floor(Math.random() * 10) + 1,
    };
  }

  /**
   * Helper function to generate a single driver for testing.
   */
  function generateTestDriver(id: string): Driver {
    return {
      id,
      firstName: `First${Math.random().toString(36).substring(7)}`,
      lastName: `Last${Math.random().toString(36).substring(7)}`,
      email: `driver${Math.random().toString(36).substring(7)}@test.com`,
      telegramChatId: `${Math.floor(Math.random() * 1000000000)}`,
      fallbackEnabled: true,
      status: 'active',
    };
  }

  /**
   * Helper function to generate a single vehicle for testing.
   */
  function generateTestVehicle(): Vehicle {
    return {
      id: `vehicle-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: `Vehicle ${Math.random().toString(36).substring(7)}`,
    };
  }

  /**
   * Setup mock database responses for batch dispatch requests.
   */
  function setupBatchSizeMocks(
    routes: Route[],
    drivers: Driver[],
    vehicles: (Vehicle | null)[],
    dispatchIds: string[]
  ): void {
    // Setup route mocks
    (entitiesRepo.getRoute as jest.Mock).mockImplementation((routeId: string) => {
      const route = routes.find((r) => r.id === routeId);
      return Promise.resolve(route || null);
    });

    // Setup driver mocks
    (entitiesRepo.getDriver as jest.Mock).mockImplementation((driverId: string) => {
      const driver = drivers.find((d) => d.id === driverId);
      return Promise.resolve(driver || null);
    });

    // Setup vehicle mocks
    (entitiesRepo.getVehicle as jest.Mock).mockImplementation((vehicleId: string) => {
      const vehicle = vehicles.find((v) => v?.id === vehicleId);
      return Promise.resolve(vehicle || null);
    });

    // Setup bookings mock - return empty array
    (entitiesRepo.getBookingsForRoute as jest.Mock).mockResolvedValue([]);

    // Setup dispatch creation mock - generate unique dispatch IDs
    let dispatchIndex = 0;
    (dispatchRepo.createDispatch as jest.Mock).mockImplementation((data: { routeId: string; driverId: string }) => {
      const routeIndex = routes.findIndex((r) => r.id === data.routeId);
      const id = dispatchIds[routeIndex] || `dispatch-${dispatchIndex++}`;
      return Promise.resolve({
        id,
        routeId: data.routeId,
        driverId: data.driverId,
        status: 'pending',
        requestedChannels: ['telegram'],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Setup other dispatch repository mocks
    (dispatchRepo.updateDispatchStatus as jest.Mock).mockImplementation((id: string, status: string) =>
      Promise.resolve({ id, status })
    );
    (dispatchRepo.createChannelDispatch as jest.Mock).mockImplementation((data: { dispatchId: string; channel: string }) =>
      Promise.resolve({
        id: `channel-${data.dispatchId}-${data.channel}`,
        dispatchId: data.dispatchId,
        channel: data.channel,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
    (dispatchRepo.updateChannelDispatch as jest.Mock).mockResolvedValue({});
  }

  /**
   * Generate batch test data for a given size.
   */
  function generateBatchTestData(batchSize: number): {
    routes: Route[];
    drivers: Driver[];
    vehicles: (Vehicle | null)[];
    dispatchIds: string[];
    requests: DispatchRequest[];
  } {
    const routes: Route[] = [];
    const drivers: Driver[] = [];
    const vehicles: (Vehicle | null)[] = [];
    const dispatchIds: string[] = [];
    const requests: DispatchRequest[] = [];

    for (let i = 0; i < batchSize; i++) {
      const route = generateTestRoute();
      const driver = generateTestDriver(`driver-batch-${i}`);
      const vehicle = generateTestVehicle();
      const dispatchId = `dispatch-batch-${i}-${Date.now()}`;

      routes.push(route);
      drivers.push(driver);
      vehicles.push(vehicle);
      dispatchIds.push(dispatchId);
      requests.push({
        routeId: route.id,
        driverId: driver.id,
      });
    }

    return { routes, drivers, vehicles, dispatchIds, requests };
  }

  // =============================================================================
  // Setup
  // =============================================================================

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =============================================================================
  // Property Tests
  // =============================================================================

  describe('Requirement 2.6: Batch size limit of 100 items', () => {
    /**
     * Property: For any batch request with 100 or fewer items,
     * the orchestrator SHALL accept and process all items.
     */
    it('should accept and process batches of 100 or fewer items', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryValidBatchSize(),
          async (batchSize) => {
            // Generate batch data
            const { routes, drivers, vehicles, dispatchIds, requests } = generateBatchTestData(batchSize);

            // Setup mocks
            setupBatchSizeMocks(routes, drivers, vehicles, dispatchIds);

            // Create orchestrator
            const adapter = new BatchSizeTestMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute batch dispatch
            const result = await orchestrator.dispatchBatch(requests);

            // Assert: batch was accepted and processed
            expect(result).toBeDefined();
            expect(result.results).toBeDefined();
            expect(Array.isArray(result.results)).toBe(true);

            // Assert: all items were processed
            expect(result.results.length).toBe(batchSize);
            expect(result.summary.total).toBe(batchSize);

            // Assert: no rejection error occurred
            // (If the batch was rejected, we wouldn't get results)
            expect(result.summary.successful + result.summary.failed).toBe(batchSize);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: The orchestrator SHALL successfully process the maximum
     * allowed batch size of exactly 100 items.
     */
    it('should successfully process exactly 100 items (maximum batch size)', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constant(100), // Always test with exactly 100 items
          async (batchSize) => {
            // Generate batch data for exactly 100 items
            const { routes, drivers, vehicles, dispatchIds, requests } = generateBatchTestData(batchSize);

            // Setup mocks
            setupBatchSizeMocks(routes, drivers, vehicles, dispatchIds);

            // Create orchestrator
            const adapter = new BatchSizeTestMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute batch dispatch
            const result = await orchestrator.dispatchBatch(requests);

            // Assert: batch was accepted
            expect(result).toBeDefined();

            // Assert: exactly 100 results returned
            expect(result.results.length).toBe(100);
            expect(result.summary.total).toBe(100);

            // Assert: all items have valid structure
            for (const itemResult of result.results) {
              expect(itemResult).toHaveProperty('index');
              expect(itemResult).toHaveProperty('success');
              expect(typeof itemResult.index).toBe('number');
              expect(typeof itemResult.success).toBe('boolean');
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any valid batch size, the number of results SHALL
     * equal the number of input requests.
     */
    it('should return results count equal to input count for valid batch sizes', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryValidBatchSize(),
          async (batchSize) => {
            // Generate batch data
            const { routes, drivers, vehicles, dispatchIds, requests } = generateBatchTestData(batchSize);

            // Setup mocks
            setupBatchSizeMocks(routes, drivers, vehicles, dispatchIds);

            // Create orchestrator
            const adapter = new BatchSizeTestMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute batch dispatch
            const result = await orchestrator.dispatchBatch(requests);

            // Assert: results count equals input count
            expect(result.results.length).toBe(requests.length);
            expect(result.summary.total).toBe(requests.length);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Batch size scaling behavior', () => {
    /**
     * Property: Small batches (1-10 items) SHALL be processed correctly.
     */
    it('should process small batches (1-10 items) correctly', () => {
      fc.assert(
        fc.asyncProperty(
          arbitrarySmallBatchSize(),
          async (batchSize) => {
            // Generate batch data
            const { routes, drivers, vehicles, dispatchIds, requests } = generateBatchTestData(batchSize);

            // Setup mocks
            setupBatchSizeMocks(routes, drivers, vehicles, dispatchIds);

            // Create orchestrator
            const adapter = new BatchSizeTestMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute batch dispatch
            const result = await orchestrator.dispatchBatch(requests);

            // Assert: batch processed successfully
            expect(result.results.length).toBe(batchSize);
            expect(result.summary.total).toBe(batchSize);

            // Assert: all items have valid indices
            const indices = result.results.map((r) => r.index).sort((a, b) => a - b);
            for (let i = 0; i < batchSize; i++) {
              expect(indices[i]).toBe(i);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Medium batches (11-50 items) SHALL be processed correctly.
     */
    it('should process medium batches (11-50 items) correctly', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryMediumBatchSize(),
          async (batchSize) => {
            // Generate batch data
            const { routes, drivers, vehicles, dispatchIds, requests } = generateBatchTestData(batchSize);

            // Setup mocks
            setupBatchSizeMocks(routes, drivers, vehicles, dispatchIds);

            // Create orchestrator
            const adapter = new BatchSizeTestMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute batch dispatch
            const result = await orchestrator.dispatchBatch(requests);

            // Assert: batch processed successfully
            expect(result.results.length).toBe(batchSize);
            expect(result.summary.total).toBe(batchSize);

            // Assert: summary is accurate
            expect(result.summary.successful + result.summary.failed).toBe(batchSize);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Large batches (51-100 items) SHALL be processed correctly.
     */
    it('should process large batches (51-100 items) correctly', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryLargeBatchSize(),
          async (batchSize) => {
            // Generate batch data
            const { routes, drivers, vehicles, dispatchIds, requests } = generateBatchTestData(batchSize);

            // Setup mocks
            setupBatchSizeMocks(routes, drivers, vehicles, dispatchIds);

            // Create orchestrator
            const adapter = new BatchSizeTestMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute batch dispatch
            const result = await orchestrator.dispatchBatch(requests);

            // Assert: batch processed successfully
            expect(result.results.length).toBe(batchSize);
            expect(result.summary.total).toBe(batchSize);

            // Assert: all results have required fields
            for (const itemResult of result.results) {
              expect(itemResult).toHaveProperty('index');
              expect(itemResult).toHaveProperty('success');
              if (itemResult.success) {
                expect(itemResult.dispatchId).toBeDefined();
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Boundary conditions', () => {
    /**
     * Property: A batch of exactly 1 item (minimum) SHALL be processed.
     */
    it('should process minimum batch size of 1 item', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constant(1),
          async (batchSize) => {
            // Generate batch data for 1 item
            const { routes, drivers, vehicles, dispatchIds, requests } = generateBatchTestData(batchSize);

            // Setup mocks
            setupBatchSizeMocks(routes, drivers, vehicles, dispatchIds);

            // Create orchestrator
            const adapter = new BatchSizeTestMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute batch dispatch
            const result = await orchestrator.dispatchBatch(requests);

            // Assert: single item processed
            expect(result.results.length).toBe(1);
            expect(result.summary.total).toBe(1);
            expect(result.results[0]).toBeDefined();
            expect(result.results[0]!.index).toBe(0);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: A batch of exactly 99 items (just under limit) SHALL be processed.
     */
    it('should process batch of 99 items (just under limit)', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constant(99),
          async (batchSize) => {
            // Generate batch data for 99 items
            const { routes, drivers, vehicles, dispatchIds, requests } = generateBatchTestData(batchSize);

            // Setup mocks
            setupBatchSizeMocks(routes, drivers, vehicles, dispatchIds);

            // Create orchestrator
            const adapter = new BatchSizeTestMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute batch dispatch
            const result = await orchestrator.dispatchBatch(requests);

            // Assert: 99 items processed
            expect(result.results.length).toBe(99);
            expect(result.summary.total).toBe(99);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: An empty batch (0 items) SHALL return empty results.
     * Note: The API layer will reject empty batches with 400 error,
     * but the orchestrator should handle it gracefully.
     */
    it('should handle empty batch gracefully', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constant(0),
          async () => {
            // Create orchestrator
            const adapter = new BatchSizeTestMockAdapter('telegram');
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute batch dispatch with empty array
            const result = await orchestrator.dispatchBatch([]);

            // Assert: empty results returned
            expect(result.results.length).toBe(0);
            expect(result.summary.total).toBe(0);
            expect(result.summary.successful).toBe(0);
            expect(result.summary.failed).toBe(0);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property-Based Tests for Delivery Status Tracking
 *
 * Feature: dispatch-service, Property 10: Delivery Status Tracking
 *
 * **Validates: Requirements 4.2, 4.4, 5.2, 5.4, 8.3, 8.4**
 *
 * Property 10 from design.md states:
 * "For any dispatch, the status SHALL transition through valid states: pending → sending → delivered/partial/failed.
 * Channel dispatch status SHALL be updated based on adapter results.
 * Provider message IDs SHALL be stored when available."
 *
 * This test verifies:
 * 1. Status transitions follow valid state machine: pending → sending → delivered/partial/failed
 * 2. Provider message IDs are stored on successful delivery
 * 3. Error messages are recorded on failure
 * 4. Dispatch status is updated based on channel results
 * 5. Channel dispatch records are updated on completion/failure
 */
describe('Feature: dispatch-service, Property 10: Delivery Status Tracking', () => {
  // =============================================================================
  // Arbitrary Generators
  // =============================================================================

  /**
   * Arbitrary generator for non-empty strings.
   */
  const arbitraryNonEmptyString = (): fc.Arbitrary<string> =>
    fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

  /**
   * Arbitrary generator for supported channel types.
   */
  const arbitraryChannelType = (): fc.Arbitrary<ChannelType> =>
    fc.constantFrom('telegram', 'email') as fc.Arbitrary<ChannelType>;

  /**
   * Arbitrary generator for telegram chat IDs (valid format).
   */
  const arbitraryTelegramChatId = (): fc.Arbitrary<string> =>
    fc.integer({ min: 1, max: 9999999999 }).map((n) => n.toString());

  /**
   * Arbitrary generator for email addresses.
   */
  const arbitraryEmail = (): fc.Arbitrary<string> => fc.emailAddress();

  /**
   * Arbitrary generator for valid UUID strings.
   */
  const arbitraryUuid = (): fc.Arbitrary<string> => fc.uuid();


  /**
   * Arbitrary generator for provider message IDs.
   */
  const arbitraryProviderMessageId = (): fc.Arbitrary<string> =>
    fc.string({ minLength: 5, maxLength: 50 }).map((s) => `msg-${s}`);

  /**
   * Arbitrary generator for error messages.
   */
  const arbitraryErrorMessage = (): fc.Arbitrary<string> =>
    fc.constantFrom(
      'Connection timeout',
      'Invalid recipient',
      'Rate limit exceeded',
      'Authentication failed',
      'Service unavailable',
      'Message rejected',
      'Invalid format'
    );

  /**
   * Arbitrary generator for driver with both channels configured.
   */
  const arbitraryDriverWithBothChannels = (): fc.Arbitrary<Driver> =>
    fc.record({
      id: arbitraryUuid(),
      firstName: arbitraryNonEmptyString(),
      lastName: arbitraryNonEmptyString(),
      email: arbitraryEmail(),
      telegramChatId: arbitraryTelegramChatId(),
      preferredChannel: fc.option(arbitraryChannelType(), { nil: undefined }),
      fallbackEnabled: fc.boolean(),
      status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
    });


  /**
   * Arbitrary generator for route.
   */
  const arbitraryRoute = (): fc.Arbitrary<Route> =>
    fc.record({
      id: arbitraryUuid(),
      name: arbitraryNonEmptyString(),
      code: fc.option(arbitraryNonEmptyString(), { nil: undefined }),
      date: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
        .map((d) => d.toISOString().split('T')[0] as string),
      plannedStartTime: fc.option(fc.constantFrom('08:00', '09:00', '10:00'), { nil: undefined }),
      plannedEndTime: fc.option(fc.constantFrom('16:00', '17:00', '18:00'), { nil: undefined }),
      totalStops: fc.integer({ min: 1, max: 50 }),
      totalDistanceKm: fc.option(fc.float({ min: 1, max: 500 }), { nil: undefined }),
      totalDurationMinutes: fc.option(fc.integer({ min: 30, max: 600 }), { nil: undefined }),
      vehicleId: fc.option(arbitraryUuid(), { nil: undefined }),
      driverId: fc.option(arbitraryUuid(), { nil: undefined }),
    }) as fc.Arbitrary<Route>;

  /**
   * Arbitrary generator for vehicle.
   */
  const arbitraryVehicle = (): fc.Arbitrary<Vehicle> =>
    fc.record({
      id: arbitraryUuid(),
      name: arbitraryNonEmptyString(),
      licensePlate: fc.option(arbitraryNonEmptyString(), { nil: undefined }),
      make: fc.option(arbitraryNonEmptyString(), { nil: undefined }),
      model: fc.option(arbitraryNonEmptyString(), { nil: undefined }),
    });


  // =============================================================================
  // Mock Adapters for Status Tracking Tests
  // =============================================================================

  /**
   * Mock adapter that always succeeds and returns a provider message ID.
   */
  class SuccessfulMockAdapter implements ChannelAdapter {
    readonly channelType: ChannelType;
    private providerMessageId: string;

    constructor(channelType: ChannelType, providerMessageId: string) {
      this.channelType = channelType;
      this.providerMessageId = providerMessageId;
    }

    canSend(driver: Driver): boolean {
      if (this.channelType === 'telegram') {
        return !!driver.telegramChatId;
      }
      if (this.channelType === 'email') {
        return !!driver.email;
      }
      return false;
    }

    async send(_context: DispatchContext): Promise<ChannelResult> {
      return {
        success: true,
        channelType: this.channelType,
        providerMessageId: this.providerMessageId,
        sentAt: new Date(),
      };
    }

    async healthCheck(): Promise<HealthStatus> {
      return { healthy: true, message: 'Mock adapter healthy' };
    }
  }


  /**
   * Mock adapter that always fails with an error message.
   */
  class FailingMockAdapter implements ChannelAdapter {
    readonly channelType: ChannelType;
    private errorMessage: string;

    constructor(channelType: ChannelType, errorMessage: string) {
      this.channelType = channelType;
      this.errorMessage = errorMessage;
    }

    canSend(driver: Driver): boolean {
      if (this.channelType === 'telegram') {
        return !!driver.telegramChatId;
      }
      if (this.channelType === 'email') {
        return !!driver.email;
      }
      return false;
    }

    async send(_context: DispatchContext): Promise<ChannelResult> {
      return {
        success: false,
        channelType: this.channelType,
        error: this.errorMessage,
        sentAt: new Date(),
      };
    }

    async healthCheck(): Promise<HealthStatus> {
      return { healthy: true, message: 'Mock adapter healthy' };
    }
  }


  /**
   * Mock adapter with configurable success/failure behavior.
   */
  class ConfigurableMockAdapter implements ChannelAdapter {
    readonly channelType: ChannelType;
    private shouldSucceed: boolean;
    private providerMessageId?: string;
    private errorMessage?: string;

    constructor(
      channelType: ChannelType,
      shouldSucceed: boolean,
      providerMessageId?: string,
      errorMessage?: string
    ) {
      this.channelType = channelType;
      this.shouldSucceed = shouldSucceed;
      this.providerMessageId = providerMessageId;
      this.errorMessage = errorMessage;
    }

    canSend(driver: Driver): boolean {
      if (this.channelType === 'telegram') {
        return !!driver.telegramChatId;
      }
      if (this.channelType === 'email') {
        return !!driver.email;
      }
      return false;
    }

    async send(_context: DispatchContext): Promise<ChannelResult> {
      if (this.shouldSucceed) {
        return {
          success: true,
          channelType: this.channelType,
          providerMessageId: this.providerMessageId,
          sentAt: new Date(),
        };
      }
      return {
        success: false,
        channelType: this.channelType,
        error: this.errorMessage,
        sentAt: new Date(),
      };
    }

    async healthCheck(): Promise<HealthStatus> {
      return { healthy: true, message: 'Mock adapter healthy' };
    }
  }


  // =============================================================================
  // Helper Functions
  // =============================================================================

  /**
   * Tracks all status updates for verification.
   */
  interface StatusTracker {
    dispatchStatusUpdates: Array<{ dispatchId: string; status: DispatchStatus }>;
    channelDispatchUpdates: Array<{
      channelDispatchId: string;
      status?: ChannelDispatchStatus;
      providerMessageId?: string;
      errorMessage?: string;
    }>;
  }

  /**
   * Setup mock database responses with status tracking.
   */
  function setupMocksWithTracking(
    route: Route,
    driver: Driver,
    vehicle: Vehicle | null,
    bookings: Booking[],
    dispatchId: string,
    tracker: StatusTracker
  ): void {
    const mockDispatch: Dispatch = {
      id: dispatchId,
      routeId: route.id,
      driverId: driver.id,
      status: 'pending',
      requestedChannels: ['telegram'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (entitiesRepo.getRoute as jest.Mock).mockResolvedValue(route);
    (entitiesRepo.getDriver as jest.Mock).mockResolvedValue(driver);
    (entitiesRepo.getVehicle as jest.Mock).mockResolvedValue(vehicle);
    (entitiesRepo.getBookingsForRoute as jest.Mock).mockResolvedValue(bookings);

    (dispatchRepo.createDispatch as jest.Mock).mockResolvedValue(mockDispatch);


    // Track dispatch status updates
    (dispatchRepo.updateDispatchStatus as jest.Mock).mockImplementation(
      (id: string, status: DispatchStatus) => {
        tracker.dispatchStatusUpdates.push({ dispatchId: id, status });
        return Promise.resolve({ ...mockDispatch, id, status });
      }
    );

    let channelDispatchCounter = 0;
    (dispatchRepo.createChannelDispatch as jest.Mock).mockImplementation(
      (data: { dispatchId: string; channel: string }) => {
        const id = `channel-dispatch-${channelDispatchCounter++}`;
        return Promise.resolve({
          id,
          dispatchId: data.dispatchId,
          channel: data.channel,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    );

    // Track channel dispatch updates
    (dispatchRepo.updateChannelDispatch as jest.Mock).mockImplementation(
      (channelDispatchId: string, input: UpdateChannelDispatchInput) => {
        tracker.channelDispatchUpdates.push({
          channelDispatchId,
          status: input.status,
          providerMessageId: input.providerMessageId,
          errorMessage: input.errorMessage,
        });
        return Promise.resolve({
          id: channelDispatchId,
          status: input.status || 'pending',
          providerMessageId: input.providerMessageId,
          errorMessage: input.errorMessage,
        });
      }
    );
  }


  /**
   * Valid dispatch status values.
   */
  const VALID_DISPATCH_STATUSES: DispatchStatus[] = ['pending', 'sending', 'delivered', 'partial', 'failed'];

  /**
   * Valid channel dispatch status values.
   */
  const VALID_CHANNEL_STATUSES: ChannelDispatchStatus[] = ['pending', 'sending', 'delivered', 'failed'];

  /**
   * Valid final dispatch statuses (after processing completes).
   */
  const VALID_FINAL_STATUSES: DispatchStatus[] = ['delivered', 'partial', 'failed'];

  // =============================================================================
  // Setup
  // =============================================================================

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });


  // =============================================================================
  // Property Tests
  // =============================================================================

  describe('Requirements 4.2, 5.2: Store provider message ID on success', () => {
    /**
     * Property: For any successful channel delivery, the provider message ID
     * SHALL be stored in the channel_dispatch record.
     */
    it('should store provider message ID when delivery succeeds', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          arbitraryProviderMessageId(),
          async (driver, route, vehicle, dispatchId, providerMessageId) => {
            // Ensure driver uses telegram channel for this test
            const driverWithTelegram: Driver = {
              ...driver,
              telegramChatId: driver.telegramChatId || '123456789',
              preferredChannel: 'telegram' as ChannelType,
            };

            // Setup tracking
            const tracker: StatusTracker = {
              dispatchStatusUpdates: [],
              channelDispatchUpdates: [],
            };
            setupMocksWithTracking(route, driverWithTelegram, vehicle, [], dispatchId, tracker);

            // Create orchestrator with successful adapter
            const adapter = new SuccessfulMockAdapter('telegram', providerMessageId);
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute dispatch
            await orchestrator.dispatch({
              routeId: route.id,
              driverId: driverWithTelegram.id,
            });

            // Wait for async processing
            await new Promise((resolve) => setTimeout(resolve, 50));


            // Assert: channel dispatch was updated with provider message ID
            const successfulUpdates = tracker.channelDispatchUpdates.filter(
              (u) => u.status === 'delivered' && u.providerMessageId !== undefined
            );
            expect(successfulUpdates.length).toBeGreaterThan(0);

            // Assert: the provider message ID matches what the adapter returned
            const updateWithMessageId = successfulUpdates.find(
              (u) => u.providerMessageId === providerMessageId
            );
            expect(updateWithMessageId).toBeDefined();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any successful delivery, the channel dispatch status
     * SHALL be updated to 'delivered'.
     */
    it('should update channel dispatch status to delivered on success', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          arbitraryProviderMessageId(),
          async (driver, route, vehicle, dispatchId, providerMessageId) => {
            // Ensure driver uses telegram channel for this test
            const driverWithTelegram: Driver = {
              ...driver,
              telegramChatId: driver.telegramChatId || '123456789',
              preferredChannel: 'telegram' as ChannelType,
            };

            // Setup tracking
            const tracker: StatusTracker = {
              dispatchStatusUpdates: [],
              channelDispatchUpdates: [],
            };
            setupMocksWithTracking(route, driverWithTelegram, vehicle, [], dispatchId, tracker);

            // Create orchestrator with successful adapter
            const adapter = new SuccessfulMockAdapter('telegram', providerMessageId);
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute dispatch
            await orchestrator.dispatch({
              routeId: route.id,
              driverId: driverWithTelegram.id,
            });

            // Wait for async processing
            await new Promise((resolve) => setTimeout(resolve, 50));


            // Assert: at least one channel dispatch was updated to 'delivered'
            const deliveredUpdates = tracker.channelDispatchUpdates.filter(
              (u) => u.status === 'delivered'
            );
            expect(deliveredUpdates.length).toBeGreaterThan(0);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirements 4.4, 5.4: Record error message on failure', () => {
    /**
     * Property: For any failed channel delivery, the error message
     * SHALL be recorded in the channel_dispatch record.
     */
    it('should record error message when delivery fails', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          arbitraryErrorMessage(),
          async (driver, route, vehicle, dispatchId, errorMessage) => {
            // Ensure driver uses telegram channel for this test
            const driverWithTelegram: Driver = {
              ...driver,
              telegramChatId: driver.telegramChatId || '123456789',
              preferredChannel: 'telegram' as ChannelType,
            };

            // Setup tracking
            const tracker: StatusTracker = {
              dispatchStatusUpdates: [],
              channelDispatchUpdates: [],
            };
            setupMocksWithTracking(route, driverWithTelegram, vehicle, [], dispatchId, tracker);

            // Create orchestrator with failing adapter
            const adapter = new FailingMockAdapter('telegram', errorMessage);
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute dispatch
            await orchestrator.dispatch({
              routeId: route.id,
              driverId: driverWithTelegram.id,
            });

            // Wait for async processing
            await new Promise((resolve) => setTimeout(resolve, 50));


            // Assert: channel dispatch was updated with error message
            const failedUpdates = tracker.channelDispatchUpdates.filter(
              (u) => u.status === 'failed' && u.errorMessage !== undefined
            );
            expect(failedUpdates.length).toBeGreaterThan(0);

            // Assert: the error message matches what the adapter returned
            const updateWithError = failedUpdates.find(
              (u) => u.errorMessage === errorMessage
            );
            expect(updateWithError).toBeDefined();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any failed delivery, the channel dispatch status
     * SHALL be updated to 'failed'.
     */
    it('should update channel dispatch status to failed on failure', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          arbitraryErrorMessage(),
          async (driver, route, vehicle, dispatchId, errorMessage) => {
            // Ensure driver uses telegram channel for this test
            const driverWithTelegram: Driver = {
              ...driver,
              telegramChatId: driver.telegramChatId || '123456789',
              preferredChannel: 'telegram' as ChannelType,
            };

            // Setup tracking
            const tracker: StatusTracker = {
              dispatchStatusUpdates: [],
              channelDispatchUpdates: [],
            };
            setupMocksWithTracking(route, driverWithTelegram, vehicle, [], dispatchId, tracker);

            // Create orchestrator with failing adapter
            const adapter = new FailingMockAdapter('telegram', errorMessage);
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute dispatch
            await orchestrator.dispatch({
              routeId: route.id,
              driverId: driverWithTelegram.id,
            });

            // Wait for async processing
            await new Promise((resolve) => setTimeout(resolve, 50));


            // Assert: at least one channel dispatch was updated to 'failed'
            const failedUpdates = tracker.channelDispatchUpdates.filter(
              (u) => u.status === 'failed'
            );
            expect(failedUpdates.length).toBeGreaterThan(0);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 8.3: Update dispatch status on changes', () => {
    /**
     * Property: For any dispatch, the status SHALL transition through valid states.
     * Valid transitions: pending → sending → delivered/partial/failed
     */
    it('should transition dispatch status through valid states', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          arbitraryProviderMessageId(),
          async (driver, route, vehicle, dispatchId, providerMessageId) => {
            // Ensure driver uses telegram channel for this test
            const driverWithTelegram: Driver = {
              ...driver,
              telegramChatId: driver.telegramChatId || '123456789',
              preferredChannel: 'telegram' as ChannelType,
            };

            // Setup tracking
            const tracker: StatusTracker = {
              dispatchStatusUpdates: [],
              channelDispatchUpdates: [],
            };
            setupMocksWithTracking(route, driverWithTelegram, vehicle, [], dispatchId, tracker);

            // Create orchestrator with successful adapter
            const adapter = new SuccessfulMockAdapter('telegram', providerMessageId);
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute dispatch
            await orchestrator.dispatch({
              routeId: route.id,
              driverId: driverWithTelegram.id,
            });

            // Wait for async processing
            await new Promise((resolve) => setTimeout(resolve, 50));


            // Assert: all status updates are valid statuses
            for (const update of tracker.dispatchStatusUpdates) {
              expect(VALID_DISPATCH_STATUSES).toContain(update.status);
            }

            // Assert: status transitions follow valid order
            // First update should be 'sending', final should be a terminal state
            if (tracker.dispatchStatusUpdates.length > 0) {
              const firstUpdate = tracker.dispatchStatusUpdates[0];
              expect(firstUpdate!.status).toBe('sending');

              const lastUpdate = tracker.dispatchStatusUpdates[tracker.dispatchStatusUpdates.length - 1];
              expect(VALID_FINAL_STATUSES).toContain(lastUpdate!.status);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch where all channels succeed, the final status
     * SHALL be 'delivered'.
     */
    it('should set dispatch status to delivered when all channels succeed', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          arbitraryProviderMessageId(),
          async (driver, route, vehicle, dispatchId, providerMessageId) => {
            // Ensure driver uses telegram channel for this test
            const driverWithTelegram: Driver = {
              ...driver,
              telegramChatId: driver.telegramChatId || '123456789',
              preferredChannel: 'telegram' as ChannelType,
            };

            // Setup tracking
            const tracker: StatusTracker = {
              dispatchStatusUpdates: [],
              channelDispatchUpdates: [],
            };
            setupMocksWithTracking(route, driverWithTelegram, vehicle, [], dispatchId, tracker);

            // Create orchestrator with successful adapter
            const adapter = new SuccessfulMockAdapter('telegram', providerMessageId);
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute dispatch
            await orchestrator.dispatch({
              routeId: route.id,
              driverId: driverWithTelegram.id,
            });

            // Wait for async processing
            await new Promise((resolve) => setTimeout(resolve, 50));


            // Assert: final dispatch status is 'delivered'
            const finalUpdate = tracker.dispatchStatusUpdates[tracker.dispatchStatusUpdates.length - 1];
            expect(finalUpdate).toBeDefined();
            expect(finalUpdate!.status).toBe('delivered');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch where all channels fail, the final status
     * SHALL be 'failed'.
     */
    it('should set dispatch status to failed when all channels fail', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          arbitraryErrorMessage(),
          async (driver, route, vehicle, dispatchId, errorMessage) => {
            // Ensure driver uses telegram channel for this test
            const driverWithTelegram: Driver = {
              ...driver,
              telegramChatId: driver.telegramChatId || '123456789',
              preferredChannel: 'telegram' as ChannelType,
            };

            // Setup tracking
            const tracker: StatusTracker = {
              dispatchStatusUpdates: [],
              channelDispatchUpdates: [],
            };
            setupMocksWithTracking(route, driverWithTelegram, vehicle, [], dispatchId, tracker);

            // Create orchestrator with failing adapter
            const adapter = new FailingMockAdapter('telegram', errorMessage);
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute dispatch
            await orchestrator.dispatch({
              routeId: route.id,
              driverId: driverWithTelegram.id,
            });

            // Wait for async processing
            await new Promise((resolve) => setTimeout(resolve, 50));


            // Assert: final dispatch status is 'failed'
            const finalUpdate = tracker.dispatchStatusUpdates[tracker.dispatchStatusUpdates.length - 1];
            expect(finalUpdate).toBeDefined();
            expect(finalUpdate!.status).toBe('failed');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any multi-channel dispatch where some channels succeed and
     * some fail, the final status SHALL be 'partial'.
     */
    it('should set dispatch status to partial when some channels succeed and some fail', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          arbitraryProviderMessageId(),
          arbitraryErrorMessage(),
          async (driver, route, vehicle, dispatchId, providerMessageId, errorMessage) => {
            // Ensure driver has both channels configured for this test
            const driverWithBothChannels: Driver = {
              ...driver,
              telegramChatId: driver.telegramChatId || '123456789',
              email: driver.email || 'test@example.com',
            };

            // Setup tracking
            const tracker: StatusTracker = {
              dispatchStatusUpdates: [],
              channelDispatchUpdates: [],
            };
            setupMocksWithTracking(route, driverWithBothChannels, vehicle, [], dispatchId, tracker);

            // Create orchestrator with one successful and one failing adapter
            const successAdapter = new SuccessfulMockAdapter('telegram', providerMessageId);
            const failAdapter = new FailingMockAdapter('email', errorMessage);
            const orchestrator = createDispatchOrchestrator([successAdapter, failAdapter]);

            // Execute dispatch with multi-channel
            await orchestrator.dispatch({
              routeId: route.id,
              driverId: driverWithBothChannels.id,
              multiChannel: true,
            });

            // Wait for async processing
            await new Promise((resolve) => setTimeout(resolve, 50));


            // Assert: final dispatch status is 'partial'
            const finalUpdate = tracker.dispatchStatusUpdates[tracker.dispatchStatusUpdates.length - 1];
            expect(finalUpdate).toBeDefined();
            expect(finalUpdate!.status).toBe('partial');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 8.4: Update channel_dispatches on completion/failure', () => {
    /**
     * Property: For any channel delivery attempt, the channel_dispatch record
     * SHALL be updated with the final status (delivered or failed).
     */
    it('should update channel dispatch record with final status', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          fc.boolean(),
          arbitraryProviderMessageId(),
          arbitraryErrorMessage(),
          async (driver, route, vehicle, dispatchId, shouldSucceed, providerMessageId, errorMessage) => {
            // Ensure driver uses telegram channel for this test
            const driverWithTelegram: Driver = {
              ...driver,
              telegramChatId: driver.telegramChatId || '123456789',
              preferredChannel: 'telegram' as ChannelType,
            };

            // Setup tracking
            const tracker: StatusTracker = {
              dispatchStatusUpdates: [],
              channelDispatchUpdates: [],
            };
            setupMocksWithTracking(route, driverWithTelegram, vehicle, [], dispatchId, tracker);

            // Create orchestrator with configurable adapter
            const adapter = new ConfigurableMockAdapter(
              'telegram',
              shouldSucceed,
              shouldSucceed ? providerMessageId : undefined,
              shouldSucceed ? undefined : errorMessage
            );
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute dispatch
            await orchestrator.dispatch({
              routeId: route.id,
              driverId: driverWithTelegram.id,
            });

            // Wait for async processing
            await new Promise((resolve) => setTimeout(resolve, 50));


            // Assert: channel dispatch was updated
            expect(tracker.channelDispatchUpdates.length).toBeGreaterThan(0);

            // Assert: final status is either 'delivered' or 'failed'
            const finalStatuses = tracker.channelDispatchUpdates
              .filter((u) => u.status === 'delivered' || u.status === 'failed')
              .map((u) => u.status);
            expect(finalStatuses.length).toBeGreaterThan(0);

            // Assert: status matches adapter behavior
            if (shouldSucceed) {
              expect(finalStatuses).toContain('delivered');
            } else {
              expect(finalStatuses).toContain('failed');
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any channel dispatch update, the status SHALL be a valid
     * channel dispatch status.
     */
    it('should only use valid channel dispatch statuses', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          fc.boolean(),
          arbitraryProviderMessageId(),
          arbitraryErrorMessage(),
          async (driver, route, vehicle, dispatchId, shouldSucceed, providerMessageId, errorMessage) => {
            // Ensure driver uses telegram channel for this test
            const driverWithTelegram: Driver = {
              ...driver,
              telegramChatId: driver.telegramChatId || '123456789',
              preferredChannel: 'telegram' as ChannelType,
            };

            // Setup tracking
            const tracker: StatusTracker = {
              dispatchStatusUpdates: [],
              channelDispatchUpdates: [],
            };
            setupMocksWithTracking(route, driverWithTelegram, vehicle, [], dispatchId, tracker);

            // Create orchestrator with configurable adapter
            const adapter = new ConfigurableMockAdapter(
              'telegram',
              shouldSucceed,
              shouldSucceed ? providerMessageId : undefined,
              shouldSucceed ? undefined : errorMessage
            );
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute dispatch
            await orchestrator.dispatch({
              routeId: route.id,
              driverId: driverWithTelegram.id,
            });

            // Wait for async processing
            await new Promise((resolve) => setTimeout(resolve, 50));


            // Assert: all channel dispatch status updates are valid
            for (const update of tracker.channelDispatchUpdates) {
              if (update.status !== undefined) {
                expect(VALID_CHANNEL_STATUSES).toContain(update.status);
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Status tracking consistency', () => {
    /**
     * Property: For any dispatch, the number of channel dispatch updates
     * SHALL be at least equal to the number of channels attempted.
     */
    it('should update channel dispatch for each channel attempted', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          arbitraryProviderMessageId(),
          async (driver, route, vehicle, dispatchId, providerMessageId) => {
            // Ensure driver has both channels configured for this test
            const driverWithBothChannels: Driver = {
              ...driver,
              telegramChatId: driver.telegramChatId || '123456789',
              email: driver.email || 'test@example.com',
            };

            // Setup tracking
            const tracker: StatusTracker = {
              dispatchStatusUpdates: [],
              channelDispatchUpdates: [],
            };
            setupMocksWithTracking(route, driverWithBothChannels, vehicle, [], dispatchId, tracker);

            // Create orchestrator with both adapters
            const telegramAdapter = new SuccessfulMockAdapter('telegram', providerMessageId);
            const emailAdapter = new SuccessfulMockAdapter('email', `email-${providerMessageId}`);
            const orchestrator = createDispatchOrchestrator([telegramAdapter, emailAdapter]);

            // Execute dispatch with multi-channel
            await orchestrator.dispatch({
              routeId: route.id,
              driverId: driverWithBothChannels.id,
              multiChannel: true,
            });

            // Wait for async processing
            await new Promise((resolve) => setTimeout(resolve, 50));


            // Assert: channel dispatch updates were made for both channels
            // Each channel should have at least one update (to delivered status)
            const deliveredUpdates = tracker.channelDispatchUpdates.filter(
              (u) => u.status === 'delivered'
            );
            expect(deliveredUpdates.length).toBeGreaterThanOrEqual(2);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any successful delivery, the provider message ID
     * SHALL NOT be undefined or empty.
     */
    it('should have non-empty provider message ID on success', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          arbitraryProviderMessageId(),
          async (driver, route, vehicle, dispatchId, providerMessageId) => {
            // Ensure driver uses telegram channel for this test
            const driverWithTelegram: Driver = {
              ...driver,
              telegramChatId: driver.telegramChatId || '123456789',
              preferredChannel: 'telegram' as ChannelType,
            };

            // Setup tracking
            const tracker: StatusTracker = {
              dispatchStatusUpdates: [],
              channelDispatchUpdates: [],
            };
            setupMocksWithTracking(route, driverWithTelegram, vehicle, [], dispatchId, tracker);

            // Create orchestrator with successful adapter
            const adapter = new SuccessfulMockAdapter('telegram', providerMessageId);
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute dispatch
            await orchestrator.dispatch({
              routeId: route.id,
              driverId: driverWithTelegram.id,
            });

            // Wait for async processing
            await new Promise((resolve) => setTimeout(resolve, 50));


            // Assert: successful updates have non-empty provider message ID
            const successfulUpdates = tracker.channelDispatchUpdates.filter(
              (u) => u.status === 'delivered'
            );
            for (const update of successfulUpdates) {
              expect(update.providerMessageId).toBeDefined();
              expect(update.providerMessageId!.length).toBeGreaterThan(0);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any failed delivery, the error message
     * SHALL NOT be undefined or empty.
     */
    it('should have non-empty error message on failure', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          arbitraryErrorMessage(),
          async (driver, route, vehicle, dispatchId, errorMessage) => {
            // Ensure driver uses telegram channel for this test
            const driverWithTelegram: Driver = {
              ...driver,
              telegramChatId: driver.telegramChatId || '123456789',
              preferredChannel: 'telegram' as ChannelType,
            };

            // Setup tracking
            const tracker: StatusTracker = {
              dispatchStatusUpdates: [],
              channelDispatchUpdates: [],
            };
            setupMocksWithTracking(route, driverWithTelegram, vehicle, [], dispatchId, tracker);

            // Create orchestrator with failing adapter
            const adapter = new FailingMockAdapter('telegram', errorMessage);
            const orchestrator = createDispatchOrchestrator([adapter]);

            // Execute dispatch
            await orchestrator.dispatch({
              routeId: route.id,
              driverId: driverWithTelegram.id,
            });

            // Wait for async processing
            await new Promise((resolve) => setTimeout(resolve, 50));


            // Assert: failed updates have non-empty error message
            const failedUpdates = tracker.channelDispatchUpdates.filter(
              (u) => u.status === 'failed'
            );
            for (const update of failedUpdates) {
              expect(update.errorMessage).toBeDefined();
              expect(update.errorMessage!.length).toBeGreaterThan(0);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property-Based Tests for Adapter Failure Resilience
 *
 * Feature: dispatch-service, Property 19: Adapter Failure Resilience
 *
 * **Validates: Requirements 12.3**
 *
 * Property 19 from design.md states:
 * "For any adapter that throws an exception, the service SHALL catch the error.
 * The error SHALL be recorded in the channel_dispatch record.
 * Other channels SHALL continue processing."
 *
 * This test verifies:
 * 1. Adapter exceptions are caught and do not crash the service
 * 2. Exceptions are recorded in the channel_dispatch record
 * 3. Other channels continue processing after one throws
 * 4. The dispatch completes even when adapters throw exceptions
 * 5. Error messages from exceptions are properly captured
 */
describe('Feature: dispatch-service, Property 19: Adapter Failure Resilience', () => {
  // =============================================================================
  // Arbitrary Generators
  // =============================================================================

  /**
   * Arbitrary generator for non-empty strings.
   */
  const arbitraryNonEmptyString = (): fc.Arbitrary<string> =>
    fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

  /**
   * Arbitrary generator for supported channel types.
   */
  const arbitraryChannelType = (): fc.Arbitrary<ChannelType> =>
    fc.constantFrom('telegram', 'email') as fc.Arbitrary<ChannelType>;

  /**
   * Arbitrary generator for telegram chat IDs (valid format).
   */
  const arbitraryTelegramChatId = (): fc.Arbitrary<string> =>
    fc.integer({ min: 1, max: 9999999999 }).map((n) => n.toString());

  /**
   * Arbitrary generator for email addresses.
   */
  const arbitraryEmail = (): fc.Arbitrary<string> => fc.emailAddress();

  /**
   * Arbitrary generator for valid UUID strings.
   */
  const arbitraryUuid = (): fc.Arbitrary<string> => fc.uuid();

  /**
   * Arbitrary generator for exception error messages.
   */
  const arbitraryExceptionMessage = (): fc.Arbitrary<string> =>
    fc.constantFrom(
      'Network connection failed',
      'Timeout exceeded',
      'Invalid API response',
      'Authentication error',
      'Rate limit exceeded',
      'Service unavailable',
      'Internal server error',
      'Connection refused',
      'DNS resolution failed',
      'SSL certificate error'
    );

  /**
   * Arbitrary generator for provider message IDs.
   */
  const arbitraryProviderMessageId = (): fc.Arbitrary<string> =>
    fc.string({ minLength: 5, maxLength: 50 }).map((s) => `msg-${s}`);

  /**
   * Arbitrary generator for driver with both channels configured.
   */
  const arbitraryDriverWithBothChannels = (): fc.Arbitrary<Driver> =>
    fc.record({
      id: arbitraryUuid(),
      firstName: arbitraryNonEmptyString(),
      lastName: arbitraryNonEmptyString(),
      email: arbitraryEmail(),
      telegramChatId: arbitraryTelegramChatId(),
      preferredChannel: fc.option(arbitraryChannelType(), { nil: undefined }),
      fallbackEnabled: fc.boolean(),
      status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
    });

  /**
   * Arbitrary generator for route.
   */
  const arbitraryRoute = (): fc.Arbitrary<Route> =>
    fc.record({
      id: arbitraryUuid(),
      name: arbitraryNonEmptyString(),
      code: fc.option(arbitraryNonEmptyString(), { nil: undefined }),
      date: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
        .map((d) => d.toISOString().split('T')[0] as string),
      plannedStartTime: fc.option(fc.constantFrom('08:00', '09:00', '10:00'), { nil: undefined }),
      plannedEndTime: fc.option(fc.constantFrom('16:00', '17:00', '18:00'), { nil: undefined }),
      totalStops: fc.integer({ min: 1, max: 50 }),
      totalDistanceKm: fc.option(fc.float({ min: 1, max: 500 }), { nil: undefined }),
      totalDurationMinutes: fc.option(fc.integer({ min: 30, max: 600 }), { nil: undefined }),
      vehicleId: fc.option(arbitraryUuid(), { nil: undefined }),
      driverId: fc.option(arbitraryUuid(), { nil: undefined }),
    }) as fc.Arbitrary<Route>;

  /**
   * Arbitrary generator for vehicle.
   */
  const arbitraryVehicle = (): fc.Arbitrary<Vehicle> =>
    fc.record({
      id: arbitraryUuid(),
      name: arbitraryNonEmptyString(),
      licensePlate: fc.option(arbitraryNonEmptyString(), { nil: undefined }),
      make: fc.option(arbitraryNonEmptyString(), { nil: undefined }),
      model: fc.option(arbitraryNonEmptyString(), { nil: undefined }),
    });

  // =============================================================================
  // Mock Adapters for Exception Testing
  // =============================================================================

  /**
   * Mock adapter that throws an exception when send() is called.
   * This simulates unexpected errors from external providers.
   */
  class ThrowingMockAdapter implements ChannelAdapter {
    readonly channelType: ChannelType;
    private exceptionMessage: string;
    public sendCalled: boolean = false;

    constructor(channelType: ChannelType, exceptionMessage: string) {
      this.channelType = channelType;
      this.exceptionMessage = exceptionMessage;
    }

    canSend(driver: Driver): boolean {
      if (this.channelType === 'telegram') {
        return !!driver.telegramChatId;
      }
      if (this.channelType === 'email') {
        return !!driver.email;
      }
      return false;
    }

    async send(_context: DispatchContext): Promise<ChannelResult> {
      this.sendCalled = true;
      throw new Error(this.exceptionMessage);
    }

    async healthCheck(): Promise<HealthStatus> {
      return { healthy: true, message: 'Mock adapter healthy' };
    }
  }

  /**
   * Mock adapter that succeeds and returns a provider message ID.
   */
  class SucceedingMockAdapter implements ChannelAdapter {
    readonly channelType: ChannelType;
    private providerMessageId: string;
    public sendCalled: boolean = false;
    public sendCompleted: boolean = false;

    constructor(channelType: ChannelType, providerMessageId: string) {
      this.channelType = channelType;
      this.providerMessageId = providerMessageId;
    }

    canSend(driver: Driver): boolean {
      if (this.channelType === 'telegram') {
        return !!driver.telegramChatId;
      }
      if (this.channelType === 'email') {
        return !!driver.email;
      }
      return false;
    }

    async send(_context: DispatchContext): Promise<ChannelResult> {
      this.sendCalled = true;
      this.sendCompleted = true;
      return {
        success: true,
        channelType: this.channelType,
        providerMessageId: this.providerMessageId,
        sentAt: new Date(),
      };
    }

    async healthCheck(): Promise<HealthStatus> {
      return { healthy: true, message: 'Mock adapter healthy' };
    }
  }

  // =============================================================================
  // Helper Functions
  // =============================================================================

  /**
   * Tracks all status updates for verification.
   */
  interface ExceptionStatusTracker {
    dispatchStatusUpdates: Array<{ dispatchId: string; status: DispatchStatus }>;
    channelDispatchUpdates: Array<{
      channelDispatchId: string;
      status?: ChannelDispatchStatus;
      providerMessageId?: string;
      errorMessage?: string;
    }>;
  }

  /**
   * Setup mock database responses with status tracking for exception tests.
   */
  function setupExceptionMocksWithTracking(
    route: Route,
    driver: Driver,
    vehicle: Vehicle | null,
    bookings: Booking[],
    dispatchId: string,
    tracker: ExceptionStatusTracker
  ): void {
    const mockDispatch: Dispatch = {
      id: dispatchId,
      routeId: route.id,
      driverId: driver.id,
      status: 'pending',
      requestedChannels: ['telegram', 'email'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (entitiesRepo.getRoute as jest.Mock).mockResolvedValue(route);
    (entitiesRepo.getDriver as jest.Mock).mockResolvedValue(driver);
    (entitiesRepo.getVehicle as jest.Mock).mockResolvedValue(vehicle);
    (entitiesRepo.getBookingsForRoute as jest.Mock).mockResolvedValue(bookings);

    (dispatchRepo.createDispatch as jest.Mock).mockResolvedValue(mockDispatch);

    // Track dispatch status updates
    (dispatchRepo.updateDispatchStatus as jest.Mock).mockImplementation(
      (id: string, status: DispatchStatus) => {
        tracker.dispatchStatusUpdates.push({ dispatchId: id, status });
        return Promise.resolve({ ...mockDispatch, id, status });
      }
    );

    let channelDispatchCounter = 0;
    (dispatchRepo.createChannelDispatch as jest.Mock).mockImplementation(
      (data: { dispatchId: string; channel: string }) => {
        const id = `channel-dispatch-exception-${channelDispatchCounter++}`;
        return Promise.resolve({
          id,
          dispatchId: data.dispatchId,
          channel: data.channel,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    );

    // Track channel dispatch updates
    (dispatchRepo.updateChannelDispatch as jest.Mock).mockImplementation(
      (channelDispatchId: string, input: UpdateChannelDispatchInput) => {
        tracker.channelDispatchUpdates.push({
          channelDispatchId,
          status: input.status,
          providerMessageId: input.providerMessageId,
          errorMessage: input.errorMessage,
        });
        return Promise.resolve({
          id: channelDispatchId,
          status: input.status || 'pending',
          providerMessageId: input.providerMessageId,
          errorMessage: input.errorMessage,
        });
      }
    );
  }

  // =============================================================================
  // Setup
  // =============================================================================

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =============================================================================
  // Property Tests
  // =============================================================================

  describe('Requirement 12.3: Catch adapter exceptions without crashing', () => {
    /**
     * Property: For any adapter that throws an exception, the dispatch service
     * SHALL catch the exception and NOT crash.
     */
    it('should catch adapter exceptions and not crash', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          arbitraryExceptionMessage(),
          async (driver, route, vehicle, dispatchId, exceptionMessage) => {
            // Ensure driver uses telegram channel for this test
            const driverWithTelegram: Driver = {
              ...driver,
              telegramChatId: driver.telegramChatId || '123456789',
              preferredChannel: 'telegram' as ChannelType,
            };

            // Setup tracking
            const tracker: ExceptionStatusTracker = {
              dispatchStatusUpdates: [],
              channelDispatchUpdates: [],
            };
            setupExceptionMocksWithTracking(route, driverWithTelegram, vehicle, [], dispatchId, tracker);

            // Create orchestrator with throwing adapter
            const throwingAdapter = new ThrowingMockAdapter('telegram', exceptionMessage);
            const orchestrator = createDispatchOrchestrator([throwingAdapter]);

            // Execute dispatch - should NOT throw
            let dispatchResult: DispatchResult | null = null;
            let caughtError: Error | null = null;

            try {
              dispatchResult = await orchestrator.dispatch({
                routeId: route.id,
                driverId: driverWithTelegram.id,
              });
            } catch (error) {
              caughtError = error instanceof Error ? error : new Error(String(error));
            }

            // Assert: dispatch() did not throw (service did not crash)
            expect(caughtError).toBeNull();

            // Assert: dispatch result was returned
            expect(dispatchResult).not.toBeNull();
            expect(dispatchResult!.dispatchId).toBeDefined();
            expect(dispatchResult!.status).toBe('pending');

            // Wait for async processing
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Assert: adapter send was called (exception was thrown)
            expect(throwingAdapter.sendCalled).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any adapter exception, the error message SHALL be
     * recorded in the channel_dispatch record.
     */
    it('should record exception error message in channel_dispatch', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          arbitraryExceptionMessage(),
          async (driver, route, vehicle, dispatchId, exceptionMessage) => {
            // Ensure driver uses telegram channel for this test
            const driverWithTelegram: Driver = {
              ...driver,
              telegramChatId: driver.telegramChatId || '123456789',
              preferredChannel: 'telegram' as ChannelType,
            };

            // Setup tracking
            const tracker: ExceptionStatusTracker = {
              dispatchStatusUpdates: [],
              channelDispatchUpdates: [],
            };
            setupExceptionMocksWithTracking(route, driverWithTelegram, vehicle, [], dispatchId, tracker);

            // Create orchestrator with throwing adapter
            const throwingAdapter = new ThrowingMockAdapter('telegram', exceptionMessage);
            const orchestrator = createDispatchOrchestrator([throwingAdapter]);

            // Execute dispatch
            await orchestrator.dispatch({
              routeId: route.id,
              driverId: driverWithTelegram.id,
            });

            // Wait for async processing
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Assert: channel dispatch was updated with error message
            const failedUpdates = tracker.channelDispatchUpdates.filter(
              (u) => u.status === 'failed' && u.errorMessage !== undefined
            );
            expect(failedUpdates.length).toBeGreaterThan(0);

            // Assert: the error message matches the exception message
            const updateWithError = failedUpdates.find(
              (u) => u.errorMessage === exceptionMessage
            );
            expect(updateWithError).toBeDefined();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any adapter exception, the channel_dispatch status
     * SHALL be updated to 'failed'.
     */
    it('should update channel_dispatch status to failed on exception', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          arbitraryExceptionMessage(),
          async (driver, route, vehicle, dispatchId, exceptionMessage) => {
            // Ensure driver uses telegram channel for this test
            const driverWithTelegram: Driver = {
              ...driver,
              telegramChatId: driver.telegramChatId || '123456789',
              preferredChannel: 'telegram' as ChannelType,
            };

            // Setup tracking
            const tracker: ExceptionStatusTracker = {
              dispatchStatusUpdates: [],
              channelDispatchUpdates: [],
            };
            setupExceptionMocksWithTracking(route, driverWithTelegram, vehicle, [], dispatchId, tracker);

            // Create orchestrator with throwing adapter
            const throwingAdapter = new ThrowingMockAdapter('telegram', exceptionMessage);
            const orchestrator = createDispatchOrchestrator([throwingAdapter]);

            // Execute dispatch
            await orchestrator.dispatch({
              routeId: route.id,
              driverId: driverWithTelegram.id,
            });

            // Wait for async processing
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Assert: at least one channel dispatch was updated to 'failed'
            const failedUpdates = tracker.channelDispatchUpdates.filter(
              (u) => u.status === 'failed'
            );
            expect(failedUpdates.length).toBeGreaterThan(0);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 12.3: Other channels continue processing', () => {
    /**
     * Property: When one adapter throws an exception, other channels
     * SHALL continue processing.
     */
    it('should continue processing other channels when one throws', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          arbitraryExceptionMessage(),
          arbitraryProviderMessageId(),
          async (driver, route, vehicle, dispatchId, exceptionMessage, providerMessageId) => {
            // Ensure driver has both channels configured
            const driverWithBothChannels: Driver = {
              ...driver,
              telegramChatId: driver.telegramChatId || '123456789',
              email: driver.email || 'test@example.com',
            };

            // Setup tracking
            const tracker: ExceptionStatusTracker = {
              dispatchStatusUpdates: [],
              channelDispatchUpdates: [],
            };
            setupExceptionMocksWithTracking(route, driverWithBothChannels, vehicle, [], dispatchId, tracker);

            // Create orchestrator with one throwing adapter and one succeeding adapter
            const throwingAdapter = new ThrowingMockAdapter('telegram', exceptionMessage);
            const succeedingAdapter = new SucceedingMockAdapter('email', providerMessageId);
            const orchestrator = createDispatchOrchestrator([throwingAdapter, succeedingAdapter]);

            // Execute dispatch with multi-channel
            await orchestrator.dispatch({
              routeId: route.id,
              driverId: driverWithBothChannels.id,
              multiChannel: true,
            });

            // Wait for async processing
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Assert: both adapters were called
            expect(throwingAdapter.sendCalled).toBe(true);
            expect(succeedingAdapter.sendCalled).toBe(true);

            // Assert: the succeeding adapter completed
            expect(succeedingAdapter.sendCompleted).toBe(true);

            // Assert: we have both failed and delivered updates
            const failedUpdates = tracker.channelDispatchUpdates.filter(
              (u) => u.status === 'failed'
            );
            const deliveredUpdates = tracker.channelDispatchUpdates.filter(
              (u) => u.status === 'delivered'
            );

            expect(failedUpdates.length).toBeGreaterThan(0);
            expect(deliveredUpdates.length).toBeGreaterThan(0);

            // Assert: the delivered update has the provider message ID
            const deliveredWithMessageId = deliveredUpdates.find(
              (u) => u.providerMessageId === providerMessageId
            );
            expect(deliveredWithMessageId).toBeDefined();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: When one adapter throws an exception in multi-channel dispatch,
     * the dispatch status SHALL be 'partial' (some succeeded, some failed).
     */
    it('should set dispatch status to partial when one channel throws and one succeeds', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          arbitraryExceptionMessage(),
          arbitraryProviderMessageId(),
          async (driver, route, vehicle, dispatchId, exceptionMessage, providerMessageId) => {
            // Ensure driver has both channels configured
            const driverWithBothChannels: Driver = {
              ...driver,
              telegramChatId: driver.telegramChatId || '123456789',
              email: driver.email || 'test@example.com',
            };

            // Setup tracking
            const tracker: ExceptionStatusTracker = {
              dispatchStatusUpdates: [],
              channelDispatchUpdates: [],
            };
            setupExceptionMocksWithTracking(route, driverWithBothChannels, vehicle, [], dispatchId, tracker);

            // Create orchestrator with one throwing adapter and one succeeding adapter
            const throwingAdapter = new ThrowingMockAdapter('telegram', exceptionMessage);
            const succeedingAdapter = new SucceedingMockAdapter('email', providerMessageId);
            const orchestrator = createDispatchOrchestrator([throwingAdapter, succeedingAdapter]);

            // Execute dispatch with multi-channel
            await orchestrator.dispatch({
              routeId: route.id,
              driverId: driverWithBothChannels.id,
              multiChannel: true,
            });

            // Wait for async processing
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Assert: final dispatch status is 'partial'
            const finalUpdate = tracker.dispatchStatusUpdates[tracker.dispatchStatusUpdates.length - 1];
            expect(finalUpdate).toBeDefined();
            expect(finalUpdate!.status).toBe('partial');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Exception handling completeness', () => {
    /**
     * Property: For any exception message, the recorded error message
     * SHALL match the exception message exactly.
     */
    it('should record exact exception message in channel_dispatch', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          arbitraryExceptionMessage(),
          async (driver, route, vehicle, dispatchId, exceptionMessage) => {
            // Ensure driver uses telegram channel for this test
            const driverWithTelegram: Driver = {
              ...driver,
              telegramChatId: driver.telegramChatId || '123456789',
              preferredChannel: 'telegram' as ChannelType,
            };

            // Setup tracking
            const tracker: ExceptionStatusTracker = {
              dispatchStatusUpdates: [],
              channelDispatchUpdates: [],
            };
            setupExceptionMocksWithTracking(route, driverWithTelegram, vehicle, [], dispatchId, tracker);

            // Create orchestrator with throwing adapter
            const throwingAdapter = new ThrowingMockAdapter('telegram', exceptionMessage);
            const orchestrator = createDispatchOrchestrator([throwingAdapter]);

            // Execute dispatch
            await orchestrator.dispatch({
              routeId: route.id,
              driverId: driverWithTelegram.id,
            });

            // Wait for async processing
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Assert: error message matches exactly
            const failedUpdates = tracker.channelDispatchUpdates.filter(
              (u) => u.status === 'failed'
            );
            expect(failedUpdates.length).toBeGreaterThan(0);

            const matchingError = failedUpdates.find(
              (u) => u.errorMessage === exceptionMessage
            );
            expect(matchingError).toBeDefined();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: When all adapters throw exceptions, the dispatch status
     * SHALL be 'failed'.
     */
    it('should set dispatch status to failed when all adapters throw', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          arbitraryExceptionMessage(),
          arbitraryExceptionMessage(),
          async (driver, route, vehicle, dispatchId, telegramException, emailException) => {
            // Ensure driver has both channels configured
            const driverWithBothChannels: Driver = {
              ...driver,
              telegramChatId: driver.telegramChatId || '123456789',
              email: driver.email || 'test@example.com',
            };

            // Setup tracking
            const tracker: ExceptionStatusTracker = {
              dispatchStatusUpdates: [],
              channelDispatchUpdates: [],
            };
            setupExceptionMocksWithTracking(route, driverWithBothChannels, vehicle, [], dispatchId, tracker);

            // Create orchestrator with both adapters throwing
            const telegramAdapter = new ThrowingMockAdapter('telegram', telegramException);
            const emailAdapter = new ThrowingMockAdapter('email', emailException);
            const orchestrator = createDispatchOrchestrator([telegramAdapter, emailAdapter]);

            // Execute dispatch with multi-channel
            await orchestrator.dispatch({
              routeId: route.id,
              driverId: driverWithBothChannels.id,
              multiChannel: true,
            });

            // Wait for async processing
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Assert: both adapters were called
            expect(telegramAdapter.sendCalled).toBe(true);
            expect(emailAdapter.sendCalled).toBe(true);

            // Assert: final dispatch status is 'failed'
            const finalUpdate = tracker.dispatchStatusUpdates[tracker.dispatchStatusUpdates.length - 1];
            expect(finalUpdate).toBeDefined();
            expect(finalUpdate!.status).toBe('failed');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch where an adapter throws, the dispatch
     * SHALL complete (not hang or timeout).
     */
    it('should complete dispatch even when adapter throws', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithBothChannels(),
          arbitraryRoute(),
          arbitraryVehicle(),
          arbitraryUuid(),
          arbitraryExceptionMessage(),
          async (driver, route, vehicle, dispatchId, exceptionMessage) => {
            // Ensure driver uses telegram channel for this test
            const driverWithTelegram: Driver = {
              ...driver,
              telegramChatId: driver.telegramChatId || '123456789',
              preferredChannel: 'telegram' as ChannelType,
            };

            // Setup tracking
            const tracker: ExceptionStatusTracker = {
              dispatchStatusUpdates: [],
              channelDispatchUpdates: [],
            };
            setupExceptionMocksWithTracking(route, driverWithTelegram, vehicle, [], dispatchId, tracker);

            // Create orchestrator with throwing adapter
            const throwingAdapter = new ThrowingMockAdapter('telegram', exceptionMessage);
            const orchestrator = createDispatchOrchestrator([throwingAdapter]);

            // Execute dispatch with timeout to ensure it completes
            const startTime = Date.now();
            await orchestrator.dispatch({
              routeId: route.id,
              driverId: driverWithTelegram.id,
            });
            const responseTime = Date.now() - startTime;

            // Assert: dispatch returned quickly (not hung)
            expect(responseTime).toBeLessThan(100);

            // Wait for async processing
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Assert: dispatch status was updated (processing completed)
            expect(tracker.dispatchStatusUpdates.length).toBeGreaterThan(0);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
