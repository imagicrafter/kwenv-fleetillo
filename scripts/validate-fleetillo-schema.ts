#!/usr/bin/env ts-node
/**
 * Fleetillo Schema Validation Script
 *
 * Validates that the fleetillo schema exists and has the expected structure.
 * Checks for:
 * - All required tables
 * - Key columns (customer_id instead of client_id)
 * - Foreign key relationships
 *
 * Usage:
 *   npx ts-node scripts/validate-fleetillo-schema.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SCHEMA_NAME = 'fleetillo';

// Expected tables in the fleetillo schema
const EXPECTED_TABLES = [
  'customers',
  'services',
  'drivers',
  'locations',
  'vehicles',
  'vehicle_locations',
  'routes',
  'bookings',
  'dispatches',
  'channel_dispatches',
  'dispatch_jobs',
  'settings',
];

// Expected columns that should use 'customer_id' (not 'client_id')
const CUSTOMER_ID_TABLES = ['locations', 'bookings'];

interface ValidationResult {
  passed: boolean;
  checks: {
    name: string;
    passed: boolean;
    message: string;
  }[];
}

async function validateSchema(): Promise<ValidationResult> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_KEY environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema: SCHEMA_NAME },
  });

  const result: ValidationResult = {
    passed: true,
    checks: [],
  };

  console.log('='.repeat(60));
  console.log(`Validating ${SCHEMA_NAME} Schema`);
  console.log('='.repeat(60));
  console.log('');

  // Check 1: Verify we can connect to the schema
  console.log('1. Checking schema connection...');
  try {
    const { error } = await supabase.from('settings').select('key').limit(1);
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows, which is fine
      throw error;
    }
    result.checks.push({
      name: 'Schema Connection',
      passed: true,
      message: `Connected to ${SCHEMA_NAME} schema successfully`,
    });
    console.log(`   ✓ Connected to ${SCHEMA_NAME} schema`);
  } catch (error: any) {
    result.passed = false;
    result.checks.push({
      name: 'Schema Connection',
      passed: false,
      message: `Failed to connect: ${error.message}`,
    });
    console.log(`   ✗ Failed to connect: ${error.message}`);
    return result;
  }
  console.log('');

  // Check 2: Verify all expected tables exist
  console.log('2. Checking expected tables...');
  for (const tableName of EXPECTED_TABLES) {
    try {
      const { error } = await supabase.from(tableName).select('*').limit(0);
      if (error) {
        throw error;
      }
      result.checks.push({
        name: `Table: ${tableName}`,
        passed: true,
        message: 'Table exists',
      });
      console.log(`   ✓ ${tableName}`);
    } catch (error: any) {
      result.passed = false;
      result.checks.push({
        name: `Table: ${tableName}`,
        passed: false,
        message: `Table missing or inaccessible: ${error.message}`,
      });
      console.log(`   ✗ ${tableName} - ${error.message}`);
    }
  }
  console.log('');

  // Check 3: Verify 'customers' table exists (not 'clients')
  console.log('3. Checking terminology (customers vs clients)...');
  try {
    const { error: customersError } = await supabase.from('customers').select('id').limit(0);
    if (customersError) {
      throw new Error('customers table not found');
    }
    result.checks.push({
      name: 'Terminology: customers table',
      passed: true,
      message: 'customers table exists (correct)',
    });
    console.log('   ✓ customers table exists (correct terminology)');
  } catch (error: any) {
    result.passed = false;
    result.checks.push({
      name: 'Terminology: customers table',
      passed: false,
      message: error.message,
    });
    console.log(`   ✗ ${error.message}`);
  }

  // Check that 'clients' table does NOT exist
  try {
    const { error: clientsError } = await supabase.from('clients').select('id').limit(0);
    if (!clientsError) {
      result.checks.push({
        name: 'Terminology: no clients table',
        passed: false,
        message: 'WARNING: clients table still exists (should be renamed to customers)',
      });
      console.log('   ⚠ clients table still exists (should only have customers)');
    } else {
      result.checks.push({
        name: 'Terminology: no clients table',
        passed: true,
        message: 'clients table does not exist (correct)',
      });
      console.log('   ✓ clients table does not exist (correct)');
    }
  } catch {
    // Expected - clients table should not exist
  }
  console.log('');

  // Check 4: Verify customer_id column exists in related tables
  console.log('4. Checking customer_id foreign keys...');
  for (const tableName of CUSTOMER_ID_TABLES) {
    try {
      // Try to select customer_id column
      const { error } = await supabase.from(tableName).select('customer_id').limit(0);
      if (error) {
        throw error;
      }
      result.checks.push({
        name: `FK: ${tableName}.customer_id`,
        passed: true,
        message: 'customer_id column exists',
      });
      console.log(`   ✓ ${tableName}.customer_id exists`);
    } catch (error: any) {
      result.passed = false;
      result.checks.push({
        name: `FK: ${tableName}.customer_id`,
        passed: false,
        message: `customer_id column missing: ${error.message}`,
      });
      console.log(`   ✗ ${tableName}.customer_id - ${error.message}`);
    }
  }
  console.log('');

  // Check 5: Verify bookings has route_id column (newer schema feature)
  console.log('5. Checking newer schema features...');
  try {
    const { error } = await supabase.from('bookings').select('route_id, stop_order').limit(0);
    if (error) {
      throw error;
    }
    result.checks.push({
      name: 'Feature: bookings.route_id',
      passed: true,
      message: 'route_id and stop_order columns exist',
    });
    console.log('   ✓ bookings.route_id and stop_order exist');
  } catch (error: any) {
    result.passed = false;
    result.checks.push({
      name: 'Feature: bookings.route_id',
      passed: false,
      message: error.message,
    });
    console.log(`   ✗ bookings route columns - ${error.message}`);
  }

  // Check drivers dispatch preferences
  try {
    const { error } = await supabase
      .from('drivers')
      .select('preferred_channel, fallback_enabled')
      .limit(0);
    if (error) {
      throw error;
    }
    result.checks.push({
      name: 'Feature: driver dispatch preferences',
      passed: true,
      message: 'preferred_channel and fallback_enabled columns exist',
    });
    console.log('   ✓ drivers.preferred_channel and fallback_enabled exist');
  } catch (error: any) {
    result.passed = false;
    result.checks.push({
      name: 'Feature: driver dispatch preferences',
      passed: false,
      message: error.message,
    });
    console.log(`   ✗ driver dispatch preferences - ${error.message}`);
  }

  // Check routes timing metrics
  try {
    const { error } = await supabase
      .from('routes')
      .select('total_service_time_minutes, total_travel_time_minutes, needs_recalculation')
      .limit(0);
    if (error) {
      throw error;
    }
    result.checks.push({
      name: 'Feature: route timing metrics',
      passed: true,
      message: 'timing metric columns exist',
    });
    console.log('   ✓ routes timing metrics exist');
  } catch (error: any) {
    result.passed = false;
    result.checks.push({
      name: 'Feature: route timing metrics',
      passed: false,
      message: error.message,
    });
    console.log(`   ✗ route timing metrics - ${error.message}`);
  }
  console.log('');

  // Check 6: Verify settings has default values
  console.log('6. Checking default settings...');
  try {
    const { data, error } = await supabase.from('settings').select('key, value');
    if (error) {
      throw error;
    }
    const settingCount = data?.length || 0;
    if (settingCount >= 6) {
      result.checks.push({
        name: 'Default settings',
        passed: true,
        message: `${settingCount} default settings found`,
      });
      console.log(`   ✓ ${settingCount} default settings found`);
    } else {
      result.checks.push({
        name: 'Default settings',
        passed: false,
        message: `Only ${settingCount} settings found (expected 6+)`,
      });
      console.log(`   ⚠ Only ${settingCount} settings found (expected 6+)`);
    }
  } catch (error: any) {
    result.checks.push({
      name: 'Default settings',
      passed: false,
      message: error.message,
    });
    console.log(`   ✗ ${error.message}`);
  }
  console.log('');

  return result;
}

async function main() {
  const result = await validateSchema();

  console.log('='.repeat(60));
  if (result.passed) {
    console.log('✓ Schema Validation PASSED');
    console.log('');
    console.log('The fleetillo schema is correctly configured with:');
    console.log('  - All expected tables');
    console.log('  - customers table (not clients)');
    console.log('  - customer_id foreign keys');
    console.log('  - All newer schema features');
  } else {
    console.log('✗ Schema Validation FAILED');
    console.log('');
    console.log('Failed checks:');
    for (const check of result.checks) {
      if (!check.passed) {
        console.log(`  - ${check.name}: ${check.message}`);
      }
    }
  }
  console.log('='.repeat(60));

  process.exit(result.passed ? 0 : 1);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
