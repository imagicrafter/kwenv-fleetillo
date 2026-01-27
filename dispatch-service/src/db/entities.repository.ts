/**
 * Entities Repository
 *
 * Provides data access functions for fetching routes, drivers, vehicles, and bookings
 * from the existing Fleetillo tables in the fleetillo schema.
 *
 * @module db/entities.repository
 * @requirements 1.1 - Fetch route, driver, vehicle, bookings data for dispatch
 * @requirements 11.1 - Read driver preferences from existing drivers table
 */

import { getSupabaseClient } from './supabase.js';
import { logger } from '../utils/logger.js';
import type { Route, Driver, Vehicle, Booking, ChannelType } from '../types/index.js';

// =============================================================================
// Database Row Types (snake_case from database)
// =============================================================================

/**
 * Route row from database
 */
interface RouteRow {
  id: string;
  route_name: string;
  route_code: string | null;
  route_date: string;
  planned_start_time: string | null;
  planned_end_time: string | null;
  total_stops: number;
  total_distance_km: number | null;
  total_duration_minutes: number | null;
  vehicle_id: string | null;
  assigned_to: string | null;
  deleted_at: string | null;
}

/**
 * Driver row from database
 */
interface DriverRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  telegram_chat_id: string | null;
  preferred_channel: string | null;
  fallback_enabled: boolean | null;
  status: string;
  deleted_at: string | null;
}

/**
 * Vehicle row from database
 */
interface VehicleRow {
  id: string;
  name: string;
  license_plate: string | null;
  make: string | null;
  model: string | null;
  deleted_at: string | null;
}

/**
 * Booking row from database (with client, service, and location joins)
 * Note: Supabase returns joined tables as arrays when using foreign key relationships
 */
interface BookingRow {
  id: string;
  customer_id: string;
  service_id: string;
  location_id: string | null;
  scheduled_date: string;
  scheduled_start_time: string;
  service_address_line1: string | null;
  service_address_line2: string | null;
  service_city: string | null;
  service_state: string | null;
  service_postal_code: string | null;
  special_instructions: string | null;
  deleted_at: string | null;
  customers: {
    name: string;
  } | { name: string }[] | null;
  services: {
    name: string;
  } | { name: string }[] | null;
  locations: {
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    latitude: number | null;
    longitude: number | null;
  } | {
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    latitude: number | null;
    longitude: number | null;
  }[] | null;
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Repository error class for entity operations
 */
export class EntityRepositoryError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'EntityRepositoryError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Error codes for entity repository operations
 */
export const EntityErrorCodes = {
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  DRIVER_NOT_FOUND: 'DRIVER_NOT_FOUND',
  VEHICLE_NOT_FOUND: 'VEHICLE_NOT_FOUND',
  QUERY_FAILED: 'ENTITY_QUERY_FAILED',
} as const;

// =============================================================================
// Conversion Functions
// =============================================================================

/**
 * Converts a database row to a Route entity
 */
function rowToRoute(row: RouteRow): Route {
  return {
    id: row.id,
    name: row.route_name,
    code: row.route_code ?? undefined,
    date: row.route_date,
    plannedStartTime: row.planned_start_time ?? undefined,
    plannedEndTime: row.planned_end_time ?? undefined,
    totalStops: row.total_stops ?? 0,
    totalDistanceKm: row.total_distance_km ?? undefined,
    totalDurationMinutes: row.total_duration_minutes ?? undefined,
    vehicleId: row.vehicle_id ?? undefined,
    driverId: row.assigned_to ?? undefined,
  };
}

/**
 * Converts a database row to a Driver entity
 * @requirements 11.1 - Read driver preferences including preferred_channel and fallback_enabled
 */
function rowToDriver(row: DriverRow): Driver {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email ?? undefined,
    telegramChatId: row.telegram_chat_id ?? undefined,
    preferredChannel: (row.preferred_channel as ChannelType) ?? undefined,
    fallbackEnabled: row.fallback_enabled ?? true,
    status: row.status as 'active' | 'inactive',
  };
}

/**
 * Converts a database row to a Vehicle entity
 */
function rowToVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    name: row.name,
    licensePlate: row.license_plate ?? undefined,
    make: row.make ?? undefined,
    model: row.model ?? undefined,
  };
}

/**
 * Builds a full address string from address components
 */
function buildAddress(
  line1: string | null,
  line2: string | null,
  city: string | null,
  state: string | null,
  postalCode: string | null
): string {
  const parts: string[] = [];

  if (line1) parts.push(line1);
  if (line2) parts.push(line2);

  const cityStateZip: string[] = [];
  if (city) cityStateZip.push(city);
  if (state) cityStateZip.push(state);
  if (postalCode) cityStateZip.push(postalCode);

  if (cityStateZip.length > 0) {
    parts.push(cityStateZip.join(', '));
  }

  return parts.join(', ') || 'Address not available';
}

/**
 * Converts a database row to a Booking entity
 * Uses location address as fallback when booking-level address is empty
 */
function rowToBooking(row: BookingRow, stopNumber: number): Booking {
  // Try booking-level address first
  let address = buildAddress(
    row.service_address_line1,
    row.service_address_line2,
    row.service_city,
    row.service_state,
    row.service_postal_code
  );

  // Get location data (may be object or array from Supabase join)
  const locationData = Array.isArray(row.locations)
    ? row.locations[0]
    : row.locations;

  // Fallback to location address if booking address is "Address not available"
  if (address === 'Address not available' && locationData) {
    address = buildAddress(
      locationData.address_line1,
      locationData.address_line2,
      locationData.city,
      locationData.state,
      locationData.postal_code
    );
  }

  // Get coordinates from location
  const latitude = locationData?.latitude ?? undefined;
  const longitude = locationData?.longitude ?? undefined;

  // Build Google Maps URL for individual stop navigation
  let mapsUrl: string | undefined;
  if (latitude && longitude) {
    mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }

  // Handle Supabase's joined table format (can be object or array)
  const clientName = Array.isArray(row.customers)
    ? row.customers[0]?.name ?? 'Unknown Client'
    : row.customers?.name ?? 'Unknown Client';

  const serviceName = Array.isArray(row.services)
    ? row.services[0]?.name
    : row.services?.name;

  return {
    id: row.id,
    routeId: '', // Will be set by caller
    stopNumber,
    clientName,
    address,
    latitude,
    longitude,
    mapsUrl,
    scheduledTime: row.scheduled_start_time ?? undefined,
    services: serviceName ?? undefined,
    specialInstructions: row.special_instructions ?? undefined,
  };
}

// =============================================================================
// Repository Functions
// =============================================================================

/**
 * Retrieves a route by ID with basic details
 *
 * @param routeId - The route ID to retrieve
 * @returns The route entity or null if not found
 * @throws EntityRepositoryError if query fails
 *
 * @requirements 1.1 - Fetch route data for dispatch
 */
export async function getRoute(routeId: string): Promise<Route | null> {
  const client = getSupabaseClient();

  logger.debug('Fetching route', { routeId });

  const { data, error } = await client
    .from('routes')
    .select(
      `
      id,
      route_name,
      route_code,
      route_date,
      planned_start_time,
      planned_end_time,
      total_stops,
      total_distance_km,
      total_duration_minutes,
      vehicle_id,
      assigned_to,
      deleted_at
    `
    )
    .eq('id', routeId)
    .is('deleted_at', null)
    .single();

  if (error) {
    // PGRST116 means no rows found
    if (error.code === 'PGRST116') {
      logger.debug('Route not found', { routeId });
      return null;
    }

    logger.error('Failed to fetch route', {
      routeId,
      error: error.message,
    });
    throw new EntityRepositoryError(
      `Failed to fetch route: ${error.message}`,
      EntityErrorCodes.QUERY_FAILED,
      error
    );
  }

  return rowToRoute(data as RouteRow);
}

/**
 * Retrieves a route with all related details (vehicle, driver info)
 *
 * @param routeId - The route ID to retrieve
 * @returns Object containing route and optionally vehicle, or null if route not found
 *
 * @requirements 1.1 - Fetch route data with details for dispatch
 */
export async function getRouteWithDetails(
  routeId: string
): Promise<{ route: Route; vehicle: Vehicle | null } | null> {
  const route = await getRoute(routeId);

  if (!route) {
    return null;
  }

  let vehicle: Vehicle | null = null;

  if (route.vehicleId) {
    vehicle = await getVehicle(route.vehicleId);
  }

  return { route, vehicle };
}

/**
 * Retrieves a driver by ID
 *
 * @param driverId - The driver ID to retrieve
 * @returns The driver entity or null if not found
 * @throws EntityRepositoryError if query fails
 *
 * @requirements 11.1 - Read driver preferences from existing drivers table
 */
export async function getDriver(driverId: string): Promise<Driver | null> {
  const client = getSupabaseClient();

  logger.debug('Fetching driver', { driverId });

  const { data, error } = await client
    .from('drivers')
    .select(
      `
      id,
      first_name,
      last_name,
      email,
      telegram_chat_id,
      preferred_channel,
      fallback_enabled,
      status,
      deleted_at
    `
    )
    .eq('id', driverId)
    .is('deleted_at', null)
    .single();

  if (error) {
    // PGRST116 means no rows found
    if (error.code === 'PGRST116') {
      logger.debug('Driver not found', { driverId });
      return null;
    }

    logger.error('Failed to fetch driver', {
      driverId,
      error: error.message,
    });
    throw new EntityRepositoryError(
      `Failed to fetch driver: ${error.message}`,
      EntityErrorCodes.QUERY_FAILED,
      error
    );
  }

  return rowToDriver(data as DriverRow);
}

/**
 * Retrieves a vehicle by ID
 *
 * @param vehicleId - The vehicle ID to retrieve
 * @returns The vehicle entity or null if not found
 * @throws EntityRepositoryError if query fails
 *
 * @requirements 1.1 - Fetch vehicle data for dispatch
 */
export async function getVehicle(vehicleId: string): Promise<Vehicle | null> {
  const client = getSupabaseClient();

  logger.debug('Fetching vehicle', { vehicleId });

  const { data, error } = await client
    .from('vehicles')
    .select(
      `
      id,
      name,
      license_plate,
      make,
      model,
      deleted_at
    `
    )
    .eq('id', vehicleId)
    .is('deleted_at', null)
    .single();

  if (error) {
    // PGRST116 means no rows found
    if (error.code === 'PGRST116') {
      logger.debug('Vehicle not found', { vehicleId });
      return null;
    }

    logger.error('Failed to fetch vehicle', {
      vehicleId,
      error: error.message,
    });
    throw new EntityRepositoryError(
      `Failed to fetch vehicle: ${error.message}`,
      EntityErrorCodes.QUERY_FAILED,
      error
    );
  }

  return rowToVehicle(data as VehicleRow);
}

/**
 * Retrieves all bookings for a route, ordered by stop sequence
 *
 * The bookings are retrieved based on the route's stop_sequence array,
 * which contains booking IDs in the order they should be visited.
 *
 * @param routeId - The route ID to get bookings for
 * @returns Array of booking entities in stop order
 * @throws EntityRepositoryError if query fails
 *
 * @requirements 1.1 - Fetch bookings data for dispatch
 */
export async function getBookingsForRoute(routeId: string): Promise<Booking[]> {
  const client = getSupabaseClient();

  logger.debug('Fetching bookings for route', { routeId });

  // First, get the route's stop_sequence to know the order
  const { data: routeData, error: routeError } = await client
    .from('routes')
    .select('stop_sequence')
    .eq('id', routeId)
    .is('deleted_at', null)
    .single();

  if (routeError) {
    if (routeError.code === 'PGRST116') {
      logger.debug('Route not found for bookings', { routeId });
      return [];
    }

    logger.error('Failed to fetch route for bookings', {
      routeId,
      error: routeError.message,
    });
    throw new EntityRepositoryError(
      `Failed to fetch route for bookings: ${routeError.message}`,
      EntityErrorCodes.QUERY_FAILED,
      routeError
    );
  }

  const stopSequence: string[] = (routeData as { stop_sequence: string[] | null }).stop_sequence || [];

  if (stopSequence.length === 0) {
    logger.debug('No bookings in route stop sequence', { routeId });
    return [];
  }

  // Fetch all bookings in the stop sequence with client and service info
  const { data: bookingsData, error: bookingsError } = await client
    .from('bookings')
    .select(
      `
      id,
      customer_id,
      service_id,
      location_id,
      scheduled_date,
      scheduled_start_time,
      service_address_line1,
      service_address_line2,
      service_city,
      service_state,
      service_postal_code,
      special_instructions,
      deleted_at,
      customers (
        name
      ),
      services (
        name
      ),
      locations (
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        latitude,
        longitude
      )
    `
    )
    .in('id', stopSequence)
    .is('deleted_at', null);

  if (bookingsError) {
    logger.error('Failed to fetch bookings', {
      routeId,
      error: bookingsError.message,
    });
    throw new EntityRepositoryError(
      `Failed to fetch bookings: ${bookingsError.message}`,
      EntityErrorCodes.QUERY_FAILED,
      bookingsError
    );
  }

  // Create a map for quick lookup
  const bookingsMap = new Map<string, BookingRow>();
  for (const booking of bookingsData as BookingRow[]) {
    bookingsMap.set(booking.id, booking);
  }

  // Order bookings according to stop_sequence and assign stop numbers
  const orderedBookings: Booking[] = [];
  let stopNumber = 1;

  for (const bookingId of stopSequence) {
    const bookingRow = bookingsMap.get(bookingId);
    if (bookingRow) {
      const booking = rowToBooking(bookingRow, stopNumber);
      booking.routeId = routeId;
      orderedBookings.push(booking);
      stopNumber++;
    }
  }

  logger.debug('Fetched bookings for route', {
    routeId,
    count: orderedBookings.length,
  });

  return orderedBookings;
}

/**
 * Retrieves the primary location for a vehicle to use as the route origin
 */
export async function getVehicleStartLocation(
  vehicleId: string
): Promise<{ latitude: number; longitude: number } | null> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('vehicle_locations')
    .select(`
      is_primary,
      locations!inner (
        latitude,
        longitude
      )
    `)
    .eq('vehicle_id', vehicleId)
    .eq('is_primary', true)
    .single();

  if (error || !data || !data.locations) {
    if (error && error.code !== 'PGRST116') {
      logger.error('Failed to get vehicle start location', { vehicleId, error, code: error.code });
    }
    return null;
  }

  // Handle potential array return from join (though inner join + single should be object)
  const loc = Array.isArray(data.locations) ? data.locations[0] : data.locations;

  if (loc && loc.latitude && loc.longitude) {
    return {
      latitude: loc.latitude,
      longitude: loc.longitude
    };
  }

  return null;
}

/**
 * Fetches all dispatch context data for a route and driver
 *
 * This is a convenience function that fetches all data needed for a dispatch
 * in a single call: route, driver, vehicle (if assigned), and bookings.
 *
 * @param routeId - The route ID
 * @param driverId - The driver ID
 * @returns Object with all dispatch context data, or null if route or driver not found
 *
 * @requirements 1.1 - Fetch all data needed for dispatch
 * @requirements 11.1 - Include driver preferences
 */
export async function getDispatchContext(
  routeId: string,
  driverId: string
): Promise<{
  route: Route;
  driver: Driver;
  vehicle: Vehicle | null;
  bookings: Booking[];
  startLocation: { latitude: number; longitude: number } | null;
} | null> {
  logger.debug('Fetching dispatch context', { routeId, driverId });

  // Fetch route and driver in parallel
  const [routeResult, driver] = await Promise.all([
    getRouteWithDetails(routeId),
    getDriver(driverId),
  ]);

  if (!routeResult) {
    logger.debug('Route not found for dispatch context', { routeId });
    return null;
  }

  if (!driver) {
    logger.debug('Driver not found for dispatch context', { driverId });
    return null;
  }

  // Fetch bookings and vehicle start location in parallel
  const [bookings, startLocation] = await Promise.all([
    getBookingsForRoute(routeId),
    routeResult.vehicle ? getVehicleStartLocation(routeResult.vehicle.id) : Promise.resolve(null)
  ]);

  logger.info('Dispatch context fetched', {
    routeId,
    driverId,
    vehicleId: routeResult.vehicle?.id,
    bookingsCount: bookings.length,
    hasStartLocation: !!startLocation
  });

  return {
    route: routeResult.route,
    driver,
    vehicle: routeResult.vehicle,
    bookings,
    startLocation,
  };
}
