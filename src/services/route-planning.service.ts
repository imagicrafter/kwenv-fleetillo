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

import { createContextLogger } from '../utils/logger';
import type { Result } from '../types/index';
import type { Booking, BookingFilters } from '../types/booking';
import type { Route, CreateRouteInput } from '../types/route';
import { getBookings, updateBooking } from './booking.service';
import { getVehicles } from './vehicle.service';
import { getServices } from './service.service';
import type { Vehicle } from '../types/vehicle';
import {
    getRouteSettings,
} from './settings.service';
import {
    createRoute,
} from './route.service';
import { getLocationById } from './location.service';
import { getVehiclePrimaryLocation } from './vehicle-location.service';
import { getAdminSupabaseClient, getSupabaseClient } from './supabase';
import { getRoutePlanningParams } from './settings.service';
import { computeRoutes } from './google-routes.service';
import {
    TravelMode,
    RoutingPreference,
    PolylineQuality,
} from '../types/google-routes';
import type {
    ComputeRoutesInput,
    ComputeRoutesResponse,
    Waypoint,
    Route as GoogleRoute,
} from '../types/google-routes';

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
 * Calculates estimated travel time in minutes between two coordinates
 * Uses dynamic settings for speed and traffic buffer
 */
function estimateTravelTimeMinutes(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    avgSpeedKmph: number,
    trafficBufferMultiplier: number
): number {
    const distKm = haversineDistance(lat1, lon1, lat2, lon2);
    // Time = Distance / Speed * 60 minutes * traffic buffer
    return (distKm / avgSpeedKmph) * 60 * trafficBufferMultiplier;
}

/**
 * Allocates bookings to vehicles based on geographic proximity and time constraints.
 * Returns reordered bookings (to match allocation) and the allocation counts.
 * 
 * Algorithm:
 * 1. Initialize all vehicles with empty routes
 * 2. Unassigned bookings pool
 * 3. While unassigned bookings exist:
 *    - For each vehicle:
 *      - Find nearest unassigned booking to vehicle's last location
 *      - Check if adding it violates max daily time (default 9 hours = 540 mins)
 *      - If fits, assign and update vehicle state
 */
async function createTimeAwareAllocation(
    bookings: Booking[],
    vehicles: Vehicle[],
    locationMap: Map<string, { latitude: number; longitude: number; name: string }>,
    servicesMap: Map<string, number> // serviceId -> averageDurationMinutes
): Promise<{
    allocations: { vehicleId: string; bookingCount: number; startLocationId?: string }[];
    orderedBookings: Booking[];
    warnings: string[];
}> {
    if (bookings.length === 0 || vehicles.length === 0) {
        return { allocations: [], orderedBookings: [], warnings: [] };
    }

    // Load dynamic settings
    const params = await getRoutePlanningParams();
    const MAX_DAILY_MINUTES = params.maxDailyMinutes;
    const warnings: string[] = [];

    // State for each vehicle
    const vehicleStates = vehicles.map(v => {
        // Determine start location
        let currentLat = 0;
        let currentLon = 0;
        let hasLocation = false;

        // Try to find vehicle home/primary location coordinates
        if (v.homeLocationId && locationMap.has(v.homeLocationId)) {
            const loc = locationMap.get(v.homeLocationId)!;
            currentLat = loc.latitude;
            currentLon = loc.longitude;
            hasLocation = true;
        }

        return {
            vehicle: v,
            currentLat,
            currentLon,
            hasLocation,
            usedMinutes: 0,
            assignedBookings: [] as Booking[],
        };
    });

    // Work with a copy of bookings to track assignment
    const unassigned = [...bookings];

    // Helper to get booking duration
    const getServiceDuration = (b: Booking) => {
        // Use estimatedDuration if overridden on booking, else service average, else default 30
        return b.estimatedDurationMinutes || servicesMap.get(b.serviceId || b.serviceIds?.[0] || '') || 30;
    };

    // Greedy allocation loop
    // In each round, each vehicle tries to pick its nearest neighbor
    let assignedSomething = true;

    while (unassigned.length > 0 && assignedSomething) {
        assignedSomething = false;

        for (const state of vehicleStates) {
            if (unassigned.length === 0) break;

            // Simple heuristic: can this vehicle support more work?
            if (state.usedMinutes >= MAX_DAILY_MINUTES) continue;

            // Find nearest booking
            let nearestIdx = -1;
            let nearestDist = Infinity;
            let nearestCoords: { latitude: number, longitude: number } | null = null;

            for (let i = 0; i < unassigned.length; i++) {
                const booking = unassigned[i]!;

                // Check service compatibility first
                const vehicleServiceSet = new Set(state.vehicle.serviceTypes || []);
                // If vehicle has no service types, assume it can do anything? Or nothing?
                // Using existing logic: if set exists, must contain serviceId
                if (state.vehicle.serviceTypes && state.vehicle.serviceTypes.length > 0) {
                    if (!vehicleServiceSet.has(booking.serviceId || booking.serviceIds?.[0] || '')) continue;
                }

                const coords = getBookingCoordinates(booking);
                if (!coords) continue;

                // Distance from vehicle's current position (last stop or depot)
                // If vehicle has no location, pick any (first) as seed relative to 0,0?
                // Better: if no location, maybe just pick first available to initialize
                let dist = 0;
                if (state.hasLocation) {
                    dist = haversineDistance(state.currentLat, state.currentLon, coords.latitude, coords.longitude);
                } else {
                    // Vehicle has no start location, so distance is 0 (first pick is free effectively)
                    dist = 0;
                }

                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestIdx = i;
                    nearestCoords = coords;
                }
            }

            if (nearestIdx !== -1 && nearestCoords) {
                const candidate = unassigned[nearestIdx]!;
                const travelTime = state.hasLocation
                    ? estimateTravelTimeMinutes(
                        state.currentLat, state.currentLon,
                        nearestCoords.latitude, nearestCoords.longitude,
                        params.avgTravelSpeedKmph, params.trafficBufferMultiplier
                    )
                    : 0;
                const serviceTime = getServiceDuration(candidate);

                // Check if adding this fits in day
                // Note: We should ideally account for return trip to depot, but for greedy packing we check that later or assume buffer
                if (state.usedMinutes + travelTime + serviceTime <= MAX_DAILY_MINUTES) {
                    // Assign
                    state.assignedBookings.push(candidate);
                    state.usedMinutes += travelTime + serviceTime;
                    state.currentLat = nearestCoords.latitude;
                    state.currentLon = nearestCoords.longitude;
                    state.hasLocation = true; // Now it has a location (the stop)

                    unassigned.splice(nearestIdx, 1);
                    assignedSomething = true;
                }
            }
        }
    }

    // Capture unassigned as warnings
    if (unassigned.length > 0) {
        warnings.push(`${unassigned.length} bookings could not be fit into vehicle time windows`);
    }

    // Construct result
    const orderedBookings: Booking[] = [];
    const allocations: { vehicleId: string; bookingCount: number; startLocationId?: string }[] = [];

    for (const state of vehicleStates) {
        if (state.assignedBookings.length > 0) {
            orderedBookings.push(...state.assignedBookings);
            allocations.push({
                vehicleId: state.vehicle.id,
                bookingCount: state.assignedBookings.length,
                startLocationId: state.vehicle.homeLocationId // preserve home loc preference
            });
        }
    }

    // Add any remaining bookings that fit nowhere to unassigned list in caller? 
    // The caller (planRoutes) expects 'allocations' to sum up to compatibleBookings used.
    // We implicitly dropped bookings that didn't fit time.
    // To handle this, we should append them to specific list or just return what fits.
    // The calling function splits 'compatibleBookings' based on allocation counts.
    // ISSUE: The calling function uses `options.vehicleAllocations` or `defaultAllocation`.
    // And it iterates `allocations` and slices `compatibleBookings`.
    // So `compatibleBookings` MUST remain the source of truth for the slice.
    // This function returns `orderedBookings` which implies we MUST replace `compatibleBookings` with this list in the caller
    // Or ensures `allocations` matches EXACTLY the order in `orderedBookings`.

    return {
        allocations,
        orderedBookings, // This MUST replace the 'compatibleBookings' list in usage
        warnings
    };
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
        startTime?: string;
    }
): Promise<Result<{ route: GoogleRoute; optimizedOrder: number[]; plannedStartTime?: string; plannedEndTime?: string }>> {
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

    // Helper: Map intermediate index back to booking
    const intermediateBookings: Booking[] = [];
    for (let i = startIdx; i < endIdx; i++) {
        intermediateBookings.push(bookings[i]!);
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

    // --- Time Calculation Logic ---

    // Helper to parse "HH:MM:SS" to seconds from midnight
    const timeToSeconds = (timeStr: string): number => {
        const [h, m, s] = timeStr.split(':').map(Number);
        return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
    };

    // Helper to format seconds from midnight to "HH:MM:SS"
    const secondsToTime = (totalSeconds: number): string => {
        let seconds = Math.max(0, totalSeconds);
        const h = Math.floor(seconds / 3600) % 24;
        seconds %= 3600;
        const m = Math.floor(seconds / 60);
        const s = Math.round(seconds % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const durationMatch = optimalRoute.duration?.match(/^(\d+)s$/);
    const totalDurationSeconds = durationMatch && durationMatch[1] ? parseInt(durationMatch[1], 10) : 0;

    let plannedStartTime: string | undefined;
    let plannedEndTime: string | undefined;

    // Reconstruct visit sequence
    // First visited booking from the intermediate list
    let firstVisitedBooking: Booking | undefined;
    let lastVisitBooking: Booking | undefined;

    if (intermediates.length > 0 && optimizedOrder.length > 0) {
        // Use optimized order to find first visited intermediate
        const firstIntermediateIdx = optimizedOrder[0];
        if (firstIntermediateIdx !== undefined) {
            firstVisitedBooking = intermediateBookings[firstIntermediateIdx];
        }

        const lastIntermediateIdx = optimizedOrder[optimizedOrder.length - 1];
        if (lastIntermediateIdx !== undefined) {
            lastVisitBooking = intermediateBookings[lastIntermediateIdx];
        }
    } else if (intermediates.length > 0) {
        // No optimization (or 1 item?), assuming sequential
        firstVisitedBooking = intermediateBookings[0];
        lastVisitBooking = intermediateBookings[intermediateBookings.length - 1];
    }

    // Use explicit start time if provided (Standardized behavior)
    // Otherwise fall back to existing logic (though essentially we want to enforce this)
    if (options.startTime) {
        // Ensure seconds part if missing
        const parts = options.startTime.split(':');
        if (parts.length === 2) {
            plannedStartTime = `${options.startTime}:00`;
        } else {
            plannedStartTime = options.startTime;
        }
    } else {
        // Legacy fallback logic
        // Determine First Visit for Start Time calculation
        if (options.departureLocation) {
            // Origin is depot. Route starts by traveling to firstVisitedBooking.
            if (firstVisitedBooking && firstVisitedBooking.scheduledStartTime) {
                const firstStartSeconds = timeToSeconds(firstVisitedBooking.scheduledStartTime);
                // Leg 0 is Origin -> First Visited Booking
                const firstLeg = optimalRoute.legs ? optimalRoute.legs[0] : undefined;
                const travelToFirstSeconds = firstLeg && firstLeg.duration
                    ? parseInt(firstLeg.duration.replace('s', ''), 10)
                    : 0;
                plannedStartTime = secondsToTime(firstStartSeconds - travelToFirstSeconds);
            }
        } else {
            // Origin is a booking (bookings[0]).
            // Start time is that booking's scheduled start time.
            const originBooking = bookings[0];
            if (originBooking && originBooking.scheduledStartTime) {
                plannedStartTime = originBooking.scheduledStartTime;
            }
        }
    }

    // Determine Last Visit for End Time calculation
    // Final destination:
    // If destinationLocation provided: Last Leg ends there. Previous stop was last visited booking (or last intermediate).
    // If returnToStart: Last Leg ends at Origin. Previous stop was last visited booking.
    // If neither: Last booking IS the destination.

    // If we have explicit destination or returnToStart, the last visited booking is the last intermediate.
    // If using bookings as destination (normal flow), last booking is destination.

    let referenceBookingForEnd: Booking | undefined;
    if (options.destinationLocation || options.returnToStart) {
        // Considers last visited intermediate as the last service point
        referenceBookingForEnd = lastVisitBooking;
        // Note: If no intermediates, what happens? e.g. Origin -> Destination directly.
    } else {
        // Last booking is the destination
        referenceBookingForEnd = bookings[bookings.length - 1];
    }

    if (referenceBookingForEnd && referenceBookingForEnd.scheduledStartTime) {
        const lastStartSeconds = timeToSeconds(referenceBookingForEnd.scheduledStartTime);
        const serviceDurationSeconds = (referenceBookingForEnd.estimatedDurationMinutes || 30) * 60;

        let travelFromLastSeconds = 0;
        // Logic: find travel time from reference booking to final destination
        // If reference is destination (normal flow), travel is 0.
        // If reference is last intermediate (returnToStart/customDest), travel is last leg.

        if (options.destinationLocation || options.returnToStart) {
            const lastLeg = optimalRoute.legs ? optimalRoute.legs[optimalRoute.legs.length - 1] : undefined;
            travelFromLastSeconds = lastLeg && lastLeg.duration
                ? parseInt(lastLeg.duration.replace('s', ''), 10)
                : 0;
        }

        plannedEndTime = secondsToTime(lastStartSeconds + serviceDurationSeconds + travelFromLastSeconds);

    } else if (plannedStartTime) {
        // Fallback
        const startSeconds = timeToSeconds(plannedStartTime);
        plannedEndTime = secondsToTime(startSeconds + totalDurationSeconds);
    }

    return {
        success: true,
        data: {
            route: optimalRoute,
            optimizedOrder,
            plannedStartTime,
            plannedEndTime,
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

        if (supportedServiceIds.has(booking.serviceId || booking.serviceIds?.[0] || '')) {
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
/**
 * Simple clusterer for breaking large routes into smaller batches (stops limit)
 */
function chunkBookings(bookings: Booking[], size: number): Booking[][] {
    const chunks: Booking[][] = [];
    for (let i = 0; i < bookings.length; i += size) {
        chunks.push(bookings.slice(i, i + size));
    }
    return chunks;
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

    // Filter to unscheduled bookings (no route assigned) with valid coordinates
    const validBookings = allBookings.filter(hasValidCoordinates);
    const invalidBookings = allBookings.filter(b => !hasValidCoordinates(b));
    const unscheduledBookings = validBookings.filter(b => !b.routeId); // Use routeId instead of vehicleId

    if (invalidBookings.length > 0) {
        warnings.push(`${invalidBookings.length} booking(s) missing coordinates`);
    }

    // Find compatible vehicle-booking pairs
    const { compatibleBookings, incompatibleBookings, vehicles, warnings: compatWarnings } =
        await findCompatibleVehicleBookings(unscheduledBookings, input.serviceId);

    warnings.push(...compatWarnings);

    // Fetch all depot/home type locations as available base locations
    // Import getAllLocations from location service if needed - using admin supabase directly
    const supabase = getAdminSupabaseClient() || getSupabaseClient();
    const { data: baseLocationsData } = await supabase
        .from('locations')
        .select('id, name, city, state, location_type')
        .in('location_type', ['depot', 'home', 'other'])
        .is('deleted_at', null);

    // Fetch services to get durations
    const servicesResult = await getServices({}, { page: 1, limit: 1000 });
    const servicesMap = new Map<string, number>();
    if (servicesResult.success && servicesResult.data) {
        for (const service of servicesResult.data.data) {
            servicesMap.set(service.id, service.averageDurationMinutes);
        }
    }

    // Collect and fetch home locations for vehicles properly with coordinates
    const locationCoordsMap = new Map<string, { latitude: number; longitude: number; name: string }>();
    const homeLocationIds = vehicles.map(v => v.homeLocationId).filter((id): id is string => !!id);

    for (const locId of homeLocationIds) {
        const locResult = await getLocationById(locId);
        if (locResult.success && locResult.data) {
            const loc = locResult.data;
            if (loc.latitude && loc.longitude) {
                locationCoordsMap.set(locId, {
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    name: loc.name
                });
            }
        }
    }

    // Create time-aware allocation
    const { allocations, orderedBookings, warnings: allocWarnings } = await createTimeAwareAllocation(
        compatibleBookings,
        vehicles,
        locationCoordsMap,
        servicesMap
    );
    warnings.push(...allocWarnings);

    // Identify which bookings from compat list were NOT allocated (due to constraints)
    // We need to move them to unassignable
    const allocatedBookingIds = new Set(orderedBookings.map(b => b.id));
    const unallocatedCompatible = compatibleBookings.filter(b => !allocatedBookingIds.has(b.id));

    // Enhance allocation for UI preview (similar to existing logic but using our new buckets)
    const enhancedAllocation = await Promise.all(
        allocations.map(async (alloc) => {
            const vehicle = vehicles.find(v => v.id === alloc.vehicleId)!;

            // Query vehicle_locations junction table for this vehicle
            // Reuse existing location logic...
            const locationMap = new Map<string, { name: string; city: string; state: string }>();
            if (vehicle.homeLocationId && locationCoordsMap.has(vehicle.homeLocationId)) {
                // simple mock as we only need simple info here
                locationMap.set(vehicle.homeLocationId, {
                    name: locationCoordsMap.get(vehicle.homeLocationId)!.name,
                    city: "", state: ""
                });
            }

            const supabase = getAdminSupabaseClient() || getSupabaseClient();
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
            const finalLocations = availableLocations.length > 0
                ? availableLocations
                : baseLocationsData?.map((loc: any) => ({ ...loc, isPrimary: false })) || [];

            return {
                vehicleId: alloc.vehicleId,
                vehicleName: vehicle.name,
                bookingCount: alloc.bookingCount,
                homeLocationId: vehicle.homeLocationId,
                homeLocationName: vehicle.homeLocationId ? locationCoordsMap.get(vehicle.homeLocationId)?.name : undefined,
                availableLocations: finalLocations
            };
        })
    );

    return {
        success: true,
        data: {
            routeDate,
            bookings: orderedBookings, // Return the SORTED/FILTERED list that matches the allocation order
            vehicles,
            defaultAllocation: enhancedAllocation,
            unassignableBookings: [...invalidBookings, ...incompatibleBookings, ...unallocatedCompatible],
            warnings,
            availableBaseLocations: (baseLocationsData || []).map((loc: any) => ({
                id: loc.id,
                name: loc.name,
                city: loc.city,
                state: loc.state,
            })),
        },
    };
}

/**
 * Plans routes for a specific date
 */
export async function planRoutes(
    input: PlanRoutesInput
): Promise<Result<PlanRoutesResponse>> {
    // Fetch route settings to get configured day start time
    const settingsResult = await getRouteSettings();
    const dayStartTime = settingsResult.success && settingsResult.data ? settingsResult.data.schedule.dayStartTime : '08:00';

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

    // Filter bookings that don't already have a route assigned (unscheduled)
    const unscheduledBookings = validBookings.filter((b) => !b.routeId); // Use routeId instead of vehicleId

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

    // Determine allocation: use user-provided or generate default (Time Aware)
    let allocations = input.vehicleAllocations;

    // We need to reorganize 'compatibleBookings' to match the allocation strategy if we are generating it
    let orderedBookings = compatibleBookings;

    if (!allocations || allocations.length === 0) {
        // Fetch services to get durations
        const servicesResult = await getServices({}, { page: 1, limit: 1000 });
        const servicesMap = new Map<string, number>();
        if (servicesResult.success && servicesResult.data) {
            for (const service of servicesResult.data.data) {
                servicesMap.set(service.id, service.averageDurationMinutes);
            }
        }

        const locationCoordsMap = new Map<string, { latitude: number; longitude: number; name: string }>();
        const homeLocationIds = vehicles.map(v => v.homeLocationId).filter((id): id is string => !!id);

        for (const locId of homeLocationIds) {
            const locResult = await getLocationById(locId);
            if (locResult.success && locResult.data) {
                // We know locResult.data has lat/long but we need to check values
                const loc = locResult.data;
                if (loc.latitude && loc.longitude) {
                    locationCoordsMap.set(locId, {
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                        name: loc.name
                    });
                }
            }
        }

        // Generate Time Aware Allocation
        const result = await createTimeAwareAllocation(compatibleBookings, vehicles, locationCoordsMap, servicesMap);

        allocations = result.allocations;
        orderedBookings = result.orderedBookings; // IMPORTANT: Use the ordered list!

        // Add warnings for those that didn't fit
        warnings.push(...result.warnings);

        // Update incompatible list (or just log it, since existing response struct treats unassigned as a separate bucket)
        // We need to separate the ordered (assigned) from the original compatible list to find dropouts
        const assignedIds = new Set(orderedBookings.map(b => b.id));
        const droppedBookings = compatibleBookings.filter(b => !assignedIds.has(b.id));
        unassignedBookings.push(...droppedBookings);
    } else {
        // If user provided manual allocation, we trust their counts but we don't have the order guarantees 
        // that our allocator provides. This is tricky. Manual allocation usually implies 
        // "Give Vehicle 1 X bookings from the pool".
        // For now, we keep the existing behavior for manual overrides (greedy take from pool)
        // but arguably we should respect time there too.
        // Given complexity, let's assume manual overrides bypass time checks (User knows best).
    }

    // Validate allocation total matches booking count
    // Validate allocation total matches booking count
    // Note: orderedBookings.length should equal totalAllocated if we used our generator

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

        // Get the bookings for this allocation from our ORDERED list
        const bookingsForVehicle = orderedBookings.slice(
            bookingOffset,
            bookingOffset + allocation.bookingCount
        );
        bookingOffset += allocation.bookingCount;

        if (bookingsForVehicle.length === 0) continue;


        // Cluster bookings simply by chunking since we already did smart allocation
        // Geographic clustering was already effectively done during allocation
        const batches = chunkBookings(bookingsForVehicle, maxStops);

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
                startTime: dayStartTime, // Pass dayStartTime to optimizeBatch
            });

            if (!optimizeResult.success) {
                warnings.push(
                    `Failed to optimize route for batch: ${optimizeResult.error?.message}`
                );
                unassignedBookings.push(...batch);
                continue;
            }

            const { route: googleRoute, optimizedOrder, plannedStartTime, plannedEndTime } = optimizeResult.data!;

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

            // Calculate detailed timing and create formatted constraints
            const routeStartTime = new Date(routeDate);
            routeStartTime.setHours(8, 0, 0, 0); // Hardcoded start time 08:00 AM

            let currentRouteTime = new Date(routeStartTime);
            const bookingUpdates: { id: string, start: string, end: string }[] = [];

            let calculatedTotalServiceMinutes = 0;
            let calculatedTotalTravelMinutes = 0;

            // Logic to iterate through ordered bookings and apply legacy timing
            let legIndex = 0;

            for (let i = 0; i < orderedBookings.length; i++) {
                const booking = orderedBookings[i];
                if (!booking) continue; // Safety check

                let travelTimeSeconds = 0;

                // Determine travel time to this booking
                if (!hasCustomDeparture && i === 0) {
                    // First booking is the origin, no travel time
                    travelTimeSeconds = 0;
                } else {
                    const leg = googleRoute.legs ? googleRoute.legs[legIndex] : undefined;
                    if (leg) {
                        const durationStr = leg.duration;
                        const match = durationStr ? durationStr.match(/^(\d+)s$/) : null;
                        travelTimeSeconds = (match && match[1]) ? parseInt(match[1], 10) : 0;
                        legIndex++;
                    }
                }

                // Update current time with travel time
                currentRouteTime = new Date(currentRouteTime.getTime() + travelTimeSeconds * 1000);
                calculatedTotalTravelMinutes += Math.round(travelTimeSeconds / 60);

                // Round UP to next 15-minute interval for scheduled start
                const minutes = currentRouteTime.getMinutes();
                const remainder = minutes % 15;
                if (remainder > 0) {
                    currentRouteTime = new Date(currentRouteTime.getTime() + (15 - remainder) * 60 * 1000);
                }
                // Zero out seconds
                currentRouteTime.setSeconds(0, 0);

                // Capture Trip Arrival Time as Scheduled Start
                // Format: HH:mm (no seconds since we use quarter hours)
                const scheduledStartTime = currentRouteTime.toTimeString().substring(0, 5);

                // Add Service Duration
                let serviceDurationMinutes = 0;
                if (booking.serviceItems && booking.serviceItems.length > 0) {
                    serviceDurationMinutes = booking.serviceItems.reduce((total, item) => total + (item.duration || 0), 0);
                } else {
                    serviceDurationMinutes = booking.serviceAverageDurationMinutes || 30; // Default 30 mins
                }
                calculatedTotalServiceMinutes += serviceDurationMinutes;

                currentRouteTime = new Date(currentRouteTime.getTime() + serviceDurationMinutes * 60 * 1000);

                // Round UP end time to next 15-minute interval
                const endMinutes = currentRouteTime.getMinutes();
                const endRemainder = endMinutes % 15;
                if (endRemainder > 0) {
                    currentRouteTime = new Date(currentRouteTime.getTime() + (15 - endRemainder) * 60 * 1000);
                }
                currentRouteTime.setSeconds(0, 0);

                // Capture Trip Departure Time as Scheduled End
                const scheduledEndTime = currentRouteTime.toTimeString().substring(0, 5);

                bookingUpdates.push({
                    id: booking.id,
                    start: scheduledStartTime,
                    end: scheduledEndTime
                });
            }

            // Calculate route metrics
            const totalDistanceMeters = googleRoute.distanceMeters || 0;
            const durationMatch = googleRoute.duration?.match(/^(\d+)s$/) || null;
            const totalTravelSeconds = durationMatch && durationMatch[1] ? parseInt(durationMatch[1], 10) : (calculatedTotalTravelMinutes * 60);
            const finalTotalTravelMinutes = Math.ceil(totalTravelSeconds / 60);

            // Create route input
            const routeInput: CreateRouteInput = {
                routeName: `Route ${routeIndex} - ${routeDate.toISOString().split('T')[0]}`,
                routeCode: await generateUniqueRouteCode(routeDate),
                vehicleId: vehicle.id,
                routeDate,
                plannedStartTime: plannedStartTime || '08:00:00',
                plannedEndTime: plannedEndTime || (() => {
                    const startBase = plannedStartTime || '08:00:00';
                    const [h, m, s] = startBase.split(':').map(Number);
                    const startSeconds = (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
                    const totalSeconds = startSeconds + ((finalTotalTravelMinutes + calculatedTotalServiceMinutes) * 60);

                    const endH = Math.floor(totalSeconds / 3600) % 24;
                    const remSeconds = totalSeconds % 3600;
                    const endM = Math.floor(remSeconds / 60);
                    const endS = remSeconds % 60;
                    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:${String(endS).padStart(2, '0')}`;
                })(),
                totalDistanceKm: totalDistanceMeters / 1000,
                // Total duration = Travel (from Google) + Service (Calculated)
                totalDurationMinutes: finalTotalTravelMinutes + calculatedTotalServiceMinutes,
                totalServiceTimeMinutes: calculatedTotalServiceMinutes,
                totalTravelTimeMinutes: finalTotalTravelMinutes,
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
            const createRouteResult = await createRoute(routeInput);

            if (!createRouteResult.success) {
                logger.error('Failed to create route', { error: JSON.stringify(createRouteResult.error, Object.getOwnPropertyNames(createRouteResult.error)) });
                unassignedBookings.push(...orderedBookings);
                continue;
            }

            const createdRoute = createRouteResult.data!;
            createdRoutes.push(createdRoute);
            vehiclesUsed.add(vehicle.id);
            routeIndex++;

            // Update bookings with route ID, stop order, and timestamps
            let stopOrderIdx = 1;
            for (const update of bookingUpdates) {
                const updateResult = await updateBooking({
                    id: update.id,
                    routeId: createdRoute.id,
                    stopOrder: stopOrderIdx,
                    status: 'scheduled',
                    scheduledStartTime: update.start,
                    scheduledEndTime: update.end
                });

                if (!updateResult.success) {
                    warnings.push(
                        `Failed to update booking ${update.id}: ${updateResult.error?.message}`
                    );
                }
                stopOrderIdx++;
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
