#!/usr/bin/env ts-node
/**
 * Database Connection Health Check Script
 *
 * Validates connectivity to the Supabase database and routeiq schema.
 * This script should be run before executing tests or deploying the application
 * to ensure the database is accessible and properly configured.
 *
 * Exit codes:
 * - 0: Success - database connection is healthy
 * - 1: Failure - database connection failed or configuration is invalid
 *
 * Usage:
 *   npm run db:check
 *   ts-node scripts/check-db-connection.ts
 */

import { config, validateConfig } from '../src/config/index.js';
import {
  initializeAndVerifySupabase,
  getConnectionStatus,
  type ConnectionStatus,
} from '../src/services/supabase.js';
import { createContextLogger } from '../src/utils/logger.js';

const logger = createContextLogger('DBHealthCheck');

/**
 * Formats connection status for display
 */
function formatConnectionStatus(status: ConnectionStatus | null): string {
  if (!status) {
    return 'No connection status available';
  }

  const parts = [
    `Connected: ${status.connected ? '✓ YES' : '✗ NO'}`,
    `Timestamp: ${status.timestamp.toISOString()}`,
  ];

  if (status.latencyMs !== undefined) {
    parts.push(`Latency: ${status.latencyMs}ms`);
  }

  if (status.error) {
    parts.push(`Error: ${status.error}`);
  }

  return parts.join('\n  ');
}

/**
 * Main health check function
 */
async function checkDatabaseConnection(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Database Connection Health Check');
  console.log('='.repeat(60));
  console.log('');

  // Step 1: Validate configuration
  logger.info('Step 1: Validating configuration...');
  const configValid = validateConfig();

  if (!configValid) {
    logger.error('Configuration validation failed');
    logger.error('Please ensure all required environment variables are set:');
    logger.error('  - SUPABASE_URL');
    logger.error('  - SUPABASE_KEY');
    logger.error('  - GOOGLE_MAPS_API_KEY');
    process.exit(1);
  }

  console.log('  ✓ Configuration is valid');
  console.log('');

  // Step 2: Display connection details (masked)
  logger.info('Step 2: Connection details:');
  console.log(`  Supabase URL: ${config.supabase.url}`);
  console.log(`  Schema: ${config.supabase.schema}`);
  console.log(`  Environment: ${config.env}`);
  console.log('');

  // Step 3: Initialize and verify connection
  logger.info('Step 3: Initializing Supabase client and verifying connection...');

  try {
    const result = await initializeAndVerifySupabase();

    if (!result.success) {
      logger.error('Database connection failed');
      console.log('');
      console.log('Error Details:');
      console.log(`  Message: ${result.error?.message}`);

      if ('code' in (result.error || {})) {
        console.log(`  Code: ${(result.error as any).code}`);
      }

      if ('details' in (result.error || {})) {
        console.log(`  Details: ${JSON.stringify((result.error as any).details, null, 2)}`);
      }

      const status = getConnectionStatus();
      if (status) {
        console.log('');
        console.log('Connection Status:');
        console.log(`  ${formatConnectionStatus(status)}`);
      }

      process.exit(1);
    }

    // Success!
    const status = result.data;
    console.log('  ✓ Database connection established successfully');
    console.log('');
    console.log('Connection Status:');
    console.log(`  ${formatConnectionStatus(status!)}`);
    console.log('');
    console.log('='.repeat(60));
    console.log('✓ Health Check PASSED');
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    logger.error('Unexpected error during health check');
    console.error('');
    console.error('Error:', error);

    const status = getConnectionStatus();
    if (status) {
      console.log('');
      console.log('Last Known Connection Status:');
      console.log(`  ${formatConnectionStatus(status)}`);
    }

    process.exit(1);
  }
}

// Run the health check
checkDatabaseConnection();
