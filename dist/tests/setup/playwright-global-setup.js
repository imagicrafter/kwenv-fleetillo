"use strict";
/**
 * Playwright Global Setup
 *
 * Runs once before all tests to prepare the test environment
 */
Object.defineProperty(exports, "__esModule", { value: true });
const database_js_1 = require("./database.js");
const logger_js_1 = require("../../src/utils/logger.js");
const logger = (0, logger_js_1.createContextLogger)('PlaywrightGlobalSetup');
async function globalSetup(config) {
    logger.info('Starting Playwright global setup...');
    try {
        // Verify database connectivity
        logger.info('Verifying database connection...');
        await (0, database_js_1.setupDatabaseForTests)();
        logger.info('Database connection verified successfully');
        // Install browsers if needed (handled by Playwright automatically)
        logger.info('Ensuring browsers are installed...');
        // You can add more global setup tasks here, such as:
        // - Starting background services
        // - Creating test databases
        // - Seeding initial data
        // - Setting up authentication tokens
        logger.info('Playwright global setup completed successfully');
    }
    catch (error) {
        logger.error('Playwright global setup failed:', error);
        throw error;
    }
}
exports.default = globalSetup;
//# sourceMappingURL=playwright-global-setup.js.map