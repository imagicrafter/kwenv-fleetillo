#!/usr/bin/env ts-node
/**
 * Delete Test Data Script
 * 
 * Deletes records created on a specific date across all routeiq tables.
 * This is used to clean up test data that was accidentally added.
 * 
 * Usage:
 *   npx ts-node scripts/delete-test-data.ts
 */

import { config, validateConfig } from '../src/config/index.js';
import { initializeSupabase, getAdminSupabaseClient } from '../src/services/supabase.js';
import { createContextLogger } from '../src/utils/logger.js';

const logger = createContextLogger('DeleteTestData');

// The date to delete records from (YYYY-MM-DD format)
const TARGET_DATE = '2026-01-05';

async function deleteTestData(): Promise<void> {
    console.log('='.repeat(60));
    console.log(`Deleting records created on ${TARGET_DATE}`);
    console.log('='.repeat(60));
    console.log('');

    // Validate configuration
    if (!validateConfig()) {
        logger.error('Configuration validation failed');
        process.exit(1);
    }

    // Initialize Supabase
    const initResult = initializeSupabase();
    if (!initResult.success) {
        logger.error('Failed to initialize Supabase:', initResult.error);
        process.exit(1);
    }

    const supabase = getAdminSupabaseClient();
    if (!supabase) {
        logger.error('Admin client not available');
        process.exit(1);
    }

    const schema = config.supabase.schema || 'routeiq';

    // Tables to check (in order to respect foreign key constraints)
    // Delete children first, then parents
    const tables = [
        'route_stops',      // Child of routes and bookings
        'routes',           // Child of vehicles
        'bookings',         // Child of clients, services, locations
        'vehicle_locations', // Child of vehicles and locations
        'locations',        // Child of clients
        'maintenance_schedules', // Child of vehicles
        'vehicles',         // Independent
        'services',         // Independent
        'clients',          // Parent of many
    ];

    const startDate = `${TARGET_DATE}T00:00:00.000Z`;
    const endDate = `${TARGET_DATE}T23:59:59.999Z`;

    let totalDeleted = 0;

    for (const table of tables) {
        try {
            // First, count records to delete
            const { count, error: countError } = await supabase
                .schema(schema)
                .from(table)
                .select('*', { count: 'exact', head: true })
                .gte('created_at', startDate)
                .lte('created_at', endDate);

            if (countError) {
                // Table might not exist or have created_at column
                console.log(`  ⚠ ${table}: skipped (${countError.message})`);
                continue;
            }

            if (!count || count === 0) {
                console.log(`  ✓ ${table}: 0 records to delete`);
                continue;
            }

            // Delete records
            const { error: deleteError } = await supabase
                .schema(schema)
                .from(table)
                .delete()
                .gte('created_at', startDate)
                .lte('created_at', endDate);

            if (deleteError) {
                console.log(`  ✗ ${table}: delete failed (${deleteError.message})`);
            } else {
                console.log(`  ✓ ${table}: ${count} records deleted`);
                totalDeleted += count;
            }
        } catch (err) {
            console.log(`  ✗ ${table}: error (${err})`);
        }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log(`Total records deleted: ${totalDeleted}`);
    console.log('='.repeat(60));

    process.exit(0);
}

// Run the deletion
deleteTestData();
