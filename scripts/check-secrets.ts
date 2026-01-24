#!/usr/bin/env tsx

/**
 * Check Secrets - NPM Command Integration
 * Runs secret scanner on all tracked files
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import * as path from 'path';

const SCANNER_SCRIPT = path.join(__dirname, 'secret-scanner.sh');

async function main() {
  console.log('🔍 Scanning repository for secrets...\n');

  // Verify scanner script exists
  if (!existsSync(SCANNER_SCRIPT)) {
    console.error(`ERROR: Scanner script not found: ${SCANNER_SCRIPT}`);
    process.exit(1);
  }

  try {
    // Get list of tracked files
    const trackedFiles = execSync('git ls-files', {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    })
      .trim()
      .split('\n')
      .filter(Boolean);

    console.log(`📊 Scanning ${trackedFiles.length} tracked files...\n`);

    // Run scanner on all files
    const filesToScan = trackedFiles.join(' ');

    try {
      execSync(`bash "${SCANNER_SCRIPT}" ${filesToScan}`, {
        stdio: 'inherit',
        encoding: 'utf-8'
      });

      console.log('\n✅ Scan complete - No secrets detected');
      process.exit(0);
    } catch (error: any) {
      // Scanner exits with code 1 if secrets found
      if (error.status === 1) {
        console.log('\n❌ Secrets detected - See above for details');
        process.exit(1);
      }
      throw error;
    }
  } catch (error: any) {
    console.error('\n❌ Error running secret scan:');
    console.error(error.message);
    process.exit(1);
  }
}

main();
