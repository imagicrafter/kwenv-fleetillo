/**
 * Commit a specific import batch to production tables
 *
 * Usage: npx tsx scripts/commit-batch.ts <batch-id>
 */
import 'dotenv/config';
import { commitBatch } from '../src/services/import/commit.service.js';
import { getBatchStatus } from '../src/services/import/import.service.js';

async function main() {
  const batchId = process.argv[2];

  if (!batchId) {
    console.error('Usage: npx tsx scripts/commit-batch.ts <batch-id>');
    process.exit(1);
  }

  console.log('========================================');
  console.log('Commit Import Batch');
  console.log('========================================');
  console.log('');
  console.log(`Batch ID: ${batchId}`);
  console.log(`Schema: ${process.env.SUPABASE_SCHEMA || 'fleetillo'}`);
  console.log('');

  // Get batch status first
  console.log('Checking batch status...');
  const batch = await getBatchStatus(batchId);
  console.log(`  Status: ${batch.status}`);
  console.log(`  Summary: ${JSON.stringify(batch.summary)}`);
  console.log('');

  if (batch.status !== 'staged') {
    console.error(`ERROR: Batch status is '${batch.status}', expected 'staged'`);
    process.exit(1);
  }

  // Commit
  console.log('Committing to production...');
  const result = await commitBatch(batchId);
  console.log('');
  console.log('Commit Result:');
  console.log(`  Success: ${result.success}`);
  console.log(`  Customers created: ${result.customersCreated}`);
  console.log(`  Locations created: ${result.locationsCreated}`);
  console.log(`  Bookings created: ${result.bookingsCreated}`);
  console.log(`  Errors: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log('');
    console.log('Error details (first 10):');
    for (const err of result.errors.slice(0, 10)) {
      console.log(`  - [${err.entityType}] ${err.error}`);
    }
    if (result.errors.length > 10) {
      console.log(`  ... and ${result.errors.length - 10} more errors`);
    }
  }

  // Display log file paths
  if (result.logPaths) {
    console.log('');
    console.log('Log Files:');
    console.log(`  Full log:  ${result.logPaths.fullLogPath}`);
    console.log(`  Error log: ${result.logPaths.errorLogPath}`);
  }

  console.log('');
  console.log('========================================');
  console.log('Commit complete!');
  console.log('========================================');
}

main().catch((err) => {
  console.error('Commit failed:', err);
  process.exit(1);
});
