/**
 * Script to backfill geocoding for existing bookings
 * Geocodes service addresses to populate service_latitude and service_longitude
 * 
 * Run with: npx tsx scripts/backfill-booking-geocodes.ts
 */

import { getAdminSupabaseClient, initializeSupabase } from '../src/services/supabase.js';
import { geocodeAddress } from '../src/services/googlemaps.service.js';
import { config } from '../src/config/index.js';

interface BookingRow {
    id: string;
    booking_number: string;
    service_address_line1: string | null;
    service_address_line2: string | null;
    service_city: string | null;
    service_state: string | null;
    service_postal_code: string | null;
    service_country: string | null;
    service_latitude: number | null;
    service_longitude: number | null;
}

async function backfillGeocodesForBookings() {
    console.log('=== Backfill Booking Geocodes ===\n');
    console.log('Initializing Supabase...');

    const initResult = initializeSupabase({
        url: config.supabase.url,
        anonKey: config.supabase.anonKey,
        serviceRoleKey: config.supabase.serviceRoleKey,
        schema: config.supabase.schema,
    });

    if (!initResult.success) {
        console.error('Failed to initialize Supabase:', initResult.error);
        process.exit(1);
    }

    const supabase = getAdminSupabaseClient();
    if (!supabase) {
        console.error('Failed to get admin Supabase client');
        process.exit(1);
    }

    // Fetch bookings that have addresses but no coordinates
    console.log('Fetching bookings without coordinates...\n');

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, booking_number, service_address_line1, service_address_line2, service_city, service_state, service_postal_code, service_country, service_latitude, service_longitude')
        .is('deleted_at', null)
        .or('service_latitude.is.null,service_longitude.is.null')
        .not('service_address_line1', 'is', null)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Failed to fetch bookings:', error);
        process.exit(1);
    }

    const bookingsToGeocode = (bookings as BookingRow[]).filter(
        b => b.service_address_line1 && b.service_address_line1.trim() !== ''
    );

    console.log(`Found ${bookingsToGeocode.length} bookings to geocode\n`);

    if (bookingsToGeocode.length === 0) {
        console.log('No bookings need geocoding. All done!');
        return;
    }

    let successCount = 0;
    let failureCount = 0;
    const failures: { booking: string; address: string; error: string }[] = [];

    // Process in batches to avoid rate limiting
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_BATCHES_MS = 1000;

    for (let i = 0; i < bookingsToGeocode.length; i += BATCH_SIZE) {
        const batch = bookingsToGeocode.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(bookingsToGeocode.length / BATCH_SIZE)}...`);

        const promises = batch.map(async (booking) => {
            // Build full address string
            const addressParts = [
                booking.service_address_line1,
                booking.service_address_line2,
                booking.service_city,
                booking.service_state,
                booking.service_postal_code,
                booking.service_country || 'USA',
            ].filter(Boolean);

            const fullAddress = addressParts.join(', ');

            try {
                const result = await geocodeAddress({ address: fullAddress });

                if (result.success && result.data) {
                    const { latitude, longitude } = result.data.coordinates;

                    // Update booking with coordinates
                    const { error: updateError } = await supabase
                        .from('bookings')
                        .update({
                            service_latitude: latitude,
                            service_longitude: longitude,
                        })
                        .eq('id', booking.id);

                    if (updateError) {
                        throw new Error(`Update failed: ${updateError.message}`);
                    }

                    console.log(`  ✓ ${booking.booking_number || booking.id.substring(0, 8)}: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                    return { success: true };
                } else {
                    throw new Error(result.error?.message || 'Geocoding returned no data');
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                console.log(`  ✗ ${booking.booking_number || booking.id.substring(0, 8)}: ${errorMessage}`);
                failures.push({
                    booking: booking.booking_number || booking.id,
                    address: fullAddress,
                    error: errorMessage,
                });
                return { success: false };
            }
        });

        const results = await Promise.all(promises);
        successCount += results.filter(r => r.success).length;
        failureCount += results.filter(r => !r.success).length;

        // Delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < bookingsToGeocode.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
        }
    }

    console.log('\n=== Summary ===');
    console.log(`Successfully geocoded: ${successCount}`);
    console.log(`Failed: ${failureCount}`);

    if (failures.length > 0) {
        console.log('\nFailed addresses:');
        failures.forEach(f => {
            console.log(`  - ${f.booking}: "${f.address}" (${f.error})`);
        });
    }

    // Verify final counts
    const { count: withCoords } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .not('service_latitude', 'is', null)
        .not('service_longitude', 'is', null);

    const { count: total } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

    console.log(`\nFinal state: ${withCoords}/${total} bookings have coordinates`);
}

backfillGeocodesForBookings().catch(console.error);
