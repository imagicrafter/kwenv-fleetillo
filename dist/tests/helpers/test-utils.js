"use strict";
/**
 * Test Utilities and Helper Functions
 *
 * Common utilities for test setup, data generation, and assertions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTestId = generateTestId;
exports.generateTestEmail = generateTestEmail;
exports.generateTestPhone = generateTestPhone;
exports.sleep = sleep;
exports.waitForCondition = waitForCondition;
exports.retry = retry;
exports.assertResponseStatus = assertResponseStatus;
exports.assertResponseHeaders = assertResponseHeaders;
exports.assertObjectSchema = assertObjectSchema;
exports.assertArrayOfObjects = assertArrayOfObjects;
exports.deepClone = deepClone;
exports.removeUndefined = removeUndefined;
exports.createMockTimestamp = createMockTimestamp;
exports.assertValidUUID = assertValidUUID;
exports.assertValidISODate = assertValidISODate;
exports.assertTimestampsClose = assertTimestampsClose;
const test_1 = require("@playwright/test");
/**
 * Generate a unique identifier for test data
 */
function generateTestId(prefix = 'test') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}-${timestamp}-${random}`;
}
/**
 * Generate a random email address for testing
 */
function generateTestEmail(prefix = 'test') {
    const id = generateTestId(prefix);
    return `${id}@example.com`;
}
/**
 * Generate a random phone number for testing
 */
function generateTestPhone() {
    const areaCode = Math.floor(Math.random() * 900) + 100;
    const prefix = Math.floor(Math.random() * 900) + 100;
    const lineNumber = Math.floor(Math.random() * 9000) + 1000;
    return `${areaCode}-${prefix}-${lineNumber}`;
}
/**
 * Sleep for a specified number of milliseconds
 */
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Wait for a condition to be true with timeout
 */
async function waitForCondition(condition, options = {}) {
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
async function retry(operation, options = {}) {
    const { maxAttempts = 3, initialDelay = 100, maxDelay = 5000, backoffMultiplier = 2, } = options;
    let lastError;
    let delay = initialDelay;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            if (attempt === maxAttempts) {
                break;
            }
            await sleep(delay);
            delay = Math.min(delay * backoffMultiplier, maxDelay);
        }
    }
    throw new Error(`Operation failed after ${maxAttempts} attempts. Last error: ${lastError?.message}`);
}
/**
 * Assert that a response has a specific status code
 */
async function assertResponseStatus(response, expectedStatus) {
    const actualStatus = response.status();
    if (actualStatus !== expectedStatus) {
        const body = await response.text();
        throw new Error(`Expected status ${expectedStatus} but got ${actualStatus}. Response: ${body}`);
    }
}
/**
 * Assert that a response contains specific headers
 */
function assertResponseHeaders(response, expectedHeaders) {
    const headers = response.headers();
    Object.entries(expectedHeaders).forEach(([key, value]) => {
        const actualValue = headers[key.toLowerCase()];
        if (value instanceof RegExp) {
            (0, test_1.expect)(actualValue).toMatch(value);
        }
        else {
            (0, test_1.expect)(actualValue).toBe(value);
        }
    });
}
/**
 * Assert that an object matches a schema
 */
function assertObjectSchema(obj, schema) {
    (0, test_1.expect)(obj).toBeDefined();
    (0, test_1.expect)(typeof obj).toBe('object');
    const typedObj = obj;
    Object.entries(schema).forEach(([key, expectedType]) => {
        (0, test_1.expect)(typedObj).toHaveProperty(key);
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
        (0, test_1.expect)(matchesType).toBe(true);
    });
}
/**
 * Assert that an array contains objects matching a schema
 */
function assertArrayOfObjects(arr, schema, options = {}) {
    (0, test_1.expect)(Array.isArray(arr)).toBe(true);
    const typedArr = arr;
    if (options.minLength !== undefined) {
        (0, test_1.expect)(typedArr.length).toBeGreaterThanOrEqual(options.minLength);
    }
    if (options.maxLength !== undefined) {
        (0, test_1.expect)(typedArr.length).toBeLessThanOrEqual(options.maxLength);
    }
    typedArr.forEach(item => {
        assertObjectSchema(item, schema);
    });
}
/**
 * Deep clone an object (useful for test data manipulation)
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
/**
 * Remove undefined properties from an object
 */
function removeUndefined(obj) {
    const result = {};
    Object.entries(obj).forEach(([key, value]) => {
        if (value !== undefined) {
            result[key] = value;
        }
    });
    return result;
}
/**
 * Create a mock timestamp for testing
 */
function createMockTimestamp(offsetDays = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString();
}
/**
 * Assert that a value is a valid UUID
 */
function assertValidUUID(value) {
    (0, test_1.expect)(typeof value).toBe('string');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    (0, test_1.expect)(value).toMatch(uuidRegex);
}
/**
 * Assert that a value is a valid ISO 8601 date string
 */
function assertValidISODate(value) {
    (0, test_1.expect)(typeof value).toBe('string');
    const date = new Date(value);
    (0, test_1.expect)(date.toString()).not.toBe('Invalid Date');
}
/**
 * Compare two timestamps and assert they are within a tolerance
 */
function assertTimestampsClose(timestamp1, timestamp2, toleranceMs = 1000) {
    const date1 = new Date(timestamp1).getTime();
    const date2 = new Date(timestamp2).getTime();
    const diff = Math.abs(date1 - date2);
    (0, test_1.expect)(diff).toBeLessThanOrEqual(toleranceMs);
}
//# sourceMappingURL=test-utils.js.map