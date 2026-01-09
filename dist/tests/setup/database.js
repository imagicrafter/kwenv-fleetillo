"use strict";
/**
 * Database Setup Utilities for Tests
 *
 * Provides centralized database initialization and teardown functions
 * for all test suites. Ensures database connectivity is verified before
 * tests run and properly cleaned up afterwards.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DB_TEST_TIMEOUT = void 0;
exports.setupDatabaseForTests = setupDatabaseForTests;
exports.teardownDatabase = teardownDatabase;
exports.isDatabaseConnected = isDatabaseConnected;
const supabase_js_1 = require("../../src/services/supabase.js");
const logger_js_1 = require("../../src/utils/logger.js");
const logger = (0, logger_js_1.createContextLogger)('TestSetup');
/**
 * Global timeout for database operations in tests (30 seconds)
 */
exports.DB_TEST_TIMEOUT = 30000;
/**
 * Sets up database connection for test suite
 * Initializes and verifies the Supabase client
 *
 * @throws Error if database connection fails
 * @returns ConnectionStatus object with connection details
 */
async function setupDatabaseForTests() {
    logger.info('Setting up database connection for tests...');
    const result = await (0, supabase_js_1.initializeAndVerifySupabase)();
    if (!result.success) {
        const errorMessage = `Database connection failed: ${result.error?.message}`;
        logger.error(errorMessage, result.error);
        const status = (0, supabase_js_1.getConnectionStatus)();
        if (status?.error) {
            logger.error('Connection error details:', status.error);
        }
        throw new Error(errorMessage);
    }
    logger.info('Database connection established successfully', {
        latencyMs: result.data?.latencyMs,
        schema: 'routeiq',
    });
    return result.data;
}
/**
 * Tears down database connection after tests
 * Resets the Supabase client to clean state
 */
async function teardownDatabase() {
    logger.info('Tearing down database connection...');
    (0, supabase_js_1.resetSupabaseClient)();
    logger.info('Database connection reset');
}
/**
 * Verifies database connection is still active
 * Useful for checking connection health during long-running test suites
 *
 * @returns true if connection is healthy, false otherwise
 */
function isDatabaseConnected() {
    const status = (0, supabase_js_1.getConnectionStatus)();
    return status?.connected ?? false;
}
//# sourceMappingURL=database.js.map