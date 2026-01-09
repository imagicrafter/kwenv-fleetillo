/**
 * Database Setup Utilities for Tests
 *
 * Provides centralized database initialization and teardown functions
 * for all test suites. Ensures database connectivity is verified before
 * tests run and properly cleaned up afterwards.
 */
import { type ConnectionStatus } from '../../src/services/supabase.js';
/**
 * Global timeout for database operations in tests (30 seconds)
 */
export declare const DB_TEST_TIMEOUT = 30000;
/**
 * Sets up database connection for test suite
 * Initializes and verifies the Supabase client
 *
 * @throws Error if database connection fails
 * @returns ConnectionStatus object with connection details
 */
export declare function setupDatabaseForTests(): Promise<ConnectionStatus>;
/**
 * Tears down database connection after tests
 * Resets the Supabase client to clean state
 */
export declare function teardownDatabase(): Promise<void>;
/**
 * Verifies database connection is still active
 * Useful for checking connection health during long-running test suites
 *
 * @returns true if connection is healthy, false otherwise
 */
export declare function isDatabaseConnected(): boolean;
//# sourceMappingURL=database.d.ts.map