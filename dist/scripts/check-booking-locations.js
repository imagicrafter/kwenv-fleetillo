"use strict";
/**
 * Script to check booking location data
 * Run with: npx tsx scripts/check-booking-locations.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("../src/services/supabase.js");
const index_js_1 = require("../src/config/index.js");
async function checkBookingLocations() {
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
    console.log('\n=== Checking Booking Location Data ===\n');
    // Get sample of bookings with location data
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, booking_number, service_address_line1, service_city, service_state, service_latitude, service_longitude, status')
        .eq('status', 'confirmed')
        .is('deleted_at', null)
        .limit(10);
    if (error) {
        console.error('Failed to fetch bookings:', error);
        process.exit(1);
    }
    console.log(`Sample of ${bookings?.length || 0} confirmed bookings:\n`);
    let withCoords = 0;
    let withAddress = 0;
    let withBoth = 0;
    let withNeither = 0;
    bookings?.forEach((b, i) => {
        const hasCoords = b.service_latitude != null && b.service_longitude != null;
        const hasAddress = b.service_address_line1 != null && b.service_address_line1.trim() !== '';
        if (hasCoords)
            withCoords++;
        if (hasAddress)
            withAddress++;
        if (hasCoords && hasAddress)
            withBoth++;
        if (!hasCoords && !hasAddress)
            withNeither++;
        console.log(`${i + 1}. Booking ${b.booking_number || b.id.substring(0, 8)}`);
        console.log(`   Address: ${b.service_address_line1 || 'N/A'}, ${b.service_city || ''} ${b.service_state || ''}`);
        console.log(`   Coords: ${hasCoords ? `${b.service_latitude}, ${b.service_longitude}` : 'N/A'}`);
        console.log('');
    });
    console.log('=== Summary ===');
    console.log(`Bookings with coordinates: ${withCoords}/${bookings?.length}`);
    console.log(`Bookings with address: ${withAddress}/${bookings?.length}`);
    console.log(`Bookings with both: ${withBoth}/${bookings?.length}`);
    console.log(`Bookings with neither: ${withNeither}/${bookings?.length}`);
    // Get total counts
    const { count: totalConfirmed } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed')
        .is('deleted_at', null);
    const { count: withCoordsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed')
        .is('deleted_at', null)
        .not('service_latitude', 'is', null)
        .not('service_longitude', 'is', null);
    console.log(`\n=== Total Counts ===`);
    console.log(`Total confirmed bookings: ${totalConfirmed}`);
    console.log(`With coordinates: ${withCoordsCount}`);
    console.log(`Missing coordinates: ${(totalConfirmed || 0) - (withCoordsCount || 0)}`);
}
checkBookingLocations().catch(console.error);
//# sourceMappingURL=check-booking-locations.js.map