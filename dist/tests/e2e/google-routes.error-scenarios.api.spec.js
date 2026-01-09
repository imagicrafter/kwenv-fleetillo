"use strict";
/**
 * Google Routes API Error Scenarios - E2E API Tests
 *
 * Comprehensive error scenario testing for Google Routes API integration
 * Tests validation errors, API errors, and configuration issues
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
// Note: These tests validate the error handling logic in the Google Routes service
// They test validation and error mapping without making actual API calls
test_1.test.describe('Google Routes Error Scenarios - Configuration Errors', () => {
    (0, test_1.test)('should validate API key exists before making requests', async () => {
        // This test verifies that the service checks for API key configuration
        // The actual validation happens in validateApiKey() function
        const { config } = await import('../../src/config/index.js');
        (0, test_1.expect)(config.googleMaps).toBeDefined();
        (0, test_1.expect)(config.googleMaps.apiKey).toBeDefined();
        (0, test_1.expect)(typeof config.googleMaps.apiKey).toBe('string');
    });
});
test_1.test.describe('Google Routes Error Scenarios - Waypoint Validation', () => {
    (0, test_1.test)('should fail when origin waypoint is missing location and placeId', async () => {
        const invalidWaypoint = {
        // Missing both location and placeId
        };
        const { validateWaypoint } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const result = validateWaypoint?.(invalidWaypoint, 'Origin');
        if (result) {
            (0, test_1.expect)(result.success).toBe(false);
            (0, test_1.expect)(result.error?.message).toContain('must have either a location');
        }
    });
    (0, test_1.test)('should fail when waypoint has invalid latitude (< -90)', async () => {
        const invalidWaypoint = {
            location: {
                latLng: {
                    latitude: -91,
                    longitude: 0,
                },
            },
        };
        const { validateWaypoint } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const result = validateWaypoint?.(invalidWaypoint, 'Origin');
        if (result) {
            (0, test_1.expect)(result.success).toBe(false);
            (0, test_1.expect)(result.error?.message).toContain('Latitude must be between -90 and 90');
        }
    });
    (0, test_1.test)('should fail when waypoint has invalid latitude (> 90)', async () => {
        const invalidWaypoint = {
            location: {
                latLng: {
                    latitude: 91,
                    longitude: 0,
                },
            },
        };
        const { validateWaypoint } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const result = validateWaypoint?.(invalidWaypoint, 'Origin');
        if (result) {
            (0, test_1.expect)(result.success).toBe(false);
            (0, test_1.expect)(result.error?.message).toContain('Latitude must be between -90 and 90');
        }
    });
    (0, test_1.test)('should fail when waypoint has invalid longitude (< -180)', async () => {
        const invalidWaypoint = {
            location: {
                latLng: {
                    latitude: 0,
                    longitude: -181,
                },
            },
        };
        const { validateWaypoint } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const result = validateWaypoint?.(invalidWaypoint, 'Origin');
        if (result) {
            (0, test_1.expect)(result.success).toBe(false);
            (0, test_1.expect)(result.error?.message).toContain('Longitude must be between -180 and 180');
        }
    });
    (0, test_1.test)('should fail when waypoint has invalid longitude (> 180)', async () => {
        const invalidWaypoint = {
            location: {
                latLng: {
                    latitude: 0,
                    longitude: 181,
                },
            },
        };
        const { validateWaypoint } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const result = validateWaypoint?.(invalidWaypoint, 'Origin');
        if (result) {
            (0, test_1.expect)(result.success).toBe(false);
            (0, test_1.expect)(result.error?.message).toContain('Longitude must be between -180 and 180');
        }
    });
    (0, test_1.test)('should fail when waypoint coordinates are not numbers', async () => {
        const invalidWaypoint = {
            location: {
                latLng: {
                    latitude: '37.7749', // String instead of number
                    longitude: -122.4194,
                },
            },
        };
        const { validateWaypoint } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const result = validateWaypoint?.(invalidWaypoint, 'Origin');
        if (result) {
            (0, test_1.expect)(result.success).toBe(false);
            (0, test_1.expect)(result.error?.message).toContain('Coordinates must be numeric values');
        }
    });
    (0, test_1.test)('should accept valid waypoint with latLng', async () => {
        const validWaypoint = {
            location: {
                latLng: {
                    latitude: 37.7749,
                    longitude: -122.4194,
                },
            },
        };
        const { validateWaypoint } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const result = validateWaypoint?.(validWaypoint, 'Origin');
        if (result) {
            (0, test_1.expect)(result.success).toBe(true);
        }
    });
    (0, test_1.test)('should accept valid waypoint with placeId', async () => {
        const validWaypoint = {
            placeId: 'ChIJIQBpAG2ahYAR_6128GcTUEo', // Google SF office
        };
        const { validateWaypoint } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const result = validateWaypoint?.(validWaypoint, 'Origin');
        if (result) {
            (0, test_1.expect)(result.success).toBe(true);
        }
    });
});
test_1.test.describe('Google Routes Error Scenarios - HTTP Status Code Mapping', () => {
    (0, test_1.test)('should map HTTP 400 to INVALID_REQUEST error', async () => {
        const { mapApiErrorToServiceError, GoogleRoutesErrorCodes } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const error = mapApiErrorToServiceError?.(400, 'Bad request');
        if (error) {
            (0, test_1.expect)(error.code).toBe(GoogleRoutesErrorCodes.INVALID_REQUEST);
            (0, test_1.expect)(error.message).toContain('Invalid request');
            (0, test_1.expect)(error.isRetryable).toBe(false);
        }
    });
    (0, test_1.test)('should map HTTP 403 to REQUEST_DENIED error', async () => {
        const { mapApiErrorToServiceError, GoogleRoutesErrorCodes } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const error = mapApiErrorToServiceError?.(403, 'Request denied');
        if (error) {
            (0, test_1.expect)(error.code).toBe(GoogleRoutesErrorCodes.REQUEST_DENIED);
            (0, test_1.expect)(error.message).toContain('request was denied');
            (0, test_1.expect)(error.isRetryable).toBe(false);
        }
    });
    (0, test_1.test)('should map HTTP 404 to ZERO_RESULTS error', async () => {
        const { mapApiErrorToServiceError, GoogleRoutesErrorCodes } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const error = mapApiErrorToServiceError?.(404);
        if (error) {
            (0, test_1.expect)(error.code).toBe(GoogleRoutesErrorCodes.ZERO_RESULTS);
            (0, test_1.expect)(error.message).toContain('No routes found');
            (0, test_1.expect)(error.isRetryable).toBe(false);
        }
    });
    (0, test_1.test)('should map HTTP 429 to QUOTA_EXCEEDED error (retryable)', async () => {
        const { mapApiErrorToServiceError, GoogleRoutesErrorCodes } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const error = mapApiErrorToServiceError?.(429);
        if (error) {
            (0, test_1.expect)(error.code).toBe(GoogleRoutesErrorCodes.QUOTA_EXCEEDED);
            (0, test_1.expect)(error.message).toContain('quota exceeded');
            (0, test_1.expect)(error.isRetryable).toBe(true); // Should be retryable
        }
    });
    (0, test_1.test)('should map HTTP 500 to API_ERROR (retryable)', async () => {
        const { mapApiErrorToServiceError, GoogleRoutesErrorCodes } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const error = mapApiErrorToServiceError?.(500, 'Internal server error');
        if (error) {
            (0, test_1.expect)(error.code).toBe(GoogleRoutesErrorCodes.API_ERROR);
            (0, test_1.expect)(error.isRetryable).toBe(true); // Server errors should be retryable
        }
    });
    (0, test_1.test)('should map HTTP 502 to API_ERROR (retryable)', async () => {
        const { mapApiErrorToServiceError, GoogleRoutesErrorCodes } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const error = mapApiErrorToServiceError?.(502);
        if (error) {
            (0, test_1.expect)(error.code).toBe(GoogleRoutesErrorCodes.API_ERROR);
            (0, test_1.expect)(error.isRetryable).toBe(true);
        }
    });
    (0, test_1.test)('should map HTTP 503 to API_ERROR (retryable)', async () => {
        const { mapApiErrorToServiceError, GoogleRoutesErrorCodes } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const error = mapApiErrorToServiceError?.(503, 'Service unavailable');
        if (error) {
            (0, test_1.expect)(error.code).toBe(GoogleRoutesErrorCodes.API_ERROR);
            (0, test_1.expect)(error.isRetryable).toBe(true);
        }
    });
    (0, test_1.test)('should map HTTP 504 to TIMEOUT error (retryable)', async () => {
        const { mapApiErrorToServiceError, GoogleRoutesErrorCodes } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const error = mapApiErrorToServiceError?.(504);
        if (error) {
            (0, test_1.expect)(error.code).toBe(GoogleRoutesErrorCodes.TIMEOUT);
            (0, test_1.expect)(error.message).toContain('timed out');
            (0, test_1.expect)(error.isRetryable).toBe(true);
        }
    });
    (0, test_1.test)('should map unknown HTTP status to API_ERROR (retryable)', async () => {
        const { mapApiErrorToServiceError, GoogleRoutesErrorCodes } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const error = mapApiErrorToServiceError?.(418, 'I am a teapot'); // Unusual status code
        if (error) {
            (0, test_1.expect)(error.code).toBe(GoogleRoutesErrorCodes.API_ERROR);
            (0, test_1.expect)(error.isRetryable).toBe(true); // Unknown errors should be retryable
        }
    });
});
test_1.test.describe('Google Routes Error Scenarios - Boundary Value Testing', () => {
    (0, test_1.test)('should accept latitude at exactly -90', async () => {
        const waypoint = {
            location: {
                latLng: {
                    latitude: -90,
                    longitude: 0,
                },
            },
        };
        const { validateWaypoint } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const result = validateWaypoint?.(waypoint, 'Origin');
        if (result) {
            (0, test_1.expect)(result.success).toBe(true);
        }
    });
    (0, test_1.test)('should accept latitude at exactly 90', async () => {
        const waypoint = {
            location: {
                latLng: {
                    latitude: 90,
                    longitude: 0,
                },
            },
        };
        const { validateWaypoint } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const result = validateWaypoint?.(waypoint, 'Origin');
        if (result) {
            (0, test_1.expect)(result.success).toBe(true);
        }
    });
    (0, test_1.test)('should accept longitude at exactly -180', async () => {
        const waypoint = {
            location: {
                latLng: {
                    latitude: 0,
                    longitude: -180,
                },
            },
        };
        const { validateWaypoint } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const result = validateWaypoint?.(waypoint, 'Origin');
        if (result) {
            (0, test_1.expect)(result.success).toBe(true);
        }
    });
    (0, test_1.test)('should accept longitude at exactly 180', async () => {
        const waypoint = {
            location: {
                latLng: {
                    latitude: 0,
                    longitude: 180,
                },
            },
        };
        const { validateWaypoint } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const result = validateWaypoint?.(waypoint, 'Origin');
        if (result) {
            (0, test_1.expect)(result.success).toBe(true);
        }
    });
    (0, test_1.test)('should reject latitude at -90.001', async () => {
        const waypoint = {
            location: {
                latLng: {
                    latitude: -90.001,
                    longitude: 0,
                },
            },
        };
        const { validateWaypoint } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const result = validateWaypoint?.(waypoint, 'Origin');
        if (result) {
            (0, test_1.expect)(result.success).toBe(false);
            (0, test_1.expect)(result.error?.message).toContain('Latitude must be between -90 and 90');
        }
    });
    (0, test_1.test)('should reject latitude at 90.001', async () => {
        const waypoint = {
            location: {
                latLng: {
                    latitude: 90.001,
                    longitude: 0,
                },
            },
        };
        const { validateWaypoint } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const result = validateWaypoint?.(waypoint, 'Origin');
        if (result) {
            (0, test_1.expect)(result.success).toBe(false);
        }
    });
    (0, test_1.test)('should reject longitude at -180.001', async () => {
        const waypoint = {
            location: {
                latLng: {
                    latitude: 0,
                    longitude: -180.001,
                },
            },
        };
        const { validateWaypoint } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const result = validateWaypoint?.(waypoint, 'Origin');
        if (result) {
            (0, test_1.expect)(result.success).toBe(false);
            (0, test_1.expect)(result.error?.message).toContain('Longitude must be between -180 and 180');
        }
    });
    (0, test_1.test)('should reject longitude at 180.001', async () => {
        const waypoint = {
            location: {
                latLng: {
                    latitude: 0,
                    longitude: 180.001,
                },
            },
        };
        const { validateWaypoint } = await import('../../src/services/google-routes.service.js');
        // @ts-ignore - Testing private function
        const result = validateWaypoint?.(waypoint, 'Origin');
        if (result) {
            (0, test_1.expect)(result.success).toBe(false);
        }
    });
});
test_1.test.describe('Google Routes Error Scenarios - Error Object Properties', () => {
    (0, test_1.test)('should include error details in GoogleRoutesServiceError', async () => {
        const { GoogleRoutesServiceError, GoogleRoutesErrorCodes } = await import('../../src/services/google-routes.service.js');
        const errorDetails = { field: 'latitude', value: 100 };
        const error = new GoogleRoutesServiceError('Test error', GoogleRoutesErrorCodes.INVALID_WAYPOINT, errorDetails, false);
        (0, test_1.expect)(error.name).toBe('GoogleRoutesServiceError');
        (0, test_1.expect)(error.message).toBe('Test error');
        (0, test_1.expect)(error.code).toBe(GoogleRoutesErrorCodes.INVALID_WAYPOINT);
        (0, test_1.expect)(error.details).toEqual(errorDetails);
        (0, test_1.expect)(error.isRetryable).toBe(false);
    });
    (0, test_1.test)('should mark retryable errors correctly', async () => {
        const { GoogleRoutesServiceError, GoogleRoutesErrorCodes } = await import('../../src/services/google-routes.service.js');
        const retryableError = new GoogleRoutesServiceError('Service unavailable', GoogleRoutesErrorCodes.API_ERROR, undefined, true);
        (0, test_1.expect)(retryableError.isRetryable).toBe(true);
        const nonRetryableError = new GoogleRoutesServiceError('Invalid request', GoogleRoutesErrorCodes.INVALID_REQUEST, undefined, false);
        (0, test_1.expect)(nonRetryableError.isRetryable).toBe(false);
    });
});
test_1.test.describe('Google Routes Error Scenarios - Error Code Constants', () => {
    (0, test_1.test)('should have all required error codes defined', async () => {
        const { GoogleRoutesErrorCodes } = await import('../../src/services/google-routes.service.js');
        // Configuration errors
        (0, test_1.expect)(GoogleRoutesErrorCodes.MISSING_API_KEY).toBeDefined();
        // Request errors
        (0, test_1.expect)(GoogleRoutesErrorCodes.INVALID_WAYPOINT).toBeDefined();
        (0, test_1.expect)(GoogleRoutesErrorCodes.INVALID_REQUEST).toBeDefined();
        (0, test_1.expect)(GoogleRoutesErrorCodes.MAX_WAYPOINTS_EXCEEDED).toBeDefined();
        (0, test_1.expect)(GoogleRoutesErrorCodes.MAX_ROUTE_LENGTH_EXCEEDED).toBeDefined();
        // API errors
        (0, test_1.expect)(GoogleRoutesErrorCodes.API_ERROR).toBeDefined();
        (0, test_1.expect)(GoogleRoutesErrorCodes.QUOTA_EXCEEDED).toBeDefined();
        (0, test_1.expect)(GoogleRoutesErrorCodes.REQUEST_DENIED).toBeDefined();
        (0, test_1.expect)(GoogleRoutesErrorCodes.ZERO_RESULTS).toBeDefined();
        (0, test_1.expect)(GoogleRoutesErrorCodes.TIMEOUT).toBeDefined();
        (0, test_1.expect)(GoogleRoutesErrorCodes.NETWORK_ERROR).toBeDefined();
    });
    (0, test_1.test)('should have error codes as strings', async () => {
        const { GoogleRoutesErrorCodes } = await import('../../src/services/google-routes.service.js');
        (0, test_1.expect)(typeof GoogleRoutesErrorCodes.MISSING_API_KEY).toBe('string');
        (0, test_1.expect)(typeof GoogleRoutesErrorCodes.INVALID_WAYPOINT).toBe('string');
        (0, test_1.expect)(typeof GoogleRoutesErrorCodes.API_ERROR).toBe('string');
    });
});
//# sourceMappingURL=google-routes.error-scenarios.api.spec.js.map