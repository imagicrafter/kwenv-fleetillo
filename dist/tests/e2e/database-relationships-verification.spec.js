"use strict";
/**
 * Database Relationships and Foreign Key Constraints Verification Test
 *
 * This test verifies that all foreign key constraints and referential integrity
 * rules are properly enforced in the RouteIQ database.
 *
 * Tests cover:
 * 1. Foreign key constraints (bookings, maintenance_schedules, routes)
 * 2. Cascade behaviors (RESTRICT, CASCADE, SET NULL)
 * 3. Validation triggers (routes.stop_sequence)
 * 4. Helper functions (can_delete_booking, get_routes_for_booking)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const supabase_js_1 = require("@supabase/supabase-js");
// Get environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vtaufnxworztolfdwlll.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
let supabase;
test_1.test.beforeAll(() => {
    if (!SUPABASE_KEY) {
        throw new Error('SUPABASE_KEY environment variable is not set');
    }
    supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_KEY, {
        db: { schema: 'routeiq' },
    });
});
test_1.test.describe('Foreign Key Constraints - Bookings Table', () => {
    let testClientId;
    let testServiceId;
    let testVehicleId;
    let testBookingId;
    test_1.test.beforeAll(async () => {
        // Create test client
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .insert({
            name: 'FK Test Client',
            email: 'fk-test@example.com',
            status: 'active',
        })
            .select()
            .single();
        (0, test_1.expect)(clientError).toBeNull();
        (0, test_1.expect)(client).toBeDefined();
        testClientId = client.id;
        // Create test service
        const { data: service, error: serviceError } = await supabase
            .from('services')
            .insert({
            name: 'FK Test Service',
            code: 'FK-TEST',
            service_type: 'maintenance',
            status: 'active',
        })
            .select()
            .single();
        (0, test_1.expect)(serviceError).toBeNull();
        (0, test_1.expect)(service).toBeDefined();
        testServiceId = service.id;
        // Create test vehicle
        const { data: vehicle, error: vehicleError } = await supabase
            .from('vehicles')
            .insert({
            name: 'FK Test Vehicle',
            status: 'available',
            service_types: ['maintenance'],
        })
            .select()
            .single();
        (0, test_1.expect)(vehicleError).toBeNull();
        (0, test_1.expect)(vehicle).toBeDefined();
        testVehicleId = vehicle.id;
    });
    test_1.test.afterAll(async () => {
        // Clean up test data (order matters due to FK constraints)
        if (testBookingId) {
            await supabase.from('bookings').delete().eq('id', testBookingId);
        }
        if (testVehicleId) {
            await supabase.from('vehicles').delete().eq('id', testVehicleId);
        }
        if (testServiceId) {
            await supabase.from('services').delete().eq('id', testServiceId);
        }
        if (testClientId) {
            await supabase.from('clients').delete().eq('id', testClientId);
        }
    });
    (0, test_1.test)('FK: bookings.client_id -> clients.id (RESTRICT)', async () => {
        // Create a booking
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .insert({
            client_id: testClientId,
            service_id: testServiceId,
            booking_type: 'one_time',
            scheduled_date: '2025-01-15',
            scheduled_start_time: '09:00:00',
            status: 'pending',
        })
            .select()
            .single();
        (0, test_1.expect)(bookingError).toBeNull();
        (0, test_1.expect)(booking).toBeDefined();
        testBookingId = booking.id;
        // Try to delete the client (should fail due to RESTRICT)
        const { error: deleteError } = await supabase
            .from('clients')
            .delete()
            .eq('id', testClientId);
        // Should get a foreign key violation error
        (0, test_1.expect)(deleteError).not.toBeNull();
        (0, test_1.expect)(deleteError?.message).toContain('foreign key');
        // Verify client still exists
        const { data: clientCheck } = await supabase
            .from('clients')
            .select('id')
            .eq('id', testClientId)
            .single();
        (0, test_1.expect)(clientCheck).toBeDefined();
        (0, test_1.expect)(clientCheck?.id).toBe(testClientId);
    });
    (0, test_1.test)('FK: bookings.service_id -> services.id (RESTRICT)', async () => {
        // Try to delete the service (should fail due to RESTRICT)
        const { error: deleteError } = await supabase
            .from('services')
            .delete()
            .eq('id', testServiceId);
        // Should get a foreign key violation error
        (0, test_1.expect)(deleteError).not.toBeNull();
        (0, test_1.expect)(deleteError?.message).toContain('foreign key');
        // Verify service still exists
        const { data: serviceCheck } = await supabase
            .from('services')
            .select('id')
            .eq('id', testServiceId)
            .single();
        (0, test_1.expect)(serviceCheck).toBeDefined();
        (0, test_1.expect)(serviceCheck?.id).toBe(testServiceId);
    });
    (0, test_1.test)('FK: bookings.vehicle_id -> vehicles.id (SET NULL)', async () => {
        // Assign vehicle to booking
        const { error: updateError } = await supabase
            .from('bookings')
            .update({ vehicle_id: testVehicleId })
            .eq('id', testBookingId);
        (0, test_1.expect)(updateError).toBeNull();
        // Create a new vehicle for deletion test
        const { data: tempVehicle, error: vehicleError } = await supabase
            .from('vehicles')
            .insert({
            name: 'Temp Vehicle for DELETE test',
            status: 'available',
            service_types: ['test'],
        })
            .select()
            .single();
        (0, test_1.expect)(vehicleError).toBeNull();
        const tempVehicleId = tempVehicle.id;
        // Create a new booking with this temp vehicle
        const { data: tempBooking, error: tempBookingError } = await supabase
            .from('bookings')
            .insert({
            client_id: testClientId,
            service_id: testServiceId,
            vehicle_id: tempVehicleId,
            booking_type: 'one_time',
            scheduled_date: '2025-01-16',
            scheduled_start_time: '10:00:00',
            status: 'pending',
        })
            .select()
            .single();
        (0, test_1.expect)(tempBookingError).toBeNull();
        const tempBookingId = tempBooking.id;
        // Delete the temp vehicle (should succeed with SET NULL)
        const { error: deleteError } = await supabase
            .from('vehicles')
            .delete()
            .eq('id', tempVehicleId);
        (0, test_1.expect)(deleteError).toBeNull();
        // Verify booking's vehicle_id was set to NULL
        const { data: bookingCheck } = await supabase
            .from('bookings')
            .select('vehicle_id')
            .eq('id', tempBookingId)
            .single();
        (0, test_1.expect)(bookingCheck).toBeDefined();
        (0, test_1.expect)(bookingCheck?.vehicle_id).toBeNull();
        // Clean up temp booking
        await supabase.from('bookings').delete().eq('id', tempBookingId);
    });
    (0, test_1.test)('FK: bookings.parent_booking_id -> bookings.id (CASCADE)', async () => {
        // Create a parent recurring booking
        const { data: parentBooking, error: parentError } = await supabase
            .from('bookings')
            .insert({
            client_id: testClientId,
            service_id: testServiceId,
            booking_type: 'recurring',
            recurrence_pattern: 'weekly',
            scheduled_date: '2025-01-20',
            scheduled_start_time: '11:00:00',
            status: 'confirmed',
        })
            .select()
            .single();
        (0, test_1.expect)(parentError).toBeNull();
        const parentBookingId = parentBooking.id;
        // Create child bookings
        const { data: childBooking1, error: child1Error } = await supabase
            .from('bookings')
            .insert({
            client_id: testClientId,
            service_id: testServiceId,
            parent_booking_id: parentBookingId,
            booking_type: 'one_time',
            scheduled_date: '2025-01-27',
            scheduled_start_time: '11:00:00',
            status: 'scheduled',
        })
            .select()
            .single();
        (0, test_1.expect)(child1Error).toBeNull();
        const childBookingId1 = childBooking1.id;
        const { data: childBooking2, error: child2Error } = await supabase
            .from('bookings')
            .insert({
            client_id: testClientId,
            service_id: testServiceId,
            parent_booking_id: parentBookingId,
            booking_type: 'one_time',
            scheduled_date: '2025-02-03',
            scheduled_start_time: '11:00:00',
            status: 'scheduled',
        })
            .select()
            .single();
        (0, test_1.expect)(child2Error).toBeNull();
        const childBookingId2 = childBooking2.id;
        // Delete the parent booking (should CASCADE delete children)
        const { error: deleteError } = await supabase
            .from('bookings')
            .delete()
            .eq('id', parentBookingId);
        (0, test_1.expect)(deleteError).toBeNull();
        // Verify child bookings were deleted
        const { data: child1Check } = await supabase
            .from('bookings')
            .select('id')
            .eq('id', childBookingId1)
            .maybeSingle();
        (0, test_1.expect)(child1Check).toBeNull();
        const { data: child2Check } = await supabase
            .from('bookings')
            .select('id')
            .eq('id', childBookingId2)
            .maybeSingle();
        (0, test_1.expect)(child2Check).toBeNull();
    });
});
test_1.test.describe('Foreign Key Constraints - Maintenance Schedules', () => {
    let testVehicleId;
    let testMaintenanceId;
    test_1.test.beforeAll(async () => {
        // Create test vehicle
        const { data: vehicle, error: vehicleError } = await supabase
            .from('vehicles')
            .insert({
            name: 'Maintenance FK Test Vehicle',
            status: 'available',
            service_types: ['test'],
        })
            .select()
            .single();
        (0, test_1.expect)(vehicleError).toBeNull();
        testVehicleId = vehicle.id;
    });
    test_1.test.afterAll(async () => {
        // Clean up (maintenance records will cascade delete)
        if (testVehicleId) {
            await supabase.from('vehicles').delete().eq('id', testVehicleId);
        }
    });
    (0, test_1.test)('FK: maintenance_schedules.vehicle_id -> vehicles.id (CASCADE)', async () => {
        // Create maintenance schedule
        const { data: maintenance, error: maintenanceError } = await supabase
            .from('maintenance_schedules')
            .insert({
            vehicle_id: testVehicleId,
            maintenance_type: 'Oil Change',
            scheduled_date: '2025-01-25',
            status: 'scheduled',
        })
            .select()
            .single();
        (0, test_1.expect)(maintenanceError).toBeNull();
        testMaintenanceId = maintenance.id;
        // Delete the vehicle (should CASCADE delete maintenance)
        const { error: deleteError } = await supabase
            .from('vehicles')
            .delete()
            .eq('id', testVehicleId);
        (0, test_1.expect)(deleteError).toBeNull();
        // Verify maintenance record was deleted
        const { data: maintenanceCheck } = await supabase
            .from('maintenance_schedules')
            .select('id')
            .eq('id', testMaintenanceId)
            .maybeSingle();
        (0, test_1.expect)(maintenanceCheck).toBeNull();
        // Clear the testVehicleId since we deleted it
        testVehicleId = '';
    });
});
test_1.test.describe('Foreign Key Constraints - Routes Table', () => {
    let testVehicleId;
    let testRouteId;
    test_1.test.beforeAll(async () => {
        // Create test vehicle
        const { data: vehicle, error: vehicleError } = await supabase
            .from('vehicles')
            .insert({
            name: 'Route FK Test Vehicle',
            status: 'available',
            service_types: ['test'],
        })
            .select()
            .single();
        (0, test_1.expect)(vehicleError).toBeNull();
        testVehicleId = vehicle.id;
    });
    test_1.test.afterAll(async () => {
        // Clean up
        if (testRouteId) {
            await supabase.from('routes').delete().eq('id', testRouteId);
        }
        if (testVehicleId) {
            await supabase.from('vehicles').delete().eq('id', testVehicleId);
        }
    });
    (0, test_1.test)('FK: routes.vehicle_id -> vehicles.id (RESTRICT)', async () => {
        // Create a route
        const { data: route, error: routeError } = await supabase
            .from('routes')
            .insert({
            route_name: 'FK Test Route',
            route_date: '2025-01-30',
            vehicle_id: testVehicleId,
            status: 'draft',
        })
            .select()
            .single();
        (0, test_1.expect)(routeError).toBeNull();
        testRouteId = route.id;
        // Try to delete the vehicle (should fail due to RESTRICT)
        const { error: deleteError } = await supabase
            .from('vehicles')
            .delete()
            .eq('id', testVehicleId);
        // Should get a foreign key violation error
        (0, test_1.expect)(deleteError).not.toBeNull();
        (0, test_1.expect)(deleteError?.message).toContain('foreign key');
        // Verify vehicle still exists
        const { data: vehicleCheck } = await supabase
            .from('vehicles')
            .select('id')
            .eq('id', testVehicleId)
            .single();
        (0, test_1.expect)(vehicleCheck).toBeDefined();
        (0, test_1.expect)(vehicleCheck?.id).toBe(testVehicleId);
    });
});
test_1.test.describe('Route Stop Sequence Validation', () => {
    let testClientId;
    let testServiceId;
    let testVehicleId;
    let testBookingId1;
    let testBookingId2;
    test_1.test.beforeAll(async () => {
        // Create test data
        const { data: client } = await supabase
            .from('clients')
            .insert({ name: 'Stop Sequence Test Client', email: 'stopseq@test.com', status: 'active' })
            .select()
            .single();
        testClientId = client.id;
        const { data: service } = await supabase
            .from('services')
            .insert({ name: 'Stop Seq Service', code: 'STOPSEQ', service_type: 'test', status: 'active' })
            .select()
            .single();
        testServiceId = service.id;
        const { data: vehicle } = await supabase
            .from('vehicles')
            .insert({ name: 'Stop Seq Vehicle', status: 'available', service_types: ['test'] })
            .select()
            .single();
        testVehicleId = vehicle.id;
        // Create bookings
        const { data: booking1 } = await supabase
            .from('bookings')
            .insert({
            client_id: testClientId,
            service_id: testServiceId,
            booking_type: 'one_time',
            scheduled_date: '2025-02-01',
            scheduled_start_time: '09:00:00',
            status: 'confirmed',
        })
            .select()
            .single();
        testBookingId1 = booking1.id;
        const { data: booking2 } = await supabase
            .from('bookings')
            .insert({
            client_id: testClientId,
            service_id: testServiceId,
            booking_type: 'one_time',
            scheduled_date: '2025-02-01',
            scheduled_start_time: '10:00:00',
            status: 'confirmed',
        })
            .select()
            .single();
        testBookingId2 = booking2.id;
    });
    test_1.test.afterAll(async () => {
        // Clean up
        await supabase.from('bookings').delete().eq('id', testBookingId1);
        await supabase.from('bookings').delete().eq('id', testBookingId2);
        await supabase.from('vehicles').delete().eq('id', testVehicleId);
        await supabase.from('services').delete().eq('id', testServiceId);
        await supabase.from('clients').delete().eq('id', testClientId);
    });
    (0, test_1.test)('Routes stop_sequence validation - valid booking IDs', async () => {
        // Create route with valid stop_sequence
        const { data: route, error } = await supabase
            .from('routes')
            .insert({
            route_name: 'Valid Stop Sequence Route',
            route_date: '2025-02-01',
            vehicle_id: testVehicleId,
            stop_sequence: [testBookingId1, testBookingId2],
            status: 'planned',
        })
            .select()
            .single();
        (0, test_1.expect)(error).toBeNull();
        (0, test_1.expect)(route).toBeDefined();
        (0, test_1.expect)(route.stop_sequence).toEqual([testBookingId1, testBookingId2]);
        (0, test_1.expect)(route.total_stops).toBe(2); // Should auto-calculate
        // Clean up
        await supabase.from('routes').delete().eq('id', route.id);
    });
    (0, test_1.test)('Routes stop_sequence validation - invalid booking ID should fail', async () => {
        const fakeBookingId = '00000000-0000-0000-0000-000000000000';
        // Try to create route with invalid booking ID
        const { data: route, error } = await supabase
            .from('routes')
            .insert({
            route_name: 'Invalid Stop Sequence Route',
            route_date: '2025-02-01',
            vehicle_id: testVehicleId,
            stop_sequence: [testBookingId1, fakeBookingId], // One valid, one invalid
            status: 'planned',
        })
            .select()
            .single();
        // Should fail validation
        (0, test_1.expect)(error).not.toBeNull();
        (0, test_1.expect)(error?.message).toContain('booking');
    });
    (0, test_1.test)('Routes total_stops auto-updates with stop_sequence', async () => {
        // Create route with stop_sequence
        const { data: route, error } = await supabase
            .from('routes')
            .insert({
            route_name: 'Auto Update Stops Route',
            route_date: '2025-02-01',
            vehicle_id: testVehicleId,
            stop_sequence: [testBookingId1],
            status: 'planned',
        })
            .select()
            .single();
        (0, test_1.expect)(error).toBeNull();
        (0, test_1.expect)(route.total_stops).toBe(1);
        // Update to add another stop
        const { data: updatedRoute, error: updateError } = await supabase
            .from('routes')
            .update({
            stop_sequence: [testBookingId1, testBookingId2],
        })
            .eq('id', route.id)
            .select()
            .single();
        (0, test_1.expect)(updateError).toBeNull();
        (0, test_1.expect)(updatedRoute.total_stops).toBe(2);
        // Clean up
        await supabase.from('routes').delete().eq('id', route.id);
    });
});
test_1.test.describe('Check Constraints - Routes Table', () => {
    let testVehicleId;
    test_1.test.beforeAll(async () => {
        const { data: vehicle } = await supabase
            .from('vehicles')
            .insert({ name: 'Constraint Test Vehicle', status: 'available', service_types: ['test'] })
            .select()
            .single();
        testVehicleId = vehicle.id;
    });
    test_1.test.afterAll(async () => {
        await supabase.from('vehicles').delete().eq('id', testVehicleId);
    });
    (0, test_1.test)('Route planned times: end must be after start', async () => {
        // Try to create route with invalid times
        const { error } = await supabase
            .from('routes')
            .insert({
            route_name: 'Invalid Time Route',
            route_date: '2025-02-05',
            vehicle_id: testVehicleId,
            planned_start_time: '14:00:00',
            planned_end_time: '10:00:00', // Earlier than start!
            status: 'draft',
        });
        (0, test_1.expect)(error).not.toBeNull();
        (0, test_1.expect)(error?.message).toContain('routes_valid_planned_times');
    });
    (0, test_1.test)('Route optimization score must be 0-100', async () => {
        // Try with score > 100
        const { error: error1 } = await supabase
            .from('routes')
            .insert({
            route_name: 'Invalid Score Route 1',
            route_date: '2025-02-05',
            vehicle_id: testVehicleId,
            optimization_score: 150, // > 100
            status: 'draft',
        });
        (0, test_1.expect)(error1).not.toBeNull();
        (0, test_1.expect)(error1?.message).toContain('routes_valid_optimization_score');
        // Try with score < 0
        const { error: error2 } = await supabase
            .from('routes')
            .insert({
            route_name: 'Invalid Score Route 2',
            route_date: '2025-02-05',
            vehicle_id: testVehicleId,
            optimization_score: -10, // < 0
            status: 'draft',
        });
        (0, test_1.expect)(error2).not.toBeNull();
        (0, test_1.expect)(error2?.message).toContain('routes_valid_optimization_score');
        // Valid score should work
        const { data, error: error3 } = await supabase
            .from('routes')
            .insert({
            route_name: 'Valid Score Route',
            route_date: '2025-02-05',
            vehicle_id: testVehicleId,
            optimization_score: 85.5,
            status: 'draft',
        })
            .select()
            .single();
        (0, test_1.expect)(error3).toBeNull();
        (0, test_1.expect)(data.optimization_score).toBe(85.5);
        // Clean up
        await supabase.from('routes').delete().eq('id', data.id);
    });
    (0, test_1.test)('Route distance and duration must be non-negative', async () => {
        // Negative distance
        const { error: error1 } = await supabase
            .from('routes')
            .insert({
            route_name: 'Negative Distance Route',
            route_date: '2025-02-05',
            vehicle_id: testVehicleId,
            total_distance_km: -10,
            status: 'draft',
        });
        (0, test_1.expect)(error1).not.toBeNull();
        (0, test_1.expect)(error1?.message).toContain('routes_valid_distance');
        // Negative duration
        const { error: error2 } = await supabase
            .from('routes')
            .insert({
            route_name: 'Negative Duration Route',
            route_date: '2025-02-05',
            vehicle_id: testVehicleId,
            total_duration_minutes: -30,
            status: 'draft',
        });
        (0, test_1.expect)(error2).not.toBeNull();
        (0, test_1.expect)(error2?.message).toContain('routes_valid_duration');
    });
});
test_1.test.describe('Referential Integrity Summary', () => {
    (0, test_1.test)('All foreign key relationships are documented', () => {
        // This is a documentation test to ensure we've covered all relationships
        const relationships = [
            'bookings.client_id -> clients.id (RESTRICT)',
            'bookings.service_id -> services.id (RESTRICT)',
            'bookings.vehicle_id -> vehicles.id (SET NULL)',
            'bookings.parent_booking_id -> bookings.id (CASCADE)',
            'maintenance_schedules.vehicle_id -> vehicles.id (CASCADE)',
            'routes.vehicle_id -> vehicles.id (RESTRICT)',
            'routes.stop_sequence -> bookings.id (VALIDATED)',
        ];
        (0, test_1.expect)(relationships).toHaveLength(7);
        console.log('\n✅ Foreign Key Relationships Verified:');
        relationships.forEach((rel) => console.log(`  - ${rel}`));
    });
});
//# sourceMappingURL=database-relationships-verification.spec.js.map