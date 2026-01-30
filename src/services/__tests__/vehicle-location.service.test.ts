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

describe('VehicleLocationService', () => {
  const vehicleId = 'v1';
  const locationId = 'l1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setVehicleLocations', () => {
    it('should insert locations into junction table when setting a primary location', async () => {
      const mockRow = {
        id: 'vl1',
        vehicle_id: vehicleId,
        location_id: locationId,
        is_primary: true,
        created_at: '2024-01-01T00:00:00Z',
      };

      const insertSpy = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [mockRow], error: null }),
      });

      const { fromSpy } = createMockSupabase({
        vehicle_locations: {
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
          insert: insertSpy,
        },
      });

      const mockSupabase = { from: fromSpy };
      (getAdminSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

      const result = await setVehicleLocations(vehicleId, [{ locationId, isPrimary: true }]);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      const firstItem = result.data![0];
      expect(firstItem?.isPrimary).toBe(true);
      // Should NOT touch the vehicles table (no sync)
      expect(fromSpy).not.toHaveBeenCalledWith('vehicles');
    });

    it('should return empty array when setting empty locations', async () => {
      const { fromSpy } = createMockSupabase({
        vehicle_locations: {
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        },
      });

      const mockSupabase = { from: fromSpy };
      (getAdminSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

      const result = await setVehicleLocations(vehicleId, []);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      // Should NOT touch the vehicles table (no sync)
      expect(fromSpy).not.toHaveBeenCalledWith('vehicles');
    });
  });

  describe('addVehicleLocation', () => {
    it('should insert a primary location without syncing to vehicles table', async () => {
      const mockLoc = {
        id: 'vl1',
        vehicle_id: vehicleId,
        location_id: locationId,
        is_primary: true,
        created_at: '2024-01-01T00:00:00Z',
      };

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
      });

      const mockSupabase = { from: fromSpy };
      (getAdminSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

      const result = await addVehicleLocation(vehicleId, locationId, true);

      expect(result.success).toBe(true);
      expect(result.data!.isPrimary).toBe(true);
      // Should NOT touch the vehicles table (no sync)
      expect(fromSpy).not.toHaveBeenCalledWith('vehicles');
    });

    it('should insert a non-primary location', async () => {
      const mockLoc = {
        id: 'vl1',
        vehicle_id: vehicleId,
        location_id: locationId,
        is_primary: false,
        created_at: '2024-01-01T00:00:00Z',
      };

      const { fromSpy } = createMockSupabase({
        vehicle_locations: {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockLoc, error: null }),
            }),
          }),
        },
      });

      const mockSupabase = { from: fromSpy };
      (getAdminSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

      const result = await addVehicleLocation(vehicleId, locationId, false);

      expect(result.success).toBe(true);
      expect(result.data!.isPrimary).toBe(false);
      // vehicles table should NOT have been accessed
      expect(fromSpy).not.toHaveBeenCalledWith('vehicles');
    });
  });

  describe('removeVehicleLocation', () => {
    it('should delete a location from the junction table', async () => {
      const eqSpy2 = jest.fn().mockResolvedValue({ data: null, error: null });
      const eqSpy1 = jest.fn().mockReturnValue({ eq: eqSpy2 });
      const deleteSpy = jest.fn().mockReturnValue({ eq: eqSpy1 });

      const fromSpy = jest.fn().mockImplementation((table: string) => {
        if (table === 'vehicle_locations') return { delete: deleteSpy };
        return {};
      });

      const mockSupabase = { from: fromSpy };
      (getAdminSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

      const result = await removeVehicleLocation(vehicleId, locationId);

      expect(result.success).toBe(true);
      // Should NOT touch the vehicles table (no sync)
      expect(fromSpy).not.toHaveBeenCalledWith('vehicles');
    });
  });

  describe('setVehiclePrimaryLocation', () => {
    it('should update primary flag in junction table without syncing to vehicles', async () => {
      const mockResponse = { data: null, error: null };
      const eqSpy = createChainableEq(mockResponse);

      const vlUpdateSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      const fromSpy = jest.fn().mockImplementation((table: string) => {
        if (table === 'vehicle_locations') return { update: vlUpdateSpy };
        return {};
      });

      const mockSupabase = { from: fromSpy };
      (getAdminSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

      const result = await setVehiclePrimaryLocation(vehicleId, locationId);

      expect(result.success).toBe(true);
      // Should NOT touch the vehicles table (no sync)
      expect(fromSpy).not.toHaveBeenCalledWith('vehicles');
    });
  });
});
