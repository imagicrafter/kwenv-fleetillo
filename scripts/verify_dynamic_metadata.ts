import { getAdminSupabaseClient, initializeSupabase } from '../src/services/supabase.js';
import { config } from '../src/config/index.js';

async function verifyDynamicMetadata() {
    console.log('=== Verifying Dynamic Metadata Support ===\n');

    initializeSupabase({
        url: config.supabase.url,
        anonKey: config.supabase.anonKey,
        serviceRoleKey: config.supabase.serviceRoleKey,
        schema: config.supabase.schema,
    });

    const supabase = getAdminSupabaseClient();
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
    } else {
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
    } else {
        console.log('Successfully created location with metadata:');
        console.log(JSON.stringify(locData.metadata, null, 2));

        // Cleanup
        console.log('\nCleaning up...');
        await supabase.from('locations').delete().eq('id', locData.id);
    }
}

verifyDynamicMetadata().catch(console.error);
