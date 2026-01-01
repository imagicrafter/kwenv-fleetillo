/**
 * Database Foreign Key Constraints Verification Script
 *
 * This script verifies that all foreign key constraints and referential integrity
 * rules are properly set up in the RouteIQ database.
 *
 * Tests:
 * 1. Foreign key constraints exist
 * 2. Cascade behaviors work correctly (RESTRICT, CASCADE, SET NULL)
 * 3. Validation triggers function properly
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vtaufnxworztolfdwlll.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

if (!SUPABASE_KEY) {
  console.error('❌ SUPABASE_KEY environment variable is not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'routeiq' },
});

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function log(message: string) {
  console.log(message);
}

function logSuccess(message: string) {
  passedTests++;
  totalTests++;
  console.log(`✅ PASS: ${message}`);
}

function logError(message: string, error?: any) {
  failedTests++;
  totalTests++;
  console.log(`❌ FAIL: ${message}`);
  if (error) {
    console.log(`   Error: ${error.message || error}`);
  }
}

function logInfo(message: string) {
  console.log(`ℹ️  ${message}`);
}

async function testForeignKeyConstraints() {
  log('\n🔍 Testing Foreign Key Constraints\n');
  log('=' .repeat(80));

  let testClientId: string = '';
  let testServiceId: string = '';
  let testVehicleId: string = '';
  let testBookingId: string = '';

  try {
    // Setup test data
    logInfo('Setting up test data...');

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        name: 'FK Test Client',
        email: `fk-test-${Date.now()}@example.com`,
        status: 'active',
      })
      .select()
      .single();

    if (clientError) throw clientError;
    testClientId = client.id;
    logInfo(`Created test client: ${testClientId}`);

    const { data: service, error: serviceError } = await supabase
      .from('services')
      .insert({
        name: 'FK Test Service',
        code: `FK-TEST-${Date.now()}`,
        service_type: 'maintenance',
        status: 'active',
      })
      .select()
      .single();

    if (serviceError) throw serviceError;
    testServiceId = service.id;
    logInfo(`Created test service: ${testServiceId}`);

    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .insert({
        name: 'FK Test Vehicle',
        status: 'available',
        service_types: ['maintenance'],
      })
      .select()
      .single();

    if (vehicleError) throw vehicleError;
    testVehicleId = vehicle.id;
    logInfo(`Created test vehicle: ${testVehicleId}`);

    log('\n' + '-'.repeat(80));
    log('TEST 1: bookings.client_id -> clients.id (RESTRICT)');
    log('-'.repeat(80));

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

    if (bookingError) throw new Error(`Failed to create booking: ${bookingError.message}`);
    testBookingId = booking.id;

    // Try to delete the client (should fail)
    const { error: deleteError } = await supabase
      .from('clients')
      .delete()
      .eq('id', testClientId);

    if (deleteError && deleteError.message.includes('foreign key')) {
      logSuccess('Client deletion blocked by FK constraint (bookings.client_id)');
    } else {
      logError('Client deletion should have been blocked by FK constraint');
    }

    log('\n' + '-'.repeat(80));
    log('TEST 2: bookings.service_id -> services.id (RESTRICT)');
    log('-'.repeat(80));

    // Try to delete the service (should fail)
    const { error: deleteServiceError } = await supabase
      .from('services')
      .delete()
      .eq('id', testServiceId);

    if (deleteServiceError && deleteServiceError.message.includes('foreign key')) {
      logSuccess('Service deletion blocked by FK constraint (bookings.service_id)');
    } else {
      logError('Service deletion should have been blocked by FK constraint');
    }

    log('\n' + '-'.repeat(80));
    log('TEST 3: bookings.vehicle_id -> vehicles.id (SET NULL)');
    log('-'.repeat(80));

    // Create a temp vehicle
    const { data: tempVehicle } = await supabase
      .from('vehicles')
      .insert({
        name: `Temp Vehicle ${Date.now()}`,
        status: 'available',
        service_types: ['test'],
      })
      .select()
      .single();

    const tempVehicleId = tempVehicle!.id;

    // Create booking with temp vehicle
    const { data: tempBooking } = await supabase
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

    const tempBookingId = tempBooking!.id;

    // Delete the vehicle (should succeed with SET NULL)
    const { error: delVehicleError } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', tempVehicleId);

    if (!delVehicleError) {
      // Check if booking's vehicle_id is null
      const { data: bookingCheck } = await supabase
        .from('bookings')
        .select('vehicle_id')
        .eq('id', tempBookingId)
        .single();

      if (bookingCheck && bookingCheck.vehicle_id === null) {
        logSuccess('Vehicle deletion set booking.vehicle_id to NULL (SET NULL behavior)');
      } else {
        logError('Vehicle deletion should have set booking.vehicle_id to NULL');
      }

      // Clean up temp booking
      await supabase.from('bookings').delete().eq('id', tempBookingId);
    } else {
      logError('Vehicle deletion failed unexpectedly', delVehicleError);
    }

    log('\n' + '-'.repeat(80));
    log('TEST 4: bookings.parent_booking_id -> bookings.id (CASCADE)');
    log('-'.repeat(80));

    // Create parent booking
    const { data: parentBooking } = await supabase
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

    const parentBookingId = parentBooking!.id;

    // Create child bookings
    const { data: childBooking } = await supabase
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

    const childBookingId = childBooking!.id;

    // Delete parent booking (should cascade delete child)
    const { error: deleteParentError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', parentBookingId);

    if (!deleteParentError) {
      // Check if child was deleted
      const { data: childCheck } = await supabase
        .from('bookings')
        .select('id')
        .eq('id', childBookingId)
        .maybeSingle();

      if (!childCheck) {
        logSuccess('Parent booking deletion cascaded to child bookings (CASCADE behavior)');
      } else {
        logError('Child booking should have been deleted with parent');
      }
    } else {
      logError('Parent booking deletion failed', deleteParentError);
    }

    log('\n' + '-'.repeat(80));
    log('TEST 5: maintenance_schedules.vehicle_id -> vehicles.id (CASCADE)');
    log('-'.repeat(80));

    // Create temp vehicle for maintenance test
    const { data: maintVehicle } = await supabase
      .from('vehicles')
      .insert({
        name: `Maint Test Vehicle ${Date.now()}`,
        status: 'available',
        service_types: ['test'],
      })
      .select()
      .single();

    const maintVehicleId = maintVehicle!.id;

    // Create maintenance schedule
    const { data: maintenance } = await supabase
      .from('maintenance_schedules')
      .insert({
        vehicle_id: maintVehicleId,
        maintenance_type: 'Oil Change',
        scheduled_date: '2025-01-25',
        status: 'scheduled',
      })
      .select()
      .single();

    const maintenanceId = maintenance!.id;

    // Delete vehicle (should cascade delete maintenance)
    const { error: delMaintVehicleError } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', maintVehicleId);

    if (!delMaintVehicleError) {
      // Check if maintenance was deleted
      const { data: maintCheck } = await supabase
        .from('maintenance_schedules')
        .select('id')
        .eq('id', maintenanceId)
        .maybeSingle();

      if (!maintCheck) {
        logSuccess('Vehicle deletion cascaded to maintenance_schedules (CASCADE behavior)');
      } else {
        logError('Maintenance schedule should have been deleted with vehicle');
      }
    } else {
      logError('Vehicle deletion failed', delMaintVehicleError);
    }

    log('\n' + '-'.repeat(80));
    log('TEST 6: routes.vehicle_id -> vehicles.id (RESTRICT)');
    log('-'.repeat(80));

    // Create route with test vehicle
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

    if (routeError) throw new Error(`Failed to create route: ${routeError.message}`);

    const routeId = route.id;

    // Try to delete vehicle (should fail)
    const { error: deleteVehicleError } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', testVehicleId);

    if (deleteVehicleError && deleteVehicleError.message.includes('foreign key')) {
      logSuccess('Vehicle deletion blocked by FK constraint (routes.vehicle_id)');
    } else {
      logError('Vehicle deletion should have been blocked by FK constraint');
    }

    // Clean up route
    await supabase.from('routes').delete().eq('id', routeId);

    log('\n' + '-'.repeat(80));
    log('TEST 7: routes.stop_sequence validation');
    log('-'.repeat(80));

    // Create route with valid stop_sequence
    const { data: validRoute, error: validRouteError } = await supabase
      .from('routes')
      .insert({
        route_name: 'Valid Stop Sequence Route',
        route_date: '2025-02-01',
        vehicle_id: testVehicleId,
        stop_sequence: [testBookingId],
        status: 'planned',
      })
      .select()
      .single();

    if (!validRouteError && validRoute.stop_sequence.includes(testBookingId)) {
      logSuccess('Valid stop_sequence accepted with existing booking ID');

      // Check total_stops auto-update
      if (validRoute.total_stops === 1) {
        logSuccess('total_stops auto-updated to match stop_sequence length');
      } else {
        logError('total_stops should auto-update to match stop_sequence length');
      }

      await supabase.from('routes').delete().eq('id', validRoute.id);
    } else {
      logError('Valid stop_sequence should have been accepted', validRouteError);
    }

    // Try invalid booking ID
    const fakeBookingId = '00000000-0000-0000-0000-000000000000';
    const { error: invalidRouteError } = await supabase
      .from('routes')
      .insert({
        route_name: 'Invalid Stop Sequence Route',
        route_date: '2025-02-01',
        vehicle_id: testVehicleId,
        stop_sequence: [fakeBookingId],
        status: 'planned',
      });

    if (invalidRouteError) {
      logSuccess('Invalid stop_sequence rejected (non-existent booking ID)');
    } else {
      logError('Invalid stop_sequence should have been rejected');
    }

  } catch (error: any) {
    logError('Test execution failed', error);
  } finally {
    // Clean up test data
    logInfo('\nCleaning up test data...');
    if (testBookingId) await supabase.from('bookings').delete().eq('id', testBookingId);
    if (testVehicleId) await supabase.from('vehicles').delete().eq('id', testVehicleId);
    if (testServiceId) await supabase.from('services').delete().eq('id', testServiceId);
    if (testClientId) await supabase.from('clients').delete().eq('id', testClientId);
  }
}

async function main() {
  console.log('\n🚀 RouteIQ Database Foreign Key Constraints Verification');
  console.log('=' .repeat(80));
  console.log(`Database: ${SUPABASE_URL}`);
  console.log(`Schema: routeiq`);
  console.log('=' .repeat(80));

  await testForeignKeyConstraints();

  log('\n' + '='.repeat(80));
  log('TEST SUMMARY');
  log('='.repeat(80));
  log(`Total Tests:  ${totalTests}`);
  log(`✅ Passed:     ${passedTests}`);
  log(`❌ Failed:     ${failedTests}`);
  log('='.repeat(80));

  if (failedTests === 0) {
    log('\n✅ All foreign key constraints are properly configured!');
    process.exit(0);
  } else {
    log('\n❌ Some tests failed. Please review the results above.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
