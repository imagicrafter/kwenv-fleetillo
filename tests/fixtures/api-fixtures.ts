/**
 * Playwright Fixtures for API Testing
 *
 * Custom fixtures that extend Playwright's test object with:
 * - API client with built-in helpers
 * - Database setup and teardown
 * - Test data factories
 * - Authentication helpers
 */

import { test as base, expect } from '@playwright/test';
import { ApiClient } from '../helpers/api-client.js';
import { setupDatabaseForTests, teardownDatabase } from '../setup/database.js';

/**
 * Extended test fixtures
 */
type ApiFixtures = {
  apiClient: ApiClient;
  authenticatedApiClient: ApiClient;
  dbSetup: void;
};

/**
 * Extend base test with custom fixtures
 */
export const test = base.extend<ApiFixtures>({
  /**
   * Database setup fixture
   * Runs before each test to ensure database is ready
   */
  dbSetup: [
    async ({}, use) => {
      // Setup
      await setupDatabaseForTests();

      // Use the fixture
      await use();

      // Teardown
      await teardownDatabase();
    },
    { auto: true }, // Automatically run for all tests
  ],

  /**
   * API Client fixture
   * Provides a configured API client for making requests
   */
  apiClient: async ({ request }, use) => {
    const client = new ApiClient(request, {
      baseURL: process.env.API_BASE_URL || 'http://localhost:3000',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    await use(client);
  },

  /**
   * Authenticated API Client fixture
   * Provides an API client with authentication headers
   * TODO: Implement actual authentication logic when auth is added
   */
  authenticatedApiClient: async ({ request }, use) => {
    // TODO: Add authentication logic here
    // For now, this is the same as the regular API client
    const client = new ApiClient(request, {
      baseURL: process.env.API_BASE_URL || 'http://localhost:3000',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // 'Authorization': `Bearer ${token}`,
      },
    });

    await use(client);
  },
});

/**
 * Export expect for convenience
 */
export { expect };

/**
 * Test data factories
 */
export const TestDataFactory = {
  /**
   * Create test vehicle data
   */
  createVehicleData: (overrides = {}) => ({
    name: `Test Vehicle ${Date.now()}`,
    description: 'Test vehicle for automated testing',
    licensePlate: `TST${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    make: 'Toyota',
    model: 'Camry',
    year: 2024,
    status: 'available' as const,
    serviceTypes: ['delivery'],
    fuelType: 'gasoline' as const,
    ...overrides,
  }),

  /**
   * Create test service data
   */
  createServiceData: (overrides = {}) => ({
    name: `Test Service ${Date.now()}`,
    description: 'Test service for automated testing',
    service_type: 'delivery',
    status: 'active' as const,
    ...overrides,
  }),

  /**
   * Create test maintenance schedule data
   */
  createMaintenanceScheduleData: (vehicleId: string, overrides = {}) => ({
    vehicle_id: vehicleId,
    maintenance_type: 'oil_change',
    scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Test maintenance schedule',
    status: 'scheduled' as const,
    ...overrides,
  }),
};
