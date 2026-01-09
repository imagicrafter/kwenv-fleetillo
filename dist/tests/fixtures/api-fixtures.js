"use strict";
/**
 * Playwright Fixtures for API Testing
 *
 * Custom fixtures that extend Playwright's test object with:
 * - API client with built-in helpers
 * - Database setup and teardown
 * - Test data factories
 * - Authentication helpers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestDataFactory = exports.expect = exports.test = void 0;
const test_1 = require("@playwright/test");
Object.defineProperty(exports, "expect", { enumerable: true, get: function () { return test_1.expect; } });
const api_client_js_1 = require("../helpers/api-client.js");
const database_js_1 = require("../setup/database.js");
/**
 * Extend base test with custom fixtures
 */
exports.test = test_1.test.extend({
    /**
     * Database setup fixture
     * Runs before each test to ensure database is ready
     */
    dbSetup: [
        async ({}, use) => {
            // Setup
            await (0, database_js_1.setupDatabaseForTests)();
            // Use the fixture
            await use();
            // Teardown
            await (0, database_js_1.teardownDatabase)();
        },
        { auto: true }, // Automatically run for all tests
    ],
    /**
     * API Client fixture
     * Provides a configured API client for making requests
     */
    apiClient: async ({ request }, use) => {
        const client = new api_client_js_1.ApiClient(request, {
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
        const client = new api_client_js_1.ApiClient(request, {
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
 * Test data factories
 */
exports.TestDataFactory = {
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
        status: 'available',
        serviceTypes: ['delivery'],
        fuelType: 'gasoline',
        ...overrides,
    }),
    /**
     * Create test service data
     */
    createServiceData: (overrides = {}) => ({
        name: `Test Service ${Date.now()}`,
        description: 'Test service for automated testing',
        service_type: 'delivery',
        status: 'active',
        ...overrides,
    }),
    /**
     * Create test maintenance schedule data
     */
    createMaintenanceScheduleData: (vehicleId, overrides = {}) => ({
        vehicle_id: vehicleId,
        maintenance_type: 'oil_change',
        scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Test maintenance schedule',
        status: 'scheduled',
        ...overrides,
    }),
};
//# sourceMappingURL=api-fixtures.js.map