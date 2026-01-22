"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("../src/services/supabase.js");
const index_js_1 = require("../src/config/index.js");
async function verifyDynamicMetadata() {
    console.log('=== Verifying Dynamic Metadata Support ===\n');
    (0, supabase_js_1.initializeSupabase)({
        url: index_js_1.config.supabase.url,
        anonKey: index_js_1.config.supabase.anonKey,
        serviceRoleKey: index_js_1.config.supabase.serviceRoleKey,
        schema: index_js_1.config.supabase.schema,
    });
    const supabase = (0, supabase_js_1.getAdminSupabaseClient)();
    if (!supabase) {
        console.error('Failed to get Supabase client');
        process.exit(1);
    }
    // 1. Verify Settings Table supports JSON Array
    console.log('1. Testing Settings Table (locations.customFields)...');
    const customFields = [
        { key: 'test_field', label: 'Test Field', type: 'text', required: true }
    ];
    // Upsert setting
    const { error: settingsError } = await supabase
        .from('settings')
        .upsert({
        key: 'locations.customFields',
        value: customFields
    }, { onConflict: 'key' });
    if (settingsError) {
        console.error('Failed to upsert setting:', settingsError);
    }
    else {
        console.log('Successfully saved custom field definition.');
    }
    // 2. Verify Locations Table supports JSON Metadata
    console.log('\n2. Testing Locations Table (metadata)...');
    // Note: 'location_type' is expected by snake_case table
    const testLocation = {
        name: 'Test Location Metadata',
        location_type: 'client',
        address_line1: '123 Test St',
        city: 'Test City',
        state: 'TS',
        postal_code: '12345',
        country: 'USA',
        metadata: {
            test_field: 'Test Value',
            random_data: 123
        }
    };
    const { data: locData, error: locError } = await supabase
        .from('locations')
        .insert(testLocation)
        .select()
        .single();
    if (locError) {
        console.error('Failed to create location:', locError);
    }
    else {
        console.log('Successfully created location with metadata:');
        console.log(JSON.stringify(locData.metadata, null, 2));
        // Cleanup
        console.log('\nCleaning up...');
        await supabase.from('locations').delete().eq('id', locData.id);
    }
}
verifyDynamicMetadata().catch(console.error);
//# sourceMappingURL=verify_dynamic_metadata.js.map