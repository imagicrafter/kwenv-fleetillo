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

import { test, expect, TestDataFactory } from '../fixtures/api-fixtures';
import {
  assertValidUUID,
  assertValidISODate,
  assertObjectSchema,
  generateTestId,
} from '../helpers/test-utils';

test.describe('Example API Tests', () => {
  test('should demonstrate basic API client usage', async ({ apiClient }) => {
    // This test demonstrates how to use the API client
    // In a real scenario, you would make actual API calls

    // Example: Making a GET request (adjust endpoint as needed)
    // const response = await apiClient.get('/api/health');
    // expect(response.status()).toBe(200);

    // For demonstration purposes
    expect(apiClient).toBeDefined();
  });

  test('should demonstrate test data factory usage', async () => {
    // Generate test vehicle data
    const vehicleData = TestDataFactory.createVehicleData({
      name: 'Custom Test Vehicle',
      year: 2025,
    });

    // Verify the generated data
    expect(vehicleData.name).toBe('Custom Test Vehicle');
    expect(vehicleData.year).toBe(2025);
    expect(vehicleData.make).toBe('Toyota');
    expect(vehicleData.status).toBe('available');
    expect(vehicleData.licensePlate).toMatch(/^TST[A-Z0-9]+$/);
  });

  test('should demonstrate test utility functions', async () => {
    // Generate unique test ID
    const testId = generateTestId('vehicle');
    expect(testId).toMatch(/^vehicle-\d+-[a-z0-9]+$/);

    // Validate UUID format
    const mockUUID = '123e4567-e89b-12d3-a456-426614174000';
    assertValidUUID(mockUUID);

    // Validate ISO date format
    const mockDate = new Date().toISOString();
    assertValidISODate(mockDate);

    // Validate object schema
    const mockObject = {
      id: '123',
      name: 'Test',
      count: 42,
      active: true,
      tags: ['test'],
    };

    assertObjectSchema(mockObject, {
      id: 'string',
      name: 'string',
      count: 'number',
      active: 'boolean',
      tags: 'array',
    });
  });

  test('should demonstrate error handling', async ({ apiClient }) => {
    // Example of testing error responses
    // In a real scenario, you would test actual error cases

    // Demonstrate that the test framework is working
    expect(async () => {
      // This would throw an error if the assertion fails
      expect(true).toBe(true);
    }).not.toThrow();
  });

  test('should demonstrate async operations', async () => {
    // Demonstrate async/await patterns in tests
    const promise = new Promise((resolve) => {
      setTimeout(() => resolve('completed'), 100);
    });

    const result = await promise;
    expect(result).toBe('completed');
  });

  test('should demonstrate parallel test execution', async () => {
    // This test runs in parallel with others
    const startTime = Date.now();

    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 50));

    const endTime = Date.now();
    expect(endTime - startTime).toBeGreaterThanOrEqual(50);
  });
});

test.describe('Example Database Tests', () => {
  test('should have database connection available', async ({ dbSetup }) => {
    // The dbSetup fixture automatically sets up and tears down database
    // This test demonstrates that the fixture is working

    // In a real scenario, you would test database operations here
    expect(dbSetup).toBeUndefined(); // dbSetup is a setup fixture, returns void
  });
});

test.describe('Example Test Hooks', () => {
  test.beforeAll(async () => {
    // Runs once before all tests in this describe block
    console.log('Starting test suite...');
  });

  test.afterAll(async () => {
    // Runs once after all tests in this describe block
    console.log('Finished test suite...');
  });

  test.beforeEach(async () => {
    // Runs before each test
    console.log('Starting test...');
  });

  test.afterEach(async () => {
    // Runs after each test
    console.log('Finished test...');
  });

  test('should demonstrate test hooks', async () => {
    // This test will have beforeEach/afterEach run around it
    expect(true).toBe(true);
  });
});
