/**
 * Unit tests for Route Planning Service
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { Mock } from 'jest-mock';

// Mock all dependencies before importing the service
jest.mock('../../../src/utils/logger.js', () => ({
    createContextLogger: () => ({
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    }),
}));

jest.mock('../../../src/services/booking.service.js', () => ({
    getBookings: jest.fn(),
    updateBooking: jest.fn(),
}));

jest.mock('../../../src/services/vehicle.service.js', () => ({
    getVehiclesByServiceType: jest.fn(),
}));

jest.mock('../../../src/services/route.service.js', () => ({
    createRoute: jest.fn(),
}));

jest.mock('../../../src/services/google-routes.service.js', () => ({
    computeRoutes: jest.fn(),
}));

// Import the service after mocks are set up
import {
    planRoutes,
    PlanRoutesInput,
    RoutePlanningServiceError,
    RoutePlanningErrorCodes,
} from '../../../src/services/route-planning.service';
import { getBookings, updateBooking } from '../../../src/services/booking.service';
import { getVehiclesByServiceType } from '../../../src/services/vehicle.service';
import { createRoute } from '../../../src/services/route.service';
import { computeRoutes } from '../../../src/services/google-routes.service';
import type { Booking } from '../../../src/types/booking';
import type { Vehicle } from '../../../src/types/vehicle';

// Cast mocks for easier use
const mockGetBookings = getBookings as Mock<typeof getBookings>;
const mockUpdateBooking = updateBooking as Mock<typeof updateBooking>;
const mockGetVehiclesByServiceType = getVehiclesByServiceType as Mock<typeof getVehiclesByServiceType>;
const mockCreateRoute = createRoute as Mock<typeof createRoute>;
const mockComputeRoutes = computeRoutes as Mock<typeof computeRoutes>;

describe('RoutePlanningService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    // Helper to create mock bookings
    function createMockBooking(overrides: Partial<Booking> = {}): Booking {
        return {
            id: `booking-${Math.random().toString(36).substr(2, 9)}`,
            clientId: 'client-1',
            serviceId: 'service-1',
            bookingType: 'one_time',
            scheduledDate: new Date('2024-12-29'),
            scheduledStartTime: '09:00:00',
            status: 'confirmed',
            priority: 'normal',
            priceCurrency: 'USD',
            clientNotified: false,
            reminderSent: false,
            confirmationSent: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            serviceLatitude: 37.7749,
            serviceLongitude: -122.4194,
            ...overrides,
        };
    }

    // Helper to create mock vehicle
    function createMockVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
        return {
            id: `vehicle-${Math.random().toString(36).substr(2, 9)}`,
            name: 'Test Vehicle',
            serviceTypes: ['service-1'],
            status: 'available',
            createdAt: new Date(),
            updatedAt: new Date(),
            ...overrides,
        };
    }

    describe('planRoutes', () => {
        const validInput: PlanRoutesInput = {
            routeDate: new Date('2024-12-29'),
            maxStopsPerRoute: 15,
        };

        describe('Input Validation', () => {
            it('should return empty result when no bookings exist for date', async () => {
                mockGetBookings.mockResolvedValueOnce({
                    success: true,
                    data: {
                        data: [],
                        pagination: { page: 1, limit: 1000, total: 0, totalPages: 0 },
                    },
                });

                const result = await planRoutes(validInput);

                expect(result.success).toBe(true);
                if (result.success && result.data) {
                    expect(result.data.routes).toHaveLength(0);
                    expect(result.data.summary.totalBookings).toBe(0);
                    expect(result.data.warnings).toContain('No confirmed bookings found for the specified date');
                }
            });

            it('should handle booking fetch failure', async () => {
                mockGetBookings.mockResolvedValueOnce({
                    success: false,
                    error: new Error('Database connection failed'),
                });

                const result = await planRoutes(validInput);

                expect(result.success).toBe(false);
                if (!result.success && result.error) {
                    expect(result.error).toBeInstanceOf(RoutePlanningServiceError);
                    expect((result.error as RoutePlanningServiceError).code).toBe(
                        RoutePlanningErrorCodes.FETCH_FAILED
                    );
                }
            });

            it('should accept string date format', async () => {
                mockGetBookings.mockResolvedValueOnce({
                    success: true,
                    data: {
                        data: [],
                        pagination: { page: 1, limit: 1000, total: 0, totalPages: 0 },
                    },
                });

                const result = await planRoutes({
                    routeDate: '2024-12-29',
                });

                expect(result.success).toBe(true);
                expect(mockGetBookings).toHaveBeenCalled();
            });
        });

        describe('Booking Filtering', () => {
            it('should skip bookings without valid coordinates', async () => {
                const validBooking = createMockBooking({
                    serviceLatitude: 37.7749,
                    serviceLongitude: -122.4194,
                });
                const invalidBooking = createMockBooking({
                    serviceLatitude: undefined,
                    serviceLongitude: undefined,
                });

                mockGetBookings.mockResolvedValueOnce({
                    success: true,
                    data: {
                        data: [validBooking, invalidBooking],
                        pagination: { page: 1, limit: 1000, total: 2, totalPages: 1 },
                    },
                });

                // Mock vehicle and route creation for valid booking
                mockGetVehiclesByServiceType.mockResolvedValueOnce({
                    success: true,
                    data: [createMockVehicle()],
                });

                mockComputeRoutes.mockResolvedValueOnce({
                    success: true,
                    data: {
                        routes: [{
                            legs: [],
                            distanceMeters: 10000,
                            duration: '3600s',
                            staticDuration: '3500s',
                            optimizedIntermediateWaypointIndex: [],
                        }],
                    },
                });

                mockCreateRoute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        id: 'route-1',
                        routeName: 'Test Route',
                        routeDate: new Date('2024-12-29'),
                        totalStops: 1,
                        status: 'planned',
                        optimizationType: 'balanced',
                        costCurrency: 'USD',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });

                mockUpdateBooking.mockResolvedValue({ success: true });

                const result = await planRoutes(validInput);

                expect(result.success).toBe(true);
                if (result.success && result.data) {
                    expect(result.data.unassignedBookings).toContainEqual(
                        expect.objectContaining({ id: invalidBooking.id })
                    );
                }
            });

            it('should skip bookings that already have vehicle assigned', async () => {
                const unassignedBooking = createMockBooking({ vehicleId: undefined });
                const assignedBooking = createMockBooking({ vehicleId: 'vehicle-assigned' });

                mockGetBookings.mockResolvedValueOnce({
                    success: true,
                    data: {
                        data: [unassignedBooking, assignedBooking],
                        pagination: { page: 1, limit: 1000, total: 2, totalPages: 1 },
                    },
                });

                mockGetVehiclesByServiceType.mockResolvedValueOnce({
                    success: true,
                    data: [createMockVehicle()],
                });

                mockComputeRoutes.mockResolvedValueOnce({
                    success: true,
                    data: {
                        routes: [{
                            legs: [],
                            distanceMeters: 10000,
                            duration: '3600s',
                            staticDuration: '3500s',
                            optimizedIntermediateWaypointIndex: [],
                        }],
                    },
                });

                mockCreateRoute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        id: 'route-1',
                        routeName: 'Test Route',
                        routeDate: new Date('2024-12-29'),
                        totalStops: 1,
                        status: 'planned',
                        optimizationType: 'balanced',
                        costCurrency: 'USD',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });

                mockUpdateBooking.mockResolvedValue({ success: true });

                const result = await planRoutes(validInput);

                expect(result.success).toBe(true);
                // Only the unassigned booking should be processed
                if (result.success && result.data) {
                    expect(result.data.summary.assignedBookings).toBe(1);
                }
            });
        });

        describe('Service Type Grouping', () => {
            it('should group bookings by service type', async () => {
                const booking1 = createMockBooking({ serviceId: 'service-a' });
                const booking2 = createMockBooking({ serviceId: 'service-a' });
                const booking3 = createMockBooking({ serviceId: 'service-b' });

                mockGetBookings.mockResolvedValueOnce({
                    success: true,
                    data: {
                        data: [booking1, booking2, booking3],
                        pagination: { page: 1, limit: 1000, total: 3, totalPages: 1 },
                    },
                });

                // Mock vehicles for service-a
                mockGetVehiclesByServiceType.mockResolvedValueOnce({
                    success: true,
                    data: [createMockVehicle({ serviceTypes: ['service-a'] })],
                });

                // Mock vehicles for service-b
                mockGetVehiclesByServiceType.mockResolvedValueOnce({
                    success: true,
                    data: [createMockVehicle({ serviceTypes: ['service-b'] })],
                });

                mockComputeRoutes.mockResolvedValue({
                    success: true,
                    data: {
                        routes: [{
                            legs: [],
                            distanceMeters: 10000,
                            duration: '3600s',
                            staticDuration: '3500s',
                            optimizedIntermediateWaypointIndex: [],
                        }],
                    },
                });

                mockCreateRoute.mockResolvedValue({
                    success: true,
                    data: {
                        id: 'route-1',
                        routeName: 'Test Route',
                        routeDate: new Date('2024-12-29'),
                        totalStops: 1,
                        status: 'planned',
                        optimizationType: 'balanced',
                        costCurrency: 'USD',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });

                mockUpdateBooking.mockResolvedValue({ success: true });

                const result = await planRoutes(validInput);

                expect(result.success).toBe(true);
                // Should have called getVehiclesByServiceType twice (once per service type)
                expect(mockGetVehiclesByServiceType).toHaveBeenCalledTimes(2);
                expect(mockGetVehiclesByServiceType).toHaveBeenCalledWith('service-a', { status: 'available' });
                expect(mockGetVehiclesByServiceType).toHaveBeenCalledWith('service-b', { status: 'available' });
            });
        });

        describe('Vehicle Assignment', () => {
            it('should warn when no vehicles available for service type', async () => {
                const booking = createMockBooking({ serviceId: 'orphan-service' });

                mockGetBookings.mockResolvedValueOnce({
                    success: true,
                    data: {
                        data: [booking],
                        pagination: { page: 1, limit: 1000, total: 1, totalPages: 1 },
                    },
                });

                mockGetVehiclesByServiceType.mockResolvedValueOnce({
                    success: true,
                    data: [], // No vehicles available
                });

                const result = await planRoutes(validInput);

                expect(result.success).toBe(true);
                if (result.success && result.data) {
                    expect(result.data.warnings).toContain(
                        expect.stringContaining('No available vehicles for service orphan-service')
                    );
                    expect(result.data.unassignedBookings).toContainEqual(
                        expect.objectContaining({ id: booking.id })
                    );
                }
            });

            it('should not reuse vehicle across batches', async () => {
                // 20 bookings requiring 2 routes (max 15 per route)
                const bookings = Array(20).fill(null).map(() => createMockBooking());

                mockGetBookings.mockResolvedValueOnce({
                    success: true,
                    data: {
                        data: bookings,
                        pagination: { page: 1, limit: 1000, total: 20, totalPages: 1 },
                    },
                });

                // Only one vehicle available
                mockGetVehiclesByServiceType.mockResolvedValueOnce({
                    success: true,
                    data: [createMockVehicle()],
                });

                mockComputeRoutes.mockResolvedValue({
                    success: true,
                    data: {
                        routes: [{
                            legs: [],
                            distanceMeters: 10000,
                            duration: '3600s',
                            staticDuration: '3500s',
                            optimizedIntermediateWaypointIndex: [],
                        }],
                    },
                });

                mockCreateRoute.mockResolvedValue({
                    success: true,
                    data: {
                        id: 'route-1',
                        routeName: 'Test Route',
                        routeDate: new Date('2024-12-29'),
                        totalStops: 15,
                        status: 'planned',
                        optimizationType: 'balanced',
                        costCurrency: 'USD',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });

                mockUpdateBooking.mockResolvedValue({ success: true });

                const result = await planRoutes(validInput);

                expect(result.success).toBe(true);
                if (result.success && result.data) {
                    // Only one route should be created (first 15 bookings)
                    // Second batch of 5 bookings should be unassigned (no more vehicles)
                    expect(result.data.summary.routesCreated).toBe(1);
                    expect(result.data.unassignedBookings.length).toBe(5);
                    expect(result.data.warnings).toContain(
                        expect.stringContaining('Ran out of vehicles')
                    );
                }
            });
        });

        describe('Route Optimization', () => {
            it('should call Google Routes API for optimization', async () => {
                const booking = createMockBooking();

                mockGetBookings.mockResolvedValueOnce({
                    success: true,
                    data: {
                        data: [booking],
                        pagination: { page: 1, limit: 1000, total: 1, totalPages: 1 },
                    },
                });

                mockGetVehiclesByServiceType.mockResolvedValueOnce({
                    success: true,
                    data: [createMockVehicle()],
                });

                mockComputeRoutes.mockResolvedValueOnce({
                    success: true,
                    data: {
                        routes: [{
                            legs: [],
                            distanceMeters: 50000,
                            duration: '7200s',
                            staticDuration: '7000s',
                            optimizedIntermediateWaypointIndex: [],
                        }],
                    },
                });

                mockCreateRoute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        id: 'route-1',
                        routeName: 'Test Route',
                        routeDate: new Date('2024-12-29'),
                        totalStops: 1,
                        status: 'planned',
                        optimizationType: 'balanced',
                        costCurrency: 'USD',
                        totalDistanceKm: 50,
                        totalDurationMinutes: 120,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });

                mockUpdateBooking.mockResolvedValue({ success: true });

                const result = await planRoutes(validInput);

                expect(result.success).toBe(true);
                expect(mockComputeRoutes).toHaveBeenCalledTimes(1);
                expect(mockComputeRoutes).toHaveBeenCalledWith(
                    expect.objectContaining({
                        origin: expect.any(Object),
                        destination: expect.any(Object),
                        travelMode: 'DRIVE',
                        optimizeWaypointOrder: true,
                    })
                );
            });

            it('should handle optimization failure gracefully', async () => {
                const booking = createMockBooking();

                mockGetBookings.mockResolvedValueOnce({
                    success: true,
                    data: {
                        data: [booking],
                        pagination: { page: 1, limit: 1000, total: 1, totalPages: 1 },
                    },
                });

                mockGetVehiclesByServiceType.mockResolvedValueOnce({
                    success: true,
                    data: [createMockVehicle()],
                });

                mockComputeRoutes.mockResolvedValueOnce({
                    success: false,
                    error: new Error('Google API failed'),
                });

                const result = await planRoutes(validInput);

                expect(result.success).toBe(true);
                if (result.success && result.data) {
                    expect(result.data.routes).toHaveLength(0);
                    expect(result.data.warnings).toContain(
                        expect.stringContaining('Failed to optimize route')
                    );
                    expect(result.data.unassignedBookings).toContainEqual(
                        expect.objectContaining({ id: booking.id })
                    );
                }
            });
        });

        describe('Route Persistence', () => {
            it('should create route with correct data', async () => {
                const booking = createMockBooking({
                    id: 'booking-123',
                    serviceLatitude: 37.7749,
                    serviceLongitude: -122.4194,
                });
                const vehicle = createMockVehicle({ id: 'vehicle-456' });

                mockGetBookings.mockResolvedValueOnce({
                    success: true,
                    data: {
                        data: [booking],
                        pagination: { page: 1, limit: 1000, total: 1, totalPages: 1 },
                    },
                });

                mockGetVehiclesByServiceType.mockResolvedValueOnce({
                    success: true,
                    data: [vehicle],
                });

                mockComputeRoutes.mockResolvedValueOnce({
                    success: true,
                    data: {
                        routes: [{
                            legs: [],
                            distanceMeters: 25000,
                            duration: '1800s', // 30 minutes
                            staticDuration: '1700s',
                            optimizedIntermediateWaypointIndex: [],
                        }],
                    },
                });

                mockCreateRoute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        id: 'route-created',
                        routeName: 'Route 1 - 2024-12-29',
                        routeDate: new Date('2024-12-29'),
                        totalStops: 1,
                        status: 'planned',
                        optimizationType: 'balanced',
                        costCurrency: 'USD',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });

                mockUpdateBooking.mockResolvedValue({ success: true });

                const result = await planRoutes(validInput);

                expect(result.success).toBe(true);
                expect(mockCreateRoute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        vehicleId: 'vehicle-456',
                        totalStops: 1,
                        totalDistanceKm: 25, // 25000m = 25km
                        totalDurationMinutes: 30, // 1800s = 30min
                        status: 'planned',
                        stopSequence: ['booking-123'],
                    })
                );
            });

            it('should update bookings with vehicle ID after route creation', async () => {
                const booking = createMockBooking({ id: 'booking-to-update' });
                const vehicle = createMockVehicle({ id: 'assigned-vehicle' });

                mockGetBookings.mockResolvedValueOnce({
                    success: true,
                    data: {
                        data: [booking],
                        pagination: { page: 1, limit: 1000, total: 1, totalPages: 1 },
                    },
                });

                mockGetVehiclesByServiceType.mockResolvedValueOnce({
                    success: true,
                    data: [vehicle],
                });

                mockComputeRoutes.mockResolvedValueOnce({
                    success: true,
                    data: {
                        routes: [{
                            legs: [],
                            distanceMeters: 10000,
                            duration: '3600s',
                            staticDuration: '3500s',
                            optimizedIntermediateWaypointIndex: [],
                        }],
                    },
                });

                mockCreateRoute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        id: 'route-1',
                        routeName: 'Test Route',
                        routeDate: new Date('2024-12-29'),
                        totalStops: 1,
                        status: 'planned',
                        optimizationType: 'balanced',
                        costCurrency: 'USD',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });

                mockUpdateBooking.mockResolvedValue({ success: true });

                const result = await planRoutes(validInput);

                expect(result.success).toBe(true);
                expect(mockUpdateBooking).toHaveBeenCalledWith({
                    id: 'booking-to-update',
                    vehicleId: 'assigned-vehicle',
                    status: 'scheduled',
                });
            });
        });

        describe('Max Stops Per Route', () => {
            it('should respect maxStopsPerRoute parameter', async () => {
                // Create 10 bookings
                const bookings = Array(10).fill(null).map((_, i) =>
                    createMockBooking({
                        id: `booking-${i}`,
                        serviceLatitude: 37.7749 + i * 0.01,
                        serviceLongitude: -122.4194 + i * 0.01,
                    })
                );

                mockGetBookings.mockResolvedValueOnce({
                    success: true,
                    data: {
                        data: bookings,
                        pagination: { page: 1, limit: 1000, total: 10, totalPages: 1 },
                    },
                });

                // Provide enough vehicles
                mockGetVehiclesByServiceType.mockResolvedValueOnce({
                    success: true,
                    data: [
                        createMockVehicle({ id: 'v1' }),
                        createMockVehicle({ id: 'v2' }),
                    ],
                });

                mockComputeRoutes.mockResolvedValue({
                    success: true,
                    data: {
                        routes: [{
                            legs: [],
                            distanceMeters: 10000,
                            duration: '3600s',
                            staticDuration: '3500s',
                            optimizedIntermediateWaypointIndex: [],
                        }],
                    },
                });

                mockCreateRoute.mockResolvedValue({
                    success: true,
                    data: {
                        id: 'route-1',
                        routeName: 'Test Route',
                        routeDate: new Date('2024-12-29'),
                        totalStops: 5,
                        status: 'planned',
                        optimizationType: 'balanced',
                        costCurrency: 'USD',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });

                mockUpdateBooking.mockResolvedValue({ success: true });

                // Set max 5 stops per route
                const result = await planRoutes({
                    ...validInput,
                    maxStopsPerRoute: 5,
                });

                expect(result.success).toBe(true);
                if (result.success && result.data) {
                    // Should create 2 routes (10 bookings / 5 max stops)
                    expect(result.data.summary.routesCreated).toBe(2);
                }
            });

            it('should use default max stops of 15', async () => {
                // Create 20 bookings
                const bookings = Array(20).fill(null).map((_, i) =>
                    createMockBooking({
                        id: `booking-${i}`,
                        serviceLatitude: 37.7749 + i * 0.01,
                        serviceLongitude: -122.4194 + i * 0.01,
                    })
                );

                mockGetBookings.mockResolvedValueOnce({
                    success: true,
                    data: {
                        data: bookings,
                        pagination: { page: 1, limit: 1000, total: 20, totalPages: 1 },
                    },
                });

                mockGetVehiclesByServiceType.mockResolvedValueOnce({
                    success: true,
                    data: [
                        createMockVehicle({ id: 'v1' }),
                        createMockVehicle({ id: 'v2' }),
                    ],
                });

                mockComputeRoutes.mockResolvedValue({
                    success: true,
                    data: {
                        routes: [{
                            legs: [],
                            distanceMeters: 10000,
                            duration: '3600s',
                            staticDuration: '3500s',
                            optimizedIntermediateWaypointIndex: [],
                        }],
                    },
                });

                mockCreateRoute.mockResolvedValue({
                    success: true,
                    data: {
                        id: 'route-1',
                        routeName: 'Test Route',
                        routeDate: new Date('2024-12-29'),
                        totalStops: 15,
                        status: 'planned',
                        optimizationType: 'balanced',
                        costCurrency: 'USD',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });

                mockUpdateBooking.mockResolvedValue({ success: true });

                // No maxStopsPerRoute specified, should default to 15
                const result = await planRoutes({
                    routeDate: new Date('2024-12-29'),
                });

                expect(result.success).toBe(true);
                if (result.success && result.data) {
                    // Should create 2 routes (20 bookings, default 15 max = 15 + 5)
                    expect(result.data.summary.routesCreated).toBe(2);
                }
            });
        });
    });
});
