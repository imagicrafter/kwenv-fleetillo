/**
 * Property-Based Tests for API Key Authentication
 *
 * Feature: dispatch-service, Property 17: API Key Authentication
 *
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
 *
 * Property 17 from design.md states:
 * "For any API request to protected endpoints, the request SHALL be rejected with HTTP 401
 * if the X-API-Key header is missing or contains an invalid key. Requests with any valid
 * configured API key SHALL be processed."
 */

import * as fc from 'fast-check';
import { Request, Response } from 'express';
import {
  authMiddleware,
  getConfiguredApiKeys,
  isValidApiKey,
} from '../../src/middleware/auth.js';

describe('Property 17: API Key Authentication', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Save original env
    originalEnv = process.env.DISPATCH_API_KEYS;
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv !== undefined) {
      process.env.DISPATCH_API_KEYS = originalEnv;
    } else {
      delete process.env.DISPATCH_API_KEYS;
    }
  });

  /**
   * Arbitrary generator for valid API key strings.
   * Generates non-empty strings without commas (since commas are delimiters).
   */
  const arbitraryApiKey = (): fc.Arbitrary<string> =>
    fc.string({ minLength: 1, maxLength: 64 })
      .filter((s) => s.trim().length > 0 && !s.includes(','));

  /**
   * Arbitrary generator for a set of valid API keys (1-5 keys).
   */
  const arbitraryApiKeySet = (): fc.Arbitrary<string[]> =>
    fc.array(arbitraryApiKey(), { minLength: 1, maxLength: 5 })
      .map((keys) => [...new Set(keys)]); // Ensure unique keys

  /**
   * Helper to create a mock request with optional API key header.
   */
  function createMockRequest(apiKey?: string): Partial<Request> {
    const headers: Record<string, string> = {};
    if (apiKey !== undefined) {
      headers['x-api-key'] = apiKey;
    }
    return {
      headers,
      correlationId: 'test-correlation-id',
      path: '/api/v1/dispatch',
      method: 'POST',
    };
  }

  /**
   * Helper to create a mock response that tracks status and json calls.
   */
  function createMockResponse(): {
    response: Partial<Response>;
    getStatus: () => number | undefined;
    getJson: () => unknown;
  } {
    let statusCode: number | undefined;
    let jsonBody: unknown;

    const response: Partial<Response> = {
      status: jest.fn().mockImplementation((code: number) => {
        statusCode = code;
        return response;
      }),
      json: jest.fn().mockImplementation((body: unknown) => {
        jsonBody = body;
        return response;
      }),
    };

    return {
      response,
      getStatus: () => statusCode,
      getJson: () => jsonBody,
    };
  }

  /**
   * Helper to configure API keys in environment.
   */
  function configureApiKeys(keys: string[]): void {
    process.env.DISPATCH_API_KEYS = keys.join(',');
  }

  describe('Requirement 9.1: Missing API key returns 401', () => {
    /**
     * Property: For any set of configured API keys, a request without
     * the X-API-Key header SHALL always be rejected with HTTP 401.
     */
    it('should always return 401 when X-API-Key header is missing', () => {
      fc.assert(
        fc.property(arbitraryApiKeySet(), (validKeys) => {
          // Configure the valid keys
          configureApiKeys(validKeys);

          // Create request WITHOUT API key header
          const mockRequest = createMockRequest(); // No API key
          const { response, getStatus } = createMockResponse();
          const nextFunction = jest.fn();

          // Execute middleware
          authMiddleware(
            mockRequest as Request,
            response as Response,
            nextFunction
          );

          // Assert: Should return 401
          expect(getStatus()).toBe(401);
          // Assert: next() should NOT be called
          expect(nextFunction).not.toHaveBeenCalled();
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 9.2: Invalid API key returns 401', () => {
    /**
     * Property: For any set of configured API keys and any key NOT in that set,
     * the request SHALL be rejected with HTTP 401.
     */
    it('should always return 401 when API key is not in configured set', () => {
      fc.assert(
        fc.property(
          arbitraryApiKeySet(),
          fc.string({ minLength: 1, maxLength: 64 }),
          (validKeys, potentialInvalidKey) => {
            // Skip if the generated key happens to be valid
            const trimmedKey = potentialInvalidKey.trim();
            if (validKeys.includes(trimmedKey) || trimmedKey.length === 0) {
              return true; // Skip this case
            }

            // Configure the valid keys
            configureApiKeys(validKeys);

            // Create request with invalid API key
            const mockRequest = createMockRequest(potentialInvalidKey);
            const { response, getStatus } = createMockResponse();
            const nextFunction = jest.fn();

            // Execute middleware
            authMiddleware(
              mockRequest as Request,
              response as Response,
              nextFunction
            );

            // Assert: Should return 401
            expect(getStatus()).toBe(401);
            // Assert: next() should NOT be called
            expect(nextFunction).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Empty string API keys should always be rejected.
     */
    it('should always return 401 for empty or whitespace-only API keys', () => {
      fc.assert(
        fc.property(
          arbitraryApiKeySet(),
          fc.constantFrom('', ' ', '  ', '\t', '\n', '   \t\n   '),
          (validKeys, emptyKey) => {
            // Configure the valid keys
            configureApiKeys(validKeys);

            // Create request with empty/whitespace API key
            const mockRequest = createMockRequest(emptyKey);
            const { response, getStatus } = createMockResponse();
            const nextFunction = jest.fn();

            // Execute middleware
            authMiddleware(
              mockRequest as Request,
              response as Response,
              nextFunction
            );

            // Assert: Should return 401
            expect(getStatus()).toBe(401);
            // Assert: next() should NOT be called
            expect(nextFunction).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 9.3: Valid API key allows request through', () => {
    /**
     * Property: For any set of configured API keys and any key FROM that set,
     * the request SHALL be processed (next() called, no 401).
     */
    it('should always call next() when API key is valid', () => {
      fc.assert(
        fc.property(
          arbitraryApiKeySet().filter((keys) => keys.length > 0),
          fc.nat(),
          (validKeys, keyIndex) => {
            // Configure the valid keys
            configureApiKeys(validKeys);

            // Select one of the valid keys
            const selectedKey = validKeys[keyIndex % validKeys.length];

            // Create request with valid API key
            const mockRequest = createMockRequest(selectedKey);
            const { response, getStatus } = createMockResponse();
            const nextFunction = jest.fn();

            // Execute middleware
            authMiddleware(
              mockRequest as Request,
              response as Response,
              nextFunction
            );

            // Assert: next() should be called
            expect(nextFunction).toHaveBeenCalledTimes(1);
            // Assert: Should NOT return 401
            expect(getStatus()).toBeUndefined();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Valid keys with leading/trailing whitespace should still work
     * (the middleware trims the key).
     */
    it('should accept valid API keys with surrounding whitespace', () => {
      fc.assert(
        fc.property(
          arbitraryApiKeySet().filter((keys) => keys.length > 0),
          fc.nat(),
          fc.constantFrom(' ', '  ', '\t'),
          (validKeys, keyIndex, whitespace) => {
            // Configure the valid keys
            configureApiKeys(validKeys);

            // Select one of the valid keys and add whitespace
            const selectedKey = validKeys[keyIndex % validKeys.length];
            const keyWithWhitespace = whitespace + selectedKey + whitespace;

            // Create request with valid API key (with whitespace)
            const mockRequest = createMockRequest(keyWithWhitespace);
            const { response, getStatus } = createMockResponse();
            const nextFunction = jest.fn();

            // Execute middleware
            authMiddleware(
              mockRequest as Request,
              response as Response,
              nextFunction
            );

            // Assert: next() should be called
            expect(nextFunction).toHaveBeenCalledTimes(1);
            // Assert: Should NOT return 401
            expect(getStatus()).toBeUndefined();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 9.4: Multiple API keys all work', () => {
    /**
     * Property: For any set of N configured API keys, ALL N keys should
     * be accepted by the middleware.
     */
    it('should accept every configured API key in a multi-key setup', () => {
      fc.assert(
        fc.property(
          arbitraryApiKeySet().filter((keys) => keys.length >= 2),
          (validKeys) => {
            // Configure the valid keys
            configureApiKeys(validKeys);

            // Test EVERY key in the set
            for (const key of validKeys) {
              const mockRequest = createMockRequest(key);
              const { response, getStatus } = createMockResponse();
              const nextFunction = jest.fn();

              // Execute middleware
              authMiddleware(
                mockRequest as Request,
                response as Response,
                nextFunction
              );

              // Assert: next() should be called for each valid key
              expect(nextFunction).toHaveBeenCalledTimes(1);
              // Assert: Should NOT return 401
              expect(getStatus()).toBeUndefined();
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: The order of keys in the configuration should not matter.
     */
    it('should accept keys regardless of their order in configuration', () => {
      fc.assert(
        fc.property(
          arbitraryApiKeySet().filter((keys) => keys.length >= 2),
          (validKeys) => {
            // Shuffle the keys for configuration
            const shuffledKeys = [...validKeys].sort(() => Math.random() - 0.5);
            configureApiKeys(shuffledKeys);

            // Test with original order keys
            for (const key of validKeys) {
              const mockRequest = createMockRequest(key);
              const { response, getStatus } = createMockResponse();
              const nextFunction = jest.fn();

              authMiddleware(
                mockRequest as Request,
                response as Response,
                nextFunction
              );

              expect(nextFunction).toHaveBeenCalledTimes(1);
              expect(getStatus()).toBeUndefined();
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('isValidApiKey function properties', () => {
    /**
     * Property: isValidApiKey should return true if and only if
     * the key is in the configured set.
     */
    it('should return true iff key is in configured set', () => {
      fc.assert(
        fc.property(
          arbitraryApiKeySet(),
          arbitraryApiKey(),
          (validKeys, testKey) => {
            configureApiKeys(validKeys);

            const result = isValidApiKey(testKey);
            const expectedResult = validKeys.includes(testKey.trim());

            expect(result).toBe(expectedResult);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: isValidApiKey should always return false for undefined/null.
     */
    it('should always return false for undefined', () => {
      fc.assert(
        fc.property(arbitraryApiKeySet(), (validKeys) => {
          configureApiKeys(validKeys);
          expect(isValidApiKey(undefined)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('getConfiguredApiKeys function properties', () => {
    /**
     * Property: getConfiguredApiKeys should return a set containing
     * exactly the non-empty, trimmed keys from the environment variable.
     */
    it('should parse and return all configured keys', () => {
      fc.assert(
        fc.property(arbitraryApiKeySet(), (validKeys) => {
          configureApiKeys(validKeys);

          const configuredKeys = getConfiguredApiKeys();

          // All configured keys should be in the returned set
          for (const key of validKeys) {
            expect(configuredKeys.has(key.trim())).toBe(true);
          }

          // The set size should match (accounting for duplicates)
          const uniqueKeys = new Set(validKeys.map((k) => k.trim()));
          expect(configuredKeys.size).toBe(uniqueKeys.size);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Empty environment variable should result in empty set.
     */
    it('should return empty set when no keys configured', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', undefined),
          (envValue) => {
            if (envValue === undefined) {
              delete process.env.DISPATCH_API_KEYS;
            } else {
              process.env.DISPATCH_API_KEYS = envValue;
            }

            const configuredKeys = getConfiguredApiKeys();
            expect(configuredKeys.size).toBe(0);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Error response structure', () => {
    /**
     * Property: All 401 responses should have consistent error structure.
     */
    it('should return consistent error structure for all rejections', () => {
      fc.assert(
        fc.property(
          arbitraryApiKeySet(),
          fc.option(fc.string({ minLength: 0, maxLength: 64 })),
          (validKeys, maybeInvalidKey) => {
            configureApiKeys(validKeys);

            // Use either no key or an invalid key
            const apiKey = maybeInvalidKey ?? undefined;
            const isValid = apiKey !== undefined && 
                           apiKey.trim().length > 0 && 
                           validKeys.includes(apiKey.trim());

            if (isValid) {
              return true; // Skip valid keys for this test
            }

            const mockRequest = createMockRequest(apiKey ?? undefined);
            const { response, getStatus, getJson } = createMockResponse();
            const nextFunction = jest.fn();

            authMiddleware(
              mockRequest as Request,
              response as Response,
              nextFunction
            );

            // Should return 401
            expect(getStatus()).toBe(401);

            // Should have proper error structure
            const jsonResponse = getJson() as {
              error: { code: string; message: string };
              requestId: string;
            };

            expect(jsonResponse).toHaveProperty('error');
            expect(jsonResponse.error).toHaveProperty('code', 'UNAUTHORIZED');
            expect(jsonResponse.error).toHaveProperty('message');
            expect(typeof jsonResponse.error.message).toBe('string');
            expect(jsonResponse).toHaveProperty('requestId');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
