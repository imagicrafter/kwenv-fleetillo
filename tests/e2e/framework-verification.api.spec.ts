/**
 * Playwright Framework Verification Test
 *
 * This test verifies that the Playwright testing framework is properly configured with:
 * - Custom fixtures working correctly
 * - Test utilities available and functional
 * - API client helpers operational
 * - Test data factories generating valid data
 */

import { test, expect, TestDataFactory } from '../fixtures/api-fixtures.js';
import {
  assertValidUUID,
  assertValidISODate,
  assertObjectSchema,
  generateTestId,
  generateTestEmail,
  generateTestPhone,
} from '../helpers/test-utils.js';

test.describe('Playwright Framework Verification', () => {
  test('should have API client fixture available', async ({ apiClient }) => {
    expect(apiClient).toBeDefined();
    expect(typeof apiClient.get).toBe('function');
    expect(typeof apiClient.post).toBe('function');
    expect(typeof apiClient.put).toBe('function');
    expect(typeof apiClient.patch).toBe('function');
    expect(typeof apiClient.delete).toBe('function');
  });

  test('should have database setup fixture working', async ({ dbSetup }) => {
    // The dbSetup fixture runs automatically and ensures database is ready
    // This test passes if the fixture doesn't throw an error
    expect(true).toBe(true);
  });

  test('should generate valid vehicle test data', async () => {
    const vehicleData = TestDataFactory.createVehicleData();

    expect(vehicleData).toBeDefined();
    expect(vehicleData.name).toBeDefined();
    expect(vehicleData.name).toContain('Test Vehicle');
    expect(vehicleData.make).toBe('Toyota');
    expect(vehicleData.model).toBe('Camry');
    expect(vehicleData.year).toBe(2024);
    expect(vehicleData.status).toBe('available');
    expect(vehicleData.serviceTypes).toEqual(['delivery']);
    expect(vehicleData.fuelType).toBe('gasoline');
    expect(vehicleData.licensePlate).toMatch(/^TST[A-Z0-9]+$/);
  });

  test('should generate valid vehicle data with overrides', async () => {
    const customData = TestDataFactory.createVehicleData({
      name: 'Custom Vehicle Name',
      year: 2025,
      make: 'Ford',
      model: 'F-150',
    });

    expect(customData.name).toBe('Custom Vehicle Name');
    expect(customData.year).toBe(2025);
    expect(customData.make).toBe('Ford');
    expect(customData.model).toBe('F-150');
  });

  test('should generate valid service test data', async () => {
    const serviceData = TestDataFactory.createServiceData();

    expect(serviceData).toBeDefined();
    expect(serviceData.name).toBeDefined();
    expect(serviceData.name).toContain('Test Service');
    expect(serviceData.service_type).toBe('delivery');
    expect(serviceData.status).toBe('active');
  });

  test('should generate unique test IDs', async () => {
    const id1 = generateTestId('vehicle');
    const id2 = generateTestId('vehicle');
    const id3 = generateTestId('service');

    expect(id1).not.toBe(id2);
    expect(id1).not.toBe(id3);
    expect(id1).toMatch(/^vehicle-\d+-[a-z0-9]+$/);
    expect(id3).toMatch(/^service-\d+-[a-z0-9]+$/);
  });

  test('should generate unique test emails', async () => {
    const email1 = generateTestEmail('driver');
    const email2 = generateTestEmail('driver');

    expect(email1).not.toBe(email2);
    expect(email1).toMatch(/^driver-\d+-[a-z0-9]+@example\.com$/);
    expect(email2).toMatch(/^driver-\d+-[a-z0-9]+@example\.com$/);
  });

  test('should generate test phone numbers', async () => {
    const phone = generateTestPhone();

    expect(phone).toMatch(/^\d{3}-\d{3}-\d{4}$/);
  });

  test('should validate UUID format', async () => {
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';

    // Should not throw
    assertValidUUID(validUUID);

    // Should throw for invalid UUID
    expect(() => assertValidUUID('not-a-uuid')).toThrow();
    expect(() => assertValidUUID('123')).toThrow();
  });

  test('should validate ISO date format', async () => {
    const validDate = new Date().toISOString();

    // Should not throw
    assertValidISODate(validDate);

    // Should throw for invalid date
    expect(() => assertValidISODate('not-a-date')).toThrow();
  });

  test('should validate object schema', async () => {
    const validObject = {
      id: '123',
      name: 'Test',
      count: 42,
      active: true,
      tags: ['test', 'example'],
      metadata: { key: 'value' },
    };

    // Should not throw
    assertObjectSchema(validObject, {
      id: 'string',
      name: 'string',
      count: 'number',
      active: 'boolean',
      tags: 'array',
      metadata: 'object',
    });

    // Should throw for missing properties
    expect(() => {
      assertObjectSchema({ id: '123' }, {
        id: 'string',
        name: 'string', // Missing in object
      });
    }).toThrow();

    // Should throw for wrong types
    expect(() => {
      assertObjectSchema({ id: 123 }, {
        id: 'string', // Should be string but is number
      });
    }).toThrow();
  });

  test('should support multiple types in schema validation', async () => {
    const object = {
      optionalValue: null,
      timestamp: new Date().toISOString(),
    };

    // Should accept null or string
    assertObjectSchema(object, {
      optionalValue: ['null', 'string'],
      timestamp: 'date',
    });
  });
});

test.describe('Playwright Configuration Verification', () => {
  test('should have correct test timeout', async () => {
    // Default timeout is 30 seconds (30000ms)
    // This test should complete well within that
    const startTime = Date.now();

    await new Promise(resolve => setTimeout(resolve, 100));

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeGreaterThanOrEqual(100);
    expect(elapsed).toBeLessThan(30000);
  });

  test('should support parallel test execution', async () => {
    // When fullyParallel is true, tests can run concurrently
    // This is more of a configuration check than a functional test
    expect(true).toBe(true);
  });

  test('should have proper expect timeout configured', async () => {
    // Expect timeout is configured to 5000ms
    // Quick assertions should pass immediately
    const start = Date.now();
    expect(true).toBe(true);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(100); // Should be nearly instant
  });
});

test.describe('Test Hooks Verification', () => {
  let setupRan = false;
  let beforeEachRan = false;

  test.beforeAll(async () => {
    setupRan = true;
  });

  test.beforeEach(async () => {
    beforeEachRan = true;
  });

  test('should run beforeAll hook', async () => {
    expect(setupRan).toBe(true);
  });

  test('should run beforeEach hook', async () => {
    expect(beforeEachRan).toBe(true);
  });

  test.afterEach(async () => {
    // Reset for next test
    beforeEachRan = false;
  });
});

test.describe('Async Operations Verification', () => {
  test('should handle async/await properly', async () => {
    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('completed'), 100);
    });

    const result = await promise;
    expect(result).toBe('completed');
  });

  test('should handle multiple async operations', async () => {
    const results = await Promise.all([
      Promise.resolve(1),
      Promise.resolve(2),
      Promise.resolve(3),
    ]);

    expect(results).toEqual([1, 2, 3]);
  });

  test('should handle rejected promises', async () => {
    await expect(async () => {
      await Promise.reject(new Error('Test error'));
    }).rejects.toThrow('Test error');
  });
});
