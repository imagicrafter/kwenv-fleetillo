/**
 * Script to apply database migration directly to Supabase
 * This script reads the migration file and executes it using the Supabase admin client
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from '../src/config';

async function applyMigration() {
  console.log('Starting migration application...');

  // Get service role key from environment
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
    console.error('Please set this in your .env file to run migrations');
    process.exit(1);
  }

  // Create admin client with service role key (bypasses RLS)
  const supabase = createClient(config.supabase.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log(`Connected to Supabase: ${config.supabase.url}`);

  // Read migration file
  const migrationPath = join(__dirname, '../supabase/migrations/20251228110000_add_referential_integrity_constraints.sql');
  let migrationSQL: string;

  try {
    migrationSQL = readFileSync(migrationPath, 'utf-8');
    console.log(`✓ Loaded migration file: ${migrationPath}`);
    console.log(`  Size: ${(migrationSQL.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error(`❌ Failed to read migration file: ${error}`);
    process.exit(1);
  }

  // Execute migration
  try {
    console.log('\nExecuting migration SQL...');

    // Use the Supabase RPC to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If the RPC function doesn't exist, we need to use a different approach
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('\n⚠️  Direct SQL execution via RPC not available');
        console.log('Please apply this migration manually via Supabase SQL Editor:');
        console.log(`  1. Go to: https://supabase.com/dashboard/project/vtaufnxworztolfdwlll/sql/new`);
        console.log(`  2. Copy the SQL from: ${migrationPath}`);
        console.log(`  3. Execute the SQL in the SQL Editor`);
        console.log('\nAlternatively, use the Supabase CLI: supabase db push');
        process.exit(1);
      } else {
        throw error;
      }
    }

    console.log('✓ Migration executed successfully!');
    console.log('\n📊 Migration Summary:');
    console.log('  ✓ Added comments to document existing foreign key constraints');
    console.log('  ✓ Created validation function for routes.stop_sequence');
    console.log('  ✓ Added check constraints for routes table (times, distances, costs)');
    console.log('  ✓ Created indexes for better foreign key lookup performance');
    console.log('  ✓ Added helper functions: can_delete_booking(), get_routes_for_booking()');
    console.log('  ✓ Added validation trigger for booking status in routes');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
applyMigration()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
