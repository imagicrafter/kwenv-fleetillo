/**
 * Public Route Service
 *
 * Provides minimal route map data for public driver view.
 * Returns only coordinates and polyline - no sensitive customer data.
 */

import { getSupabaseClient, getAdminSupabaseClient } from './supabase';
import { createContextLogger } from '../utils/logger';
import type { Result } from '../types/index';
import type { PublicRouteMapData, RouteTokenCoordinates, StopCoordinate } from '../types/route-token';

/**
 * Logger instance for public route operations
 */
const logger = createContextLogger('PublicRouteService');

/**
 * Public route service error
 */
export class PublicRouteServiceError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'PublicRouteServiceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Error codes for public route service errors
 */
export const PublicRouteErrorCodes = {
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  NO_GEOMETRY: 'ROUTE_NO_GEOMETRY',
  NO_STOPS: 'ROUTE_NO_STOPS',
  QUERY_FAILED: 'ROUTE_QUERY_FAILED',
} as const;

/**
 * Gets minimal route data for map display
 *
 * Returns only:
 * - Route polyline (encoded)
 * - Stop coordinates with sequence numbers
 * - Start and end points
 *
 * Does NOT return:
 * - Customer names
 * - Contact information
 * - Booking details
 * - Pricing information
 *
 * @param routeId - The route ID to fetch
 * @returns Result containing PublicRouteMapData
 */
export async function getRouteMapData(
  routeId: string
): Promise<Result<PublicRouteMapData>> {
  logger.debug('Fetching public route map data', { routeId });

  try {
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    // Fetch route with geometry
    const { data: route, error: routeError } = await supabase
      .from('routes')
      .select('id, route_geometry, stop_sequence')
      .eq('id', routeId)
      .is('deleted_at', null)
      .single();

    if (routeError || !route) {
      logger.warn('Route not found', { routeId });
      return {
        success: false,
        error: new PublicRouteServiceError(
          'Route not found',
          PublicRouteErrorCodes.ROUTE_NOT_FOUND,
          { routeId }
        ),
      };
    }

    // Get stop sequence
    const stopSequence: string[] = route.stop_sequence || [];
    const routeGeometry = route.route_geometry as {
      encodedPolyline?: string;
      startLocation?: { lat: number; lng: number };
      endLocation?: { lat: number; lng: number };
    } | null;

    // Fetch booking coordinates for stops
    const stops: StopCoordinate[] = [];

    if (stopSequence.length > 0) {
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, location_latitude, location_longitude, service_latitude, service_longitude')
        .in('id', stopSequence);

      if (bookingsError) {
        logger.error('Failed to fetch booking coordinates', { error: bookingsError });
        return {
          success: false,
          error: new PublicRouteServiceError(
            'Failed to fetch stop coordinates',
            PublicRouteErrorCodes.QUERY_FAILED,
            bookingsError
          ),
        };
      }

      // Map bookings to stops in sequence order
      if (bookings) {
        const bookingMap = new Map(bookings.map((b) => [b.id, b]));

        stopSequence.forEach((stopId, index) => {
          const booking = bookingMap.get(stopId);
          if (booking) {
            // Use location coords, fall back to service coords
            const lat = parseFloat(booking.location_latitude ?? booking.service_latitude);
            const lng = parseFloat(booking.location_longitude ?? booking.service_longitude);

            if (!isNaN(lat) && !isNaN(lng)) {
              stops.push({
                sequence: index + 1,
                lat,
                lng,
              });
            }
          }
        });
      }
    }

    // Extract polyline and endpoints from route geometry
    const polyline = routeGeometry?.encodedPolyline || '';

    // Determine start and end points
    let start: RouteTokenCoordinates;
    let end: RouteTokenCoordinates;

    if (routeGeometry?.startLocation) {
      start = {
        lat: routeGeometry.startLocation.lat,
        lng: routeGeometry.startLocation.lng,
      };
    } else if (stops.length > 0 && stops[0]) {
      // Fall back to first stop
      start = { lat: stops[0].lat, lng: stops[0].lng };
    } else {
      // Default center (US)
      start = { lat: 39.8283, lng: -98.5795 };
    }

    if (routeGeometry?.endLocation) {
      end = {
        lat: routeGeometry.endLocation.lat,
        lng: routeGeometry.endLocation.lng,
      };
    } else if (stops.length > 0) {
      // Fall back to last stop
      const lastStop = stops[stops.length - 1]!;
      end = { lat: lastStop.lat, lng: lastStop.lng };
    } else {
      end = start;
    }

    logger.debug('Public route map data fetched', {
      routeId,
      stopsCount: stops.length,
      hasPolyline: !!polyline,
    });

    return {
      success: true,
      data: {
        polyline,
        stops,
        start,
        end,
      },
    };
  } catch (error) {
    logger.error('Unexpected error fetching route map data', { error, routeId });
    return {
      success: false,
      error: new PublicRouteServiceError(
        'Failed to fetch route map data',
        PublicRouteErrorCodes.QUERY_FAILED,
        error
      ),
    };
  }
}
