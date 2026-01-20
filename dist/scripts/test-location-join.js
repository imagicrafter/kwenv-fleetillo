"use strict";
/**
 * Test script to check relationship between bookings and locations
 */
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("../src/services/supabase.js");
const index_js_1 = require("../src/config/index.js");
async function testLocationJoin() {
    console.log('=== Testing Bookings-Locations Relationship ===\n');
    (0, supabase_js_1.initializeSupabase)({
        url: index_js_1.config.supabase.url,
        anonKey: index_js_1.config.supabase.anonKey,
        serviceRoleKey: index_js_1.config.supabase.serviceRoleKey,
        schema: index_js_1.config.supabase.schema,
    });
    const supabase = (0, supabase_js_1.getAdminSupabaseClient)();
    if (!supabase) {
        console.error('Failed to get Supabase client');
        return;
    }
    // Try default join syntax
    console.log('1. Try default join: locations(...)');
    const result1 = await supabase
        .from('bookings')
        .select('id, location_id, locations(name, latitude, longitude)')
        .limit(2);
    console.log('Result:', result1.error ? `ERROR: ${result1.error.message}` : 'SUCCESS');
    if (result1.data)
        console.log('Data:', JSON.stringify(result1.data, null, 2));
    // Try explicit FK hint
    console.log('\n2. Try with FK hint: locations!location_id(...)');
    const result2 = await supabase
        .from('bookings')
        .select('id, location_id, locations!location_id(name, latitude, longitude)')
        .not('location_id', 'is', null)
        .limit(2);
    console.log('Result:', result2.error ? `ERROR: ${result2.error.message}` : 'SUCCESS');
    if (result2.data)
        console.log('Data:', JSON.stringify(result2.data, null, 2));
    // Try inner join syntax
    console.log('\n3. Try inner join: locations!inner(...)');
    const result3 = await supabase
        .from('bookings')
        .select('id, location_id, locations!inner(name, latitude, longitude)')
        .limit(2);
    console.log('Result:', result3.error ? `ERROR: ${result3.error.message}` : 'SUCCESS');
    if (result3.data)
        console.log('Data:', JSON.stringify(result3.data, null, 2));
}
testLocationJoin().catch(console.error);
//# sourceMappingURL=test-location-join.js.map