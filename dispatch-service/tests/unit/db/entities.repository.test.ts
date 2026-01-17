/**
 * Unit tests for Entities Repository
 *
 * Tests the data access functions for routes, drivers, vehicles, and bookings
 * from the existing OptiRoute tables.
 *
 * @requirements 1.1 - Fetch route, driver, vehicle, bookings data for dispatch
 * @requirements 11.1 - Read driver preferences from existing drivers table
 */

import {
  getRoute,
  getRouteWithDetails,
  getDriver,
  getVehicle,
  getBookingsForRoute,
  getDispatchContext,
  EntityRepositoryError,
  EntityErrorCodes,
} from '../../../src/db/entities.repository.js';
import { getSupabaseClient } from '../../../src/db/supabase.js';
import type { ChannelType } from '../../../src/types/index.js';

// Mock the Supabase client
jest.mock('../../../src/db/supabase.js', () => ({
  getSupabaseClient: jest.fn(),
  resetSupabaseClient: jest.fn(),
}));

// Mock the logger
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

/**
 * Helper to create a chainable mock for Supabase queries
 */
function createChainableMock(finalResult: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {};
  
  const createMethod = () => jest.fn().mockReturnValue(chain);
  
  chain.select = createMethod();
  chain.eq = createMethod();
  chain.is = createMethod();
  chain.in = createMethod();
  chain.single = jest.fn().mockResolvedValue(finalResult);
  
  return chain;
}

describe('Entities Repository', () => {
  describe('getRoute', () => {
    const routeId = '123e4567-e89b-12d3-a456-426614174000';

    const mockRouteRow = {
      id: routeId,
      route_name: 'Route A - 2024-01-15',
      route_code: 'RT-001',
      route_date: '2024-01-15',
      planned_start_time: '08:00:00',
      planned_end_time: '17:00:00',
      total_stops: 10,
      total_distance_km: 45.5,
      total_duration_minutes: 480,
      vehicle_id: '123e4567-e89b-12d3-a456-426614174010',
      assigned_to: '123e4567-e89b-12d3-a456-426614174001',
      deleted_at: null,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should retrieve a route by ID', async () => {
      const chain = createChainableMock({ data: mockRouteRow, error: null });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

      const result = await getRoute(routeId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(routeId);
      expect(result?.name).toBe('Route A - 2024-01-15');
      expect(result?.code).toBe('RT-001');
      expect(result?.date).toBe('2024-01-15');
      expect(result?.plannedStartTime).toBe('08:00:00');
      expect(result?.totalStops).toBe(10);
      expect(result?.vehicleId).toBe('123e4567-e89b-12d3-a456-426614174010');
      expect(result?.driverId).toBe('123e4567-e89b-12d3-a456-426614174001');
    });

    it('should return null when route not found', async () => {
      const chain = createChainableMock({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

      const result = await getRoute(routeId);

      expect(result).toBeNull();
    });

    it('should handle route with null optional fields', async () => {
      const routeWithNulls = {
        ...mockRouteRow,
        route_code: null,
        planned_start_time: null,
        planned_end_time: null,
        total_distance_km: null,
        total_duration_minutes: null,
        vehicle_id: null,
        assigned_to: null,
      };
      const chain = createChainableMock({ data: routeWithNulls, error: null });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

      const result = await getRoute(routeId);

      expect(result?.code).toBeUndefined();
      expect(result?.plannedStartTime).toBeUndefined();
      expect(result?.vehicleId).toBeUndefined();
      expect(result?.driverId).toBeUndefined();
    });

    it('should throw EntityRepositoryError on query failure', async () => {
      const chain = createChainableMock({
        data: null,
        error: { code: '42P01', message: 'Table not found' },
      });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

      await expect(getRoute(routeId)).rejects.toThrow(EntityRepositoryError);
      await expect(getRoute(routeId)).rejects.toMatchObject({
        code: EntityErrorCodes.QUERY_FAILED,
      });
    });
  });

  describe('getDriver', () => {
    const driverId = '123e4567-e89b-12d3-a456-426614174001';

    const mockDriverRow = {
      id: driverId,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      telegram_chat_id: '123456789',
      preferred_channel: 'telegram',
      fallback_enabled: true,
      status: 'active',
      deleted_at: null,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should retrieve a driver by ID with all preferences', async () => {
      const chain = createChainableMock({ data: mockDriverRow, error: null });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

      const result = await getDriver(driverId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(driverId);
      expect(result?.firstName).toBe('John');
      expect(result?.lastName).toBe('Doe');
      expect(result?.email).toBe('john.doe@example.com');
      expect(result?.telegramChatId).toBe('123456789');
      expect(result?.preferredChannel).toBe('telegram');
      expect(result?.fallbackEnabled).toBe(true);
      expect(result?.status).toBe('active');
    });

    it('should return null when driver not found', async () => {
      const chain = createChainableMock({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

      const result = await getDriver(driverId);

      expect(result).toBeNull();
    });

    it('should handle driver with null optional fields', async () => {
      const driverWithNulls = {
        ...mockDriverRow,
        email: null,
        telegram_chat_id: null,
        preferred_channel: null,
        fallback_enabled: null,
      };
      const chain = createChainableMock({ data: driverWithNulls, error: null });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

      const result = await getDriver(driverId);

      expect(result?.email).toBeUndefined();
      expect(result?.telegramChatId).toBeUndefined();
      expect(result?.preferredChannel).toBeUndefined();
      expect(result?.fallbackEnabled).toBe(true); // Default to true
    });

    it('should handle driver with email channel preference', async () => {
      const driverWithEmail = {
        ...mockDriverRow,
        preferred_channel: 'email' as ChannelType,
        telegram_chat_id: null,
      };
      const chain = createChainableMock({ data: driverWithEmail, error: null });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

      const result = await getDriver(driverId);

      expect(result?.preferredChannel).toBe('email');
    });

    it('should throw EntityRepositoryError on query failure', async () => {
      const chain = createChainableMock({
        data: null,
        error: { code: '42P01', message: 'Table not found' },
      });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

      await expect(getDriver(driverId)).rejects.toThrow(EntityRepositoryError);
      await expect(getDriver(driverId)).rejects.toMatchObject({
        code: EntityErrorCodes.QUERY_FAILED,
      });
    });
  });

  describe('getVehicle', () => {
    const vehicleId = '123e4567-e89b-12d3-a456-426614174010';

    const mockVehicleRow = {
      id: vehicleId,
      name: 'Truck 1',
      license_plate: 'ABC-1234',
      make: 'Ford',
      model: 'F-150',
      deleted_at: null,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should retrieve a vehicle by ID', async () => {
      const chain = createChainableMock({ data: mockVehicleRow, error: null });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

      const result = await getVehicle(vehicleId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(vehicleId);
      expect(result?.name).toBe('Truck 1');
      expect(result?.licensePlate).toBe('ABC-1234');
      expect(result?.make).toBe('Ford');
      expect(result?.model).toBe('F-150');
    });

    it('should return null when vehicle not found', async () => {
      const chain = createChainableMock({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

      const result = await getVehicle(vehicleId);

      expect(result).toBeNull();
    });

    it('should handle vehicle with null optional fields', async () => {
      const vehicleWithNulls = {
        ...mockVehicleRow,
        license_plate: null,
        make: null,
        model: null,
      };
      const chain = createChainableMock({ data: vehicleWithNulls, error: null });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

      const result = await getVehicle(vehicleId);

      expect(result?.licensePlate).toBeUndefined();
      expect(result?.make).toBeUndefined();
      expect(result?.model).toBeUndefined();
    });

    it('should throw EntityRepositoryError on query failure', async () => {
      const chain = createChainableMock({
        data: null,
        error: { code: '42P01', message: 'Table not found' },
      });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

      await expect(getVehicle(vehicleId)).rejects.toThrow(EntityRepositoryError);
      await expect(getVehicle(vehicleId)).rejects.toMatchObject({
        code: EntityErrorCodes.QUERY_FAILED,
      });
    });
  });

  describe('getBookingsForRoute', () => {
    const routeId = '123e4567-e89b-12d3-a456-426614174000';
    const bookingId1 = '123e4567-e89b-12d3-a456-426614174020';
    const bookingId2 = '123e4567-e89b-12d3-a456-426614174021';

    const mockBookingRows = [
      {
        id: bookingId1,
        client_id: 'client-1',
        service_id: 'service-1',
        scheduled_date: '2024-01-15',
        scheduled_start_time: '09:00:00',
        service_address_line1: '123 Main St',
        service_address_line2: 'Suite 100',
        service_city: 'Springfield',
        service_state: 'IL',
        service_postal_code: '62701',
        special_instructions: 'Ring doorbell',
        deleted_at: null,
        clients: { name: 'Acme Corp' },
        services: { name: 'Delivery' },
      },
      {
        id: bookingId2,
        client_id: 'client-2',
        service_id: 'service-2',
        scheduled_date: '2024-01-15',
        scheduled_start_time: '10:30:00',
        service_address_line1: '456 Oak Ave',
        service_address_line2: null,
        service_city: 'Springfield',
        service_state: 'IL',
        service_postal_code: '62702',
        special_instructions: null,
        deleted_at: null,
        clients: { name: 'Beta Inc' },
        services: { name: 'Installation' },
      },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should retrieve bookings for a route in stop order', async () => {
      // Create mock that handles both route and bookings queries
      const mockFrom = jest.fn().mockImplementation((table: string) => {
        if (table === 'routes') {
          return createChainableMock({ data: { stop_sequence: [bookingId1, bookingId2] }, error: null });
        } else {
          // For bookings query, return data directly (no single())
          const chain: Record<string, jest.Mock> = {};
          chain.select = jest.fn().mockReturnValue(chain);
          chain.in = jest.fn().mockReturnValue(chain);
          chain.is = jest.fn().mockResolvedValue({ data: mockBookingRows, error: null });
          return chain;
        }
      });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await getBookingsForRoute(routeId);

      expect(result).toHaveLength(2);
      expect(result[0]?.stopNumber).toBe(1);
      expect(result[0]?.clientName).toBe('Acme Corp');
      expect(result[0]?.address).toContain('123 Main St');
      expect(result[0]?.scheduledTime).toBe('09:00:00');
      expect(result[0]?.services).toBe('Delivery');
      expect(result[0]?.specialInstructions).toBe('Ring doorbell');
      expect(result[1]?.stopNumber).toBe(2);
      expect(result[1]?.clientName).toBe('Beta Inc');
    });

    it('should return empty array when route has no stop sequence', async () => {
      const chain = createChainableMock({ data: { stop_sequence: null }, error: null });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

      const result = await getBookingsForRoute(routeId);

      expect(result).toHaveLength(0);
    });

    it('should return empty array when route has empty stop sequence', async () => {
      const chain = createChainableMock({ data: { stop_sequence: [] }, error: null });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

      const result = await getBookingsForRoute(routeId);

      expect(result).toHaveLength(0);
    });

    it('should return empty array when route not found', async () => {
      const chain = createChainableMock({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

      const result = await getBookingsForRoute(routeId);

      expect(result).toHaveLength(0);
    });

    it('should handle bookings with missing client/service names', async () => {
      const bookingsWithNulls = [
        {
          ...mockBookingRows[0],
          clients: null,
          services: null,
        },
      ];
      const mockFrom = jest.fn().mockImplementation((table: string) => {
        if (table === 'routes') {
          return createChainableMock({ data: { stop_sequence: [bookingId1] }, error: null });
        } else {
          const chain: Record<string, jest.Mock> = {};
          chain.select = jest.fn().mockReturnValue(chain);
          chain.in = jest.fn().mockReturnValue(chain);
          chain.is = jest.fn().mockResolvedValue({ data: bookingsWithNulls, error: null });
          return chain;
        }
      });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await getBookingsForRoute(routeId);

      expect(result[0]?.clientName).toBe('Unknown Client');
      expect(result[0]?.services).toBeUndefined();
    });

    it('should handle bookings with array format for joined tables', async () => {
      const bookingsWithArrays = [
        {
          ...mockBookingRows[0],
          clients: [{ name: 'Acme Corp' }],
          services: [{ name: 'Delivery' }],
        },
      ];
      const mockFrom = jest.fn().mockImplementation((table: string) => {
        if (table === 'routes') {
          return createChainableMock({ data: { stop_sequence: [bookingId1] }, error: null });
        } else {
          const chain: Record<string, jest.Mock> = {};
          chain.select = jest.fn().mockReturnValue(chain);
          chain.in = jest.fn().mockReturnValue(chain);
          chain.is = jest.fn().mockResolvedValue({ data: bookingsWithArrays, error: null });
          return chain;
        }
      });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await getBookingsForRoute(routeId);

      expect(result[0]?.clientName).toBe('Acme Corp');
      expect(result[0]?.services).toBe('Delivery');
    });

    it('should build address correctly with all components', async () => {
      const mockFrom = jest.fn().mockImplementation((table: string) => {
        if (table === 'routes') {
          return createChainableMock({ data: { stop_sequence: [bookingId1] }, error: null });
        } else {
          const chain: Record<string, jest.Mock> = {};
          chain.select = jest.fn().mockReturnValue(chain);
          chain.in = jest.fn().mockReturnValue(chain);
          chain.is = jest.fn().mockResolvedValue({ data: [mockBookingRows[0]], error: null });
          return chain;
        }
      });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await getBookingsForRoute(routeId);

      expect(result[0]?.address).toBe('123 Main St, Suite 100, Springfield, IL, 62701');
    });

    it('should build address with missing components', async () => {
      const bookingWithPartialAddress = {
        ...mockBookingRows[0],
        service_address_line1: '123 Main St',
        service_address_line2: null,
        service_city: 'Springfield',
        service_state: null,
        service_postal_code: null,
      };
      const mockFrom = jest.fn().mockImplementation((table: string) => {
        if (table === 'routes') {
          return createChainableMock({ data: { stop_sequence: [bookingId1] }, error: null });
        } else {
          const chain: Record<string, jest.Mock> = {};
          chain.select = jest.fn().mockReturnValue(chain);
          chain.in = jest.fn().mockReturnValue(chain);
          chain.is = jest.fn().mockResolvedValue({ data: [bookingWithPartialAddress], error: null });
          return chain;
        }
      });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await getBookingsForRoute(routeId);

      expect(result[0]?.address).toBe('123 Main St, Springfield');
    });

    it('should return default address when all components are null', async () => {
      const bookingWithNoAddress = {
        ...mockBookingRows[0],
        service_address_line1: null,
        service_address_line2: null,
        service_city: null,
        service_state: null,
        service_postal_code: null,
      };
      const mockFrom = jest.fn().mockImplementation((table: string) => {
        if (table === 'routes') {
          return createChainableMock({ data: { stop_sequence: [bookingId1] }, error: null });
        } else {
          const chain: Record<string, jest.Mock> = {};
          chain.select = jest.fn().mockReturnValue(chain);
          chain.in = jest.fn().mockReturnValue(chain);
          chain.is = jest.fn().mockResolvedValue({ data: [bookingWithNoAddress], error: null });
          return chain;
        }
      });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await getBookingsForRoute(routeId);

      expect(result[0]?.address).toBe('Address not available');
    });

    it('should throw EntityRepositoryError on bookings query failure', async () => {
      const mockFrom = jest.fn().mockImplementation((table: string) => {
        if (table === 'routes') {
          return createChainableMock({ data: { stop_sequence: [bookingId1] }, error: null });
        } else {
          const chain: Record<string, jest.Mock> = {};
          chain.select = jest.fn().mockReturnValue(chain);
          chain.in = jest.fn().mockReturnValue(chain);
          chain.is = jest.fn().mockResolvedValue({
            data: null,
            error: { code: '42P01', message: 'Table not found' },
          });
          return chain;
        }
      });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

      await expect(getBookingsForRoute(routeId)).rejects.toThrow(EntityRepositoryError);
      await expect(getBookingsForRoute(routeId)).rejects.toMatchObject({
        code: EntityErrorCodes.QUERY_FAILED,
      });
    });
  });

  describe('getRouteWithDetails', () => {
    const routeId = '123e4567-e89b-12d3-a456-426614174000';
    const vehicleId = '123e4567-e89b-12d3-a456-426614174010';

    const mockRouteRow = {
      id: routeId,
      route_name: 'Route A',
      route_code: 'RT-001',
      route_date: '2024-01-15',
      planned_start_time: '08:00:00',
      planned_end_time: '17:00:00',
      total_stops: 10,
      total_distance_km: 45.5,
      total_duration_minutes: 480,
      vehicle_id: vehicleId,
      assigned_to: null,
      deleted_at: null,
    };

    const mockVehicleRow = {
      id: vehicleId,
      name: 'Truck 1',
      license_plate: 'ABC-1234',
      make: 'Ford',
      model: 'F-150',
      deleted_at: null,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should retrieve route with vehicle details', async () => {
      let callCount = 0;
      const mockFrom = jest.fn().mockImplementation((_table: string) => {
        callCount++;
        if (callCount === 1) {
          // First call: getRoute
          return createChainableMock({ data: mockRouteRow, error: null });
        } else {
          // Second call: getVehicle
          return createChainableMock({ data: mockVehicleRow, error: null });
        }
      });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await getRouteWithDetails(routeId);

      expect(result).not.toBeNull();
      expect(result?.route.id).toBe(routeId);
      expect(result?.vehicle).not.toBeNull();
      expect(result?.vehicle?.id).toBe(vehicleId);
      expect(result?.vehicle?.name).toBe('Truck 1');
    });

    it('should return route with null vehicle when no vehicle assigned', async () => {
      const routeWithoutVehicle = { ...mockRouteRow, vehicle_id: null };
      const chain = createChainableMock({ data: routeWithoutVehicle, error: null });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

      const result = await getRouteWithDetails(routeId);

      expect(result).not.toBeNull();
      expect(result?.route.id).toBe(routeId);
      expect(result?.vehicle).toBeNull();
    });

    it('should return null when route not found', async () => {
      const chain = createChainableMock({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

      const result = await getRouteWithDetails(routeId);

      expect(result).toBeNull();
    });
  });

  describe('getDispatchContext', () => {
    const routeId = '123e4567-e89b-12d3-a456-426614174000';
    const driverId = '123e4567-e89b-12d3-a456-426614174001';
    const vehicleId = '123e4567-e89b-12d3-a456-426614174010';
    const bookingId = '123e4567-e89b-12d3-a456-426614174020';

    const mockRouteRow = {
      id: routeId,
      route_name: 'Route A',
      route_code: 'RT-001',
      route_date: '2024-01-15',
      planned_start_time: '08:00:00',
      planned_end_time: '17:00:00',
      total_stops: 1,
      total_distance_km: 45.5,
      total_duration_minutes: 480,
      vehicle_id: vehicleId,
      assigned_to: driverId,
      deleted_at: null,
    };

    const mockDriverRow = {
      id: driverId,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      telegram_chat_id: '123456789',
      preferred_channel: 'telegram',
      fallback_enabled: true,
      status: 'active',
      deleted_at: null,
    };

    const mockVehicleRow = {
      id: vehicleId,
      name: 'Truck 1',
      license_plate: 'ABC-1234',
      make: 'Ford',
      model: 'F-150',
      deleted_at: null,
    };

    const mockBookingRow = {
      id: bookingId,
      client_id: 'client-1',
      service_id: 'service-1',
      scheduled_date: '2024-01-15',
      scheduled_start_time: '09:00:00',
      service_address_line1: '123 Main St',
      service_address_line2: null,
      service_city: 'Springfield',
      service_state: 'IL',
      service_postal_code: '62701',
      special_instructions: null,
      deleted_at: null,
      clients: { name: 'Acme Corp' },
      services: { name: 'Delivery' },
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should retrieve complete dispatch context', async () => {
      let routeCallCount = 0;
      const mockFrom = jest.fn().mockImplementation((table: string) => {
        if (table === 'routes') {
          routeCallCount++;
          // First route call for getRoute, second for getBookingsForRoute
          if (routeCallCount === 1) {
            return createChainableMock({ data: mockRouteRow, error: null });
          } else {
            return createChainableMock({ data: { stop_sequence: [bookingId] }, error: null });
          }
        } else if (table === 'drivers') {
          return createChainableMock({ data: mockDriverRow, error: null });
        } else if (table === 'vehicles') {
          return createChainableMock({ data: mockVehicleRow, error: null });
        } else if (table === 'bookings') {
          const chain: Record<string, jest.Mock> = {};
          chain.select = jest.fn().mockReturnValue(chain);
          chain.in = jest.fn().mockReturnValue(chain);
          chain.is = jest.fn().mockResolvedValue({ data: [mockBookingRow], error: null });
          return chain;
        }
        return createChainableMock({ data: null, error: null });
      });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await getDispatchContext(routeId, driverId);

      expect(result).not.toBeNull();
      expect(result?.route.id).toBe(routeId);
      expect(result?.driver.id).toBe(driverId);
      expect(result?.vehicle?.id).toBe(vehicleId);
      expect(result?.bookings).toHaveLength(1);
      expect(result?.bookings[0]?.clientName).toBe('Acme Corp');
    });

    it('should return null when route not found', async () => {
      const mockFrom = jest.fn().mockImplementation((table: string) => {
        if (table === 'routes') {
          return createChainableMock({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' },
          });
        } else if (table === 'drivers') {
          return createChainableMock({ data: mockDriverRow, error: null });
        }
        return createChainableMock({ data: null, error: null });
      });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await getDispatchContext(routeId, driverId);

      expect(result).toBeNull();
    });

    it('should return null when driver not found', async () => {
      const mockFrom = jest.fn().mockImplementation((tableName: string) => {
        if (tableName === 'routes') {
          return createChainableMock({ data: mockRouteRow, error: null });
        } else if (tableName === 'drivers') {
          return createChainableMock({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' },
          });
        } else if (tableName === 'vehicles') {
          return createChainableMock({ data: mockVehicleRow, error: null });
        }
        return createChainableMock({ data: null, error: null });
      });
      (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await getDispatchContext(routeId, driverId);

      expect(result).toBeNull();
    });
  });
});
