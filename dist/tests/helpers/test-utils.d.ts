/**
 * Test Utilities and Helper Functions
 *
 * Common utilities for test setup, data generation, and assertions
 */
import type { APIResponse } from '@playwright/test';
/**
 * Generate a unique identifier for test data
 */
export declare function generateTestId(prefix?: string): string;
/**
 * Generate a random email address for testing
 */
export declare function generateTestEmail(prefix?: string): string;
/**
 * Generate a random phone number for testing
 */
export declare function generateTestPhone(): string;
/**
 * Sleep for a specified number of milliseconds
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Wait for a condition to be true with timeout
 */
export declare function waitForCondition(condition: () => Promise<boolean> | boolean, options?: {
    timeout?: number;
    interval?: number;
    errorMessage?: string;
}): Promise<void>;
/**
 * Retry an operation with exponential backoff
 */
export declare function retry<T>(operation: () => Promise<T>, options?: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
}): Promise<T>;
/**
 * Assert that a response has a specific status code
 */
export declare function assertResponseStatus(response: APIResponse, expectedStatus: number): Promise<void>;
/**
 * Assert that a response contains specific headers
 */
export declare function assertResponseHeaders(response: APIResponse, expectedHeaders: Record<string, string | RegExp>): void;
/**
 * Assert that an object matches a schema
 */
export declare function assertObjectSchema(obj: unknown, schema: Record<string, string | string[]>): void;
/**
 * Assert that an array contains objects matching a schema
 */
export declare function assertArrayOfObjects(arr: unknown, schema: Record<string, string | string[]>, options?: {
    minLength?: number;
    maxLength?: number;
}): void;
/**
 * Deep clone an object (useful for test data manipulation)
 */
export declare function deepClone<T>(obj: T): T;
/**
 * Remove undefined properties from an object
 */
export declare function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T>;
/**
 * Create a mock timestamp for testing
 */
export declare function createMockTimestamp(offsetDays?: number): string;
/**
 * Assert that a value is a valid UUID
 */
export declare function assertValidUUID(value: unknown): void;
/**
 * Assert that a value is a valid ISO 8601 date string
 */
export declare function assertValidISODate(value: unknown): void;
/**
 * Compare two timestamps and assert they are within a tolerance
 */
export declare function assertTimestampsClose(timestamp1: string | Date, timestamp2: string | Date, toleranceMs?: number): void;
//# sourceMappingURL=test-utils.d.ts.map