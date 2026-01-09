"use strict";
/**
 * Unit tests for Google Routes Service
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const google_routes_service_js_1 = require("../../../src/services/google-routes.service.js");
// Mock the config module
globals_1.jest.mock('../../../src/config/index.js', () => ({
    config: {
        googleMaps: {
            apiKey: 'test-api-key',
        },
    },
}));
// Mock the logger module
globals_1.jest.mock('../../../src/utils/logger.js', () => ({
    createContextLogger: () => ({
        info: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
    }),
}));
// Store original fetch
const originalFetch = global.fetch;
(0, globals_1.describe)('GoogleRoutesService', () => {
    let mockFetch;
    (0, globals_1.beforeEach)(() => {
        // Create a fresh mock for each test
        mockFetch = globals_1.jest.fn();
        global.fetch = mockFetch;
    });
    (0, globals_1.afterEach)(() => {
        // Restore original fetch
        global.fetch = originalFetch;
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('computeRoutes', () => {
        const validInput = {
            origin: {
                location: {
                    latLng: { latitude: 37.7749, longitude: -122.4194 }, // San Francisco
                },
            },
            destination: {
                location: {
                    latLng: { latitude: 34.0522, longitude: -118.2437 }, // Los Angeles
                },
            },
            travelMode: 'DRIVE',
        };
        const mockSuccessResponse = {
            routes: [
                {
                    legs: [
                        {
                            distanceMeters: 615000,
                            duration: '21600s', // 6 hours
                            staticDuration: '21000s',
                            startLocation: { latLng: { latitude: 37.7749, longitude: -122.4194 } },
                            endLocation: { latLng: { latitude: 34.0522, longitude: -118.2437 } },
                        },
                    ],
                    distanceMeters: 615000,
                    duration: '21600s',
                    staticDuration: '21000s',
                    polyline: {
                        encodedPolyline: 'mockEncodedPolyline',
                    },
                },
            ],
        };
        (0, globals_1.it)('should successfully compute routes', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: async () => JSON.stringify(mockSuccessResponse),
            });
            const result = await (0, google_routes_service_js_1.computeRoutes)(validInput);
            (0, globals_1.expect)(result.success).toBe(true);
            if (result.success && result.data) {
                (0, globals_1.expect)(result.data.routes).toHaveLength(1);
                (0, globals_1.expect)(result.data.routes[0]?.distanceMeters).toBe(615000);
                (0, globals_1.expect)(result.data.routes[0]?.duration).toBe('21600s');
            }
            (0, globals_1.expect)(mockFetch).toHaveBeenCalledTimes(1);
        });
        (0, globals_1.it)('should fail when origin is missing', async () => {
            const invalidInput = {
                ...validInput,
                origin: {},
            };
            const result = await (0, google_routes_service_js_1.computeRoutes)(invalidInput);
            (0, globals_1.expect)(result.success).toBe(false);
            if (!result.success) {
                (0, globals_1.expect)(result.error).toBeInstanceOf(google_routes_service_js_1.GoogleRoutesServiceError);
                (0, globals_1.expect)(result.error.code).toBe(google_routes_service_js_1.GoogleRoutesErrorCodes.INVALID_WAYPOINT);
            }
            (0, globals_1.expect)(mockFetch).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should fail when destination is missing', async () => {
            const invalidInput = {
                ...validInput,
                destination: {},
            };
            const result = await (0, google_routes_service_js_1.computeRoutes)(invalidInput);
            (0, globals_1.expect)(result.success).toBe(false);
            if (!result.success) {
                (0, globals_1.expect)(result.error).toBeInstanceOf(google_routes_service_js_1.GoogleRoutesServiceError);
                (0, globals_1.expect)(result.error.code).toBe(google_routes_service_js_1.GoogleRoutesErrorCodes.INVALID_WAYPOINT);
            }
            (0, globals_1.expect)(mockFetch).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should fail when coordinates are invalid (latitude out of range)', async () => {
            const invalidInput = {
                origin: {
                    location: {
                        latLng: { latitude: 91, longitude: -122.4194 }, // Invalid latitude
                    },
                },
                destination: validInput.destination,
            };
            const result = await (0, google_routes_service_js_1.computeRoutes)(invalidInput);
            (0, globals_1.expect)(result.success).toBe(false);
            if (!result.success) {
                (0, globals_1.expect)(result.error).toBeInstanceOf(google_routes_service_js_1.GoogleRoutesServiceError);
                (0, globals_1.expect)(result.error.code).toBe(google_routes_service_js_1.GoogleRoutesErrorCodes.INVALID_WAYPOINT);
            }
            (0, globals_1.expect)(mockFetch).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should fail when coordinates are invalid (longitude out of range)', async () => {
            const invalidInput = {
                origin: validInput.origin,
                destination: {
                    location: {
                        latLng: { latitude: 34.0522, longitude: 200 }, // Invalid longitude
                    },
                },
            };
            const result = await (0, google_routes_service_js_1.computeRoutes)(invalidInput);
            (0, globals_1.expect)(result.success).toBe(false);
            if (!result.success) {
                (0, globals_1.expect)(result.error).toBeInstanceOf(google_routes_service_js_1.GoogleRoutesServiceError);
                (0, globals_1.expect)(result.error.code).toBe(google_routes_service_js_1.GoogleRoutesErrorCodes.INVALID_WAYPOINT);
            }
            (0, globals_1.expect)(mockFetch).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should fail when too many intermediate waypoints', async () => {
            const invalidInput = {
                ...validInput,
                intermediates: Array(26).fill({
                    location: { latLng: { latitude: 35.0, longitude: -120.0 } },
                }),
            };
            const result = await (0, google_routes_service_js_1.computeRoutes)(invalidInput);
            (0, globals_1.expect)(result.success).toBe(false);
            if (!result.success) {
                (0, globals_1.expect)(result.error).toBeInstanceOf(google_routes_service_js_1.GoogleRoutesServiceError);
                (0, globals_1.expect)(result.error.code).toBe(google_routes_service_js_1.GoogleRoutesErrorCodes.MAX_WAYPOINTS_EXCEEDED);
            }
            (0, globals_1.expect)(mockFetch).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle API quota exceeded error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests',
                text: async () => JSON.stringify({ error: { message: 'Quota exceeded' } }),
            });
            const result = await (0, google_routes_service_js_1.computeRoutes)(validInput);
            (0, globals_1.expect)(result.success).toBe(false);
            if (!result.success) {
                (0, globals_1.expect)(result.error).toBeInstanceOf(google_routes_service_js_1.GoogleRoutesServiceError);
                (0, globals_1.expect)(result.error.code).toBe(google_routes_service_js_1.GoogleRoutesErrorCodes.QUOTA_EXCEEDED);
                (0, globals_1.expect)(result.error.isRetryable).toBe(true);
            }
        });
        (0, globals_1.it)('should handle zero results', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: async () => JSON.stringify({ routes: [] }),
            });
            const result = await (0, google_routes_service_js_1.computeRoutes)(validInput);
            (0, globals_1.expect)(result.success).toBe(false);
            if (!result.success) {
                (0, globals_1.expect)(result.error).toBeInstanceOf(google_routes_service_js_1.GoogleRoutesServiceError);
                (0, globals_1.expect)(result.error.code).toBe(google_routes_service_js_1.GoogleRoutesErrorCodes.ZERO_RESULTS);
            }
        });
        (0, globals_1.it)('should retry on transient failures', async () => {
            // First call fails with 503
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 503,
                statusText: 'Service Unavailable',
                text: async () => JSON.stringify({ error: { message: 'Service temporarily unavailable' } }),
            });
            // Second call succeeds
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: async () => JSON.stringify(mockSuccessResponse),
            });
            const result = await (0, google_routes_service_js_1.computeRoutes)(validInput);
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(mockFetch).toHaveBeenCalledTimes(2);
        });
        (0, globals_1.it)('should accept waypoint with placeId', async () => {
            const placeIdInput = {
                origin: {
                    placeId: 'ChIJIQBpAG2ahYAR_6128GcTUEo', // San Francisco
                },
                destination: {
                    placeId: 'ChIJE9on3F3HwoAR9AhGJW_fL-I', // Los Angeles
                },
                travelMode: 'DRIVE',
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: async () => JSON.stringify(mockSuccessResponse),
            });
            const result = await (0, google_routes_service_js_1.computeRoutes)(placeIdInput);
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(mockFetch).toHaveBeenCalledTimes(1);
        });
        (0, globals_1.it)('should accept waypoint with address', async () => {
            const addressInput = {
                origin: {
                    location: {
                        address: 'San Francisco, CA',
                    },
                },
                destination: {
                    location: {
                        address: 'Los Angeles, CA',
                    },
                },
                travelMode: 'DRIVE',
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: async () => JSON.stringify(mockSuccessResponse),
            });
            const result = await (0, google_routes_service_js_1.computeRoutes)(addressInput);
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(mockFetch).toHaveBeenCalledTimes(1);
        });
    });
    (0, globals_1.describe)('computeRouteMatrix', () => {
        const validInput = {
            origins: [
                {
                    waypoint: {
                        location: { latLng: { latitude: 37.7749, longitude: -122.4194 } },
                    },
                },
                {
                    waypoint: {
                        location: { latLng: { latitude: 37.3382, longitude: -121.8863 } },
                    },
                },
            ],
            destinations: [
                {
                    waypoint: {
                        location: { latLng: { latitude: 34.0522, longitude: -118.2437 } },
                    },
                },
                {
                    waypoint: {
                        location: { latLng: { latitude: 32.7157, longitude: -117.1611 } },
                    },
                },
            ],
            travelMode: 'DRIVE',
        };
        const mockMatrixResponse = {
            elements: [
                {
                    originIndex: 0,
                    destinationIndex: 0,
                    distanceMeters: 615000,
                    duration: '21600s',
                    staticDuration: '21000s',
                },
                {
                    originIndex: 0,
                    destinationIndex: 1,
                    distanceMeters: 740000,
                    duration: '25200s',
                    staticDuration: '24600s',
                },
                {
                    originIndex: 1,
                    destinationIndex: 0,
                    distanceMeters: 550000,
                    duration: '19800s',
                    staticDuration: '19200s',
                },
                {
                    originIndex: 1,
                    destinationIndex: 1,
                    distanceMeters: 675000,
                    duration: '23400s',
                    staticDuration: '22800s',
                },
            ],
        };
        (0, globals_1.it)('should successfully compute route matrix', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: async () => JSON.stringify(mockMatrixResponse),
            });
            const result = await (0, google_routes_service_js_1.computeRouteMatrix)(validInput);
            (0, globals_1.expect)(result.success).toBe(true);
            if (result.success && result.data) {
                (0, globals_1.expect)(result.data.elements).toHaveLength(4);
                (0, globals_1.expect)(result.data.elements[0]?.distanceMeters).toBe(615000);
            }
            (0, globals_1.expect)(mockFetch).toHaveBeenCalledTimes(1);
        });
        (0, globals_1.it)('should fail when origins are empty', async () => {
            const invalidInput = {
                ...validInput,
                origins: [],
            };
            const result = await (0, google_routes_service_js_1.computeRouteMatrix)(invalidInput);
            (0, globals_1.expect)(result.success).toBe(false);
            if (!result.success) {
                (0, globals_1.expect)(result.error).toBeInstanceOf(google_routes_service_js_1.GoogleRoutesServiceError);
                (0, globals_1.expect)(result.error.code).toBe(google_routes_service_js_1.GoogleRoutesErrorCodes.INVALID_REQUEST);
            }
            (0, globals_1.expect)(mockFetch).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should fail when destinations are empty', async () => {
            const invalidInput = {
                ...validInput,
                destinations: [],
            };
            const result = await (0, google_routes_service_js_1.computeRouteMatrix)(invalidInput);
            (0, globals_1.expect)(result.success).toBe(false);
            if (!result.success) {
                (0, globals_1.expect)(result.error).toBeInstanceOf(google_routes_service_js_1.GoogleRoutesServiceError);
                (0, globals_1.expect)(result.error.code).toBe(google_routes_service_js_1.GoogleRoutesErrorCodes.INVALID_REQUEST);
            }
            (0, globals_1.expect)(mockFetch).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('batchComputeRoutes', () => {
        const mockSuccessResponse = {
            routes: [
                {
                    legs: [
                        {
                            distanceMeters: 100000,
                            duration: '3600s',
                            staticDuration: '3500s',
                            startLocation: { latLng: { latitude: 37.7749, longitude: -122.4194 } },
                            endLocation: { latLng: { latitude: 37.3382, longitude: -121.8863 } },
                        },
                    ],
                    distanceMeters: 100000,
                    duration: '3600s',
                    staticDuration: '3500s',
                },
            ],
        };
        (0, globals_1.it)('should process batch requests with concurrency limit', async () => {
            const batchItems = Array(10)
                .fill(null)
                .map((_, i) => ({
                input: {
                    origin: {
                        location: { latLng: { latitude: 37.7749, longitude: -122.4194 } },
                    },
                    destination: {
                        location: { latLng: { latitude: 37.3382 + i * 0.1, longitude: -121.8863 } },
                    },
                    travelMode: 'DRIVE',
                },
                requestId: `req-${i}`,
            }));
            // Mock all requests to succeed
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                text: async () => JSON.stringify(mockSuccessResponse),
            });
            const result = await (0, google_routes_service_js_1.batchComputeRoutes)(batchItems, {
                concurrency: 3,
                delayMs: 10,
            });
            (0, globals_1.expect)(result.success).toBe(true);
            if (result.success && result.data) {
                (0, globals_1.expect)(result.data).toHaveLength(10);
                (0, globals_1.expect)(result.data.every(r => r.success)).toBe(true);
            }
            (0, globals_1.expect)(mockFetch).toHaveBeenCalledTimes(10);
        });
        (0, globals_1.it)('should handle mixed success and failure in batch', async () => {
            const batchItems = Array(3)
                .fill(null)
                .map((_, i) => ({
                input: {
                    origin: {
                        location: { latLng: { latitude: 37.7749, longitude: -122.4194 } },
                    },
                    destination: {
                        location: { latLng: { latitude: 37.3382, longitude: -121.8863 } },
                    },
                    travelMode: 'DRIVE',
                },
                requestId: `req-${i}`,
            }));
            // First succeeds, second fails, third succeeds
            mockFetch
                .mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: async () => JSON.stringify(mockSuccessResponse),
            })
                .mockResolvedValueOnce({
                ok: false,
                status: 404,
                text: async () => JSON.stringify({ error: { message: 'Not found' } }),
            })
                .mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: async () => JSON.stringify(mockSuccessResponse),
            });
            const result = await (0, google_routes_service_js_1.batchComputeRoutes)(batchItems, {
                concurrency: 3,
                delayMs: 0,
            });
            (0, globals_1.expect)(result.success).toBe(true);
            if (result.success && result.data) {
                (0, globals_1.expect)(result.data).toHaveLength(3);
                (0, globals_1.expect)(result.data[0]?.success).toBe(true);
                (0, globals_1.expect)(result.data[1]?.success).toBe(false);
                (0, globals_1.expect)(result.data[2]?.success).toBe(true);
            }
        });
        (0, globals_1.it)('should return empty array for empty batch', async () => {
            const result = await (0, google_routes_service_js_1.batchComputeRoutes)([]);
            (0, globals_1.expect)(result.success).toBe(true);
            if (result.success && result.data) {
                (0, globals_1.expect)(result.data).toHaveLength(0);
            }
            (0, globals_1.expect)(mockFetch).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('Utility Functions', () => {
        (0, globals_1.describe)('getOptimalRoute', () => {
            (0, globals_1.it)('should return first route from response', () => {
                const response = {
                    routes: [
                        {
                            legs: [],
                            distanceMeters: 100000,
                            duration: '3600s',
                            staticDuration: '3500s',
                        },
                        {
                            legs: [],
                            distanceMeters: 120000,
                            duration: '4200s',
                            staticDuration: '4100s',
                        },
                    ],
                };
                const optimal = (0, google_routes_service_js_1.getOptimalRoute)(response);
                (0, globals_1.expect)(optimal).toBeDefined();
                (0, globals_1.expect)(optimal?.distanceMeters).toBe(100000);
            });
            (0, globals_1.it)('should return undefined for empty routes', () => {
                const response = {
                    routes: [],
                };
                const optimal = (0, google_routes_service_js_1.getOptimalRoute)(response);
                (0, globals_1.expect)(optimal).toBeUndefined();
            });
        });
        (0, globals_1.describe)('calculateRouteTotals', () => {
            (0, globals_1.it)('should calculate total distance and duration', () => {
                const route = {
                    legs: [],
                    distanceMeters: 615000,
                    duration: '21600s',
                    staticDuration: '21000s',
                };
                const totals = (0, google_routes_service_js_1.calculateRouteTotals)(route);
                (0, globals_1.expect)(totals.totalDistanceMeters).toBe(615000);
                (0, globals_1.expect)(totals.totalDurationSeconds).toBe(21600);
            });
            (0, globals_1.it)('should handle missing values', () => {
                const route = {
                    legs: [],
                    distanceMeters: 0,
                    duration: '',
                    staticDuration: '',
                };
                const totals = (0, google_routes_service_js_1.calculateRouteTotals)(route);
                (0, globals_1.expect)(totals.totalDistanceMeters).toBe(0);
                (0, globals_1.expect)(totals.totalDurationSeconds).toBe(0);
            });
        });
    });
});
//# sourceMappingURL=google-routes.service.test.js.map