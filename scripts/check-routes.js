const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'fleetillo' } }
);

async function check() {
  // Check bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, booking_number, status, route_id')
    .eq('scheduled_date', '2026-01-25')
    .is('deleted_at', null);

  console.log('Bookings for 2026-01-25:', bookings?.length || 0);
  const withRoute = bookings?.filter(b => b.route_id) || [];
  const withoutRoute = bookings?.filter(b => b.route_id === null) || [];
  console.log('With route_id:', withRoute.length);
  console.log('Without route_id:', withoutRoute.length);

  // Check vehicles
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, name, home_location_id, status')
    .is('deleted_at', null);

  console.log('\nVehicles:');
  for (const v of vehicles || []) {
    const { data: vl } = await supabase
      .from('vehicle_locations')
      .select('location_id')
      .eq('vehicle_id', v.id)
      .eq('is_primary', true)
      .single();

    console.log(`  ${v.name}: home_location_id=${v.home_location_id || 'NULL'}, primary_location=${vl?.location_id || 'NULL'}`);
  }

  // If bookings still have route_id, clear them
  if (withRoute.length > 0) {
    console.log('\n--- Bookings still assigned to routes ---');
    for (const b of withRoute) {
      console.log(`  ${b.booking_number}: route_id=${b.route_id}`);
    }
  }
}

check().catch(console.error);
