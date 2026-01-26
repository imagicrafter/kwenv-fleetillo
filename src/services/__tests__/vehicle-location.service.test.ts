
import {
    setVehicleLocations,
    addVehicleLocation,
    setVehiclePrimaryLocation,
    removeVehicleLocation,
    getVehiclePrimaryLocation
} from '../vehicle-location.service';
import { getAdminSupabaseClient } from '../supabase';

// Mock supabase client
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockDelete = jest.fn();
const mockOrder = jest.fn();
const mockSingle = jest.fn();

const mockSupabase = {
    from: mockFrom
};

// Mock chainable logic
mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
    update: mockUpdate
});

mockSelect.mockReturnValue({
    eq: mockEq,
    order: mockOrder,
    single: mockSingle
});

mockInsert.mockReturnValue({
    select: mockSelect
});

mockDelete.mockReturnValue({
    eq: mockEq
});

mockUpdate.mockReturnValue({
    eq: mockEq
});

mockEq.mockReturnValue({
    eq: mockEq,
    single: mockSingle,
    select: mockSelect,
    order: mockOrder
});


// We need to properly mock the implementation of getAdminSupabaseClient
jest.mock('../supabase', () => ({
    getAdminSupabaseClient: jest.fn(),
    getSupabaseClient: jest.fn()
}));


describe('VehicleLocationService Home Location Sync', () => {
    const vehicleId = 'v1';
    const locationId = 'l1';
    const altLocationId = 'l2';

    beforeEach(() => {
        jest.clearAllMocks();
        (getAdminSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

        // Default success responses
        mockSelect.mockResolvedValue({ data: [], error: null });
        mockSingle.mockResolvedValue({ data: null, error: null });
        mockEq.mockReturnValue(mockSupabase); // Reset chain for update/delete

        // Fix chain for complex queries (delete().eq().eq().select())
        mockDelete.mockReturnValue({
            eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue({ data: [], error: null })
                })
            })
        });
    });

    // Since I can't easily mock the deeply chained supabase calls perfectly without a library,
    // I will focus on spying on the 'vehicles' table update call which is the core of the requirement.

    // But wait, the service imports supabase internally.
    // I need to intercept that. 
    // The previous mock setup for '../supabase' works.

    it('should sync home_location_id when adding a primary location', async () => {
        // Setup insert return
        const mockLoc = { vehicle_id: vehicleId, location_id: locationId, is_primary: true };
        mockSelect.mockResolvedValueOnce({ data: mockLoc, error: null }); // for insert().select().single()

        // This is tricky because addVehicleLocation calls rowToVehicleLocation
        // and chained calls. 
        // Let's refine the mock structure to handle the specific chains in the service.

        // Chain for addVehicleLocation:
        // insert().select().single()
        // update().eq() (if primary)
        // AND fetch vehicles table update

        const updateSpy = jest.fn().mockImplementation(() => ({ eq: jest.fn() }));
        const fromSpy = jest.fn().mockImplementation((table) => {
            if (table === 'vehicles') return { update: updateSpy };
            if (table === 'vehicle_locations') return {
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: mockLoc, error: null })
                    })
                }),
                update: jest.fn().mockReturnValue({ eq: jest.fn() }),
                delete: jest.fn().mockReturnValue({ eq: jest.fn() })
            };
            return {};
        });

        mockSupabase.from = fromSpy;

        await addVehicleLocation(vehicleId, locationId, true);

        // Verify vehicles table update
        expect(fromSpy).toHaveBeenCalledWith('vehicles');
        expect(updateSpy).toHaveBeenCalledWith({ home_location_id: locationId });
    });

    it('should sync home_location_id when removing primary location', async () => {
        const mockDeletedRows = [{ vehicle_id: vehicleId, location_id: locationId, is_primary: true }];

        const selectSpy = jest.fn().mockResolvedValue({ data: mockDeletedRows, error: null });
        const eqSpy2 = jest.fn().mockReturnValue({ select: selectSpy });
        const eqSpy1 = jest.fn().mockReturnValue({ eq: eqSpy2 });
        const deleteSpy = jest.fn().mockReturnValue({ eq: eqSpy1 });
        const updateSpy = jest.fn().mockReturnValue({ eq: jest.fn() });

        const fromSpy = jest.fn().mockImplementation((table) => {
            if (table === 'vehicles') return { update: updateSpy };
            if (table === 'vehicle_locations') return {
                delete: deleteSpy
            };
            return {};
        });
        mockSupabase.from = fromSpy;

        await removeVehicleLocation(vehicleId, locationId);

        expect(fromSpy).toHaveBeenCalledWith('vehicles');
        expect(updateSpy).toHaveBeenCalledWith({ home_location_id: null });
    });

    it('should NOT sync home_location_id when removing non-primary location', async () => {
        const mockDeletedRows = [{ vehicle_id: vehicleId, location_id: locationId, is_primary: false }];

        const selectSpy = jest.fn().mockResolvedValue({ data: mockDeletedRows, error: null });
        const eqSpy2 = jest.fn().mockReturnValue({ select: selectSpy });
        const eqSpy1 = jest.fn().mockReturnValue({ eq: eqSpy2 });
        const deleteSpy = jest.fn().mockReturnValue({ eq: eqSpy1 });
        const updateSpy = jest.fn().mockReturnValue({ eq: jest.fn() });

        const fromSpy = jest.fn().mockImplementation((table) => {
            if (table === 'vehicles') return { update: updateSpy };
            if (table === 'vehicle_locations') return {
                delete: deleteSpy
            };
            return {};
        });
        mockSupabase.from = fromSpy;

        await removeVehicleLocation(vehicleId, locationId);

        expect(fromSpy).not.toHaveBeenCalledWith('vehicles');
    });

    it('should sync home_location_id when setting primary location via setVehiclePrimaryLocation', async () => {
        // We need a mock that handles both 1-level and 2-level eq chains and returns a result
        const mockResponse = { data: null, error: null };
        const eqSpy = jest.fn();

        // Make eqSpy return itself so we can chain infinite .eq()
        // And make it thenable to return the response
        const thenableEq = {
            eq: eqSpy,
            then: (resolve: any) => resolve(mockResponse)
        };
        eqSpy.mockReturnValue(thenableEq);

        const updateSpy = jest.fn().mockReturnValue(thenableEq);

        const fromSpy = jest.fn().mockImplementation((table) => {
            if (table === 'vehicles') return { update: updateSpy };
            if (table === 'vehicle_locations') return {
                update: updateSpy
            };
            return {};
        });
        mockSupabase.from = fromSpy;

        await setVehiclePrimaryLocation(vehicleId, locationId);

        // Check if vehicles table was updated
        expect(fromSpy).toHaveBeenCalledWith('vehicles');
        expect(updateSpy).toHaveBeenCalledWith({ home_location_id: locationId });
    });
});
