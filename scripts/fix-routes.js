const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'fleetillo' } }
);

async function fix() {
  // 1. Clear route_id from bookings for Jan 25
  console.log('Clearing route_id from bookings for 2026-01-25...');
  const { data: cleared, error: clearError } = await supabase
    .from('bookings')
    .update({ route_id: null, status: 'scheduled' })
    .eq('scheduled_date', '2026-01-25')
    .not('route_id', 'is', null)
    .is('deleted_at', null)
    .select('booking_number');

  if (clearError) {
    console.error('Error clearing bookings:', clearError);
  } else {
    console.log(`Cleared ${cleared?.length || 0} bookings`);
  }

  // 2. Sync home_location_id for vehicles that have primary_location but no home_location_id
  console.log('\nSyncing home_location_id from vehicle_locations...');

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, name, home_location_id')
    .is('deleted_at', null);

  let synced = 0;
  for (const v of vehicles || []) {
    if (v.home_location_id === null) {
      // Check for primary location
      const { data: vl } = await supabase
        .from('vehicle_locations')
        .select('location_id')
        .eq('vehicle_id', v.id)
        .eq('is_primary', true)
        .single();

      if (vl?.location_id) {
        const { error: updateError } = await supabase
          .from('vehicles')
          .update({ home_location_id: vl.location_id })
          .eq('id', v.id);

        if (updateError) {
          console.error(`  Error updating ${v.name}:`, updateError.message);
        } else {
          console.log(`  Synced ${v.name}: home_location_id = ${vl.location_id}`);
          synced++;
        }
      }
    }
  }
  console.log(`Synced ${synced} vehicles`);

  // 3. Verify
  console.log('\n--- Verification ---');
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, route_id')
    .eq('scheduled_date', '2026-01-25')
    .is('deleted_at', null);

  console.log(`Bookings for 2026-01-25: ${bookings?.length || 0}`);
  console.log(`Without route_id: ${bookings?.filter(b => b.route_id === null).length || 0}`);
  console.log('\nReady for route planning!');
}

fix().catch(console.error);
