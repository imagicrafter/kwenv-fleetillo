/**
 * Script to backfill geocoding for existing locations
 * Geocodes addresses to populate latitude and longitude
 * 
 * Run with: npx tsx scripts/backfill-location-geocodes.ts
 */

import { getAdminSupabaseClient, initializeSupabase } from '../src/services/supabase.js';
import { geocodeAddress } from '../src/services/googlemaps.service.js';
import { config } from '../src/config/index.js';

interface LocationRow {
    id: string;
    name: string;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
}

async function backfillGeocodesForLocations() {
    console.log('=== Backfill Location Geocodes ===\n');
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

    // Fetch locations that have addresses but no coordinates
    console.log('Fetching locations without coordinates...\n');

    const { data: locations, error } = await supabase
        .from('locations')
        .select('id, name, address_line1, address_line2, city, state, postal_code, country, latitude, longitude')
        .is('deleted_at', null)
        .or('latitude.is.null,longitude.is.null')
        .not('address_line1', 'is', null)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Failed to fetch locations:', error);
        process.exit(1);
    }

    const locationsToGeocode = (locations as LocationRow[]).filter(
        loc => loc.address_line1 && loc.address_line1.trim() !== ''
    );

    console.log(`Found ${locationsToGeocode.length} locations to geocode\n`);

    if (locationsToGeocode.length === 0) {
        console.log('No locations need geocoding. All done!');
        return;
    }

    let successCount = 0;
    let failureCount = 0;
    const failures: { location: string; address: string; error: string }[] = [];

    // Process one at a time with delay (locations are fewer, less need for batching)
    for (let i = 0; i < locationsToGeocode.length; i++) {
        const location = locationsToGeocode[i]!;

        // Build full address string
        const addressParts = [
            location.address_line1,
            location.address_line2,
            location.city,
            location.state,
            location.postal_code,
            location.country || 'USA',
        ].filter(Boolean);

        const fullAddress = addressParts.join(', ');

        try {
            const result = await geocodeAddress({ address: fullAddress });

            if (result.success && result.data) {
                const { latitude, longitude } = result.data.coordinates;

                // Update location with coordinates
                const { error: updateError } = await supabase
                    .from('locations')
                    .update({
                        latitude: latitude,
                        longitude: longitude,
                    })
                    .eq('id', location.id);

                if (updateError) {
                    throw new Error(`Update failed: ${updateError.message}`);
                }

                console.log(`  ✓ ${location.name}: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                successCount++;
            } else {
                throw new Error(result.error?.message || 'Geocoding returned no data');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.log(`  ✗ ${location.name}: ${errorMessage}`);
            failures.push({
                location: location.name,
                address: fullAddress,
                error: errorMessage,
            });
            failureCount++;
        }

        // Small delay between requests
        if (i < locationsToGeocode.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    console.log('\n=== Summary ===');
    console.log(`Successfully geocoded: ${successCount}`);
    console.log(`Failed: ${failureCount}`);

    if (failures.length > 0) {
        console.log('\nFailed addresses:');
        failures.forEach(f => {
            console.log(`  - ${f.location}: "${f.address}" (${f.error})`);
        });
    }

    // Verify final counts
    const { count: withCoords } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

    const { count: total } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

    console.log(`\nFinal state: ${withCoords}/${total} locations have coordinates`);
}

backfillGeocodesForLocations().catch(console.error);
