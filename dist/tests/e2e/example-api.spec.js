"use strict";
/**
 * Example API Test
 *
 * Demonstrates how to use the Playwright testing framework with:
 * - Custom fixtures (apiClient, dbSetup)
 * - Test data factories
 * - Helper utilities
 * - Assertions
 *
 * This is an example test to showcase the framework capabilities.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const api_fixtures_js_1 = require("../fixtures/api-fixtures.js");
const test_utils_js_1 = require("../helpers/test-utils.js");
api_fixtures_js_1.test.describe('Example API Tests', () => {
    (0, api_fixtures_js_1.test)('should demonstrate basic API client usage', async ({ apiClient }) => {
        // This test demonstrates how to use the API client
        // In a real scenario, you would make actual API calls
        // Example: Making a GET request (adjust endpoint as needed)
        // const response = await apiClient.get('/api/health');
        // expect(response.status()).toBe(200);
        // For demonstration purposes
        (0, api_fixtures_js_1.expect)(apiClient).toBeDefined();
    });
    (0, api_fixtures_js_1.test)('should demonstrate test data factory usage', async () => {
        // Generate test vehicle data
        const vehicleData = api_fixtures_js_1.TestDataFactory.createVehicleData({
            name: 'Custom Test Vehicle',
            year: 2025,
        });
        // Verify the generated data
        (0, api_fixtures_js_1.expect)(vehicleData.name).toBe('Custom Test Vehicle');
        (0, api_fixtures_js_1.expect)(vehicleData.year).toBe(2025);
        (0, api_fixtures_js_1.expect)(vehicleData.make).toBe('Toyota');
        (0, api_fixtures_js_1.expect)(vehicleData.status).toBe('available');
        (0, api_fixtures_js_1.expect)(vehicleData.licensePlate).toMatch(/^TST[A-Z0-9]+$/);
    });
    (0, api_fixtures_js_1.test)('should demonstrate test utility functions', async () => {
        // Generate unique test ID
        const testId = (0, test_utils_js_1.generateTestId)('vehicle');
        (0, api_fixtures_js_1.expect)(testId).toMatch(/^vehicle-\d+-[a-z0-9]+$/);
        // Validate UUID format
        const mockUUID = '123e4567-e89b-12d3-a456-426614174000';
        (0, test_utils_js_1.assertValidUUID)(mockUUID);
        // Validate ISO date format
        const mockDate = new Date().toISOString();
        (0, test_utils_js_1.assertValidISODate)(mockDate);
        // Validate object schema
        const mockObject = {
            id: '123',
            name: 'Test',
            count: 42,
            active: true,
            tags: ['test'],
        };
        (0, test_utils_js_1.assertObjectSchema)(mockObject, {
            id: 'string',
            name: 'string',
            count: 'number',
            active: 'boolean',
            tags: 'array',
        });
    });
    (0, api_fixtures_js_1.test)('should demonstrate error handling', async ({ apiClient }) => {
        // Example of testing error responses
        // In a real scenario, you would test actual error cases
        // Demonstrate that the test framework is working
        (0, api_fixtures_js_1.expect)(async () => {
            // This would throw an error if the assertion fails
            (0, api_fixtures_js_1.expect)(true).toBe(true);
        }).not.toThrow();
    });
    (0, api_fixtures_js_1.test)('should demonstrate async operations', async () => {
        // Demonstrate async/await patterns in tests
        const promise = new Promise((resolve) => {
            setTimeout(() => resolve('completed'), 100);
        });
        const result = await promise;
        (0, api_fixtures_js_1.expect)(result).toBe('completed');
    });
    (0, api_fixtures_js_1.test)('should demonstrate parallel test execution', async () => {
        // This test runs in parallel with others
        const startTime = Date.now();
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 50));
        const endTime = Date.now();
        (0, api_fixtures_js_1.expect)(endTime - startTime).toBeGreaterThanOrEqual(50);
    });
});
api_fixtures_js_1.test.describe('Example Database Tests', () => {
    (0, api_fixtures_js_1.test)('should have database connection available', async ({ dbSetup }) => {
        // The dbSetup fixture automatically sets up and tears down database
        // This test demonstrates that the fixture is working
        // In a real scenario, you would test database operations here
        (0, api_fixtures_js_1.expect)(dbSetup).toBeUndefined(); // dbSetup is a setup fixture, returns void
    });
});
api_fixtures_js_1.test.describe('Example Test Hooks', () => {
    api_fixtures_js_1.test.beforeAll(async () => {
        // Runs once before all tests in this describe block
        console.log('Starting test suite...');
    });
    api_fixtures_js_1.test.afterAll(async () => {
        // Runs once after all tests in this describe block
        console.log('Finished test suite...');
    });
    api_fixtures_js_1.test.beforeEach(async () => {
        // Runs before each test
        console.log('Starting test...');
    });
    api_fixtures_js_1.test.afterEach(async () => {
        // Runs after each test
        console.log('Finished test...');
    });
    (0, api_fixtures_js_1.test)('should demonstrate test hooks', async () => {
        // This test will have beforeEach/afterEach run around it
        (0, api_fixtures_js_1.expect)(true).toBe(true);
    });
});
//# sourceMappingURL=example-api.spec.js.map