/**
 * Script to update all bookings to 'confirmed' status
 * Run with: npx tsx scripts/update-bookings-status.ts
 */

import { getAdminSupabaseClient, initializeSupabase } from '../src/services/supabase.js';
import { config } from '../src/config/index.js';

async function updateAllBookingsToConfirmed() {
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

    console.log('Updating all bookings to confirmed status...');

    const { data, error, count } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .neq('status', 'confirmed')
        .is('deleted_at', null)
        .select('id');

    if (error) {
        console.error('Failed to update bookings:', error);
        process.exit(1);
    }

    console.log(`Successfully updated ${data?.length || 0} bookings to 'confirmed' status`);

    // Also show total count of confirmed bookings now
    const { count: totalConfirmed } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed')
        .is('deleted_at', null);

    console.log(`Total confirmed bookings: ${totalConfirmed}`);
}

updateAllBookingsToConfirmed().catch(console.error);
