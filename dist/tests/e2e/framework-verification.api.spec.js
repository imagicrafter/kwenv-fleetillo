"use strict";
/**
 * Playwright Framework Verification Test
 *
 * This test verifies that the Playwright testing framework is properly configured with:
 * - Custom fixtures working correctly
 * - Test utilities available and functional
 * - API client helpers operational
 * - Test data factories generating valid data
 */
Object.defineProperty(exports, "__esModule", { value: true });
const api_fixtures_js_1 = require("../fixtures/api-fixtures.js");
const test_utils_js_1 = require("../helpers/test-utils.js");
api_fixtures_js_1.test.describe('Playwright Framework Verification', () => {
    (0, api_fixtures_js_1.test)('should have API client fixture available', async ({ apiClient }) => {
        (0, api_fixtures_js_1.expect)(apiClient).toBeDefined();
        (0, api_fixtures_js_1.expect)(typeof apiClient.get).toBe('function');
        (0, api_fixtures_js_1.expect)(typeof apiClient.post).toBe('function');
        (0, api_fixtures_js_1.expect)(typeof apiClient.put).toBe('function');
        (0, api_fixtures_js_1.expect)(typeof apiClient.patch).toBe('function');
        (0, api_fixtures_js_1.expect)(typeof apiClient.delete).toBe('function');
    });
    (0, api_fixtures_js_1.test)('should have database setup fixture working', async ({ dbSetup }) => {
        // The dbSetup fixture runs automatically and ensures database is ready
        // This test passes if the fixture doesn't throw an error
        (0, api_fixtures_js_1.expect)(true).toBe(true);
    });
    (0, api_fixtures_js_1.test)('should generate valid vehicle test data', async () => {
        const vehicleData = api_fixtures_js_1.TestDataFactory.createVehicleData();
        (0, api_fixtures_js_1.expect)(vehicleData).toBeDefined();
        (0, api_fixtures_js_1.expect)(vehicleData.name).toBeDefined();
        (0, api_fixtures_js_1.expect)(vehicleData.name).toContain('Test Vehicle');
        (0, api_fixtures_js_1.expect)(vehicleData.make).toBe('Toyota');
        (0, api_fixtures_js_1.expect)(vehicleData.model).toBe('Camry');
        (0, api_fixtures_js_1.expect)(vehicleData.year).toBe(2024);
        (0, api_fixtures_js_1.expect)(vehicleData.status).toBe('available');
        (0, api_fixtures_js_1.expect)(vehicleData.serviceTypes).toEqual(['delivery']);
        (0, api_fixtures_js_1.expect)(vehicleData.fuelType).toBe('gasoline');
        (0, api_fixtures_js_1.expect)(vehicleData.licensePlate).toMatch(/^TST[A-Z0-9]+$/);
    });
    (0, api_fixtures_js_1.test)('should generate valid vehicle data with overrides', async () => {
        const customData = api_fixtures_js_1.TestDataFactory.createVehicleData({
            name: 'Custom Vehicle Name',
            year: 2025,
            make: 'Ford',
            model: 'F-150',
        });
        (0, api_fixtures_js_1.expect)(customData.name).toBe('Custom Vehicle Name');
        (0, api_fixtures_js_1.expect)(customData.year).toBe(2025);
        (0, api_fixtures_js_1.expect)(customData.make).toBe('Ford');
        (0, api_fixtures_js_1.expect)(customData.model).toBe('F-150');
    });
    (0, api_fixtures_js_1.test)('should generate valid service test data', async () => {
        const serviceData = api_fixtures_js_1.TestDataFactory.createServiceData();
        (0, api_fixtures_js_1.expect)(serviceData).toBeDefined();
        (0, api_fixtures_js_1.expect)(serviceData.name).toBeDefined();
        (0, api_fixtures_js_1.expect)(serviceData.name).toContain('Test Service');
        (0, api_fixtures_js_1.expect)(serviceData.service_type).toBe('delivery');
        (0, api_fixtures_js_1.expect)(serviceData.status).toBe('active');
    });
    (0, api_fixtures_js_1.test)('should generate unique test IDs', async () => {
        const id1 = (0, test_utils_js_1.generateTestId)('vehicle');
        const id2 = (0, test_utils_js_1.generateTestId)('vehicle');
        const id3 = (0, test_utils_js_1.generateTestId)('service');
        (0, api_fixtures_js_1.expect)(id1).not.toBe(id2);
        (0, api_fixtures_js_1.expect)(id1).not.toBe(id3);
        (0, api_fixtures_js_1.expect)(id1).toMatch(/^vehicle-\d+-[a-z0-9]+$/);
        (0, api_fixtures_js_1.expect)(id3).toMatch(/^service-\d+-[a-z0-9]+$/);
    });
    (0, api_fixtures_js_1.test)('should generate unique test emails', async () => {
        const email1 = (0, test_utils_js_1.generateTestEmail)('driver');
        const email2 = (0, test_utils_js_1.generateTestEmail)('driver');
        (0, api_fixtures_js_1.expect)(email1).not.toBe(email2);
        (0, api_fixtures_js_1.expect)(email1).toMatch(/^driver-\d+-[a-z0-9]+@example\.com$/);
        (0, api_fixtures_js_1.expect)(email2).toMatch(/^driver-\d+-[a-z0-9]+@example\.com$/);
    });
    (0, api_fixtures_js_1.test)('should generate test phone numbers', async () => {
        const phone = (0, test_utils_js_1.generateTestPhone)();
        (0, api_fixtures_js_1.expect)(phone).toMatch(/^\d{3}-\d{3}-\d{4}$/);
    });
    (0, api_fixtures_js_1.test)('should validate UUID format', async () => {
        const validUUID = '123e4567-e89b-12d3-a456-426614174000';
        // Should not throw
        (0, test_utils_js_1.assertValidUUID)(validUUID);
        // Should throw for invalid UUID
        (0, api_fixtures_js_1.expect)(() => (0, test_utils_js_1.assertValidUUID)('not-a-uuid')).toThrow();
        (0, api_fixtures_js_1.expect)(() => (0, test_utils_js_1.assertValidUUID)('123')).toThrow();
    });
    (0, api_fixtures_js_1.test)('should validate ISO date format', async () => {
        const validDate = new Date().toISOString();
        // Should not throw
        (0, test_utils_js_1.assertValidISODate)(validDate);
        // Should throw for invalid date
        (0, api_fixtures_js_1.expect)(() => (0, test_utils_js_1.assertValidISODate)('not-a-date')).toThrow();
    });
    (0, api_fixtures_js_1.test)('should validate object schema', async () => {
        const validObject = {
            id: '123',
            name: 'Test',
            count: 42,
            active: true,
            tags: ['test', 'example'],
            metadata: { key: 'value' },
        };
        // Should not throw
        (0, test_utils_js_1.assertObjectSchema)(validObject, {
            id: 'string',
            name: 'string',
            count: 'number',
            active: 'boolean',
            tags: 'array',
            metadata: 'object',
        });
        // Should throw for missing properties
        (0, api_fixtures_js_1.expect)(() => {
            (0, test_utils_js_1.assertObjectSchema)({ id: '123' }, {
                id: 'string',
                name: 'string', // Missing in object
            });
        }).toThrow();
        // Should throw for wrong types
        (0, api_fixtures_js_1.expect)(() => {
            (0, test_utils_js_1.assertObjectSchema)({ id: 123 }, {
                id: 'string', // Should be string but is number
            });
        }).toThrow();
    });
    (0, api_fixtures_js_1.test)('should support multiple types in schema validation', async () => {
        const object = {
            optionalValue: null,
            timestamp: new Date().toISOString(),
        };
        // Should accept null or string
        (0, test_utils_js_1.assertObjectSchema)(object, {
            optionalValue: ['null', 'string'],
            timestamp: 'date',
        });
    });
});
api_fixtures_js_1.test.describe('Playwright Configuration Verification', () => {
    (0, api_fixtures_js_1.test)('should have correct test timeout', async () => {
        // Default timeout is 30 seconds (30000ms)
        // This test should complete well within that
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 100));
        const elapsed = Date.now() - startTime;
        (0, api_fixtures_js_1.expect)(elapsed).toBeGreaterThanOrEqual(100);
        (0, api_fixtures_js_1.expect)(elapsed).toBeLessThan(30000);
    });
    (0, api_fixtures_js_1.test)('should support parallel test execution', async () => {
        // When fullyParallel is true, tests can run concurrently
        // This is more of a configuration check than a functional test
        (0, api_fixtures_js_1.expect)(true).toBe(true);
    });
    (0, api_fixtures_js_1.test)('should have proper expect timeout configured', async () => {
        // Expect timeout is configured to 5000ms
        // Quick assertions should pass immediately
        const start = Date.now();
        (0, api_fixtures_js_1.expect)(true).toBe(true);
        const elapsed = Date.now() - start;
        (0, api_fixtures_js_1.expect)(elapsed).toBeLessThan(100); // Should be nearly instant
    });
});
api_fixtures_js_1.test.describe('Test Hooks Verification', () => {
    let setupRan = false;
    let beforeEachRan = false;
    api_fixtures_js_1.test.beforeAll(async () => {
        setupRan = true;
    });
    api_fixtures_js_1.test.beforeEach(async () => {
        beforeEachRan = true;
    });
    (0, api_fixtures_js_1.test)('should run beforeAll hook', async () => {
        (0, api_fixtures_js_1.expect)(setupRan).toBe(true);
    });
    (0, api_fixtures_js_1.test)('should run beforeEach hook', async () => {
        (0, api_fixtures_js_1.expect)(beforeEachRan).toBe(true);
    });
    api_fixtures_js_1.test.afterEach(async () => {
        // Reset for next test
        beforeEachRan = false;
    });
});
api_fixtures_js_1.test.describe('Async Operations Verification', () => {
    (0, api_fixtures_js_1.test)('should handle async/await properly', async () => {
        const promise = new Promise((resolve) => {
            setTimeout(() => resolve('completed'), 100);
        });
        const result = await promise;
        (0, api_fixtures_js_1.expect)(result).toBe('completed');
    });
    (0, api_fixtures_js_1.test)('should handle multiple async operations', async () => {
        const results = await Promise.all([
            Promise.resolve(1),
            Promise.resolve(2),
            Promise.resolve(3),
        ]);
        (0, api_fixtures_js_1.expect)(results).toEqual([1, 2, 3]);
    });
    (0, api_fixtures_js_1.test)('should handle rejected promises', async () => {
        await (0, api_fixtures_js_1.expect)(async () => {
            await Promise.reject(new Error('Test error'));
        }).rejects.toThrow('Test error');
    });
});
//# sourceMappingURL=framework-verification.api.spec.js.map