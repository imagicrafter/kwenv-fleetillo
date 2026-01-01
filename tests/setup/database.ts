/**
 * Database Setup Utilities for Tests
 *
 * Provides centralized database initialization and teardown functions
 * for all test suites. Ensures database connectivity is verified before
 * tests run and properly cleaned up afterwards.
 */

import {
  initializeAndVerifySupabase,
  resetSupabaseClient,
  getConnectionStatus,
  type ConnectionStatus,
} from '../../src/services/supabase.js';
import { createContextLogger } from '../../src/utils/logger.js';

const logger = createContextLogger('TestSetup');

/**
 * Global timeout for database operations in tests (30 seconds)
 */
export const DB_TEST_TIMEOUT = 30000;

/**
 * Sets up database connection for test suite
 * Initializes and verifies the Supabase client
 *
 * @throws Error if database connection fails
 * @returns ConnectionStatus object with connection details
 */
export async function setupDatabaseForTests(): Promise<ConnectionStatus> {
  logger.info('Setting up database connection for tests...');

  const result = await initializeAndVerifySupabase();

  if (!result.success) {
    const errorMessage = `Database connection failed: ${result.error?.message}`;
    logger.error(errorMessage, result.error);

    const status = getConnectionStatus();
    if (status?.error) {
      logger.error('Connection error details:', status.error);
    }

    throw new Error(errorMessage);
  }

  logger.info('Database connection established successfully', {
    latencyMs: result.data?.latencyMs,
    schema: 'routeiq',
  });

  return result.data!;
}

/**
 * Tears down database connection after tests
 * Resets the Supabase client to clean state
 */
export async function teardownDatabase(): Promise<void> {
  logger.info('Tearing down database connection...');
  resetSupabaseClient();
  logger.info('Database connection reset');
}

/**
 * Verifies database connection is still active
 * Useful for checking connection health during long-running test suites
 *
 * @returns true if connection is healthy, false otherwise
 */
export function isDatabaseConnected(): boolean {
  const status = getConnectionStatus();
  return status?.connected ?? false;
}
