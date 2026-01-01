/**
 * Playwright Global Teardown
 *
 * Runs once after all tests to clean up the test environment
 */

import { FullConfig } from '@playwright/test';
import { teardownDatabase } from './database.js';
import { createContextLogger } from '../../src/utils/logger.js';

const logger = createContextLogger('PlaywrightGlobalTeardown');

async function globalTeardown(config: FullConfig) {
  logger.info('Starting Playwright global teardown...');

  try {
    // Clean up database connections
    logger.info('Cleaning up database connections...');
    await teardownDatabase();

    // You can add more global teardown tasks here, such as:
    // - Stopping background services
    // - Cleaning up test databases
    // - Removing temporary files
    // - Generating test reports

    logger.info('Playwright global teardown completed successfully');
  } catch (error) {
    logger.error('Playwright global teardown failed:', error);
    // Don't throw - we want teardown to complete even if there are errors
  }
}

export default globalTeardown;
