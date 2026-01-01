/**
 * Test Utilities and Helper Functions
 *
 * Common utilities for test setup, data generation, and assertions
 */

import { expect } from '@playwright/test';
import type { APIResponse } from '@playwright/test';

/**
 * Generate a unique identifier for test data
 */
export function generateTestId(prefix = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate a random email address for testing
 */
export function generateTestEmail(prefix = 'test'): string {
  const id = generateTestId(prefix);
  return `${id}@example.com`;
}

/**
 * Generate a random phone number for testing
 */
export function generateTestPhone(): string {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const lineNumber = Math.floor(Math.random() * 9000) + 1000;
  return `${areaCode}-${prefix}-${lineNumber}`;
}

/**
 * Sleep for a specified number of milliseconds
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitForCondition(
  condition: () => Promise<boolean> | boolean,
  options: {
    timeout?: number;
    interval?: number;
    errorMessage?: string;
  } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100, errorMessage = 'Condition not met' } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`${errorMessage} (timeout: ${timeout}ms)`);
}

/**
 * Retry an operation with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 100,
    maxDelay = 5000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxAttempts) {
        break;
      }
      await sleep(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw new Error(
    `Operation failed after ${maxAttempts} attempts. Last error: ${lastError?.message}`
  );
}

/**
 * Assert that a response has a specific status code
 */
export async function assertResponseStatus(
  response: APIResponse,
  expectedStatus: number
): Promise<void> {
  const actualStatus = response.status();
  if (actualStatus !== expectedStatus) {
    const body = await response.text();
    throw new Error(
      `Expected status ${expectedStatus} but got ${actualStatus}. Response: ${body}`
    );
  }
}

/**
 * Assert that a response contains specific headers
 */
export function assertResponseHeaders(
  response: APIResponse,
  expectedHeaders: Record<string, string | RegExp>
): void {
  const headers = response.headers();

  Object.entries(expectedHeaders).forEach(([key, value]) => {
    const actualValue = headers[key.toLowerCase()];

    if (value instanceof RegExp) {
      expect(actualValue).toMatch(value);
    } else {
      expect(actualValue).toBe(value);
    }
  });
}

/**
 * Assert that an object matches a schema
 */
export function assertObjectSchema(
  obj: unknown,
  schema: Record<string, string | string[]>
): void {
  expect(obj).toBeDefined();
  expect(typeof obj).toBe('object');

  const typedObj = obj as Record<string, unknown>;

  Object.entries(schema).forEach(([key, expectedType]) => {
    expect(typedObj).toHaveProperty(key);

    const actualValue = typedObj[key];
    const types = Array.isArray(expectedType) ? expectedType : [expectedType];

    const matchesType = types.some(type => {
      if (type === 'array') {
        return Array.isArray(actualValue);
      }
      if (type === 'null') {
        return actualValue === null;
      }
      if (type === 'date') {
        return actualValue instanceof Date ||
          (typeof actualValue === 'string' && !isNaN(Date.parse(actualValue)));
      }
      return typeof actualValue === type;
    });

    expect(matchesType).toBe(true);
  });
}

/**
 * Assert that an array contains objects matching a schema
 */
export function assertArrayOfObjects(
  arr: unknown,
  schema: Record<string, string | string[]>,
  options: { minLength?: number; maxLength?: number } = {}
): void {
  expect(Array.isArray(arr)).toBe(true);

  const typedArr = arr as unknown[];

  if (options.minLength !== undefined) {
    expect(typedArr.length).toBeGreaterThanOrEqual(options.minLength);
  }

  if (options.maxLength !== undefined) {
    expect(typedArr.length).toBeLessThanOrEqual(options.maxLength);
  }

  typedArr.forEach(item => {
    assertObjectSchema(item, schema);
  });
}

/**
 * Deep clone an object (useful for test data manipulation)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Remove undefined properties from an object
 */
export function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};

  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined) {
      result[key as keyof T] = value as any;
    }
  });

  return result;
}

/**
 * Create a mock timestamp for testing
 */
export function createMockTimestamp(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString();
}

/**
 * Assert that a value is a valid UUID
 */
export function assertValidUUID(value: unknown): void {
  expect(typeof value).toBe('string');
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  expect(value).toMatch(uuidRegex);
}

/**
 * Assert that a value is a valid ISO 8601 date string
 */
export function assertValidISODate(value: unknown): void {
  expect(typeof value).toBe('string');
  const date = new Date(value as string);
  expect(date.toString()).not.toBe('Invalid Date');
}

/**
 * Compare two timestamps and assert they are within a tolerance
 */
export function assertTimestampsClose(
  timestamp1: string | Date,
  timestamp2: string | Date,
  toleranceMs = 1000
): void {
  const date1 = new Date(timestamp1).getTime();
  const date2 = new Date(timestamp2).getTime();
  const diff = Math.abs(date1 - date2);

  expect(diff).toBeLessThanOrEqual(toleranceMs);
}
