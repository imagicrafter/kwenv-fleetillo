/**
 * Unit tests for DispatchOrchestrator
 *
 * Tests the dispatch orchestration workflow including:
 * - Fetching route, driver, vehicle, bookings data
 * - Creating dispatch records
 * - Channel selection and routing
 * - Template rendering
 * - Adapter invocation
 * - Status updates
 */

import {
  DispatchOrchestrator,
  DispatchRequest,
  EntityNotFoundError,
  createDispatchOrchestrator,
} from '../../../src/core/orchestrator.js';
import { ChannelRouter } from '../../../src/core/router.js';
import { TemplateEngine } from '../../../src/core/templates.js';
import { ChannelAdapter, DispatchContext, ChannelResult, HealthStatus } from '../../../src/adapters/interface.js';
import type { ChannelType, Driver, Route, Vehicle, Booking, Dispatch } from '../../../src/types/index.js';

// Mock the database modules
jest.mock('../../../src/db/dispatch.repository.js', () => ({
  createDispatch: jest.fn(),
  updateDispatchStatus: jest.fn(),
  createChannelDispatch: jest.fn(),
  updateChannelDispatch: jest.fn(),
  getDispatchWithChannels: jest.fn(),
}));

jest.mock('../../../src/db/entities.repository.js', () => ({
  getRoute: jest.fn(),
  getDriver: jest.fn(),
  getVehicle: jest.fn(),
  getBookingsForRoute: jest.fn(),
}));

// Import mocked modules
import * as dispatchRepo from '../../../src/db/dispatch.repository.js';
import * as entitiesRepo from '../../../src/db/entities.repository.js';

// =============================================================================
// Test Fixtures
// =============================================================================

const mockRoute: Route = {
  id: 'route-123',
  name: 'Morning Route',
  code: 'MR-001',
  date: '2024-01-15',
  plannedStartTime: '08:00',
  plannedEndTime: '12:00',
  totalStops: 5,
  totalDistanceKm: 25.5,
  totalDurationMinutes: 180,
  vehicleId: 'vehicle-123',
  driverId: 'driver-123',
};

const mockDriver: Driver = {
  id: 'driver-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  telegramChatId: '123456789',
  preferredChannel: 'telegram',
  fallbackEnabled: true,
  status: 'active',
};

const mockVehicle: Vehicle = {
  id: 'vehicle-123',
  name: 'Van 1',
  licensePlate: 'ABC-123',
  make: 'Ford',
  model: 'Transit',
};

const mockBookings: Booking[] = [
  {
    id: 'booking-1',
    routeId: 'route-123',
    stopNumber: 1,
    clientName: 'Client A',
    address: '123 Main St, City, ST 12345',
    scheduledTime: '08:30',
    services: 'Delivery',
    specialInstructions: 'Ring doorbell',
  },
  {
    id: 'booking-2',
    routeId: 'route-123',
    stopNumber: 2,
    clientName: 'Client B',
    address: '456 Oak Ave, City, ST 12345',
    scheduledTime: '09:15',
    services: 'Pickup',
  },
];

const mockDispatch: Dispatch = {
  id: 'dispatch-123',
  routeId: 'route-123',
  driverId: 'driver-123',
  status: 'pending',
  requestedChannels: ['telegram'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// =============================================================================
// Mock Adapter
// =============================================================================

class MockAdapter implements ChannelAdapter {
  readonly channelType: ChannelType;
  private shouldSucceed: boolean;
  private canSendResult: boolean;
  public sendCalls: DispatchContext[] = [];

  constructor(channelType: ChannelType, shouldSucceed = true, canSendResult = true) {
    this.channelType = channelType;
    this.shouldSucceed = shouldSucceed;
    this.canSendResult = canSendResult;
  }

  canSend(driver: Driver): boolean {
    if (this.channelType === 'telegram') {
      return this.canSendResult && !!driver.telegramChatId;
    }
    if (this.channelType === 'email') {
      return this.canSendResult && !!driver.email;
    }
    return this.canSendResult;
  }

  async send(context: DispatchContext): Promise<ChannelResult> {
    this.sendCalls.push(context);
    return {
      success: this.shouldSucceed,
      channelType: this.channelType,
      providerMessageId: this.shouldSucceed ? `msg-${Date.now()}` : undefined,
      error: this.shouldSucceed ? undefined : 'Mock send failure',
      sentAt: new Date(),
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    return { healthy: true, message: 'Mock adapter healthy' };
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('DispatchOrchestrator', () => {
  let orchestrator: DispatchOrchestrator;
  let mockTelegramAdapter: MockAdapter;
  let mockEmailAdapter: MockAdapter;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mock returns
    (entitiesRepo.getRoute as jest.Mock).mockResolvedValue(mockRoute);
    (entitiesRepo.getDriver as jest.Mock).mockResolvedValue(mockDriver);
    (entitiesRepo.getVehicle as jest.Mock).mockResolvedValue(mockVehicle);
    (entitiesRepo.getBookingsForRoute as jest.Mock).mockResolvedValue(mockBookings);

    (dispatchRepo.createDispatch as jest.Mock).mockResolvedValue(mockDispatch);
    (dispatchRepo.updateDispatchStatus as jest.Mock).mockResolvedValue({
      ...mockDispatch,
      status: 'delivered',
    });
    (dispatchRepo.createChannelDispatch as jest.Mock).mockResolvedValue({
      id: 'channel-dispatch-123',
      dispatchId: 'dispatch-123',
      channel: 'telegram',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (dispatchRepo.updateChannelDispatch as jest.Mock).mockResolvedValue({
      id: 'channel-dispatch-123',
      dispatchId: 'dispatch-123',
      channel: 'telegram',
      status: 'delivered',
      providerMessageId: 'msg-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create mock adapters
    mockTelegramAdapter = new MockAdapter('telegram');
    mockEmailAdapter = new MockAdapter('email');

    // Create orchestrator with mock adapters
    orchestrator = createDispatchOrchestrator([mockTelegramAdapter, mockEmailAdapter]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('dispatch()', () => {
    it('should create a dispatch record and return immediately', async () => {
      const request: DispatchRequest = {
        routeId: 'route-123',
        driverId: 'driver-123',
      };

      const result = await orchestrator.dispatch(request);

      expect(result).toEqual({
        dispatchId: 'dispatch-123',
        status: 'pending',
        requestedChannels: expect.any(Array),
      });

      // Verify dispatch was created
      expect(dispatchRepo.createDispatch).toHaveBeenCalledWith({
        routeId: 'route-123',
        driverId: 'driver-123',
        requestedChannels: expect.any(Array),
        metadata: undefined,
      });
    });

    it('should fetch route and driver data', async () => {
      const request: DispatchRequest = {
        routeId: 'route-123',
        driverId: 'driver-123',
      };

      await orchestrator.dispatch(request);

      expect(entitiesRepo.getRoute).toHaveBeenCalledWith('route-123');
      expect(entitiesRepo.getDriver).toHaveBeenCalledWith('driver-123');
    });

    it('should throw EntityNotFoundError when route does not exist', async () => {
      (entitiesRepo.getRoute as jest.Mock).mockResolvedValue(null);

      const request: DispatchRequest = {
        routeId: 'nonexistent-route',
        driverId: 'driver-123',
      };

      await expect(orchestrator.dispatch(request)).rejects.toThrow(EntityNotFoundError);
      
      try {
        await orchestrator.dispatch(request);
      } catch (error) {
        expect(error).toBeInstanceOf(EntityNotFoundError);
        expect((error as EntityNotFoundError).entityType).toBe('route');
        expect((error as EntityNotFoundError).entityId).toBe('nonexistent-route');
      }
    });

    it('should throw EntityNotFoundError when driver does not exist', async () => {
      (entitiesRepo.getDriver as jest.Mock).mockResolvedValue(null);

      const request: DispatchRequest = {
        routeId: 'route-123',
        driverId: 'nonexistent-driver',
      };

      await expect(orchestrator.dispatch(request)).rejects.toThrow(EntityNotFoundError);
      
      try {
        await orchestrator.dispatch(request);
      } catch (error) {
        expect(error).toBeInstanceOf(EntityNotFoundError);
        expect((error as EntityNotFoundError).entityType).toBe('driver');
        expect((error as EntityNotFoundError).entityId).toBe('nonexistent-driver');
      }
    });

    it('should use channel override when specified', async () => {
      const request: DispatchRequest = {
        routeId: 'route-123',
        driverId: 'driver-123',
        channels: ['email'],
      };

      await orchestrator.dispatch(request);

      expect(dispatchRepo.createDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          requestedChannels: ['email'],
        })
      );
    });

    it('should include metadata in dispatch record', async () => {
      const request: DispatchRequest = {
        routeId: 'route-123',
        driverId: 'driver-123',
        metadata: { priority: 'high', source: 'api' },
      };

      await orchestrator.dispatch(request);

      expect(dispatchRepo.createDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { priority: 'high', source: 'api' },
        })
      );
    });

    it('should fetch vehicle when route has vehicleId', async () => {
      const request: DispatchRequest = {
        routeId: 'route-123',
        driverId: 'driver-123',
      };

      await orchestrator.dispatch(request);

      expect(entitiesRepo.getVehicle).toHaveBeenCalledWith('vehicle-123');
    });

    it('should not fetch vehicle when route has no vehicleId', async () => {
      (entitiesRepo.getRoute as jest.Mock).mockResolvedValue({
        ...mockRoute,
        vehicleId: undefined,
      });

      const request: DispatchRequest = {
        routeId: 'route-123',
        driverId: 'driver-123',
      };

      await orchestrator.dispatch(request);

      expect(entitiesRepo.getVehicle).not.toHaveBeenCalled();
    });

    it('should fetch bookings for the route', async () => {
      const request: DispatchRequest = {
        routeId: 'route-123',
        driverId: 'driver-123',
      };

      await orchestrator.dispatch(request);

      expect(entitiesRepo.getBookingsForRoute).toHaveBeenCalledWith('route-123');
    });
  });

  describe('dispatchBatch()', () => {
    it('should process multiple dispatch requests', async () => {
      const requests: DispatchRequest[] = [
        { routeId: 'route-1', driverId: 'driver-1' },
        { routeId: 'route-2', driverId: 'driver-2' },
      ];

      // Mock different dispatches for each request
      (dispatchRepo.createDispatch as jest.Mock)
        .mockResolvedValueOnce({ ...mockDispatch, id: 'dispatch-1' })
        .mockResolvedValueOnce({ ...mockDispatch, id: 'dispatch-2' });

      const result = await orchestrator.dispatchBatch(requests);

      expect(result.summary.total).toBe(2);
      expect(result.results).toHaveLength(2);
    });

    it('should continue processing when one item fails', async () => {
      const requests: DispatchRequest[] = [
        { routeId: 'route-1', driverId: 'driver-1' },
        { routeId: 'nonexistent-route', driverId: 'driver-2' },
        { routeId: 'route-3', driverId: 'driver-3' },
      ];

      // First and third succeed, second fails
      (entitiesRepo.getRoute as jest.Mock)
        .mockResolvedValueOnce(mockRoute)
        .mockResolvedValueOnce(null) // This will cause failure
        .mockResolvedValueOnce(mockRoute);

      (dispatchRepo.createDispatch as jest.Mock)
        .mockResolvedValueOnce({ ...mockDispatch, id: 'dispatch-1' })
        .mockResolvedValueOnce({ ...mockDispatch, id: 'dispatch-3' });

      const result = await orchestrator.dispatchBatch(requests);

      expect(result.summary.total).toBe(3);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(1);
      expect(result.results[1]?.success).toBe(false);
      expect(result.results[1]?.error).toContain('not found');
    });

    it('should return results in order', async () => {
      const requests: DispatchRequest[] = [
        { routeId: 'route-1', driverId: 'driver-1' },
        { routeId: 'route-2', driverId: 'driver-2' },
        { routeId: 'route-3', driverId: 'driver-3' },
      ];

      (dispatchRepo.createDispatch as jest.Mock)
        .mockResolvedValueOnce({ ...mockDispatch, id: 'dispatch-1' })
        .mockResolvedValueOnce({ ...mockDispatch, id: 'dispatch-2' })
        .mockResolvedValueOnce({ ...mockDispatch, id: 'dispatch-3' });

      const result = await orchestrator.dispatchBatch(requests);

      expect(result.results[0]?.index).toBe(0);
      expect(result.results[1]?.index).toBe(1);
      expect(result.results[2]?.index).toBe(2);
    });
  });

  describe('getDispatch()', () => {
    it('should return dispatch with channel dispatches', async () => {
      const mockDispatchWithChannels = {
        dispatch: mockDispatch,
        channelDispatches: [
          {
            id: 'channel-dispatch-123',
            dispatchId: 'dispatch-123',
            channel: 'telegram' as ChannelType,
            status: 'delivered' as const,
            providerMessageId: 'msg-123',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      (dispatchRepo.getDispatchWithChannels as jest.Mock).mockResolvedValue(mockDispatchWithChannels);

      const result = await orchestrator.getDispatch('dispatch-123');

      expect(result).toEqual(mockDispatchWithChannels);
      expect(dispatchRepo.getDispatchWithChannels).toHaveBeenCalledWith('dispatch-123');
    });

    it('should return null when dispatch not found', async () => {
      (dispatchRepo.getDispatchWithChannels as jest.Mock).mockResolvedValue(null);

      const result = await orchestrator.getDispatch('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('registerAdapter()', () => {
    it('should register a new adapter', async () => {
      const newOrchestrator = new DispatchOrchestrator();
      const adapter = new MockAdapter('telegram');

      newOrchestrator.registerAdapter(adapter);

      // The adapter should now be available for dispatch
      // We can verify this by checking that dispatch works with the adapter
      const request: DispatchRequest = {
        routeId: 'route-123',
        driverId: 'driver-123',
        channels: ['telegram'],
      };

      const result = await newOrchestrator.dispatch(request);
      expect(result.dispatchId).toBe('dispatch-123');
    });
  });

  describe('createDispatchOrchestrator()', () => {
    it('should create orchestrator with provided adapters', () => {
      const adapters = [new MockAdapter('telegram'), new MockAdapter('email')];
      const orch = createDispatchOrchestrator(adapters);

      expect(orch).toBeInstanceOf(DispatchOrchestrator);
    });

    it('should accept custom router and template engine', () => {
      const adapters = [new MockAdapter('telegram')];
      const router = new ChannelRouter();
      const templateEngine = new TemplateEngine();

      const orch = createDispatchOrchestrator(adapters, router, templateEngine);

      expect(orch).toBeInstanceOf(DispatchOrchestrator);
    });
  });
});

describe('EntityNotFoundError', () => {
  it('should have correct properties for route not found', () => {
    const error = new EntityNotFoundError('route', 'route-123');

    expect(error.name).toBe('EntityNotFoundError');
    expect(error.entityType).toBe('route');
    expect(error.entityId).toBe('route-123');
    expect(error.message).toBe('Route not found: route-123');
  });

  it('should have correct properties for driver not found', () => {
    const error = new EntityNotFoundError('driver', 'driver-456');

    expect(error.name).toBe('EntityNotFoundError');
    expect(error.entityType).toBe('driver');
    expect(error.entityId).toBe('driver-456');
    expect(error.message).toBe('Driver not found: driver-456');
  });
});
