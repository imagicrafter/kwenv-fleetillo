import {
  setVehicleLocations,
  addVehicleLocation,
  setVehiclePrimaryLocation,
  removeVehicleLocation,
} from '../vehicle-location.service';
import { getAdminSupabaseClient } from '../supabase';

// We need to properly mock the implementation of getAdminSupabaseClient
jest.mock('../supabase', () => ({
  getAdminSupabaseClient: jest.fn(),
  getSupabaseClient: jest.fn(),
}));

/**
 * Creates a mock Supabase client with table-aware routing.
 * Returns the mock client and spies for verifying calls.
 */
function createMockSupabase(tableHandlers: Record<string, Record<string, jest.Mock>>) {
  const fromSpy = jest.fn().mockImplementation((table: string) => {
    return tableHandlers[table] || {};
  });
  return { from: fromSpy, fromSpy };
}

/**
 * Creates a chainable eq mock that supports arbitrary depth.
 * Final call in the chain resolves with the given response.
 */
function createChainableEq(response: { data: unknown; error: unknown }): jest.Mock {
  const eqSpy: jest.Mock = jest.fn();
  const thenable = {
    eq: eqSpy,
    select: jest.fn().mockResolvedValue(response),
    then: (resolve: (val: unknown) => void) => resolve(response),
  };
  eqSpy.mockReturnValue(thenable);
  return eqSpy;
}

describe('VehicleLocationService Home Location Sync', () => {
  const vehicleId = 'v1';
  const locationId = 'l1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setVehicleLocations', () => {
    it('should sync home_location_id when setting a primary location', async () => {
      const mockRow = {
        id: 'vl1',
        vehicle_id: vehicleId,
        location_id: locationId,
        is_primary: true,
        created_at: '2024-01-01T00:00:00Z',
      };

      const vehiclesUpdateSpy = jest.fn().mockReturnValue({
        eq: createChainableEq({ data: null, error: null }),
      });

      const { from: mockFrom, fromSpy } = createMockSupabase({
        vehicle_locations: {
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: [mockRow], error: null }),
          }),
        },
        vehicles: {
          update: vehiclesUpdateSpy,
        },
      });

      const mockSupabase = { from: fromSpy };
      (getAdminSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

      const result = await setVehicleLocations(vehicleId, [{ locationId, isPrimary: true }]);

      expect(result.success).toBe(true);
      expect(fromSpy).toHaveBeenCalledWith('vehicles');
      expect(vehiclesUpdateSpy).toHaveBeenCalledWith({ home_location_id: locationId });
    });

    it('should clear home_location_id when setting empty locations', async () => {
      const vehiclesUpdateSpy = jest.fn().mockReturnValue({
        eq: createChainableEq({ data: null, error: null }),
      });

      const { fromSpy } = createMockSupabase({
        vehicle_locations: {
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        },
        vehicles: {
          update: vehiclesUpdateSpy,
        },
      });

      const mockSupabase = { from: fromSpy };
      (getAdminSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

      const result = await setVehicleLocations(vehicleId, []);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(fromSpy).toHaveBeenCalledWith('vehicles');
      expect(vehiclesUpdateSpy).toHaveBeenCalledWith({ home_location_id: null });
    });

    it('should handle sync error gracefully without failing the main operation', async () => {
      const mockRow = {
        id: 'vl1',
        vehicle_id: vehicleId,
        location_id: locationId,
        is_primary: true,
        created_at: '2024-01-01T00:00:00Z',
      };

      // Sync update returns a Supabase error
      const vehiclesUpdateSpy = jest.fn().mockReturnValue({
        eq: createChainableEq({
          data: null,
          error: { message: 'RLS policy blocked update', code: '42501' },
        }),
      });

      const { fromSpy } = createMockSupabase({
        vehicle_locations: {
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: [mockRow], error: null }),
          }),
        },
        vehicles: {
          update: vehiclesUpdateSpy,
        },
      });

      const mockSupabase = { from: fromSpy };
      (getAdminSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

      // The main operation should still succeed even though sync failed
      const result = await setVehicleLocations(vehicleId, [{ locationId, isPrimary: true }]);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('addVehicleLocation', () => {
    it('should sync home_location_id when adding a primary location', async () => {
      const mockLoc = {
        id: 'vl1',
        vehicle_id: vehicleId,
        location_id: locationId,
        is_primary: true,
        created_at: '2024-01-01T00:00:00Z',
      };

      const vehiclesUpdateSpy = jest.fn().mockReturnValue({
        eq: createChainableEq({ data: null, error: null }),
      });

      const { fromSpy } = createMockSupabase({
        vehicle_locations: {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockLoc, error: null }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn(),
          }),
        },
        vehicles: {
          update: vehiclesUpdateSpy,
        },
      });

      const mockSupabase = { from: fromSpy };
      (getAdminSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

      await addVehicleLocation(vehicleId, locationId, true);

      expect(fromSpy).toHaveBeenCalledWith('vehicles');
      expect(vehiclesUpdateSpy).toHaveBeenCalledWith({ home_location_id: locationId });
    });

    it('should NOT sync home_location_id when adding a non-primary location', async () => {
      const mockLoc = {
        id: 'vl1',
        vehicle_id: vehicleId,
        location_id: locationId,
        is_primary: false,
        created_at: '2024-01-01T00:00:00Z',
      };

      const vehiclesUpdateSpy = jest.fn().mockReturnValue({
        eq: createChainableEq({ data: null, error: null }),
      });

      const { fromSpy } = createMockSupabase({
        vehicle_locations: {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockLoc, error: null }),
            }),
          }),
        },
        vehicles: {
          update: vehiclesUpdateSpy,
        },
      });

      const mockSupabase = { from: fromSpy };
      (getAdminSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

      await addVehicleLocation(vehicleId, locationId, false);

      // vehicles table should NOT have been accessed
      expect(fromSpy).not.toHaveBeenCalledWith('vehicles');
    });
  });

  describe('removeVehicleLocation', () => {
    it('should clear home_location_id when removing a primary location', async () => {
      const mockDeletedRows = [
        {
          id: 'vl1',
          vehicle_id: vehicleId,
          location_id: locationId,
          is_primary: true,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const selectSpy = jest.fn().mockResolvedValue({ data: mockDeletedRows, error: null });
      const eqSpy2 = jest.fn().mockReturnValue({ select: selectSpy });
      const eqSpy1 = jest.fn().mockReturnValue({ eq: eqSpy2 });
      const deleteSpy = jest.fn().mockReturnValue({ eq: eqSpy1 });
      const vehiclesUpdateSpy = jest.fn().mockReturnValue({
        eq: createChainableEq({ data: null, error: null }),
      });

      const fromSpy = jest.fn().mockImplementation((table: string) => {
        if (table === 'vehicles') return { update: vehiclesUpdateSpy };
        if (table === 'vehicle_locations') return { delete: deleteSpy };
        return {};
      });

      const mockSupabase = { from: fromSpy };
      (getAdminSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

      await removeVehicleLocation(vehicleId, locationId);

      expect(fromSpy).toHaveBeenCalledWith('vehicles');
      expect(vehiclesUpdateSpy).toHaveBeenCalledWith({ home_location_id: null });
    });

    it('should NOT clear home_location_id when removing a non-primary location', async () => {
      const mockDeletedRows = [
        {
          id: 'vl1',
          vehicle_id: vehicleId,
          location_id: locationId,
          is_primary: false,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const selectSpy = jest.fn().mockResolvedValue({ data: mockDeletedRows, error: null });
      const eqSpy2 = jest.fn().mockReturnValue({ select: selectSpy });
      const eqSpy1 = jest.fn().mockReturnValue({ eq: eqSpy2 });
      const deleteSpy = jest.fn().mockReturnValue({ eq: eqSpy1 });
      const vehiclesUpdateSpy = jest.fn().mockReturnValue({
        eq: createChainableEq({ data: null, error: null }),
      });

      const fromSpy = jest.fn().mockImplementation((table: string) => {
        if (table === 'vehicles') return { update: vehiclesUpdateSpy };
        if (table === 'vehicle_locations') return { delete: deleteSpy };
        return {};
      });

      const mockSupabase = { from: fromSpy };
      (getAdminSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

      await removeVehicleLocation(vehicleId, locationId);

      expect(fromSpy).not.toHaveBeenCalledWith('vehicles');
    });
  });

  describe('setVehiclePrimaryLocation', () => {
    it('should sync home_location_id when changing primary location', async () => {
      const mockResponse = { data: null, error: null };
      const eqSpy = createChainableEq(mockResponse);

      const vehiclesUpdateSpy = jest.fn().mockReturnValue({ eq: eqSpy });
      const vlUpdateSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      const fromSpy = jest.fn().mockImplementation((table: string) => {
        if (table === 'vehicles') return { update: vehiclesUpdateSpy };
        if (table === 'vehicle_locations') return { update: vlUpdateSpy };
        return {};
      });

      const mockSupabase = { from: fromSpy };
      (getAdminSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

      await setVehiclePrimaryLocation(vehicleId, locationId);

      expect(fromSpy).toHaveBeenCalledWith('vehicles');
      expect(vehiclesUpdateSpy).toHaveBeenCalledWith({ home_location_id: locationId });
    });
  });
});
