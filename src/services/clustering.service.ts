/**
 * Geographic Clustering Service for Route Planning
 *
 * Implements home-based clustering to assign bookings to vehicle depots,
 * preventing cross-city route assignments.
 */

import { createContextLogger } from '../utils/logger';
import { config } from '../config';
import { getRouteSettings } from './settings.service';
import type { Vehicle } from '../types/vehicle';
import type { Booking } from '../types/booking';

const logger = createContextLogger('ClusteringService');

/**
 * Coordinates for a location
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * A depot (vehicle home location) with its coordinates
 */
export interface Depot {
  locationId: string;
  name: string;
  city: string;
  coordinates: Coordinates;
  vehicles: Vehicle[];
}

/**
 * A booking with its location coordinates
 */
export interface BookingWithCoordinates {
  booking: Booking;
  coordinates: Coordinates;
  locationName: string;
  locationCity: string;
}

/**
 * Result of assigning a booking to a depot
 */
export interface DepotAssignment {
  booking: Booking;
  depot: Depot;
  distanceMiles: number;
}

/**
 * Reason why a booking couldn't be assigned
 */
export type UnassignedReason =
  | 'out_of_service_area'
  | 'no_vehicle_available'
  | 'capacity_exceeded'
  | 'no_coordinates'
  | 'no_matching_service';

/**
 * A booking that couldn't be assigned to any depot
 */
export interface UnassignedBooking {
  booking: Booking;
  reason: UnassignedReason;
  details?: string;
}

/**
 * Result of the clustering operation
 */
export interface ClusteringResult {
  /** Bookings grouped by depot location ID */
  depotClusters: Map<string, DepotAssignment[]>;
  /** Bookings that couldn't be assigned to any depot */
  unassigned: UnassignedBooking[];
  /** Summary statistics */
  stats: {
    totalBookings: number;
    assignedBookings: number;
    unassignedBookings: number;
    depotCount: number;
  };
}

/**
 * Configuration for clustering
 */
export interface ClusteringConfig {
  maxRadiusMiles: number;
  maxStopsPerVehicle: number;
}

/**
 * Calculate the Haversine distance between two coordinates in miles
 */
export function calculateDistanceMiles(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 3959; // Earth's radius in miles

  const lat1Rad = (coord1.latitude * Math.PI) / 180;
  const lat2Rad = (coord2.latitude * Math.PI) / 180;
  const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLng = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Find the nearest depot to a given coordinate
 */
export function findNearestDepot(
  coordinates: Coordinates,
  depots: Depot[]
): { depot: Depot; distance: number } | null {
  if (depots.length === 0) {
    return null;
  }

  let nearestDepot = depots[0]!;
  let minDistance = calculateDistanceMiles(coordinates, nearestDepot.coordinates);

  for (let i = 1; i < depots.length; i++) {
    const depot = depots[i]!;
    const distance = calculateDistanceMiles(coordinates, depot.coordinates);
    if (distance < minDistance) {
      minDistance = distance;
      nearestDepot = depot;
    }
  }

  return { depot: nearestDepot, distance: minDistance };
}

/**
 * Check if a vehicle can service a booking based on service types
 */
export function canVehicleServiceBooking(
  vehicle: Vehicle,
  booking: Booking
): boolean {
  // If vehicle has no service types defined, assume it can service anything
  if (!vehicle.serviceTypes || vehicle.serviceTypes.length === 0) {
    return true;
  }

  // Check if any of the booking's services match the vehicle's capabilities
  const bookingServiceIds = booking.serviceIds || [];
  if (booking.serviceId) {
    bookingServiceIds.push(booking.serviceId);
  }

  return bookingServiceIds.some((serviceId) =>
    vehicle.serviceTypes.includes(serviceId)
  );
}

/**
 * Main clustering function: Assigns bookings to depots based on geographic proximity
 *
 * Algorithm:
 * 1. Build list of depots from vehicle home locations
 * 2. For each booking, find the nearest depot within the radius limit
 * 3. Check that at least one vehicle at the depot can service the booking
 * 4. Group bookings by depot
 * 5. Handle capacity overflow
 */
export function clusterBookingsByDepot(
  bookings: BookingWithCoordinates[],
  vehicles: Vehicle[],
  depotLocations: Map<string, { name: string; city: string; coordinates: Coordinates }>,
  clusterConfig: ClusteringConfig
): ClusteringResult {
  const maxRadius = clusterConfig.maxRadiusMiles;
  const maxStopsPerVehicle = clusterConfig.maxStopsPerVehicle;

  logger.info('Starting depot-based clustering', {
    bookingCount: bookings.length,
    vehicleCount: vehicles.length,
    depotCount: depotLocations.size,
    maxRadius,
    maxStopsPerVehicle,
  });

  // Build depots from vehicle home locations
  const depots: Depot[] = [];
  const vehiclesByHomeLocation = new Map<string, Vehicle[]>();

  for (const vehicle of vehicles) {
    if (!vehicle.homeLocationId) {
      logger.warn('Vehicle has no home location, skipping', { vehicleId: vehicle.id, vehicleName: vehicle.name });
      continue;
    }

    const existing = vehiclesByHomeLocation.get(vehicle.homeLocationId) || [];
    existing.push(vehicle);
    vehiclesByHomeLocation.set(vehicle.homeLocationId, existing);
  }

  for (const [locationId, locationVehicles] of vehiclesByHomeLocation) {
    const locationData = depotLocations.get(locationId);
    if (!locationData) {
      logger.warn('Depot location not found', { locationId });
      continue;
    }

    depots.push({
      locationId,
      name: locationData.name,
      city: locationData.city,
      coordinates: locationData.coordinates,
      vehicles: locationVehicles,
    });
  }

  logger.info('Built depot list', {
    depotCount: depots.length,
    depots: depots.map((d) => ({ name: d.name, city: d.city, vehicleCount: d.vehicles.length })),
  });

  if (depots.length === 0) {
    logger.error('No depots available for clustering');
    return {
      depotClusters: new Map(),
      unassigned: bookings.map((b) => ({
        booking: b.booking,
        reason: 'no_vehicle_available' as UnassignedReason,
        details: 'No vehicles with home locations available',
      })),
      stats: {
        totalBookings: bookings.length,
        assignedBookings: 0,
        unassignedBookings: bookings.length,
        depotCount: 0,
      },
    };
  }

  // Assign bookings to depots
  const depotClusters = new Map<string, DepotAssignment[]>();
  const unassigned: UnassignedBooking[] = [];

  for (const { booking, coordinates, locationCity } of bookings) {
    // Find nearest depot
    const nearest = findNearestDepot(coordinates, depots);

    if (!nearest) {
      unassigned.push({
        booking,
        reason: 'no_vehicle_available',
        details: 'No depots available',
      });
      continue;
    }

    // Check if within radius
    if (nearest.distance > maxRadius) {
      logger.debug('Booking outside service area', {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        locationCity,
        nearestDepot: nearest.depot.name,
        distance: nearest.distance.toFixed(1),
        maxRadius,
      });
      unassigned.push({
        booking,
        reason: 'out_of_service_area',
        details: `Nearest depot "${nearest.depot.name}" is ${nearest.distance.toFixed(1)} miles away (max: ${maxRadius} miles)`,
      });
      continue;
    }

    // Check if any vehicle at the depot can service this booking
    const canService = nearest.depot.vehicles.some((v) =>
      canVehicleServiceBooking(v, booking)
    );

    if (!canService) {
      unassigned.push({
        booking,
        reason: 'no_matching_service',
        details: `No vehicle at "${nearest.depot.name}" can service this booking`,
      });
      continue;
    }

    // Add to depot cluster
    const cluster = depotClusters.get(nearest.depot.locationId) || [];
    cluster.push({
      booking,
      depot: nearest.depot,
      distanceMiles: nearest.distance,
    });
    depotClusters.set(nearest.depot.locationId, cluster);

    logger.debug('Assigned booking to depot', {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      locationCity,
      depot: nearest.depot.name,
      depotCity: nearest.depot.city,
      distance: nearest.distance.toFixed(1),
    });
  }

  // Check capacity and move overflow to unassigned
  for (const [depotId, assignments] of depotClusters) {
    const depot = depots.find((d) => d.locationId === depotId);
    if (!depot) continue;

    const totalCapacity = depot.vehicles.length * maxStopsPerVehicle;

    if (assignments.length > totalCapacity) {
      logger.warn('Depot over capacity, moving excess to unassigned', {
        depot: depot.name,
        bookings: assignments.length,
        capacity: totalCapacity,
        overflow: assignments.length - totalCapacity,
      });

      // Sort by distance (closest first) and keep only within capacity
      assignments.sort((a, b) => a.distanceMiles - b.distanceMiles);

      const overflow = assignments.splice(totalCapacity);
      for (const assignment of overflow) {
        unassigned.push({
          booking: assignment.booking,
          reason: 'capacity_exceeded',
          details: `Depot "${depot.name}" at capacity (${totalCapacity} stops max)`,
        });
      }
    }
  }

  const assignedCount = Array.from(depotClusters.values()).reduce(
    (sum, cluster) => sum + cluster.length,
    0
  );

  logger.info('Clustering complete', {
    totalBookings: bookings.length,
    assignedBookings: assignedCount,
    unassignedBookings: unassigned.length,
    depotCount: depotClusters.size,
    clusterSizes: Array.from(depotClusters.entries()).map(([id, c]) => ({
      depotId: id,
      size: c.length,
    })),
  });

  return {
    depotClusters,
    unassigned,
    stats: {
      totalBookings: bookings.length,
      assignedBookings: assignedCount,
      unassignedBookings: unassigned.length,
      depotCount: depotClusters.size,
    },
  };
}

/**
 * Get the default clustering configuration from app config (sync - uses env var)
 */
export function getDefaultClusteringConfig(maxStopsPerVehicle: number): ClusteringConfig {
  return {
    maxRadiusMiles: config.routePlanning.maxClusterRadiusMiles,
    maxStopsPerVehicle,
  };
}

/**
 * Get clustering configuration from database settings (async)
 */
export async function getClusteringConfigAsync(maxStopsPerVehicle: number): Promise<ClusteringConfig> {
  try {
    const settingsResult = await getRouteSettings();
    if (settingsResult.success && settingsResult.data) {
      return {
        maxRadiusMiles: settingsResult.data.fleet.defaultServiceRadiusMiles,
        maxStopsPerVehicle,
      };
    }
  } catch (error) {
    logger.warn('Failed to fetch service radius setting, using default', { error });
  }

  // Fall back to env var / default
  return getDefaultClusteringConfig(maxStopsPerVehicle);
}

/**
 * Check if clustering is enabled (sync version - checks env var only)
 * Use isClusteringEnabledAsync for full check including database setting
 */
export function isClusteringEnabled(): boolean {
  return config.routePlanning.enableClusteringV2;
}

/**
 * Check if clustering is enabled (async version - checks env var AND database setting)
 */
export async function isClusteringEnabledAsync(): Promise<boolean> {
  // First check env var (master kill-switch)
  if (!config.routePlanning.enableClusteringV2) {
    return false;
  }

  // Then check database setting
  try {
    const settingsResult = await getRouteSettings();
    if (settingsResult.success && settingsResult.data) {
      return settingsResult.data.routing.enableCityClustering;
    }
  } catch (error) {
    logger.warn('Failed to fetch clustering setting, using default', { error });
  }

  // Default to enabled if setting can't be read
  return true;
}
