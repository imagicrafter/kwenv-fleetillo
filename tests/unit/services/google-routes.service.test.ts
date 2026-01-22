/**
 * Unit tests for Google Routes Service
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { Mock } from 'jest-mock';
import {
  computeRoutes,
  computeRouteMatrix,
  batchComputeRoutes,
  getOptimalRoute,
  calculateRouteTotals,
  GoogleRoutesServiceError,
  GoogleRoutesErrorCodes,
} from '../../../src/services/google-routes.service';
import type {
  ComputeRoutesInput,
  ComputeRoutesResponse,
  ComputeRouteMatrixInput,
  Waypoint,
  Route,
  TravelMode,
} from '../../../src/types/google-routes';

// Mock the config module
jest.mock('../../../src/config/index.js', () => ({
  config: {
    googleMaps: {
      apiKey: 'test-api-key',
    },
  },
}));

// Mock the logger module
jest.mock('../../../src/utils/logger.js', () => ({
  createContextLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Store original fetch
const originalFetch = global.fetch;

describe('GoogleRoutesService', () => {
  let mockFetch: Mock<typeof fetch>;

  beforeEach(() => {
    // Create a fresh mock for each test
    mockFetch = jest.fn() as Mock<typeof fetch>;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('computeRoutes', () => {
    const validInput: ComputeRoutesInput = {
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
      travelMode: 'DRIVE' as TravelMode,
    };

    const mockSuccessResponse: ComputeRoutesResponse = {
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

    it('should successfully compute routes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockSuccessResponse),
      } as Response);

      const result = await computeRoutes(validInput);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.routes).toHaveLength(1);
        expect(result.data.routes[0]?.distanceMeters).toBe(615000);
        expect(result.data.routes[0]?.duration).toBe('21600s');
      }

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should fail when origin is missing', async () => {
      const invalidInput = {
        ...validInput,
        origin: {} as Waypoint,
      };

      const result = await computeRoutes(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(GoogleRoutesServiceError);
        expect((result.error as GoogleRoutesServiceError).code).toBe(
          GoogleRoutesErrorCodes.INVALID_WAYPOINT
        );
      }

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fail when destination is missing', async () => {
      const invalidInput = {
        ...validInput,
        destination: {} as Waypoint,
      };

      const result = await computeRoutes(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(GoogleRoutesServiceError);
        expect((result.error as GoogleRoutesServiceError).code).toBe(
          GoogleRoutesErrorCodes.INVALID_WAYPOINT
        );
      }

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fail when coordinates are invalid (latitude out of range)', async () => {
      const invalidInput: ComputeRoutesInput = {
        origin: {
          location: {
            latLng: { latitude: 91, longitude: -122.4194 }, // Invalid latitude
          },
        },
        destination: validInput.destination,
      };

      const result = await computeRoutes(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(GoogleRoutesServiceError);
        expect((result.error as GoogleRoutesServiceError).code).toBe(
          GoogleRoutesErrorCodes.INVALID_WAYPOINT
        );
      }

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fail when coordinates are invalid (longitude out of range)', async () => {
      const invalidInput: ComputeRoutesInput = {
        origin: validInput.origin,
        destination: {
          location: {
            latLng: { latitude: 34.0522, longitude: 200 }, // Invalid longitude
          },
        },
      };

      const result = await computeRoutes(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(GoogleRoutesServiceError);
        expect((result.error as GoogleRoutesServiceError).code).toBe(
          GoogleRoutesErrorCodes.INVALID_WAYPOINT
        );
      }

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fail when too many intermediate waypoints', async () => {
      const invalidInput: ComputeRoutesInput = {
        ...validInput,
        intermediates: Array(26).fill({
          location: { latLng: { latitude: 35.0, longitude: -120.0 } },
        }),
      };

      const result = await computeRoutes(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(GoogleRoutesServiceError);
        expect((result.error as GoogleRoutesServiceError).code).toBe(
          GoogleRoutesErrorCodes.MAX_WAYPOINTS_EXCEEDED
        );
      }

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle API quota exceeded error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => JSON.stringify({ error: { message: 'Quota exceeded' } }),
      } as Response);

      const result = await computeRoutes(validInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(GoogleRoutesServiceError);
        expect((result.error as GoogleRoutesServiceError).code).toBe(
          GoogleRoutesErrorCodes.QUOTA_EXCEEDED
        );
        expect((result.error as GoogleRoutesServiceError).isRetryable).toBe(true);
      }
    });

    it('should handle zero results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ routes: [] }),
      } as Response);

      const result = await computeRoutes(validInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(GoogleRoutesServiceError);
        expect((result.error as GoogleRoutesServiceError).code).toBe(
          GoogleRoutesErrorCodes.ZERO_RESULTS
        );
      }
    });

    it('should retry on transient failures', async () => {
      // First call fails with 503
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => JSON.stringify({ error: { message: 'Service temporarily unavailable' } }),
      } as Response);

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockSuccessResponse),
      } as Response);

      const result = await computeRoutes(validInput);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should accept waypoint with placeId', async () => {
      const placeIdInput: ComputeRoutesInput = {
        origin: {
          placeId: 'ChIJIQBpAG2ahYAR_6128GcTUEo', // San Francisco
        },
        destination: {
          placeId: 'ChIJE9on3F3HwoAR9AhGJW_fL-I', // Los Angeles
        },
        travelMode: 'DRIVE' as TravelMode,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockSuccessResponse),
      } as Response);

      const result = await computeRoutes(placeIdInput);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should accept waypoint with address', async () => {
      const addressInput: ComputeRoutesInput = {
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
        travelMode: 'DRIVE' as TravelMode,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockSuccessResponse),
      } as Response);

      const result = await computeRoutes(addressInput);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('computeRouteMatrix', () => {
    const validInput: ComputeRouteMatrixInput = {
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
      travelMode: 'DRIVE' as TravelMode,
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

    it('should successfully compute route matrix', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockMatrixResponse),
      } as Response);

      const result = await computeRouteMatrix(validInput);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.elements).toHaveLength(4);
        expect(result.data.elements[0]?.distanceMeters).toBe(615000);
      }

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should fail when origins are empty', async () => {
      const invalidInput: ComputeRouteMatrixInput = {
        ...validInput,
        origins: [],
      };

      const result = await computeRouteMatrix(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(GoogleRoutesServiceError);
        expect((result.error as GoogleRoutesServiceError).code).toBe(
          GoogleRoutesErrorCodes.INVALID_REQUEST
        );
      }

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fail when destinations are empty', async () => {
      const invalidInput: ComputeRouteMatrixInput = {
        ...validInput,
        destinations: [],
      };

      const result = await computeRouteMatrix(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(GoogleRoutesServiceError);
        expect((result.error as GoogleRoutesServiceError).code).toBe(
          GoogleRoutesErrorCodes.INVALID_REQUEST
        );
      }

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('batchComputeRoutes', () => {
    const mockSuccessResponse: ComputeRoutesResponse = {
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

    it('should process batch requests with concurrency limit', async () => {
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
            travelMode: 'DRIVE' as TravelMode,
          },
          requestId: `req-${i}`,
        }));

      // Mock all requests to succeed
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockSuccessResponse),
      } as Response);

      const result = await batchComputeRoutes(batchItems, {
        concurrency: 3,
        delayMs: 10,
      });

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data).toHaveLength(10);
        expect(result.data.every(r => r.success)).toBe(true);
      }

      expect(mockFetch).toHaveBeenCalledTimes(10);
    });

    it('should handle mixed success and failure in batch', async () => {
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
            travelMode: 'DRIVE' as TravelMode,
          },
          requestId: `req-${i}`,
        }));

      // First succeeds, second fails, third succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(mockSuccessResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: async () => JSON.stringify({ error: { message: 'Not found' } }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(mockSuccessResponse),
        } as Response);

      const result = await batchComputeRoutes(batchItems, {
        concurrency: 3,
        delayMs: 0,
      });

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data).toHaveLength(3);
        expect(result.data[0]?.success).toBe(true);
        expect(result.data[1]?.success).toBe(false);
        expect(result.data[2]?.success).toBe(true);
      }
    });

    it('should return empty array for empty batch', async () => {
      const result = await batchComputeRoutes([]);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data).toHaveLength(0);
      }

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Utility Functions', () => {
    describe('getOptimalRoute', () => {
      it('should return first route from response', () => {
        const response: ComputeRoutesResponse = {
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

        const optimal = getOptimalRoute(response);

        expect(optimal).toBeDefined();
        expect(optimal?.distanceMeters).toBe(100000);
      });

      it('should return undefined for empty routes', () => {
        const response: ComputeRoutesResponse = {
          routes: [],
        };

        const optimal = getOptimalRoute(response);

        expect(optimal).toBeUndefined();
      });
    });

    describe('calculateRouteTotals', () => {
      it('should calculate total distance and duration', () => {
        const route: Route = {
          legs: [],
          distanceMeters: 615000,
          duration: '21600s',
          staticDuration: '21000s',
        };

        const totals = calculateRouteTotals(route);

        expect(totals.totalDistanceMeters).toBe(615000);
        expect(totals.totalDurationSeconds).toBe(21600);
      });

      it('should handle missing values', () => {
        const route: Route = {
          legs: [],
          distanceMeters: 0,
          duration: '',
          staticDuration: '',
        };

        const totals = calculateRouteTotals(route);

        expect(totals.totalDistanceMeters).toBe(0);
        expect(totals.totalDurationSeconds).toBe(0);
      });
    });
  });
});
