/**
 * Validates that all required database objects exist for the import pipeline.
 *
 * Usage:
 *   npx tsx scripts/validate-import-schema.ts
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const SCHEMA = process.env.SUPABASE_SCHEMA || 'fleetillo';

interface TableCheck {
  name: string;
  required: boolean;
  description: string;
}

const REQUIRED_TABLES: TableCheck[] = [
  // Core tables
  { name: 'customers', required: true, description: 'Customer/brand records' },
  { name: 'locations', required: true, description: 'Location/site records' },
  { name: 'bookings', required: true, description: 'Booking/service records' },
  { name: 'drivers', required: true, description: 'Driver records' },
  // Import tables
  { name: 'import_batches', required: true, description: 'Import batch tracking' },
  { name: 'import_staging', required: true, description: 'Staging records for import' },
];

async function main() {
  console.log('========================================');
  console.log('Import Schema Validation');
  console.log('========================================');
  console.log('');
  console.log(`Schema: ${SCHEMA}`);
  console.log(`URL: ${SUPABASE_URL?.replace(/\/\/(.+?)@/, '//*****@')}`);
  console.log('');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: Missing SUPABASE_URL or SUPABASE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    db: { schema: SCHEMA },
  });

  console.log('Checking tables...');
  console.log('');

  let allPassed = true;
  const results: { name: string; exists: boolean; error?: string }[] = [];

  for (const table of REQUIRED_TABLES) {
    try {
      const { error } = await supabase.from(table.name).select('*').limit(0);

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist
          results.push({ name: table.name, exists: false, error: 'Table not found' });
          if (table.required) {
            allPassed = false;
          }
        } else if (error.code === 'PGRST204') {
          // No rows (this is OK)
          results.push({ name: table.name, exists: true });
        } else {
          results.push({ name: table.name, exists: false, error: error.message });
          if (table.required) {
            allPassed = false;
          }
        }
      } else {
        results.push({ name: table.name, exists: true });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      results.push({ name: table.name, exists: false, error: errorMsg });
      if (table.required) {
        allPassed = false;
      }
    }
  }

  // Print results
  for (const result of results) {
    const status = result.exists ? '\u2705' : '\u274C';
    const tableInfo = REQUIRED_TABLES.find((t) => t.name === result.name);
    console.log(`${status} ${result.name.padEnd(20)} - ${tableInfo?.description || ''}`);
    if (!result.exists && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }

  console.log('');

  // Check row counts for existing tables
  console.log('Row counts:');
  for (const result of results) {
    if (result.exists) {
      const { count, error } = await supabase
        .from(result.name)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`  ${result.name}: ${count ?? 0} rows`);
      }
    }
  }

  console.log('');
  console.log('========================================');

  if (allPassed) {
    console.log('\u2705 All required tables exist!');
    console.log('');
    console.log('Schema is ready for import operations.');
  } else {
    console.log('\u274C Some required tables are missing.');
    console.log('');
    console.log('Please apply the migration:');
    console.log('  supabase/migrations/20260127000000_create_import_tables.sql');
    console.log('');
    console.log('Or for tenant schema:');
    console.log('  supabase/migrations/tenant_kwenv_fleetillo.sql');
    process.exit(1);
  }

  console.log('========================================');
}

main().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
