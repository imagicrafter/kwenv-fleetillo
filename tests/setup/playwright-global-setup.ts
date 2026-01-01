/**
 * Playwright Global Setup
 *
 * Runs once before all tests to prepare the test environment
 */

import { chromium, FullConfig } from '@playwright/test';
import { setupDatabaseForTests } from './database.js';
import { createContextLogger } from '../../src/utils/logger.js';

const logger = createContextLogger('PlaywrightGlobalSetup');

async function globalSetup(config: FullConfig) {
  logger.info('Starting Playwright global setup...');

  try {
    // Verify database connectivity
    logger.info('Verifying database connection...');
    await setupDatabaseForTests();
    logger.info('Database connection verified successfully');

    // Install browsers if needed (handled by Playwright automatically)
    logger.info('Ensuring browsers are installed...');

    // You can add more global setup tasks here, such as:
    // - Starting background services
    // - Creating test databases
    // - Seeding initial data
    // - Setting up authentication tokens

    logger.info('Playwright global setup completed successfully');
  } catch (error) {
    logger.error('Playwright global setup failed:', error);
    throw error;
  }
}

export default globalSetup;
