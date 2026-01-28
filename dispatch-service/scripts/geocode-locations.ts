/**
 * Batch Geocoding Script for Locations
 *
 * Geocodes locations that don't have coordinates using Google Maps Geocoding API.
 * Rate limited to 25 requests per minute to avoid API quota issues.
 *
 * Usage:
 *   npx tsx scripts/geocode-locations.ts [options]
 *
 * Options:
 *   --dry-run     Preview what would be geocoded without updating
 *   --limit=N     Only process first N locations
 *
 * Examples:
 *   npx tsx scripts/geocode-locations.ts --dry-run           # Preview all
 *   npx tsx scripts/geocode-locations.ts --dry-run --limit=5 # Preview 5
 *   npx tsx scripts/geocode-locations.ts --limit=10          # Geocode 10 locations
 *   npx tsx scripts/geocode-locations.ts                     # Geocode all without coordinates
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Load .env from dispatch-service first, then parent directory for Google Maps key
config(); // Load local .env
config({ path: resolve(process.cwd(), '..', '.env') }); // Load parent .env (for GOOGLE_MAPS_API_KEY)

// Rate limit: 25 per minute = 2400ms between requests
const RATE_LIMIT_MS = 2400;
const REQUESTS_PER_MINUTE = 25;

interface Location {
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

interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

interface GeocodeResponse {
  results: Array<{
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    formatted_address: string;
  }>;
  status: string;
  error_message?: string;
}

interface ScriptArgs {
  dryRun: boolean;
  limit?: number;
}

function parseArgs(args: string[]): ScriptArgs {
  let dryRun = false;
  let limit: number | undefined;

  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg.startsWith('--limit=')) {
      const limitStr = arg.split('=')[1];
      limit = limitStr ? parseInt(limitStr, 10) : undefined;
    }
  }

  return { dryRun, limit };
}

function buildAddress(location: Location): string {
  const parts: string[] = [];

  if (location.address_line1) {
    parts.push(location.address_line1);
  }
  if (location.address_line2) {
    parts.push(location.address_line2);
  }
  if (location.city) {
    parts.push(location.city);
  }
  if (location.state) {
    parts.push(location.state);
  }
  if (location.postal_code) {
    parts.push(location.postal_code);
  }
  if (location.country) {
    parts.push(location.country);
  }

  return parts.join(', ');
}

async function geocodeAddress(address: string, apiKey: string): Promise<GeocodeResult | null> {
  const encodedAddress = encodeURIComponent(address);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json() as GeocodeResponse;

  if (data.status === 'OK' && data.results.length > 0) {
    const result = data.results[0];
    if (result) {
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
      };
    }
  }

  if (data.status === 'ZERO_RESULTS') {
    return null;
  }

  if (data.error_message) {
    throw new Error(`Geocoding API error: ${data.error_message}`);
  }

  throw new Error(`Geocoding failed with status: ${data.status}`);
}

async function getLocationsWithoutCoordinates(
  supabase: SupabaseClient,
  limit?: number
): Promise<Location[]> {
  let query = supabase
    .from('locations')
    .select('id, name, address_line1, address_line2, city, state, postal_code, country, latitude, longitude')
    .or('latitude.is.null,longitude.is.null')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch locations: ${error.message}`);
  }

  return data || [];
}

async function updateLocationCoordinates(
  supabase: SupabaseClient,
  locationId: string,
  lat: number,
  lng: number
): Promise<void> {
  const { error } = await supabase
    .from('locations')
    .update({
      latitude: lat,
      longitude: lng,
      updated_at: new Date().toISOString(),
    })
    .eq('id', locationId);

  if (error) {
    throw new Error(`Failed to update location ${locationId}: ${error.message}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

async function main() {
  const args = process.argv.slice(2);
  const { dryRun, limit } = parseArgs(args);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  const schema = process.env.SUPABASE_SCHEMA || 'fleetillo';

  if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  if (!googleMapsApiKey) {
    console.error('ERROR: Missing GOOGLE_MAPS_API_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema } });

  console.log('========================================');
  console.log('Batch Geocoding for Locations');
  console.log('========================================');
  console.log('');
  console.log(`Schema: ${schema}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no updates)' : 'LIVE (will update database)'}`);
  console.log(`Rate limit: ${REQUESTS_PER_MINUTE} requests/minute`);
  if (limit) {
    console.log(`Limit: ${limit} locations`);
  }
  console.log('');

  // Fetch locations without coordinates
  console.log('Fetching locations without coordinates...');
  const locations = await getLocationsWithoutCoordinates(supabase, limit);
  console.log(`Found ${locations.length} locations to geocode`);
  console.log('');

  if (locations.length === 0) {
    console.log('No locations need geocoding. All locations have coordinates.');
    return;
  }

  // Estimate time
  const estimatedMs = locations.length * RATE_LIMIT_MS;
  console.log(`Estimated time: ${formatDuration(estimatedMs)}`);
  console.log('');

  // Process locations
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;
  const failures: Array<{ name: string; address: string; error: string }> = [];

  for (let i = 0; i < locations.length; i++) {
    const location = locations[i];
    if (!location) continue;

    const address = buildAddress(location);
    const progress = `[${i + 1}/${locations.length}]`;

    // Skip if no address to geocode
    if (!address.trim()) {
      console.log(`${progress} SKIP: ${location.name} - No address data`);
      skippedCount++;
      continue;
    }

    // Double-check coordinates (in case of race condition)
    if (location.latitude !== null && location.longitude !== null) {
      console.log(`${progress} SKIP: ${location.name} - Already has coordinates`);
      skippedCount++;
      continue;
    }

    console.log(`${progress} Geocoding: ${location.name}`);
    console.log(`         Address: ${address}`);

    if (dryRun) {
      console.log(`         [DRY RUN] Would geocode this address`);
      successCount++;
    } else {
      try {
        const result = await geocodeAddress(address, googleMapsApiKey);

        if (result) {
          console.log(`         Result: ${result.lat}, ${result.lng}`);
          console.log(`         Formatted: ${result.formattedAddress}`);

          await updateLocationCoordinates(supabase, location.id, result.lat, result.lng);
          console.log(`         ✓ Updated successfully`);
          successCount++;
        } else {
          console.log(`         ✗ No results found for address`);
          failures.push({ name: location.name, address, error: 'No results found' });
          failCount++;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`         ✗ Error: ${errorMsg}`);
        failures.push({ name: location.name, address, error: errorMsg });
        failCount++;
      }

      // Rate limiting - wait before next request (except for last one)
      if (i < locations.length - 1) {
        await sleep(RATE_LIMIT_MS);
      }
    }

    console.log('');
  }

  // Summary
  console.log('========================================');
  console.log('Summary');
  console.log('========================================');
  console.log(`Total locations: ${locations.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log('');

  if (failures.length > 0) {
    console.log('Failed locations:');
    for (const f of failures) {
      console.log(`  - ${f.name}: ${f.error}`);
      console.log(`    Address: ${f.address}`);
    }
    console.log('');
  }

  if (dryRun) {
    console.log('This was a DRY RUN. No changes were made.');
    console.log('Run without --dry-run to actually geocode locations.');
  }

  console.log('');
  console.log('========================================');
  console.log('Geocoding complete!');
  console.log('========================================');
}

main().catch((err) => {
  console.error('Geocoding failed:', err);
  process.exit(1);
});
