"use strict";
/**
 * Playwright Global Teardown
 *
 * Runs once after all tests to clean up the test environment
 */
Object.defineProperty(exports, "__esModule", { value: true });
const database_js_1 = require("./database.js");
const logger_js_1 = require("../../src/utils/logger.js");
const logger = (0, logger_js_1.createContextLogger)('PlaywrightGlobalTeardown');
async function globalTeardown(config) {
    logger.info('Starting Playwright global teardown...');
    try {
        // Clean up database connections
        logger.info('Cleaning up database connections...');
        await (0, database_js_1.teardownDatabase)();
        // You can add more global teardown tasks here, such as:
        // - Stopping background services
        // - Cleaning up test databases
        // - Removing temporary files
        // - Generating test reports
        logger.info('Playwright global teardown completed successfully');
    }
    catch (error) {
        logger.error('Playwright global teardown failed:', error);
        // Don't throw - we want teardown to complete even if there are errors
    }
}
exports.default = globalTeardown;
//# sourceMappingURL=playwright-global-teardown.js.map