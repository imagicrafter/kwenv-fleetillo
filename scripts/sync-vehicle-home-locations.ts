/**
 * One-time data migration script: Sync vehicles.home_location_id with vehicle_locations primary entry
 *
 * This script reconciles data in two directions:
 * 1. Forward: vehicle_locations (is_primary=true) -> vehicles.home_location_id
 * 2. Reverse: vehicles.home_location_id -> vehicle_locations (if junction record missing)
 *
 * Run with: npx tsx scripts/sync-vehicle-home-locations.ts
 * Add --dry-run flag to preview changes without applying them.
 */

import { getAdminSupabaseClient, initializeSupabase } from '../src/services/supabase.js';
import { createContextLogger } from '../src/utils/logger.js';
import { config } from '../src/config/index.js';

const logger = createContextLogger('SyncVehicleHomeLocations');

interface VehicleLocationPrimaryRow {
  vehicle_id: string;
  location_id: string;
}

interface VehicleWithHomeRow {
  id: string;
  home_location_id: string;
}

interface SyncResult {
  syncedForward: number;
  syncedReverse: number;
  errors: number;
}

async function syncVehicleHomeLocations(dryRun: boolean): Promise<SyncResult> {
  const initResult = initializeSupabase({
    url: config.supabase.url,
    anonKey: config.supabase.anonKey,
    serviceRoleKey: config.supabase.serviceRoleKey,
    schema: config.supabase.schema,
  });

  if (!initResult.success) {
    logger.error('Failed to initialize Supabase', { error: initResult.error });
    process.exit(1);
  }

  const supabase = getAdminSupabaseClient();
  if (!supabase) {
    logger.error('Admin client not available');
    process.exit(1);
  }

  const result: SyncResult = { syncedForward: 0, syncedReverse: 0, errors: 0 };

  // Direction 1: vehicle_locations (primary) -> vehicles.home_location_id
  logger.info('Phase 1: Forward sync — vehicle_locations.is_primary -> vehicles.home_location_id');

  const { data: primaryLocations, error: primaryError } = await supabase
    .from('vehicle_locations')
    .select('vehicle_id, location_id')
    .eq('is_primary', true);

  if (primaryError) {
    logger.error('Failed to fetch primary vehicle locations', { error: primaryError.message });
    process.exit(1);
  }

  for (const row of (primaryLocations as VehicleLocationPrimaryRow[]) || []) {
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('home_location_id')
      .eq('id', row.vehicle_id)
      .single();

    if (vehicleError) {
      logger.warn('Failed to fetch vehicle for forward sync', {
        vehicleId: row.vehicle_id,
        error: vehicleError.message,
      });
      result.errors++;
      continue;
    }

    if (vehicle?.home_location_id !== row.location_id) {
      logger.info('Forward sync needed', {
        vehicleId: row.vehicle_id,
        oldHomeLocationId: vehicle?.home_location_id ?? null,
        newHomeLocationId: row.location_id,
        dryRun,
      });

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('vehicles')
          .update({ home_location_id: row.location_id })
          .eq('id', row.vehicle_id);

        if (updateError) {
          logger.error('Forward sync update failed', {
            vehicleId: row.vehicle_id,
            error: updateError.message,
          });
          result.errors++;
          continue;
        }
      }

      result.syncedForward++;
    }
  }

  // Direction 2: vehicles.home_location_id -> vehicle_locations (if junction record missing)
  logger.info('Phase 2: Reverse sync — vehicles.home_location_id -> vehicle_locations');

  const { data: vehiclesWithHome, error: vehiclesError } = await supabase
    .from('vehicles')
    .select('id, home_location_id')
    .not('home_location_id', 'is', null)
    .is('deleted_at', null);

  if (vehiclesError) {
    logger.error('Failed to fetch vehicles with home_location_id', {
      error: vehiclesError.message,
    });
    process.exit(1);
  }

  for (const vehicle of (vehiclesWithHome as VehicleWithHomeRow[]) || []) {
    const { data: existing, error: existingError } = await supabase
      .from('vehicle_locations')
      .select('id')
      .eq('vehicle_id', vehicle.id)
      .eq('location_id', vehicle.home_location_id)
      .maybeSingle();

    if (existingError) {
      logger.warn('Failed to check existing vehicle_location', {
        vehicleId: vehicle.id,
        error: existingError.message,
      });
      result.errors++;
      continue;
    }

    if (!existing) {
      logger.info('Reverse sync needed — creating vehicle_location junction record', {
        vehicleId: vehicle.id,
        locationId: vehicle.home_location_id,
        dryRun,
      });

      if (!dryRun) {
        // Unset any existing primaries first
        const { error: unsetError } = await supabase
          .from('vehicle_locations')
          .update({ is_primary: false })
          .eq('vehicle_id', vehicle.id);

        if (unsetError) {
          logger.error('Failed to unset existing primaries', {
            vehicleId: vehicle.id,
            error: unsetError.message,
          });
          result.errors++;
          continue;
        }

        // Insert the junction record as primary
        const { error: insertError } = await supabase.from('vehicle_locations').insert({
          vehicle_id: vehicle.id,
          location_id: vehicle.home_location_id,
          is_primary: true,
        });

        if (insertError) {
          logger.error('Failed to insert vehicle_location junction record', {
            vehicleId: vehicle.id,
            locationId: vehicle.home_location_id,
            error: insertError.message,
          });
          result.errors++;
          continue;
        }
      }

      result.syncedReverse++;
    }
  }

  return result;
}

const dryRun = process.argv.includes('--dry-run');

logger.info('Starting vehicle home location sync', { dryRun });

syncVehicleHomeLocations(dryRun)
  .then(result => {
    logger.info('Sync complete', {
      syncedForward: result.syncedForward,
      syncedReverse: result.syncedReverse,
      errors: result.errors,
      dryRun,
    });

    if (result.errors > 0) {
      logger.warn('Some sync operations failed — review logs above');
      process.exit(1);
    }

    process.exit(0);
  })
  .catch(error => {
    logger.error('Sync script failed with unexpected error', { error });
    process.exit(1);
  });
