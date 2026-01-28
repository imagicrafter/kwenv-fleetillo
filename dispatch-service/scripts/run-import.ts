/**
 * End-to-end import script for legacy CSV data
 *
 * Issue #18: CSV Parser & Data Normalization for Legacy Import
 *
 * Usage (from dispatch-service directory):
 *   npx tsx scripts/run-import.ts [options] [csv-file-path]
 *
 * Options:
 *   --commit        Commit staged data to production tables
 *   --limit=N       Only process first N rows (for testing)
 *
 * Examples:
 *   npx tsx scripts/run-import.ts                          # Parse all, stage only
 *   npx tsx scripts/run-import.ts --limit=10               # Parse 10 rows only
 *   npx tsx scripts/run-import.ts --limit=10 --commit      # Parse 10 rows and commit
 *   npx tsx scripts/run-import.ts --commit                 # Parse all and commit
 */

import { resolve } from 'path';
import { existsSync } from 'fs';
import 'dotenv/config';

import { createBatch, parseAndStage, getBatchStatus, commitBatch } from '../src/services/import/index.js';
import { previewCsv, loadCsv } from '../src/services/import/csv-parser.service.js';
import { normalize, getUniqueCustomers, getUniqueLocations, getBookings } from '../src/services/import/data-normalizer.js';

const DEFAULT_CSV_PATH = 'docs/client_artifacts/ExpanedTechDaySheetReport_01_01_2026_03_31_2026.xlsx - Worksheet.csv';

interface ImportArgs {
  csvPath: string;
  commit: boolean;
  limit?: number;
}

function parseArgs(args: string[]): ImportArgs {
  let csvPath = DEFAULT_CSV_PATH;
  let commit = false;
  let limit: number | undefined;

  for (const arg of args) {
    if (arg === '--commit') {
      commit = true;
    } else if (arg.startsWith('--limit=')) {
      const limitStr = arg.split('=')[1];
      limit = limitStr ? parseInt(limitStr, 10) : undefined;
    } else if (!arg.startsWith('--')) {
      csvPath = arg;
    }
  }

  return { csvPath, commit, limit };
}

async function main() {
  const args = process.argv.slice(2);
  const { csvPath, commit, limit } = parseArgs(args);
  const fullPath = resolve(process.cwd(), '..', csvPath);

  console.log('========================================');
  console.log('Legacy CSV Import Pipeline');
  console.log('========================================');
  console.log('');
  console.log(`CSV File: ${csvPath}`);
  console.log(`Full Path: ${fullPath}`);
  console.log(`Schema: ${process.env.SUPABASE_SCHEMA || 'fleetillo'}`);
  if (limit) {
    console.log(`Row limit: ${limit}`);
  }
  console.log('');

  // Verify file exists
  if (!existsSync(fullPath)) {
    console.error(`ERROR: File not found: ${fullPath}`);
    process.exit(1);
  }

  // Preview
  console.log('Previewing CSV...');
  const preview = await previewCsv(fullPath, 3);
  console.log(`  Headers: ${preview.headers.join(', ')}`);
  console.log(`  Preview rows: ${preview.rows.length}`);
  console.log('');

  // Create batch
  const batchName = limit ? `${csvPath} (limit: ${limit})` : csvPath;
  console.log('Creating import batch...');
  const batch = await createBatch(batchName);
  console.log(`  Batch ID: ${batch.id}`);
  console.log(`  Status: ${batch.status}`);
  console.log('');

  // Parse and stage
  console.log('Parsing and staging data...');
  const summary = await parseAndStage(batch.id, fullPath, { maxRows: limit });
  console.log('');
  console.log('Import Summary:');
  console.log(`  Total rows: ${summary.totalRows}`);
  console.log(`  Customers extracted: ${summary.customersExtracted}`);
  console.log(`  Locations extracted: ${summary.locationsExtracted}`);
  console.log(`  Bookings generated: ${summary.bookingsGenerated}`);
  console.log(`  Errors: ${summary.errorsCount}`);
  console.log(`  Needs review: ${summary.needsReviewCount}`);
  console.log('');

  // Get batch status
  const batchStatus = await getBatchStatus(batch.id);
  console.log(`Batch Status: ${batchStatus.status}`);
  console.log('');

  // Commit if requested
  if (commit) {
    console.log('Committing to production...');
    const commitResult = await commitBatch(batch.id);
    console.log('');
    console.log('Commit Result:');
    console.log(`  Success: ${commitResult.success}`);
    console.log(`  Customers created: ${commitResult.customersCreated}`);
    console.log(`  Locations created: ${commitResult.locationsCreated}`);
    console.log(`  Bookings created: ${commitResult.bookingsCreated}`);
    console.log(`  Errors: ${commitResult.errors.length}`);
    if (commitResult.errors.length > 0) {
      console.log('  Error details:');
      for (const err of commitResult.errors.slice(0, 5)) {
        console.log(`    - [${err.entityType}] ${err.error}`);
      }
    }
  } else {
    console.log('Data has been staged for review.');
    console.log('');
    console.log('To commit to production, run:');
    console.log(`  npx tsx scripts/run-import.ts --commit`);
    console.log('');
    console.log('Or review staged data in the import_staging table.');
  }

  console.log('');
  console.log('========================================');
  console.log('Import complete!');
  console.log('========================================');
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
