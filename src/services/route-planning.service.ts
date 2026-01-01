/**
 * Route Planning Service
 *
 * Orchestrates the complete route planning workflow:
 * 1. Fetches unscheduled bookings for a date
 * 2. Groups bookings by service type
 * 3. Clusters geographically and respects max stops per route
 * 4. Optimizes routes using Google Routes API
 * 5. Assigns compatible vehicles
 * 6. Persists routes and updates bookings
 */

import { createContextLogger } from '../utils/logger.js';
import type { Result } from '../types/index.js';
import type { Booking, BookingFilters } from '../types/booking.js';
import type { Route, CreateRouteInput } from '../types/route.js';
import { getBookings, updateBooking } from './booking.service.js';
import { getVehicles } from './vehicle.service.js';
import type { Vehicle } from '../types/vehicle.js';
import { createRoute } from './route.service.js';
import { getLocationById } from './location.service.js';
import { getVehiclePrimaryLocation } from './vehicle-location.service.js';
import { getAdminSupabaseClient, getSupabaseClient } from './supabase.js';
import { computeRoutes } from './google-routes.service.js';
import {
    TravelMode,
    RoutingPreference,
    PolylineQuality,
} from '../types/google-routes.js';
import type {
    ComputeRoutesInput,
    ComputeRoutesResponse,
    Waypoint,
    Route as GoogleRoute,
} from '../types/google-routes.js';

/**
 * Logger instance for route planning operations
 */
const logger = createContextLogger('RoutePlanningService');

/**
 * Default maximum stops per route per day
 */
const DEFAULT_MAX_STOPS_PER_ROUTE = 15;

/**
 * Route planning service error
 */
export class RoutePlanningServiceError extends Error {
    public readonly code: string;
    public readonly details?: unknown;

    constructor(message: string, code: string, details?: unknown) {
        super(message);
        this.name = 'RoutePlanningServiceError';
        this.code = code;
        this.details = details;
    }
}

/**
 * Error codes for route planning service
 */
export const RoutePlanningErrorCodes = {
    INVALID_INPUT: 'ROUTE_PLANNING_INVALID_INPUT',
    NO_BOOKINGS: 'ROUTE_PLANNING_NO_BOOKINGS',
    NO_VEHICLES: 'ROUTE_PLANNING_NO_VEHICLES',
    FETCH_FAILED: 'ROUTE_PLANNING_FETCH_FAILED',
    OPTIMIZATION_FAILED: 'ROUTE_PLANNING_OPTIMIZATION_FAILED',
    PERSIST_FAILED: 'ROUTE_PLANNING_PERSIST_FAILED',
} as const;

/**
 * Input for planning routes
 */
export interface PlanRoutesInput {
    routeDate: Date | string;
    serviceId?: string; // Optional: filter to specific service
    maxStopsPerRoute?: number; // Default: 15
    departureLocation?: { latitude: number; longitude: number };
    returnToStart?: boolean;
    routingPreference?: 'TRAFFIC_UNAWARE' | 'TRAFFIC_AWARE'; // Default: TRAFFIC_UNAWARE
    vehicleAllocations?: VehicleAllocation[]; // Optional: user-specified booking counts per vehicle
}

/**
 * Vehicle allocation for route planning
 */
export interface VehicleAllocation {
    vehicleId: string;
    bookingCount: number;
    startLocationId?: string;  // Override start location
    endLocationId?: string;    // Override end location (if not returning to start)
}

/**
 * Result from planning routes
 */
export interface PlanRoutesResponse {
    routes: Route[];
    unassignedBookings: Booking[];
    summary: {
        totalBookings: number;
        assignedBookings: number;
        routesCreated: number;
        vehiclesUsed: number;
    };
    warnings: string[];
}

/**
 * Preview response for route planning (before creating routes)
 */
export interface RoutePlanPreview {
    routeDate: Date;
    bookings: Booking[];
    vehicles: Vehicle[];
    defaultAllocation: {
        vehicleId: string;
        vehicleName: string;
        bookingCount: number;
        homeLocationId?: string;
        homeLocationName?: string;
        availableLocations: {
            id: string;
            name: string;
            city: string;
            state: string;
            isPrimary: boolean;
        }[];
    }[];
    unassignableBookings: Booking[];
    warnings: string[];
    availableBaseLocations: {
        id: string;
        name: string;
        city: string;
        state: string;
    }[];
}

/**
 * Gets coordinates for a booking, prioritizing location coordinates over direct booking coordinates
 */
function getBookingCoordinates(booking: Booking): { latitude: number; longitude: number } | null {
    // Priority 1: Location coordinates (from joined locations table)
    if (
        booking.locationLatitude !== undefined &&
        booking.locationLatitude !== null &&
        booking.locationLongitude !== undefined &&
        booking.locationLongitude !== null &&
        booking.locationLatitude >= -90 &&
        booking.locationLatitude <= 90 &&
        booking.locationLongitude >= -180 &&
        booking.locationLongitude <= 180
    ) {
        return {
            latitude: booking.locationLatitude,
            longitude: booking.locationLongitude,
        };
    }

    // Priority 2: Direct booking coordinates (legacy fallback)
    if (
        booking.serviceLatitude !== undefined &&
        booking.serviceLatitude !== null &&
        booking.serviceLongitude !== undefined &&
        booking.serviceLongitude !== null &&
        booking.serviceLatitude >= -90 &&
        booking.serviceLatitude <= 90 &&
        booking.serviceLongitude >= -180 &&
        booking.serviceLongitude <= 180
    ) {
        return {
            latitude: booking.serviceLatitude,
            longitude: booking.serviceLongitude,
        };
    }

    return null;
}

/**
 * Validates a booking has required location data
 */
function hasValidCoordinates(booking: Booking): boolean {
    return getBookingCoordinates(booking) !== null;
}

/**
 * Calculates distance between two coordinates using Haversine formula
 */
function haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Simple geographic clustering that splits bookings into batches
 * Uses a greedy approach: start with first booking, add nearest until max reached
 */
function clusterBookingsGeographically(
    bookings: Booking[],
    maxPerBatch: number
): Booking[][] {
    if (bookings.length === 0) return [];
    if (bookings.length <= maxPerBatch) return [bookings];

    const batches: Booking[][] = [];
    const remaining = [...bookings];

    while (remaining.length > 0) {
        const batch: Booking[] = [];

        // Start with the first remaining booking
        const seed = remaining.shift()!;
        batch.push(seed);

        // Add nearest bookings until batch is full
        while (batch.length < maxPerBatch && remaining.length > 0) {
            // Find the booking nearest to the centroid of current batch
            let sumLat = 0;
            let sumLon = 0;
            for (const b of batch) {
                const coords = getBookingCoordinates(b);
                if (coords) {
                    sumLat += coords.latitude;
                    sumLon += coords.longitude;
                }
            }
            const centroidLat = sumLat / batch.length;
            const centroidLon = sumLon / batch.length;

            let nearestIdx = 0;
            let nearestDist = Infinity;

            for (let i = 0; i < remaining.length; i++) {
                const booking = remaining[i]!;
                const coords = getBookingCoordinates(booking);
                if (coords) {
                    const dist = haversineDistance(
                        centroidLat,
                        centroidLon,
                        coords.latitude,
                        coords.longitude
                    );
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestIdx = i;
                    }
                }
            }

            batch.push(remaining.splice(nearestIdx, 1)[0]!);
        }

        batches.push(batch);
    }

    return batches;
}

/**
 * Converts a booking to a waypoint for the Routes API
 */
function bookingToWaypoint(booking: Booking): Waypoint {
    const coords = getBookingCoordinates(booking);
    if (!coords) {
        throw new Error(`Booking ${booking.id} has no valid coordinates`);
    }
    return {
        location: {
            latLng: {
                latitude: coords.latitude,
                longitude: coords.longitude,
            },
        },
        vehicleStopover: true,
    };
}

/**
 * Optimizes a batch of bookings using Google Routes API
 */
async function optimizeBatch(
    bookings: Booking[],
    options: {
        departureLocation?: { latitude: number; longitude: number };
        destinationLocation?: { latitude: number; longitude: number };
        returnToStart?: boolean;
        routingPreference?: 'TRAFFIC_UNAWARE' | 'TRAFFIC_AWARE';
    }
): Promise<Result<{ route: GoogleRoute; optimizedOrder: number[] }>> {
    if (bookings.length === 0) {
        return {
            success: false,
            error: new RoutePlanningServiceError(
                'Cannot optimize empty batch',
                RoutePlanningErrorCodes.INVALID_INPUT
            ),
        };
    }

    // Determine origin
    let origin: Waypoint;
    if (options.departureLocation) {
        origin = {
            location: {
                latLng: {
                    latitude: options.departureLocation.latitude,
                    longitude: options.departureLocation.longitude,
                },
            },
        };
    } else {
        origin = bookingToWaypoint(bookings[0]!);
    }

    // Determine destination
    let destination: Waypoint;
    if (options.destinationLocation) {
        // Explicit destination location provided
        destination = {
            location: {
                latLng: {
                    latitude: options.destinationLocation.latitude,
                    longitude: options.destinationLocation.longitude,
                },
            },
        };
    } else if (options.returnToStart) {
        destination = origin;
    } else {
        destination = bookingToWaypoint(bookings[bookings.length - 1]!);
    }

    // Build intermediates
    const intermediates: Waypoint[] = [];
    const startIdx = options.departureLocation ? 0 : 1;
    // If we have an explicit destination, all bookings are intermediates; otherwise exclude last if not returning
    const endIdx = options.destinationLocation || options.returnToStart ? bookings.length : bookings.length - 1;

    for (let i = startIdx; i < endIdx; i++) {
        intermediates.push(bookingToWaypoint(bookings[i]!));
    }

    // Build route input
    // Note: optimizeWaypointOrder is not supported with TRAFFIC_AWARE_OPTIMAL
    // Routing preference is configurable, defaults to TRAFFIC_UNAWARE for future dates
    const routingPref = options.routingPreference === 'TRAFFIC_AWARE'
        ? RoutingPreference.TRAFFIC_AWARE
        : RoutingPreference.TRAFFIC_UNAWARE;

    const routeInput: ComputeRoutesInput = {
        origin,
        destination,
        intermediates: intermediates.length > 0 ? intermediates : undefined,
        travelMode: TravelMode.DRIVE,
        routingPreference: routingPref,
        optimizeWaypointOrder: true,
        polylineQuality: PolylineQuality.HIGH_QUALITY,
        computeAlternativeRoutes: false,
    };

    logger.debug('Calling Google Routes API for optimization', {
        bookingCount: bookings.length,
        intermediateCount: intermediates.length,
    });

    const routeResult = await computeRoutes(routeInput);

    if (!routeResult.success) {
        return {
            success: false,
            error: new RoutePlanningServiceError(
                `Route optimization failed: ${routeResult.error?.message}`,
                RoutePlanningErrorCodes.OPTIMIZATION_FAILED,
                routeResult.error
            ),
        };
    }

    const response = routeResult.data as ComputeRoutesResponse;
    if (!response.routes || response.routes.length === 0) {
        return {
            success: false,
            error: new RoutePlanningServiceError(
                'No routes returned from optimization',
                RoutePlanningErrorCodes.OPTIMIZATION_FAILED
            ),
        };
    }

    const optimalRoute = response.routes[0]!;
    const optimizedOrder = optimalRoute.optimizedIntermediateWaypointIndex || [];

    return {
        success: true,
        data: {
            route: optimalRoute,
            optimizedOrder,
        },
    };
}

/**
 * Generates a unique route code by checking existing codes (including soft-deleted)
 */
async function generateUniqueRouteCode(date: Date): Promise<string> {
    const dateStr = date.toISOString().split('T')[0]!.replace(/-/g, '');
    const prefix = `RT-${dateStr}-`;

    // Query existing route codes with this prefix (including soft-deleted)
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    const { data, error } = await supabase
        .from('routes')
        .select('route_code')
        .like('route_code', `${prefix}%`);

    if (error) {
        logger.warn('Failed to check existing route codes, using timestamp', { error: error.message });
        // Fallback: use timestamp to ensure uniqueness
        return `RT-${dateStr}-${Date.now().toString().slice(-6)}`;
    }

    // Find the highest existing index
    let maxIndex = 0;
    for (const row of data || []) {
        const code = row.route_code as string;
        const match = code.match(/RT-\d{8}-(\d{3,})$/);
        if (match) {
            const idx = parseInt(match[1]!, 10);
            if (idx > maxIndex) maxIndex = idx;
        }
    }

    // Use next available index
    return `${prefix}${String(maxIndex + 1).padStart(3, '0')}`;
}

/**
 * Finds all bookings that can be serviced by available vehicles.
 * A booking is compatible if at least one available vehicle has its serviceId in service_types.
 */
async function findCompatibleVehicleBookings(
    bookings: Booking[],
    serviceIdFilter?: string
): Promise<{
    compatibleBookings: Booking[];
    incompatibleBookings: Booking[];
    vehicles: Vehicle[];
    warnings: string[];
}> {
    const warnings: string[] = [];

    // Get all available vehicles
    const vehiclesResult = await getVehicles({ status: 'available' }, { page: 1, limit: 100 });

    if (!vehiclesResult.success || !vehiclesResult.data) {
        return {
            compatibleBookings: [],
            incompatibleBookings: bookings,
            vehicles: [],
            warnings: ['Failed to fetch available vehicles'],
        };
    }

    const vehicles = vehiclesResult.data.data;

    if (vehicles.length === 0) {
        return {
            compatibleBookings: [],
            incompatibleBookings: bookings,
            vehicles: [],
            warnings: ['No available vehicles found'],
        };
    }

    // Build a set of all service IDs that any vehicle can handle
    const supportedServiceIds = new Set<string>();
    for (const vehicle of vehicles) {
        for (const serviceId of vehicle.serviceTypes || []) {
            supportedServiceIds.add(serviceId);
        }
    }

    // Partition bookings based on whether any vehicle supports their service
    const compatibleBookings: Booking[] = [];
    const incompatibleBookings: Booking[] = [];

    for (const booking of bookings) {
        // If filtering by serviceId, skip non-matching bookings
        if (serviceIdFilter && booking.serviceId !== serviceIdFilter) {
            continue;
        }

        if (supportedServiceIds.has(booking.serviceId)) {
            compatibleBookings.push(booking);
        } else {
            incompatibleBookings.push(booking);
        }
    }

    if (incompatibleBookings.length > 0) {
        warnings.push(
            `${incompatibleBookings.length} booking(s) have services not supported by any available vehicle`
        );
    }

    return {
        compatibleBookings,
        incompatibleBookings,
        vehicles,
        warnings,
    };
}

/**
 * Creates default allocation plan: evenly distribute bookings across vehicles
 * that support the required service types.
 */
function createDefaultAllocation(
    bookings: Booking[],
    vehicles: Vehicle[],
    maxStopsPerRoute: number,
    locationMap: Map<string, { name: string; city: string; state: string }> = new Map()
): { vehicleId: string; vehicleName: string; bookingCount: number; homeLocationId?: string; homeLocationName?: string }[] {
    if (bookings.length === 0 || vehicles.length === 0) {
        return [];
    }

    // Collect all unique service IDs from bookings
    const requiredServiceIds = new Set(bookings.map(b => b.serviceId));

    // Filter vehicles to only those that support ALL required service types
    // Actually, we want vehicles that support ANY of the service types (OR logic)
    // But for allocation, we want vehicles that can handle the bookings assigned to them
    // For simplicity: find vehicles that support at least one of the required services
    const compatibleVehicles = vehicles.filter(v => {
        const vehicleServiceSet = new Set(v.serviceTypes || []);
        return Array.from(requiredServiceIds).some(sId => vehicleServiceSet.has(sId));
    });

    if (compatibleVehicles.length === 0) {
        return [];
    }

    // For now, with one vehicle: assign all bookings to it (up to max)
    // With multiple vehicles: split evenly
    const allocation: { vehicleId: string; vehicleName: string; bookingCount: number; homeLocationId?: string; homeLocationName?: string }[] = [];

    let remainingBookings = bookings.length;
    const vehicleCount = compatibleVehicles.length;

    // Calculate how many bookings each vehicle gets (evenly split, respecting max)
    const maxTotalCapacity = vehicleCount * maxStopsPerRoute;
    const bookingsToAssign = Math.min(remainingBookings, maxTotalCapacity);
    const baseCount = Math.floor(bookingsToAssign / vehicleCount);
    let extraBookings = bookingsToAssign % vehicleCount;

    for (const vehicle of compatibleVehicles) {
        let count = baseCount;
        if (extraBookings > 0) {
            count++;
            extraBookings--;
        }

        // Enforce max stops per route
        count = Math.min(count, maxStopsPerRoute);

        // Get home location info
        let homeLocationName: string | undefined;
        if (vehicle.homeLocationId && locationMap.has(vehicle.homeLocationId)) {
            const loc = locationMap.get(vehicle.homeLocationId)!;
            homeLocationName = `${loc.name} - ${loc.city}, ${loc.state}`;
        }

        allocation.push({
            vehicleId: vehicle.id,
            vehicleName: vehicle.name,
            bookingCount: count,
            homeLocationId: vehicle.homeLocationId,
            homeLocationName,
        });
    }

    return allocation;
}

/**
 * Preview route planning before actually creating routes.
 * Returns list of compatible bookings, available vehicles, and default allocation.
 */
export async function previewRoutePlan(
    input: PlanRoutesInput
): Promise<Result<RoutePlanPreview>> {
    logger.info('Previewing route plan', {
        routeDate: input.routeDate,
        serviceId: input.serviceId,
    });

    // Parse date
    const routeDate =
        typeof input.routeDate === 'string'
            ? new Date(input.routeDate)
            : input.routeDate;

    const maxStops = input.maxStopsPerRoute ?? DEFAULT_MAX_STOPS_PER_ROUTE;
    const warnings: string[] = [];

    // Build booking filters
    const bookingFilters: BookingFilters = {
        scheduledDateFrom: routeDate,
        scheduledDateTo: routeDate,
        status: 'confirmed',
    };

    if (input.serviceId) {
        bookingFilters.serviceId = input.serviceId;
    }

    // Fetch bookings
    const bookingsResult = await getBookings(bookingFilters, { page: 1, limit: 1000 });

    if (!bookingsResult.success) {
        return {
            success: false,
            error: new RoutePlanningServiceError(
                `Failed to fetch bookings: ${bookingsResult.error?.message}`,
                RoutePlanningErrorCodes.FETCH_FAILED,
                bookingsResult.error
            ),
        };
    }

    const allBookings = bookingsResult.data!.data;

    // Filter to unscheduled bookings with valid coordinates
    const validBookings = allBookings.filter(hasValidCoordinates);
    const invalidBookings = allBookings.filter(b => !hasValidCoordinates(b));
    const unscheduledBookings = validBookings.filter(b => !b.vehicleId);

    if (invalidBookings.length > 0) {
        warnings.push(`${invalidBookings.length} booking(s) missing coordinates`);
    }

    // Find compatible vehicle-booking pairs
    const { compatibleBookings, incompatibleBookings, vehicles, warnings: compatWarnings } =
        await findCompatibleVehicleBookings(unscheduledBookings, input.serviceId);

    warnings.push(...compatWarnings);

    // Collect and fetch home locations for vehicles
    const homeLocationIds = vehicles
        .map(v => v.homeLocationId)
        .filter((id): id is string => !!id);

    const locationMap = new Map<string, { name: string; city: string; state: string }>();

    for (const locId of homeLocationIds) {
        const locResult = await getLocationById(locId);
        if (locResult.success && locResult.data) {
            const loc = locResult.data;
            locationMap.set(locId, {
                name: loc.name,
                city: loc.city,
                state: loc.state,
            });
        }
    }

    // Create default allocation with home location info
    const defaultAllocation = createDefaultAllocation(compatibleBookings, vehicles, maxStops, locationMap);

    // Fetch all depot/home type locations as available base locations
    // Import getAllLocations from location service if needed - using admin supabase directly
    const supabase = getAdminSupabaseClient() || getSupabaseClient();
    const { data: baseLocationsData } = await supabase
        .from('locations')
        .select('id, name, city, state, location_type')
        .in('location_type', ['depot', 'home', 'other'])
        .is('deleted_at', null);

    const availableBaseLocations = (baseLocationsData || []).map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        city: loc.city,
        state: loc.state,
    }));

    // Fetch vehicle locations from junction table for each vehicle in allocation
    const enhancedAllocation = await Promise.all(
        defaultAllocation.map(async (alloc) => {
            // Query vehicle_locations junction table for this vehicle
            const { data: vehicleLocsData } = await supabase
                .from('vehicle_locations')
                .select(`
                    location_id,
                    is_primary,
                    locations!inner(id, name, city, state)
                `)
                .eq('vehicle_id', alloc.vehicleId);

            const availableLocations = (vehicleLocsData || []).map((vl: any) => ({
                id: vl.locations.id,
                name: vl.locations.name,
                city: vl.locations.city,
                state: vl.locations.state,
                isPrimary: vl.is_primary,
            }));

            // If no vehicle locations, fall back to all base locations
            return {
                ...alloc,
                availableLocations: availableLocations.length > 0
                    ? availableLocations
                    : availableBaseLocations.map(loc => ({ ...loc, isPrimary: false })),
            };
        })
    );

    return {
        success: true,
        data: {
            routeDate,
            bookings: compatibleBookings,
            vehicles,
            defaultAllocation: enhancedAllocation,
            unassignableBookings: [...invalidBookings, ...incompatibleBookings],
            warnings,
            availableBaseLocations,
        },
    };
}

/**
 * Plans routes for a specific date
 */
export async function planRoutes(
    input: PlanRoutesInput
): Promise<Result<PlanRoutesResponse>> {
    logger.info('Starting route planning', {
        routeDate: input.routeDate,
        serviceId: input.serviceId,
        maxStopsPerRoute: input.maxStopsPerRoute,
    });

    // Parse date
    const routeDate =
        typeof input.routeDate === 'string'
            ? new Date(input.routeDate)
            : input.routeDate;

    const maxStops = input.maxStopsPerRoute ?? DEFAULT_MAX_STOPS_PER_ROUTE;

    // Build booking filters
    const bookingFilters: BookingFilters = {
        scheduledDateFrom: routeDate,
        scheduledDateTo: routeDate,
        status: 'confirmed', // Only confirmed bookings
    };

    if (input.serviceId) {
        bookingFilters.serviceId = input.serviceId;
    }

    // Fetch bookings
    logger.debug('Fetching bookings for date', { routeDate });
    const bookingsResult = await getBookings(bookingFilters, { page: 1, limit: 1000 });

    if (!bookingsResult.success) {
        return {
            success: false,
            error: new RoutePlanningServiceError(
                `Failed to fetch bookings: ${bookingsResult.error?.message}`,
                RoutePlanningErrorCodes.FETCH_FAILED,
                bookingsResult.error
            ),
        };
    }

    const allBookings = bookingsResult.data!.data;
    logger.info('Found bookings for date', { count: allBookings.length });

    if (allBookings.length === 0) {
        return {
            success: true,
            data: {
                routes: [],
                unassignedBookings: [],
                summary: {
                    totalBookings: 0,
                    assignedBookings: 0,
                    routesCreated: 0,
                    vehiclesUsed: 0,
                },
                warnings: ['No confirmed bookings found for the specified date'],
            },
        };
    }

    // Filter bookings with valid coordinates
    const validBookings = allBookings.filter(hasValidCoordinates);
    const invalidBookings = allBookings.filter((b) => !hasValidCoordinates(b));

    if (invalidBookings.length > 0) {
        logger.warn('Bookings missing coordinates', { count: invalidBookings.length });
    }

    // Filter bookings that don't already have a vehicle assigned (unscheduled)
    const unscheduledBookings = validBookings.filter((b) => !b.vehicleId);

    if (unscheduledBookings.length === 0) {
        return {
            success: true,
            data: {
                routes: [],
                unassignedBookings: invalidBookings,
                summary: {
                    totalBookings: allBookings.length,
                    assignedBookings: 0,
                    routesCreated: 0,
                    vehiclesUsed: 0,
                },
                warnings: [
                    'All bookings with valid coordinates already have vehicles assigned',
                    ...(invalidBookings.length > 0
                        ? [`${invalidBookings.length} bookings missing coordinates`]
                        : []),
                ],
            },
        };
    }

    // ===== NEW VEHICLE-AGNOSTIC APPROACH =====
    // Instead of grouping by service, find all bookings that any available vehicle can service
    const { compatibleBookings, incompatibleBookings, vehicles, warnings: compatWarnings } =
        await findCompatibleVehicleBookings(unscheduledBookings, input.serviceId);

    const warnings: string[] = [...compatWarnings];
    const unassignedBookings: Booking[] = [...invalidBookings, ...incompatibleBookings];

    if (compatibleBookings.length === 0) {
        return {
            success: true,
            data: {
                routes: [],
                unassignedBookings,
                summary: {
                    totalBookings: allBookings.length,
                    assignedBookings: 0,
                    routesCreated: 0,
                    vehiclesUsed: 0,
                },
                warnings: [
                    ...warnings,
                    'No bookings could be matched to available vehicles',
                ],
            },
        };
    }

    if (vehicles.length === 0) {
        return {
            success: true,
            data: {
                routes: [],
                unassignedBookings: [...unassignedBookings, ...compatibleBookings],
                summary: {
                    totalBookings: allBookings.length,
                    assignedBookings: 0,
                    routesCreated: 0,
                    vehiclesUsed: 0,
                },
                warnings: [...warnings, 'No available vehicles found'],
            },
        };
    }

    // Determine allocation: use user-provided or generate default
    let allocations = input.vehicleAllocations;
    if (!allocations || allocations.length === 0) {
        // Generate default allocation (all to first compatible vehicle, or split evenly)
        const defaultAlloc = createDefaultAllocation(compatibleBookings, vehicles, maxStops);
        allocations = defaultAlloc.map(a => ({
            vehicleId: a.vehicleId,
            bookingCount: a.bookingCount,
        }));
    }

    // Validate allocation total matches booking count
    const totalAllocated = allocations.reduce((sum, a) => sum + a.bookingCount, 0);
    if (totalAllocated !== compatibleBookings.length) {
        logger.warn('Allocation count mismatch, adjusting', {
            totalAllocated,
            bookingCount: compatibleBookings.length,
        });
        // Adjust: cap allocation to available bookings
    }

    // Build vehicle map for quick lookup
    const vehicleMap = new Map(vehicles.map(v => [v.id, v]));

    // Process allocations - create routes for each vehicle with allocated bookings
    const createdRoutes: Route[] = [];
    const vehiclesUsed = new Set<string>();
    let routeIndex = 1;
    let bookingOffset = 0;

    for (const allocation of allocations) {
        if (allocation.bookingCount === 0) continue;

        const vehicle = vehicleMap.get(allocation.vehicleId);
        if (!vehicle) {
            warnings.push(`Vehicle ${allocation.vehicleId} not found or not available`);
            continue;
        }

        // Get the bookings for this allocation
        const bookingsForVehicle = compatibleBookings.slice(
            bookingOffset,
            bookingOffset + allocation.bookingCount
        );
        bookingOffset += allocation.bookingCount;

        if (bookingsForVehicle.length === 0) continue;

        // Cluster bookings geographically if exceeding max stops
        const batches = clusterBookingsGeographically(bookingsForVehicle, maxStops);

        for (const batch of batches) {
            // Determine start location: priority is override > vehicle home > input departure > first booking
            let batchDepartureLocation = input.departureLocation;
            let batchDestinationLocation: { latitude: number; longitude: number } | undefined;
            let shouldReturnToStart = input.returnToStart ?? true;

            // Check for start location override from allocation, or get vehicle's primary location
            let startLocationIdToUse = allocation.startLocationId;

            // If no allocation override, try to get vehicle's primary location from vehicle_locations table
            if (!startLocationIdToUse) {
                const primaryLocResult = await getVehiclePrimaryLocation(vehicle.id);
                if (primaryLocResult.success && primaryLocResult.data) {
                    startLocationIdToUse = primaryLocResult.data.locationId;
                    logger.debug('Using primary location for vehicle', {
                        vehicleId: vehicle.id,
                        locationId: startLocationIdToUse
                    });
                }
            }

            // Fallback to old homeLocationId if vehicle_locations not set
            if (!startLocationIdToUse && vehicle.homeLocationId) {
                startLocationIdToUse = vehicle.homeLocationId;
            }

            if (!batchDepartureLocation && startLocationIdToUse) {
                const startLocationResult = await getLocationById(startLocationIdToUse);
                if (startLocationResult.success && startLocationResult.data) {
                    const startLoc = startLocationResult.data;
                    if (startLoc.latitude && startLoc.longitude) {
                        batchDepartureLocation = {
                            latitude: startLoc.latitude,
                            longitude: startLoc.longitude,
                        };
                        logger.debug('Set departure location', {
                            lat: startLoc.latitude,
                            lng: startLoc.longitude,
                            locationName: startLoc.name
                        });
                    }
                }
            }

            // Check for end location override from allocation
            if (allocation.endLocationId) {
                // If a specific end location is set, don't return to start
                shouldReturnToStart = false;
                const endLocationResult = await getLocationById(allocation.endLocationId);
                if (endLocationResult.success && endLocationResult.data) {
                    const endLoc = endLocationResult.data;
                    if (endLoc.latitude && endLoc.longitude) {
                        batchDestinationLocation = {
                            latitude: endLoc.latitude,
                            longitude: endLoc.longitude,
                        };
                    }
                }
            }

            // Optimize the route
            const optimizeResult = await optimizeBatch(batch, {
                departureLocation: batchDepartureLocation,
                destinationLocation: batchDestinationLocation,
                returnToStart: shouldReturnToStart,
                routingPreference: input.routingPreference,
            });

            if (!optimizeResult.success) {
                warnings.push(
                    `Failed to optimize route for batch: ${optimizeResult.error?.message}`
                );
                unassignedBookings.push(...batch);
                continue;
            }

            const { route: googleRoute, optimizedOrder } = optimizeResult.data!;

            // Build ordered bookings from optimized route
            // Note: optimizedOrder contains indices into the INTERMEDIATES array, not the batch array
            // We need to account for which bookings were used as origin/destination vs intermediates
            const orderedBookings: Booking[] = [];

            // Determine which bookings were intermediates
            const hasCustomDeparture = !!batchDepartureLocation;
            const hasCustomDestination = !!batchDestinationLocation;

            if (optimizedOrder.length > 0) {
                // Map optimized intermediate indices back to batch indices
                // When hasCustomDeparture: intermediates[i] = batch[i]
                // When !hasCustomDeparture: batch[0] is origin, intermediates[i] = batch[i+1]
                const intermediateOffset = hasCustomDeparture ? 0 : 1;

                // If no custom departure, first booking is origin - add it first
                if (!hasCustomDeparture && batch.length > 0) {
                    orderedBookings.push(batch[0]!);
                }

                // Add intermediates in optimized order
                for (const intermediateIdx of optimizedOrder) {
                    const batchIdx = intermediateIdx + intermediateOffset;
                    if (batch[batchIdx]) {
                        orderedBookings.push(batch[batchIdx]);
                    }
                }

                // If no custom destination and not returning to start, last booking is destination
                // (it wasn't in intermediates, so we need to add it)
                if (!hasCustomDestination && !shouldReturnToStart && batch.length > 0) {
                    const lastBooking = batch[batch.length - 1]!;
                    if (!orderedBookings.includes(lastBooking)) {
                        orderedBookings.push(lastBooking);
                    }
                }

                // Safety: add any bookings we might have missed
                for (const booking of batch) {
                    if (!orderedBookings.includes(booking)) {
                        orderedBookings.push(booking);
                    }
                }
            } else {
                orderedBookings.push(...batch);
            }

            // Calculate route metrics
            const totalDistanceMeters = googleRoute.distanceMeters || 0;
            const durationMatch = googleRoute.duration?.match(/^(\d+)s$/);
            const totalDurationSeconds = durationMatch ? parseInt(durationMatch[1]!, 10) : 0;

            // Create route input
            const routeInput: CreateRouteInput = {
                routeName: `Route ${routeIndex} - ${routeDate.toISOString().split('T')[0]}`,
                routeCode: await generateUniqueRouteCode(routeDate),
                vehicleId: vehicle.id,
                routeDate,
                totalDistanceKm: totalDistanceMeters / 1000,
                totalDurationMinutes: Math.ceil(totalDurationSeconds / 60),
                totalStops: orderedBookings.length,
                optimizationType: 'balanced',
                optimizationScore: 85,
                status: 'planned',
                stopSequence: orderedBookings.map((b) => b.id),
                costCurrency: 'USD',
                routeGeometry: {
                    encodedPolyline: googleRoute.polyline?.encodedPolyline || null,
                    legs: googleRoute.legs?.map(leg => ({
                        distanceMeters: leg.distanceMeters,
                        duration: leg.duration,
                        polyline: leg.polyline?.encodedPolyline,
                    })) || [],
                },
            };

            // Create the route
            const createResult = await createRoute(routeInput);

            if (!createResult.success) {
                warnings.push(`Failed to create route: ${createResult.error?.message}`);
                unassignedBookings.push(...orderedBookings);
                continue;
            }

            const createdRoute = createResult.data!;
            createdRoutes.push(createdRoute);
            vehiclesUsed.add(vehicle.id);
            routeIndex++;

            // Update bookings with vehicle ID
            for (const booking of orderedBookings) {
                const updateResult = await updateBooking({
                    id: booking.id,
                    vehicleId: vehicle.id,
                    status: 'scheduled',
                });

                if (!updateResult.success) {
                    warnings.push(
                        `Failed to update booking ${booking.id}: ${updateResult.error?.message}`
                    );
                }
            }

            logger.info('Created route', {
                routeId: createdRoute.id,
                routeCode: createdRoute.routeCode,
                vehicleId: vehicle.id,
                stops: orderedBookings.length,
            });
        }
    }

    const summary = {
        totalBookings: allBookings.length,
        assignedBookings: allBookings.length - unassignedBookings.length,
        routesCreated: createdRoutes.length,
        vehiclesUsed: vehiclesUsed.size,
    };

    logger.info('Route planning completed', summary);

    return {
        success: true,
        data: {
            routes: createdRoutes,
            unassignedBookings,
            summary,
            warnings,
        },
    };
}
