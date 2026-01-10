# OptiRoute Route Planning Guide

This guide explains the route planning and optimization algorithm used in OptiRoute.

## Overview

The route planning service automatically:
1. Fetches confirmed bookings for a specific date
2. Matches bookings to compatible vehicles
3. Distributes bookings across vehicles
4. Optimizes stop order using Google Routes API
5. Creates route records with stop sequences

## Planning Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    Route Planning Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Fetch Bookings ──► Get confirmed bookings for date      │
│         │                                                    │
│         ▼                                                    │
│  2. Filter Valid ───► Remove bookings without coordinates   │
│         │                                                    │
│         ▼                                                    │
│  3. Find Vehicles ──► Get vehicles compatible with services │
│         │                                                    │
│         ▼                                                    │
│  4. Allocate ───────► Distribute bookings to vehicles       │
│         │                                                    │
│         ▼                                                    │
│  5. Cluster ────────► Group if exceeding max stops/route    │
│         │                                                    │
│         ▼                                                    │
│  6. Optimize ───────► Call Routes API for optimal order     │
│         │                                                    │
│         ▼                                                    │
│  7. Create Routes ──► Save route records with sequences     │
│         │                                                    │
│         ▼                                                    │
│  8. Update Bookings ► Set vehicle_id and status='scheduled' │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Type Definitions

```typescript
// src/types/route-planning.ts

export interface PlanRoutesInput {
  routeDate: Date | string;
  serviceId?: string;              // Filter by specific service
  maxStopsPerRoute?: number;       // Default: 15
  departureLocation?: Coordinates;  // Custom start point
  returnToStart?: boolean;         // End at start location
  routingPreference?: RoutingPreference;
  vehicleAllocations?: VehicleAllocation[];  // Manual allocation
}

export interface VehicleAllocation {
  vehicleId: string;
  bookingCount: number;            // How many bookings to assign
  startLocationId?: string;        // Override start location
  endLocationId?: string;          // Override end location
}

export interface PlanRoutesResponse {
  routes: Route[];
  unassignedBookings: Booking[];
  summary: {
    totalBookings: number;
    assignedBookings: number;
    routesCreated: number;
    vehiclesUsed: number;
    totalDistanceKm: number;
    totalDurationMinutes: number;
  };
  warnings: string[];
}

export interface RoutePlanningOptions {
  optimizationType: OptimizationType;
  maxDurationMinutes?: number;
  maxDistanceKm?: number;
  respectTimeWindows: boolean;
  clusterRadius?: number;          // km for geographic clustering
}

export type RoutingPreference =
  | 'TRAFFIC_UNAWARE'
  | 'TRAFFIC_AWARE'
  | 'TRAFFIC_AWARE_OPTIMAL';
```

## Service Implementation

```typescript
// src/services/route-planning.service.ts

import { getBookings } from './booking.service.js';
import { getVehicles } from './vehicle.service.js';
import { getLocationById } from './location.service.js';
import { createRoute } from './route.service.js';
import { computeRoutes, createWaypoint } from './google-routes.service.js';
import { createContextLogger } from '../utils/logger.js';
import type { Result } from '../types/index.js';
import type {
  PlanRoutesInput,
  PlanRoutesResponse,
  VehicleAllocation,
} from '../types/route-planning.js';
import type { Booking, Vehicle, Route } from '../types/index.js';

const logger = createContextLogger('RoutePlanningService');

const DEFAULT_MAX_STOPS = 15;

/**
 * Plan and create optimized routes for a given date
 */
export async function planRoutes(
  input: PlanRoutesInput
): Promise<Result<PlanRoutesResponse>> {
  const startTime = Date.now();
  logger.info('Starting route planning', { date: input.routeDate });

  const warnings: string[] = [];

  // Step 1: Fetch confirmed bookings for the date
  const bookingsResult = await getBookingsForPlanning(input);
  if (!bookingsResult.success) {
    return bookingsResult as Result<PlanRoutesResponse>;
  }

  const allBookings = bookingsResult.data!;
  logger.info(`Found ${allBookings.length} bookings for planning`);

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
          totalDistanceKm: 0,
          totalDurationMinutes: 0,
        },
        warnings: ['No confirmed bookings found for this date'],
      },
    };
  }

  // Step 2: Filter bookings with valid coordinates
  const { validBookings, invalidBookings } = filterValidBookings(allBookings);

  if (invalidBookings.length > 0) {
    warnings.push(
      `${invalidBookings.length} bookings have no coordinates and will not be scheduled`
    );
  }

  // Step 3: Find compatible vehicles
  const vehiclesResult = await findCompatibleVehicles(validBookings, input.serviceId);
  if (!vehiclesResult.success) {
    return vehiclesResult as Result<PlanRoutesResponse>;
  }

  const vehicles = vehiclesResult.data!;
  if (vehicles.length === 0) {
    return {
      success: false,
      error: new Error('No available vehicles found for these services'),
    };
  }

  // Step 4: Allocate bookings to vehicles
  const allocations = input.vehicleAllocations
    ? input.vehicleAllocations
    : distributeBookingsEvenly(validBookings.length, vehicles);

  // Step 5: Create and optimize routes
  const routes: Route[] = [];
  const assignedBookingIds = new Set<string>();
  let totalDistanceKm = 0;
  let totalDurationMinutes = 0;
  let bookingIndex = 0;

  for (const allocation of allocations) {
    const vehicleBookings = validBookings.slice(
      bookingIndex,
      bookingIndex + allocation.bookingCount
    );
    bookingIndex += allocation.bookingCount;

    if (vehicleBookings.length === 0) continue;

    // Get start/end locations
    const startLocation = await getStartLocation(allocation, vehicles);
    const endLocation = input.returnToStart
      ? startLocation
      : await getEndLocation(allocation, vehicles);

    // Cluster if too many stops
    const maxStops = input.maxStopsPerRoute ?? DEFAULT_MAX_STOPS;
    const clusters = clusterBookings(vehicleBookings, maxStops);

    for (const cluster of clusters) {
      // Optimize route using Google Routes API
      const optimizedResult = await optimizeRouteOrder(
        cluster,
        startLocation,
        endLocation,
        input.routingPreference
      );

      if (!optimizedResult.success) {
        warnings.push(
          `Route optimization failed for vehicle ${allocation.vehicleId}: ${optimizedResult.error?.message}`
        );
        continue;
      }

      const { orderedBookings, routeData } = optimizedResult.data!;

      // Create route record
      const routeResult = await createRoute({
        routeName: generateRouteName(allocation.vehicleId, input.routeDate, routes.length + 1),
        vehicleId: allocation.vehicleId,
        routeDate: formatDate(input.routeDate),
        plannedStartTime: '08:00',
        optimizationType: 'balanced',
        status: 'optimized',
        totalStops: orderedBookings.length,
        totalDistanceKm: routeData.distanceKm,
        totalDurationMinutes: routeData.durationMinutes,
        stopSequence: orderedBookings.map(b => b.id),
        routeGeometry: routeData.geometry,
      });

      if (routeResult.success) {
        routes.push(routeResult.data!);
        orderedBookings.forEach(b => assignedBookingIds.add(b.id));
        totalDistanceKm += routeData.distanceKm;
        totalDurationMinutes += routeData.durationMinutes;
      }
    }
  }

  // Step 6: Update bookings with vehicle assignments
  await updateBookingsWithRoutes(routes, validBookings);

  // Identify unassigned bookings
  const unassignedBookings = [
    ...invalidBookings,
    ...validBookings.filter(b => !assignedBookingIds.has(b.id)),
  ];

  const elapsed = Date.now() - startTime;
  logger.info(`Route planning completed in ${elapsed}ms`, {
    routes: routes.length,
    assigned: assignedBookingIds.size,
    unassigned: unassignedBookings.length,
  });

  return {
    success: true,
    data: {
      routes,
      unassignedBookings,
      summary: {
        totalBookings: allBookings.length,
        assignedBookings: assignedBookingIds.size,
        routesCreated: routes.length,
        vehiclesUsed: new Set(routes.map(r => r.vehicleId)).size,
        totalDistanceKm,
        totalDurationMinutes,
      },
      warnings,
    },
  };
}

/**
 * Preview route planning without saving
 */
export async function previewRoutePlan(
  input: PlanRoutesInput
): Promise<Result<PlanRoutesResponse>> {
  // Same logic as planRoutes but without creating route records
  // or updating bookings
  // ...implementation similar to planRoutes but read-only
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getBookingsForPlanning(
  input: PlanRoutesInput
): Promise<Result<Booking[]>> {
  const date = formatDate(input.routeDate);

  return await getBookings(
    {
      date,
      status: 'confirmed',
      serviceId: input.serviceId,
    },
    { page: 1, limit: 1000 }  // Get all for the date
  ).then(result => ({
    success: result.success,
    data: result.data?.data,
    error: result.error,
  }));
}

function filterValidBookings(bookings: Booking[]): {
  validBookings: Booking[];
  invalidBookings: Booking[];
} {
  const validBookings: Booking[] = [];
  const invalidBookings: Booking[] = [];

  for (const booking of bookings) {
    if (
      booking.latitude != null &&
      booking.longitude != null &&
      isValidCoordinate(booking.latitude, booking.longitude)
    ) {
      validBookings.push(booking);
    } else {
      invalidBookings.push(booking);
    }
  }

  return { validBookings, invalidBookings };
}

function isValidCoordinate(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

async function findCompatibleVehicles(
  bookings: Booking[],
  serviceId?: string
): Promise<Result<Vehicle[]>> {
  // Get unique service IDs from bookings
  const serviceIds = new Set(bookings.map(b => b.serviceId));

  // Get available vehicles
  const vehiclesResult = await getVehicles({ status: 'available' });
  if (!vehiclesResult.success) {
    return vehiclesResult as Result<Vehicle[]>;
  }

  // Filter vehicles that can handle the required services
  const compatibleVehicles = vehiclesResult.data!.data.filter(vehicle => {
    // Vehicle must have at least one matching service type
    return [...serviceIds].some(sid => vehicle.serviceTypes.includes(sid));
  });

  return { success: true, data: compatibleVehicles };
}

function distributeBookingsEvenly(
  bookingCount: number,
  vehicles: Vehicle[]
): VehicleAllocation[] {
  const vehicleCount = vehicles.length;
  const baseCount = Math.floor(bookingCount / vehicleCount);
  const remainder = bookingCount % vehicleCount;

  return vehicles.map((vehicle, index) => ({
    vehicleId: vehicle.id,
    bookingCount: baseCount + (index < remainder ? 1 : 0),
  }));
}

function clusterBookings(
  bookings: Booking[],
  maxPerCluster: number
): Booking[][] {
  if (bookings.length <= maxPerCluster) {
    return [bookings];
  }

  // Simple geographic clustering using k-means-like approach
  const clusters: Booking[][] = [];
  const numClusters = Math.ceil(bookings.length / maxPerCluster);

  // Sort by latitude for simple geographic grouping
  const sorted = [...bookings].sort((a, b) => a.latitude! - b.latitude!);

  const clusterSize = Math.ceil(sorted.length / numClusters);
  for (let i = 0; i < sorted.length; i += clusterSize) {
    clusters.push(sorted.slice(i, i + clusterSize));
  }

  return clusters;
}

async function optimizeRouteOrder(
  bookings: Booking[],
  startLocation: Coordinates | null,
  endLocation: Coordinates | null,
  routingPreference?: RoutingPreference
): Promise<Result<{
  orderedBookings: Booking[];
  routeData: {
    distanceKm: number;
    durationMinutes: number;
    geometry: RouteGeometry;
  };
}>> {
  // If no bookings or just one, no optimization needed
  if (bookings.length <= 1) {
    return {
      success: true,
      data: {
        orderedBookings: bookings,
        routeData: {
          distanceKm: 0,
          durationMinutes: 0,
          geometry: { legs: [] },
        },
      },
    };
  }

  // Build waypoints
  const intermediates = bookings.map(b =>
    createWaypoint(b.latitude!, b.longitude!)
  );

  // Use first/last booking as origin/destination if no start/end specified
  const origin = startLocation
    ? createWaypoint(startLocation.latitude, startLocation.longitude, false)
    : intermediates.shift()!;

  const destination = endLocation
    ? createWaypoint(endLocation.latitude, endLocation.longitude, false)
    : intermediates.pop() ?? origin;

  // Call Google Routes API with optimization
  const routesResult = await computeRoutes({
    origin,
    destination,
    intermediates: intermediates.length > 0 ? intermediates : undefined,
    travelMode: 'DRIVE',
    routingPreference: routingPreference ?? 'TRAFFIC_AWARE',
    optimizeWaypointOrder: true,
    polylineQuality: 'HIGH_QUALITY',
  });

  if (!routesResult.success || !routesResult.data?.routes?.[0]) {
    return {
      success: false,
      error: routesResult.error ?? new Error('No route returned'),
    };
  }

  const route = routesResult.data.routes[0];
  const optimizedOrder = routesResult.data.optimizedIntermediateWaypointIndex;

  // Reorder bookings based on optimized order
  let orderedBookings: Booking[];
  if (optimizedOrder && optimizedOrder.length > 0) {
    orderedBookings = optimizedOrder.map(idx => bookings[idx]);
  } else {
    orderedBookings = bookings;
  }

  return {
    success: true,
    data: {
      orderedBookings,
      routeData: {
        distanceKm: route.distanceMeters / 1000,
        durationMinutes: parseDurationSeconds(route.duration) / 60,
        geometry: {
          encodedPolyline: route.polyline?.encodedPolyline,
          legs: route.legs.map(leg => ({
            startLocation: leg.startLocation.latLng,
            endLocation: leg.endLocation.latLng,
            distanceMeters: leg.distanceMeters,
            durationSeconds: parseDurationSeconds(leg.duration),
            encodedPolyline: leg.polyline?.encodedPolyline,
          })),
        },
      },
    },
  };
}

function parseDurationSeconds(duration: string): number {
  const match = duration.match(/^(\d+)s$/);
  return match ? parseInt(match[1], 10) : 0;
}

async function updateBookingsWithRoutes(
  routes: Route[],
  bookings: Booking[]
): Promise<void> {
  // Create a map of booking ID to vehicle ID
  const bookingToVehicle = new Map<string, string>();

  for (const route of routes) {
    for (const bookingId of route.stopSequence) {
      if (route.vehicleId) {
        bookingToVehicle.set(bookingId, route.vehicleId);
      }
    }
  }

  // Update each booking
  for (const [bookingId, vehicleId] of bookingToVehicle) {
    await updateBooking(bookingId, {
      vehicleId,
      status: 'scheduled',
    });
  }
}

function generateRouteName(
  vehicleId: string,
  date: Date | string,
  index: number
): string {
  const dateStr = formatDate(date);
  return `Route ${String.fromCharCode(64 + index)} - ${dateStr}`;
}

function formatDate(date: Date | string): string {
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
}
```

## Vehicle-Service Compatibility

Vehicles have a `service_types` array containing service IDs they can perform:

```typescript
// Check if vehicle can handle a booking
function isVehicleCompatible(vehicle: Vehicle, booking: Booking): boolean {
  return vehicle.serviceTypes.includes(booking.serviceId);
}

// Filter compatible vehicles
const compatibleVehicles = vehicles.filter(v =>
  bookings.some(b => v.serviceTypes.includes(b.serviceId))
);
```

## Optimization Settings

### Optimization Types

| Type | Description |
|------|-------------|
| `time` | Minimize total travel time |
| `distance` | Minimize total distance |
| `balanced` | Balance time and distance |
| `priority` | Prioritize high-priority bookings |

### Routing Preferences

| Preference | Description |
|------------|-------------|
| `TRAFFIC_UNAWARE` | Ignore traffic conditions |
| `TRAFFIC_AWARE` | Consider current traffic |
| `TRAFFIC_AWARE_OPTIMAL` | Best route considering traffic |

## Best Practices

1. **Run planning during off-hours** to avoid API rate limits
2. **Geocode addresses beforehand** to ensure coordinates exist
3. **Set realistic max stops** (15-20) for driver workload
4. **Use traffic-aware routing** for accurate time estimates
5. **Review unassigned bookings** and handle manually if needed
6. **Monitor optimization scores** to identify route quality issues
