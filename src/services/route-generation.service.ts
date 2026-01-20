/**
 * Route Generation Service
 *
 * Batches bookings by vehicle and service type, then calls Google Routes API
 * for route optimization. This service is designed to handle multiple bookings
 * and generate optimized routes for efficient service delivery.
 */

import { createContextLogger } from '../utils/logger.js';
import type { Result } from '../types/index.js';
import type { Booking } from '../types/booking.js';
import { getBookingById } from './booking.service.js';
import { computeRoutes } from './google-routes.service.js';
import {
  TravelMode,
  RoutingPreference,
  PolylineQuality,
} from '../types/google-routes.js';
import type {
  ComputeRoutesInput,
  ComputeRoutesResponse,
  Route,
  Waypoint,
} from '../types/google-routes.js';

/**
 * Logger instance for route generation operations
 */
const logger = createContextLogger('RouteGenerationService');

/**
 * Route generation service error
 */
export class RouteGenerationServiceError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'RouteGenerationServiceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Error codes for route generation service
 */
export const RouteGenerationErrorCodes = {
  INVALID_INPUT: 'ROUTE_GENERATION_INVALID_INPUT',
  NO_BOOKINGS: 'ROUTE_GENERATION_NO_BOOKINGS',
  MISSING_COORDINATES: 'ROUTE_GENERATION_MISSING_COORDINATES',
  FETCH_BOOKING_FAILED: 'ROUTE_GENERATION_FETCH_BOOKING_FAILED',
  OPTIMIZATION_FAILED: 'ROUTE_GENERATION_OPTIMIZATION_FAILED',
  BATCH_FAILED: 'ROUTE_GENERATION_BATCH_FAILED',
} as const;

/**
 * A batch of bookings grouped by vehicle and service type
 */
export interface BookingBatch {
  vehicleId: string;
  serviceId: string;
  bookings: Booking[];
}

/**
 * Optimized route result for a batch of bookings
 */
export interface OptimizedRouteBatch {
  vehicleId: string;
  serviceId: string;
  bookings: Booking[];
  route: Route;
  optimizedOrder: number[]; // Indices of bookings in optimized order
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  plannedStartTime?: string;
  plannedEndTime?: string;
  warnings?: string[];
}

/**
 * Input for generating optimized routes
 */
export interface GenerateOptimizedRoutesInput {
  bookingIds?: string[]; // Array of booking IDs to fetch and batch
  bookings?: Booking[]; // Or provide booking objects directly
  departureLocation?: {
    latitude: number;
    longitude: number;
  }; // Optional starting point (defaults to first booking)
  returnToStart?: boolean; // Whether to return to departure location
  travelMode?: TravelMode; // Default: DRIVE
  routingPreference?: RoutingPreference; // Default: TRAFFIC_AWARE_OPTIMAL
  optimizeWaypointOrder?: boolean; // Default: true
}

/**
 * Response from route generation
 */
export interface GenerateOptimizedRoutesResponse {
  batches: OptimizedRouteBatch[];
  summary: {
    totalBatches: number;
    totalBookings: number;
    successfulBatches: number;
    failedBatches: number;
    totalDistanceMeters: number;
    totalDurationSeconds: number;
  };
  errors?: Array<{
    batchIndex: number;
    vehicleId: string;
    serviceId: string;
    error: string;
  }>;
}

/**
 * Validates a booking has required location data
 */
function validateBookingLocation(booking: Booking): boolean {
  return (
    booking.serviceLatitude !== null &&
    booking.serviceLatitude !== undefined &&
    booking.serviceLongitude !== null &&
    booking.serviceLongitude !== undefined &&
    booking.serviceLatitude >= -90 &&
    booking.serviceLatitude <= 90 &&
    booking.serviceLongitude >= -180 &&
    booking.serviceLongitude <= 180
  );
}

/**
 * Batches bookings by route ID and service ID
 * Note: In the new model, bookings are assigned to routes (which have vehicles)
 */
function batchBookingsByVehicleAndService(bookings: Booking[]): BookingBatch[] {
  const batches = new Map<string, BookingBatch>();

  for (const booking of bookings) {
    // Skip bookings without route assignment
    if (!booking.routeId) {
      logger.debug('Skipping booking without route assignment', {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
      });
      continue;
    }

    // Skip bookings without valid coordinates
    if (!validateBookingLocation(booking)) {
      logger.debug('Skipping booking without valid coordinates', {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
      });
      continue;
    }

    // Create a composite key: routeId:serviceId
    const batchKey = `${booking.routeId}:${booking.serviceId}`;

    if (!batches.has(batchKey)) {
      batches.set(batchKey, {
        vehicleId: booking.routeId, // Note: This is actually routeId; vehicleId should come from route
        serviceId: booking.serviceId || booking.serviceIds?.[0] || '',
        bookings: [],
      });
    }

    batches.get(batchKey)!.bookings.push(booking);
  }

  return Array.from(batches.values());
}

/**
 * Converts a booking to a waypoint for the Routes API
 */
function bookingToWaypoint(booking: Booking): Waypoint {
  return {
    location: {
      latLng: {
        latitude: booking.serviceLatitude!,
        longitude: booking.serviceLongitude!,
      },
    },
    vehicleStopover: true,
  };
}

/**
 * Computes optimized route for a batch of bookings
 */
async function optimizeBatchRoute(
  batch: BookingBatch,
  options: {
    departureLocation?: { latitude: number; longitude: number };
    returnToStart?: boolean;
    travelMode?: TravelMode;
    routingPreference?: RoutingPreference;
    optimizeWaypointOrder?: boolean;
  }
): Promise<Result<OptimizedRouteBatch>> {
  logger.debug('Optimizing route for batch', {
    vehicleId: batch.vehicleId,
    serviceId: batch.serviceId,
    bookingCount: batch.bookings.length,
  });

  // Validate batch has at least one booking
  if (batch.bookings.length === 0) {
    return {
      success: false,
      error: new RouteGenerationServiceError(
        'Batch has no bookings',
        RouteGenerationErrorCodes.NO_BOOKINGS,
        { batch }
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
    // Use first booking as origin
    const firstBooking = batch.bookings[0];
    if (!firstBooking) {
      return {
        success: false,
        error: new RouteGenerationServiceError(
          'Batch has no bookings to use as origin',
          RouteGenerationErrorCodes.NO_BOOKINGS,
          { batch }
        ),
      };
    }
    origin = bookingToWaypoint(firstBooking);
  }

  // Determine destination
  let destination: Waypoint;
  if (options.returnToStart) {
    // Return to origin
    destination = origin;
  } else {
    // Use last booking as destination
    const lastBooking = batch.bookings[batch.bookings.length - 1];
    if (!lastBooking) {
      return {
        success: false,
        error: new RouteGenerationServiceError(
          'Batch has no bookings to use as destination',
          RouteGenerationErrorCodes.NO_BOOKINGS,
          { batch }
        ),
      };
    }
    destination = bookingToWaypoint(lastBooking);
  }

  // Build intermediates list
  const intermediates: Waypoint[] = [];

  if (options.departureLocation) {
    // If we have a departure location, all bookings are intermediates (except possibly the last)
    if (options.returnToStart) {
      // All bookings are intermediates
      intermediates.push(...batch.bookings.map(bookingToWaypoint));
    } else {
      // All but last booking are intermediates
      intermediates.push(...batch.bookings.slice(0, -1).map(bookingToWaypoint));
    }
  } else {
    // First booking is origin, last is destination, rest are intermediates
    if (batch.bookings.length > 2) {
      intermediates.push(...batch.bookings.slice(1, -1).map(bookingToWaypoint));
    }
  }

  // Build route computation input
  const routeInput: ComputeRoutesInput = {
    origin,
    destination,
    intermediates: intermediates.length > 0 ? intermediates : undefined,
    travelMode: options.travelMode || TravelMode.DRIVE,
    routingPreference: options.routingPreference || RoutingPreference.TRAFFIC_AWARE_OPTIMAL,
    optimizeWaypointOrder: options.optimizeWaypointOrder ?? true,
    polylineQuality: PolylineQuality.HIGH_QUALITY,
    computeAlternativeRoutes: false,
  };

  logger.debug('Calling Google Routes API', {
    origin,
    destination,
    intermediateCount: intermediates.length,
    optimizeWaypointOrder: routeInput.optimizeWaypointOrder,
  });

  // Call Google Routes API
  const routeResult = await computeRoutes(routeInput);

  if (!routeResult.success) {
    logger.error('Failed to compute route for batch', routeResult.error, {
      vehicleId: batch.vehicleId,
      serviceId: batch.serviceId,
    });
    return {
      success: false,
      error: new RouteGenerationServiceError(
        `Failed to compute route: ${routeResult.error?.message}`,
        RouteGenerationErrorCodes.OPTIMIZATION_FAILED,
        { batch, originalError: routeResult.error }
      ),
    };
  }

  const routeResponse = routeResult.data as ComputeRoutesResponse;

  // Get the optimal route
  if (!routeResponse.routes || routeResponse.routes.length === 0) {
    logger.warn('No routes returned from API', {
      vehicleId: batch.vehicleId,
      serviceId: batch.serviceId,
    });
    return {
      success: false,
      error: new RouteGenerationServiceError(
        'No routes returned from Google Routes API',
        RouteGenerationErrorCodes.OPTIMIZATION_FAILED,
        { batch }
      ),
    };
  }

  const optimalRoute = routeResponse.routes[0];
  if (!optimalRoute) {
    return {
      success: false,
      error: new RouteGenerationServiceError(
        'No optimal route found in response',
        RouteGenerationErrorCodes.OPTIMIZATION_FAILED,
        { batch }
      ),
    };
  }

  // Extract optimized waypoint order
  const optimizedOrder = optimalRoute.optimizedIntermediateWaypointIndex || [];

  // Calculate totals
  const totalDistanceMeters = optimalRoute.distanceMeters;
  const durationMatch = optimalRoute.duration?.match(/^(\d+)s$/);
  const totalDurationSeconds = durationMatch && durationMatch[1] ? parseInt(durationMatch[1], 10) : 0;

  // Calculate Planned Start and End Times
  let plannedStartTime: string | undefined;
  let plannedEndTime: string | undefined;

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

  // Reconstruct the visit sequence to identify first and last bookings
  // Note: logic mirrors the construction of 'intermediates' input
  let sortedBookings: Booking[] = [];

  // Logic to determine sequence based on options
  if (options.departureLocation) {
    // Departure is Custom (Not a booking)
    // All bookings are considered intermediates (or destination)
    // If returnToStart is TRUE: All bookings are intermediates.
    // If returnToStart is FALSE: All bookings except last are intermediates. Last is Destination.

    if (options.returnToStart) {
      // All bookings are intermediates.
      // ordered by optimizedOrder indices
      sortedBookings = optimizedOrder.map(idx => batch.bookings[idx]!);
    } else {
      // Last booking is DESTINATION.
      // intermediates = batch.bookings.slice(0, -1)
      // optimizedOrder indices refer to this slice
      const intermediateBookings = batch.bookings.slice(0, -1);
      const sortedIntermediates = optimizedOrder.map(idx => intermediateBookings[idx]!);
      // Append the destination booking (fixed at end)
      sortedBookings = [...sortedIntermediates, batch.bookings[batch.bookings.length - 1]!];
    }
  } else {
    // ORIGIN is Booking[0]
    // If returnToStart is TRUE: Destination is Origin. Intermediates = Booking[1...Last]
    // If returnToStart is FALSE: Destination is Booking[Last]. Intermediates = Booking[1...Last-1]

    const firstBooking = batch.bookings[0]; // Fixed Origin

    if (options.returnToStart) {
      // Intermediates = batch.bookings.slice(1) assuming purely circular? 
      // Wait, 'intermediates' loop: i = 1 to endIdx.
      // If returnToStart, endIdx = length. So Intermediates = Booking[1]...Booking[Last].
      const intermediatesList = batch.bookings.slice(1);
      const sortedIntermediates = optimizedOrder.map(idx => intermediatesList[idx]!);
      sortedBookings = [firstBooking!, ...sortedIntermediates];
    } else {
      // Destination is Fixed Last.
      // Intermediates = Booking[1]...Booking[Last-1]
      if (batch.bookings.length > 2) {
        const intermediatesList = batch.bookings.slice(1, -1);
        const sortedIntermediates = optimizedOrder.map(idx => intermediatesList[idx]!);
        sortedBookings = [firstBooking!, ...sortedIntermediates, batch.bookings[batch.bookings.length - 1]!];
      } else {
        // Only 2 bookings: Origin and Destination. No intermediates.
        sortedBookings = [...batch.bookings];
      }
    }
  }

  // Identify First Visit Booking
  const firstVisitBooking = sortedBookings[0];

  if (firstVisitBooking && firstVisitBooking.scheduledStartTime) {
    const firstStartSeconds = timeToSeconds(firstVisitBooking.scheduledStartTime);

    // Travel Time to First Visit
    // Leg 0 is Origin -> First Visit.
    const firstLeg = optimalRoute.legs[0];
    const travelToFirstSeconds = firstLeg && firstLeg.duration
      ? parseInt(firstLeg.duration.replace('s', ''), 10)
      : 0;

    // Planned Start = Scheduled Start - Travel Time
    plannedStartTime = secondsToTime(firstStartSeconds - travelToFirstSeconds);
  }

  // Identify Last Visit Booking
  const lastVisitBooking = sortedBookings[sortedBookings.length - 1];

  if (lastVisitBooking && lastVisitBooking.scheduledStartTime) {
    const lastStartSeconds = timeToSeconds(lastVisitBooking.scheduledStartTime);
    const serviceDurationSeconds = (lastVisitBooking.estimatedDurationMinutes || 30) * 60;

    // Travel Time from Last Visit to Destination
    // Last Leg?
    // If returnToStart, Route ends at Origin. Last leg is LastBooking -> Origin.
    // If NOT returnToStart, Route ends at LastBooking?
    // If Route ends at LastBooking, travel time after service is 0.

    let travelFromLastSeconds = 0;
    if (options.returnToStart) {
      const lastLeg = optimalRoute.legs[optimalRoute.legs.length - 1];
      travelFromLastSeconds = lastLeg && lastLeg.duration
        ? parseInt(lastLeg.duration.replace('s', ''), 10)
        : 0;
    }

    plannedEndTime = secondsToTime(lastStartSeconds + serviceDurationSeconds + travelFromLastSeconds);
  } else if (plannedStartTime) {
    // Fallback: Start + Total Duration
    const startSeconds = timeToSeconds(plannedStartTime);
    plannedEndTime = secondsToTime(startSeconds + totalDurationSeconds);
  }


  logger.info('Successfully optimized route for batch', {
    vehicleId: batch.vehicleId,
    serviceId: batch.serviceId,
    bookingCount: batch.bookings.length,
    totalDistanceMeters,
    totalDurationSeconds,
    optimizedOrder,
  });

  return {
    success: true,
    data: {
      vehicleId: batch.vehicleId,
      serviceId: batch.serviceId,
      bookings: batch.bookings,
      route: optimalRoute,
      optimizedOrder,
      totalDistanceMeters,
      totalDurationSeconds,
      plannedStartTime,
      plannedEndTime,
      warnings: optimalRoute.warnings,
    },
  };
}

/**
 * Generates optimized routes for multiple bookings by batching them
 * by vehicle and service type, then calling Google Routes API
 *
 * @param input - Configuration for route generation
 * @returns Optimized route batches with summary
 */
export async function generateOptimizedRoutes(
  input: GenerateOptimizedRoutesInput
): Promise<Result<GenerateOptimizedRoutesResponse>> {
  logger.debug('Starting route generation', {
    bookingIdsCount: input.bookingIds?.length,
    bookingsCount: input.bookings?.length,
    hasDepartureLocation: !!input.departureLocation,
    returnToStart: input.returnToStart,
  });

  // Validate input
  if (!input.bookingIds && !input.bookings) {
    return {
      success: false,
      error: new RouteGenerationServiceError(
        'Must provide either bookingIds or bookings',
        RouteGenerationErrorCodes.INVALID_INPUT
      ),
    };
  }

  if (input.bookingIds && input.bookings) {
    return {
      success: false,
      error: new RouteGenerationServiceError(
        'Cannot provide both bookingIds and bookings',
        RouteGenerationErrorCodes.INVALID_INPUT
      ),
    };
  }

  // Fetch bookings if IDs provided
  let bookings: Booking[];
  if (input.bookingIds) {
    logger.debug('Fetching bookings by ID', { count: input.bookingIds.length });
    bookings = [];

    for (const id of input.bookingIds) {
      const result = await getBookingById(id);
      if (!result.success) {
        logger.error('Failed to fetch booking', result.error, { bookingId: id });
        return {
          success: false,
          error: new RouteGenerationServiceError(
            `Failed to fetch booking ${id}: ${result.error?.message}`,
            RouteGenerationErrorCodes.FETCH_BOOKING_FAILED,
            { bookingId: id, originalError: result.error }
          ),
        };
      }
      bookings.push(result.data as Booking);
    }
  } else {
    bookings = input.bookings!;
  }

  if (bookings.length === 0) {
    return {
      success: false,
      error: new RouteGenerationServiceError(
        'No bookings provided',
        RouteGenerationErrorCodes.NO_BOOKINGS
      ),
    };
  }

  logger.info('Processing bookings for route generation', {
    totalBookings: bookings.length,
  });

  // Batch bookings by vehicle and service type
  const batches = batchBookingsByVehicleAndService(bookings);

  logger.info('Batched bookings', {
    totalBatches: batches.length,
    batchDetails: batches.map(b => ({
      vehicleId: b.vehicleId,
      serviceId: b.serviceId,
      bookingCount: b.bookings.length,
    })),
  });

  if (batches.length === 0) {
    return {
      success: false,
      error: new RouteGenerationServiceError(
        'No valid batches created (bookings may be missing vehicle assignments or coordinates)',
        RouteGenerationErrorCodes.NO_BOOKINGS
      ),
    };
  }

  // Optimize routes for each batch
  const optimizedBatches: OptimizedRouteBatch[] = [];
  const errors: Array<{
    batchIndex: number;
    vehicleId: string;
    serviceId: string;
    error: string;
  }> = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    if (!batch) continue; // TypeScript guard

    const optimizeResult = await optimizeBatchRoute(batch, {
      departureLocation: input.departureLocation,
      returnToStart: input.returnToStart,
      travelMode: input.travelMode,
      routingPreference: input.routingPreference,
      optimizeWaypointOrder: input.optimizeWaypointOrder,
    });

    if (optimizeResult.success) {
      optimizedBatches.push(optimizeResult.data as OptimizedRouteBatch);
    } else {
      errors.push({
        batchIndex: i,
        vehicleId: batch.vehicleId,
        serviceId: batch.serviceId,
        error: optimizeResult.error?.message || 'Unknown error',
      });
      logger.error('Failed to optimize batch', optimizeResult.error, {
        batchIndex: i,
        vehicleId: batch.vehicleId,
        serviceId: batch.serviceId,
      });
    }
  }

  // Calculate summary
  const totalDistanceMeters = optimizedBatches.reduce(
    (sum, batch) => sum + batch.totalDistanceMeters,
    0
  );
  const totalDurationSeconds = optimizedBatches.reduce(
    (sum, batch) => sum + batch.totalDurationSeconds,
    0
  );

  const summary = {
    totalBatches: batches.length,
    totalBookings: bookings.length,
    successfulBatches: optimizedBatches.length,
    failedBatches: errors.length,
    totalDistanceMeters,
    totalDurationSeconds,
  };

  logger.info('Route generation completed', summary);

  return {
    success: true,
    data: {
      batches: optimizedBatches,
      summary,
      errors: errors.length > 0 ? errors : undefined,
    },
  };
}
