/**
 * Backfill script to populate service_ids column in bookings table.
 * Priority:
 * 1. service_items (map to array of serviceId)
 * 2. service_id (single item array)
 *
 * Run with: npx tsx src/scripts/backfill-service-ids.ts
 */

import 'dotenv/config';
import { initializeSupabase, getAdminSupabaseClient } from '../services/supabase';

// Initialize Supabase with environment variables
initializeSupabase({
  url: process.env.SUPABASE_URL || '',
  anonKey: process.env.SUPABASE_KEY || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

async function backfill() {
  const supabase = getAdminSupabaseClient()!;

  console.log('='.repeat(80));
  console.log('BACKFILL: Populating service_ids from service_items');
  console.log('='.repeat(80));

  // Fetch bookings that need backfilling
  // We want bookings where service_ids is null, OR empty (if we want to be thorough, but let's stick to null for now)
  // And have either service_items or service_id
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, booking_number, service_id, service_ids, service_items')
    .is('deleted_at', null)
    .is('service_ids', null);

  if (error) {
    console.error('Error fetching bookings:', error);
    process.exit(1);
  }

  if (!bookings || bookings.length === 0) {
    console.log('No bookings found requiring backfill (service_ids is null).');
    return;
  }

  console.log(`Found ${bookings.length} bookings to check/update.`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const booking of bookings) {
    let serviceIds: string[] = [];
    let source = '';

    // 1. Try to get from service_items
    if (
      booking.service_items &&
      Array.isArray(booking.service_items) &&
      booking.service_items.length > 0
    ) {
      serviceIds = booking.service_items
        .map((item: any) => item.serviceId)
        .filter((id: any) => !!id);
      source = 'service_items';
    }
    // 2. Fallback to service_id
    else if (booking.service_id) {
      serviceIds = [booking.service_id];
      source = 'service_id';
    }

    if (serviceIds.length > 0) {
      // Update the booking
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ service_ids: serviceIds })
        .eq('id', booking.id);

      if (updateError) {
        console.error(
          `Error updating booking ${booking.booking_number} (${booking.id}):`,
          updateError
        );
        errorCount++;
      } else {
        console.log(
          `Updated booking ${booking.booking_number} (${booking.id}) - Source: ${source}, IDs: ${serviceIds.join(', ')}`
        );
        updatedCount++;
      }
    } else {
      console.log(
        `Skipping booking ${booking.booking_number} (${booking.id}) - No service data found in items or legacy ID.`
      );
      skippedCount++;
    }
  }

  console.log('-'.repeat(80));
  console.log(`Backfill Complete.`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Errors:  ${errorCount}`);
  console.log('='.repeat(80));
}

backfill()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
