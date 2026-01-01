/**
 * Jest Global Teardown
 *
 * Runs once after all test suites complete.
 * Cleans up database connections and resources.
 */

import { resetSupabaseClient } from '../../src/services/supabase.js';

export default async function globalTeardown(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Jest Global Teardown - Cleaning Up');
  console.log('='.repeat(60));
  console.log('');

  console.log('Resetting database connections...');
  resetSupabaseClient();

  console.log('✓ Cleanup complete');
  console.log('');
}
