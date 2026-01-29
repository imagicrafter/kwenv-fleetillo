/**
 * Integration Test: Vehicle Home Location Sync
 *
 * Tests the full round-trip sync between vehicle_locations.is_primary
 * and vehicles.home_location_id against a real Supabase database.
 *
 * Verifies:
 * - setVehicleLocations syncs home_location_id with primary
 * - setVehicleLocations([]) clears home_location_id (edge case fix)
 * - removeVehicleLocation clears home_location_id when primary removed
 * - Cleanup after each test to avoid data pollution
 */

import {
    setVehicleLocations,
    removeVehicleLocation,
    setVehiclePrimaryLocation,
} from '../../../src/services/vehicle-location.service';
import {
    createVehicle,
    getVehicleById,
    hardDeleteVehicle,
} from '../../../src/services/index';
import { createLocation } from '../../../src/services/location.service';
import {
    initializeSupabase,
    resetSupabaseClient,
    getAdminSupabaseClient,
} from '../../../src/services/supabase';
import type { CreateVehicleInput } from '../../../src/types/vehicle';

// Test data
const testVehicleInput: CreateVehicleInput = {
    name: 'Sync Test Vehicle ' + Date.now(),
    licensePlate: 'SYNC-TEST-' + Date.now(),
    status: 'available',
};

const testLocationInput1 = {
    name: 'Sync Test Location A ' + Date.now(),
    locationType: 'depot' as const,
    addressLine1: '100 Test Ave',
    city: 'Testville',
    state: 'TX',
    postalCode: '75001',
    country: 'US',
    isPrimary: false,
    tags: [],
};

const testLocationInput2 = {
    name: 'Sync Test Location B ' + Date.now(),
    locationType: 'depot' as const,
    addressLine1: '200 Test Blvd',
    city: 'Testville',
    state: 'TX',
    postalCode: '75002',
    country: 'US',
    isPrimary: false,
    tags: [],
};

let vehicleId: string | null = null;
let locationId1: string | null = null;
let locationId2: string | null = null;

describe('Vehicle Home Location Sync (Integration)', () => {
    beforeAll(async () => {
        await initializeSupabase();

        // Create test vehicle
        const vehicleResult = await createVehicle(testVehicleInput);
        expect(vehicleResult.success).toBe(true);
        vehicleId = vehicleResult.data!.id;

        // Create test locations
        const locResult1 = await createLocation(testLocationInput1);
        expect(locResult1.success).toBe(true);
        locationId1 = locResult1.data!.id;

        const locResult2 = await createLocation(testLocationInput2);
        expect(locResult2.success).toBe(true);
        locationId2 = locResult2.data!.id;
    });

    afterAll(async () => {
        const supabase = getAdminSupabaseClient();

        // Clean up vehicle_locations junction records
        if (vehicleId && supabase) {
            await supabase
                .from('vehicle_locations')
                .delete()
                .eq('vehicle_id', vehicleId);
        }

        // Clean up test vehicle
        if (vehicleId) {
            await hardDeleteVehicle(vehicleId);
        }

        // Clean up test locations (hard delete via admin client)
        if (supabase) {
            if (locationId1) {
                await supabase.from('locations').delete().eq('id', locationId1);
            }
            if (locationId2) {
                await supabase.from('locations').delete().eq('id', locationId2);
            }
        }

        resetSupabaseClient();
    });

    test('setVehicleLocations syncs home_location_id with primary location', async () => {
        const result = await setVehicleLocations(vehicleId!, [
            { locationId: locationId1!, isPrimary: true },
        ]);
        expect(result.success).toBe(true);

        // Re-read the vehicle and verify home_location_id
        const vehicleResult = await getVehicleById(vehicleId!);
        expect(vehicleResult.success).toBe(true);
        expect(vehicleResult.data!.homeLocationId).toBe(locationId1);
    });

    test('setVehiclePrimaryLocation syncs home_location_id to new primary', async () => {
        // First set two locations
        const setResult = await setVehicleLocations(vehicleId!, [
            { locationId: locationId1!, isPrimary: true },
            { locationId: locationId2!, isPrimary: false },
        ]);
        expect(setResult.success).toBe(true);

        // Now change primary to location 2
        const primaryResult = await setVehiclePrimaryLocation(vehicleId!, locationId2!);
        expect(primaryResult.success).toBe(true);

        // Verify home_location_id updated
        const vehicleResult = await getVehicleById(vehicleId!);
        expect(vehicleResult.success).toBe(true);
        expect(vehicleResult.data!.homeLocationId).toBe(locationId2);
    });

    test('removeVehicleLocation clears home_location_id when primary is removed', async () => {
        // Set a single primary location
        const setResult = await setVehicleLocations(vehicleId!, [
            { locationId: locationId1!, isPrimary: true },
        ]);
        expect(setResult.success).toBe(true);

        // Remove the primary location
        const removeResult = await removeVehicleLocation(vehicleId!, locationId1!);
        expect(removeResult.success).toBe(true);

        // Verify home_location_id is cleared
        const vehicleResult = await getVehicleById(vehicleId!);
        expect(vehicleResult.success).toBe(true);
        expect(vehicleResult.data!.homeLocationId).toBeUndefined();
    });

    test('setVehicleLocations with empty array clears home_location_id', async () => {
        // First set a primary location
        const setResult = await setVehicleLocations(vehicleId!, [
            { locationId: locationId1!, isPrimary: true },
        ]);
        expect(setResult.success).toBe(true);

        // Verify it was set
        const vehicleBefore = await getVehicleById(vehicleId!);
        expect(vehicleBefore.success).toBe(true);
        expect(vehicleBefore.data!.homeLocationId).toBe(locationId1);

        // Now clear all locations
        const clearResult = await setVehicleLocations(vehicleId!, []);
        expect(clearResult.success).toBe(true);
        expect(clearResult.data).toEqual([]);

        // Verify home_location_id is cleared
        const vehicleAfter = await getVehicleById(vehicleId!);
        expect(vehicleAfter.success).toBe(true);
        expect(vehicleAfter.data!.homeLocationId).toBeUndefined();
    });
});
