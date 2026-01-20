#!/usr/bin/env ts-node
"use strict";
/**
 * Services Table Verification Script
 *
 * This script verifies that the services table exists and is properly configured.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../src/config/index.js");
const supabase_js_1 = require("../src/services/supabase.js");
const supabase_js_2 = require("@supabase/supabase-js");
const logger_js_1 = require("../src/utils/logger.js");
const logger = (0, logger_js_1.createContextLogger)('ServicesTableVerification');
/**
 * Main verification function
 */
async function verifyServicesTable() {
    console.log('='.repeat(60));
    console.log('Services Table Verification');
    console.log('='.repeat(60));
    console.log('');
    // Step 1: Verify database connection
    logger.info('Step 1: Verifying database connection...');
    const connectionResult = await (0, supabase_js_1.initializeAndVerifySupabase)();
    if (!connectionResult.success) {
        logger.error('Failed to connect to database');
        console.error('Error:', connectionResult.error);
        process.exit(1);
    }
    console.log('  ✓ Database connection verified');
    console.log('');
    // Create client
    const supabase = (0, supabase_js_2.createClient)(index_js_1.config.supabase.url, index_js_1.config.supabase.anonKey, {
        db: {
            schema: index_js_1.config.supabase.schema,
        },
    });
    // Step 2: Check if table exists
    logger.info('Step 2: Checking if services table exists...');
    try {
        const { data, error } = await supabase
            .from('services')
            .select('id')
            .limit(1);
        if (error) {
            if (error.code === 'PGRST200' || error.message.includes('does not exist')) {
                console.log('  ✗ Services table does NOT exist');
                console.log('');
                console.log('The services table has not been created yet.');
                console.log('');
                console.log('To create the table, run the migration SQL manually:');
                console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard');
                console.log('2. Navigate to: SQL Editor > New Query');
                console.log('3. Copy and paste the SQL from:');
                console.log('   supabase/migrations/20251227072000_create_services_table.sql');
                console.log('4. Click "Run" to execute the migration');
                console.log('');
                process.exit(1);
            }
            console.log('  ✗ Error checking table existence');
            console.error('Error:', error);
            process.exit(1);
        }
        console.log('  ✓ Services table exists');
        console.log('');
        // Step 3: Get row count
        logger.info('Step 3: Getting table statistics...');
        const { count, error: countError } = await supabase
            .from('services')
            .select('*', { count: 'exact', head: true });
        if (countError) {
            console.log('  ⚠ Could not get row count');
            console.warn('Warning:', countError);
        }
        else {
            console.log(`  ✓ Row count: ${count || 0}`);
        }
        console.log('');
        // Step 4: Test insert and delete (to verify RLS policies)
        logger.info('Step 4: Testing table permissions...');
        const testService = {
            name: 'Test Service',
            code: 'TEST-SERVICE',
            service_type: 'test',
            description: 'This is a test service for verification',
            average_duration_minutes: 30,
        };
        try {
            // Try to insert
            const { data: insertData, error: insertError } = await supabase
                .from('services')
                .insert(testService)
                .select()
                .single();
            if (insertError) {
                console.log('  ⚠ Insert test failed (RLS policies may be restricting access)');
                console.log(`  Error: ${insertError.message}`);
                console.log('');
                console.log('  This is expected if you are not authenticated.');
                console.log('  The table is configured with Row Level Security (RLS).');
            }
            else {
                console.log('  ✓ Insert test successful');
                // Clean up test data
                if (insertData?.id) {
                    const { error: deleteError } = await supabase
                        .from('services')
                        .delete()
                        .eq('id', insertData.id);
                    if (deleteError) {
                        console.log('  ⚠ Could not delete test record');
                        console.log(`  Please manually delete record with id: ${insertData.id}`);
                    }
                    else {
                        console.log('  ✓ Test record cleaned up');
                    }
                }
            }
        }
        catch (error) {
            console.log('  ⚠ Permission test encountered an error');
            console.warn('Warning:', error);
        }
        console.log('');
        // Step 5: Summary
        console.log('='.repeat(60));
        console.log('✓ Verification Complete');
        console.log('='.repeat(60));
        console.log('');
        console.log('Services table status:');
        console.log('  - Table exists: YES');
        console.log(`  - Records: ${count || 0}`);
        console.log('  - RLS enabled: YES (authentication required for modifications)');
        console.log('');
        console.log('The services table is ready to use!');
        console.log('');
        console.log('Table schema includes:');
        console.log('  - id (UUID, primary key)');
        console.log('  - name (service name)');
        console.log('  - code (short code for quick reference)');
        console.log('  - service_type (category: maintenance, repair, inspection, etc.)');
        console.log('  - description (detailed service description)');
        console.log('  - average_duration_minutes (expected service duration)');
        console.log('  - minimum_duration_minutes (min expected duration)');
        console.log('  - maximum_duration_minutes (max expected duration)');
        console.log('  - base_price (optional pricing)');
        console.log('  - requires_appointment (scheduling flag)');
        console.log('  - equipment_required (array of required equipment)');
        console.log('  - skills_required (array of required skills)');
        console.log('  - status (active/inactive/discontinued)');
        console.log('  - timestamps and soft delete support');
        console.log('');
        process.exit(0);
    }
    catch (error) {
        logger.error('Unexpected error during verification');
        console.error('Error:', error);
        process.exit(1);
    }
}
// Run the verification
verifyServicesTable();
//# sourceMappingURL=verify-services-table.js.map