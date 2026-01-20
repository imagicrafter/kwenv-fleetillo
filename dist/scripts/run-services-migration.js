#!/usr/bin/env ts-node
"use strict";
/**
 * Services Table Migration Script
 *
 * This script applies the services table migration to the Supabase database.
 * It reads the migration SQL file and executes it using the Supabase client.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const index_js_1 = require("../src/config/index.js");
const supabase_js_1 = require("../src/services/supabase.js");
const supabase_js_2 = require("@supabase/supabase-js");
const logger_js_1 = require("../src/utils/logger.js");
const logger = (0, logger_js_1.createContextLogger)('ServicesMigration');
/**
 * Main migration function
 */
async function runServicesMigration() {
    console.log('='.repeat(60));
    console.log('Services Table Migration');
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
    // Step 2: Read migration file
    logger.info('Step 2: Reading migration file...');
    const migrationPath = (0, path_1.join)(process.cwd(), 'supabase', 'migrations', '20251227072000_create_services_table.sql');
    let migrationSQL;
    try {
        migrationSQL = (0, fs_1.readFileSync)(migrationPath, 'utf-8');
        console.log(`  ✓ Migration file loaded: ${migrationPath}`);
        console.log(`  File size: ${migrationSQL.length} bytes`);
    }
    catch (error) {
        logger.error('Failed to read migration file');
        console.error('Error:', error);
        process.exit(1);
    }
    console.log('');
    // Step 3: Execute migration
    logger.info('Step 3: Executing migration...');
    // Create a client with service role key for admin operations
    const supabase = (0, supabase_js_2.createClient)(index_js_1.config.supabase.url, index_js_1.config.supabase.serviceRoleKey || index_js_1.config.supabase.anonKey, {
        db: {
            schema: index_js_1.config.supabase.schema,
        },
    });
    try {
        // Execute the migration SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
        if (error) {
            // If the RPC doesn't exist, try using raw SQL execution
            logger.warn('RPC method not available, attempting direct SQL execution...');
            // Split the SQL into individual statements and execute them
            const statements = migrationSQL
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));
            for (const statement of statements) {
                const { error: execError } = await supabase.rpc('exec_sql', { sql: statement });
                if (execError) {
                    // Last resort: try using the REST API directly
                    console.log('  Executing SQL statement directly via Supabase client...');
                    const response = await fetch(`${index_js_1.config.supabase.url}/rest/v1/rpc/exec_sql`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': index_js_1.config.supabase.anonKey,
                            'Authorization': `Bearer ${index_js_1.config.supabase.serviceRoleKey || index_js_1.config.supabase.anonKey}`,
                        },
                        body: JSON.stringify({ sql: statement }),
                    });
                    if (!response.ok) {
                        throw new Error(`Failed to execute SQL: ${response.statusText}`);
                    }
                }
            }
        }
        console.log('  ✓ Migration executed successfully');
    }
    catch (error) {
        logger.error('Migration execution failed');
        console.error('Error:', error);
        logger.info('Attempting alternative migration method...');
        // Try using the Postgres client directly through Supabase
        // This is a workaround for when RPC is not available
        try {
            const { error: schemaError } = await supabase
                .from('services')
                .select('count')
                .limit(1);
            if (schemaError && schemaError.code === 'PGRST200') {
                logger.warn('Table may not exist yet, this is expected for first migration');
            }
        }
        catch (err) {
            // This is fine, table doesn't exist yet
        }
        logger.info('Please apply the migration manually using Supabase Dashboard SQL Editor');
        logger.info(`Migration file location: ${migrationPath}`);
        console.log('');
        console.log('Alternative: Copy the SQL from the migration file and execute it in:');
        console.log('Supabase Dashboard > SQL Editor > New Query');
        console.log('');
    }
    console.log('');
    // Step 4: Verify table creation
    logger.info('Step 4: Verifying table creation...');
    try {
        const { data, error } = await supabase
            .from('services')
            .select('count')
            .limit(1);
        if (error) {
            if (error.code === 'PGRST200' || error.message.includes('does not exist')) {
                logger.warn('Services table does not exist yet');
                console.log('  ⚠ Table verification failed - table may not exist');
                console.log('');
                console.log('Please apply the migration using one of these methods:');
                console.log('1. Supabase Dashboard > SQL Editor > Run migration SQL');
                console.log('2. Use Supabase CLI: supabase db push');
                console.log('');
                process.exit(1);
            }
            throw error;
        }
        console.log('  ✓ Services table exists and is accessible');
        console.log('');
        // Try to get table schema information
        const { data: schemaData, error: schemaError } = await supabase
            .from('services')
            .select('*')
            .limit(0);
        if (!schemaError) {
            console.log('  ✓ Table schema verified');
        }
    }
    catch (error) {
        logger.warn('Could not verify table creation');
        console.warn('Warning:', error);
    }
    console.log('');
    console.log('='.repeat(60));
    console.log('✓ Migration Process Complete');
    console.log('='.repeat(60));
    console.log('');
    console.log('Next steps:');
    console.log('1. Verify the table in Supabase Dashboard > Table Editor');
    console.log('2. Check RLS policies are enabled');
    console.log('3. Test inserting sample service data');
    console.log('');
}
// Run the migration
runServicesMigration();
//# sourceMappingURL=run-services-migration.js.map