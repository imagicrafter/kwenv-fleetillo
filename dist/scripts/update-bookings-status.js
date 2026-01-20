"use strict";
/**
 * Script to update all bookings to 'confirmed' status
 * Run with: npx tsx scripts/update-bookings-status.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("../src/services/supabase.js");
const index_js_1 = require("../src/config/index.js");
async function updateAllBookingsToConfirmed() {
    console.log('Initializing Supabase...');
    const initResult = (0, supabase_js_1.initializeSupabase)({
        url: index_js_1.config.supabase.url,
        anonKey: index_js_1.config.supabase.anonKey,
        serviceRoleKey: index_js_1.config.supabase.serviceRoleKey,
        schema: index_js_1.config.supabase.schema,
    });
    if (!initResult.success) {
        console.error('Failed to initialize Supabase:', initResult.error);
        process.exit(1);
    }
    const supabase = (0, supabase_js_1.getAdminSupabaseClient)();
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
//# sourceMappingURL=update-bookings-status.js.map