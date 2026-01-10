# OptiRoute Google Maps Integration Guide

This guide explains how to integrate with Google Maps Platform APIs in the OptiRoute application.

## Required APIs

Enable these APIs in Google Cloud Console:

1. **Geocoding API** - Address to coordinates conversion
2. **Places API** - Address autocomplete
3. **Routes API** - Route optimization and directions
4. **Maps JavaScript API** - Frontend map display
5. **Distance Matrix API** (optional) - Distance/duration between points

## Configuration

### Environment Variables

```bash
GOOGLE_MAPS_API_KEY=your-api-key-here

# For frontend (Vite)
VITE_GOOGLE_MAPS_API_KEY=your-api-key-here
```

### API Key Restrictions

Recommended restrictions:
- HTTP referrer restrictions for frontend key
- IP address restrictions for backend key
- API restrictions to only enabled APIs

---

## Geocoding Service

### Type Definitions

```typescript
// src/types/googlemaps.ts

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodingResult {
  formattedAddress: string;
  coordinates: Coordinates;
  placeId: string;
  locationType: LocationType;
  addressComponents: AddressComponents;
}

export type LocationType =
  | 'ROOFTOP'
  | 'RANGE_INTERPOLATED'
  | 'GEOMETRIC_CENTER'
  | 'APPROXIMATE';

export interface AddressComponents {
  streetNumber?: string;
  route?: string;
  locality?: string;
  administrativeAreaLevel1?: string;
  administrativeAreaLevel2?: string;
  postalCode?: string;
  country?: string;
}

export interface GeocodeAddressInput {
  address: string;
  region?: string;  // Country code (e.g., 'us')
}

export interface ReverseGeocodeInput {
  coordinates: Coordinates;
  resultTypes?: string[];
}

export interface PlaceAutocompleteInput {
  input: string;
  sessionToken?: string;
  types?: string[];
  location?: Coordinates;
  radius?: number;
  region?: string;
}

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

export interface AddressValidationResult {
  isValid: boolean;
  validationGranularity: ValidationGranularity;
  address: ValidatedAddress;
  coordinates?: Coordinates;
  placeId?: string;
  issues: AddressIssue[];
}

export type ValidationGranularity =
  | 'PREMISE'
  | 'ROUTE'
  | 'BLOCK'
  | 'OTHER';

export interface AddressIssue {
  code: string;
  message: string;
  field?: string;
}
```

### Geocoding Service Implementation

```typescript
// src/services/googlemaps.service.ts

import { config } from '../config/index.js';
import { createContextLogger } from '../utils/logger.js';
import type { Result } from '../types/index.js';
import type {
  Coordinates,
  GeocodingResult,
  GeocodeAddressInput,
  ReverseGeocodeInput,
  PlaceAutocompleteInput,
  PlacePrediction,
} from '../types/googlemaps.js';

const logger = createContextLogger('GoogleMapsService');

// API URLs
const GEOCODING_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';

// Configuration
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_RETRIES = 3;

/**
 * Geocode an address to coordinates
 */
export async function geocodeAddress(
  input: GeocodeAddressInput
): Promise<Result<GeocodingResult>> {
  logger.info('Geocoding address', { address: input.address });

  const apiKey = config.googleMaps.apiKey;
  if (!apiKey) {
    return {
      success: false,
      error: new Error('Google Maps API key not configured'),
    };
  }

  if (!input.address?.trim()) {
    return {
      success: false,
      error: new Error('Address is required'),
    };
  }

  try {
    const params = new URLSearchParams({
      address: input.address,
      key: apiKey,
    });

    if (input.region) {
      params.append('region', input.region);
    }

    const response = await fetchWithRetry(
      `${GEOCODING_API_URL}?${params.toString()}`
    );

    if (response.status !== 'OK') {
      return {
        success: false,
        error: new Error(`Geocoding failed: ${response.status}`),
      };
    }

    const result = response.results[0];
    if (!result) {
      return {
        success: false,
        error: new Error('No results found'),
      };
    }

    return {
      success: true,
      data: {
        formattedAddress: result.formatted_address,
        coordinates: {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
        },
        placeId: result.place_id,
        locationType: result.geometry.location_type,
        addressComponents: extractAddressComponents(result.address_components),
      },
    };
  } catch (error) {
    logger.error('Geocoding error', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(
  input: ReverseGeocodeInput
): Promise<Result<GeocodingResult>> {
  logger.info('Reverse geocoding', { coordinates: input.coordinates });

  const apiKey = config.googleMaps.apiKey;
  if (!apiKey) {
    return {
      success: false,
      error: new Error('Google Maps API key not configured'),
    };
  }

  // Validate coordinates
  const { latitude, longitude } = input.coordinates;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return {
      success: false,
      error: new Error('Invalid coordinates'),
    };
  }

  try {
    const params = new URLSearchParams({
      latlng: `${latitude},${longitude}`,
      key: apiKey,
    });

    if (input.resultTypes?.length) {
      params.append('result_type', input.resultTypes.join('|'));
    }

    const response = await fetchWithRetry(
      `${GEOCODING_API_URL}?${params.toString()}`
    );

    if (response.status !== 'OK') {
      return {
        success: false,
        error: new Error(`Reverse geocoding failed: ${response.status}`),
      };
    }

    const result = response.results[0];
    return {
      success: true,
      data: {
        formattedAddress: result.formatted_address,
        coordinates: input.coordinates,
        placeId: result.place_id,
        locationType: result.geometry.location_type,
        addressComponents: extractAddressComponents(result.address_components),
      },
    };
  } catch (error) {
    logger.error('Reverse geocoding error', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get place autocomplete predictions
 */
export async function getPlaceAutocomplete(
  input: PlaceAutocompleteInput
): Promise<Result<PlacePrediction[]>> {
  logger.debug('Place autocomplete', { input: input.input });

  const apiKey = config.googleMaps.apiKey;
  if (!apiKey) {
    return {
      success: false,
      error: new Error('Google Maps API key not configured'),
    };
  }

  if (!input.input?.trim()) {
    return { success: true, data: [] };
  }

  try {
    const params = new URLSearchParams({
      input: input.input,
      key: apiKey,
    });

    if (input.sessionToken) {
      params.append('sessiontoken', input.sessionToken);
    }
    if (input.types?.length) {
      params.append('types', input.types.join('|'));
    }
    if (input.region) {
      params.append('components', `country:${input.region}`);
    }

    const response = await fetchWithRetry(
      `${PLACES_API_URL}?${params.toString()}`
    );

    if (response.status !== 'OK' && response.status !== 'ZERO_RESULTS') {
      return {
        success: false,
        error: new Error(`Autocomplete failed: ${response.status}`),
      };
    }

    const predictions: PlacePrediction[] = response.predictions.map(
      (pred: any) => ({
        placeId: pred.place_id,
        description: pred.description,
        mainText: pred.structured_formatting.main_text,
        secondaryText: pred.structured_formatting.secondary_text,
        types: pred.types,
      })
    );

    return { success: true, data: predictions };
  } catch (error) {
    logger.error('Autocomplete error', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Batch geocode multiple addresses
 */
export async function batchGeocodeAddresses(
  addresses: GeocodeAddressInput[]
): Promise<Result<Array<{ input: GeocodeAddressInput; result: Result<GeocodingResult> }>>> {
  if (addresses.length === 0) {
    return { success: true, data: [] };
  }

  const CONCURRENCY_LIMIT = 5;
  const DELAY_MS = 200;
  const results: Array<{ input: GeocodeAddressInput; result: Result<GeocodingResult> }> = [];

  for (let i = 0; i < addresses.length; i += CONCURRENCY_LIMIT) {
    const batch = addresses.slice(i, i + CONCURRENCY_LIMIT);
    const batchResults = await Promise.all(
      batch.map(async (input) => ({
        input,
        result: await geocodeAddress(input),
      }))
    );
    results.push(...batchResults);

    // Rate limiting delay
    if (i + CONCURRENCY_LIMIT < addresses.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  return { success: true, data: results };
}

// Helper functions

async function fetchWithRetry(
  url: string,
  maxRetries = DEFAULT_MAX_RETRIES
): Promise<any> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        DEFAULT_TIMEOUT_MS
      );

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
        );
      }
    }
  }

  throw lastError;
}

function extractAddressComponents(components: any[]): AddressComponents {
  const result: AddressComponents = {};

  for (const component of components) {
    const types = component.types;

    if (types.includes('street_number')) {
      result.streetNumber = component.long_name;
    } else if (types.includes('route')) {
      result.route = component.long_name;
    } else if (types.includes('locality')) {
      result.locality = component.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      result.administrativeAreaLevel1 = component.short_name;
    } else if (types.includes('administrative_area_level_2')) {
      result.administrativeAreaLevel2 = component.long_name;
    } else if (types.includes('postal_code')) {
      result.postalCode = component.long_name;
    } else if (types.includes('country')) {
      result.country = component.short_name;
    }
  }

  return result;
}
```

---

## Routes API

### Type Definitions

```typescript
// src/types/google-routes.ts

export interface ComputeRoutesInput {
  origin: Waypoint;
  destination: Waypoint;
  intermediates?: Waypoint[];
  travelMode: TravelMode;
  routingPreference?: RoutingPreference;
  optimizeWaypointOrder?: boolean;
  polylineQuality?: PolylineQuality;
  departureTime?: Date;
}

export interface Waypoint {
  location: {
    latLng: {
      latitude: number;
      longitude: number;
    };
  };
  vehicleStopover?: boolean;
}

export type TravelMode = 'DRIVE' | 'WALK' | 'BICYCLE' | 'TWO_WHEELER';

export type RoutingPreference =
  | 'TRAFFIC_UNAWARE'
  | 'TRAFFIC_AWARE'
  | 'TRAFFIC_AWARE_OPTIMAL';

export type PolylineQuality = 'HIGH_QUALITY' | 'OVERVIEW';

export interface ComputeRoutesResponse {
  routes: RouteResult[];
  optimizedIntermediateWaypointIndex?: number[];
}

export interface RouteResult {
  distanceMeters: number;
  duration: string;  // e.g., "3600s"
  polyline: {
    encodedPolyline: string;
  };
  legs: RouteLeg[];
}

export interface RouteLeg {
  distanceMeters: number;
  duration: string;
  startLocation: {
    latLng: Coordinates;
  };
  endLocation: {
    latLng: Coordinates;
  };
  polyline: {
    encodedPolyline: string;
  };
}
```

### Routes API Implementation

```typescript
// src/services/google-routes.service.ts

import { config } from '../config/index.js';
import { createContextLogger } from '../utils/logger.js';
import type { Result } from '../types/index.js';
import type {
  ComputeRoutesInput,
  ComputeRoutesResponse,
  Waypoint,
} from '../types/google-routes.js';

const logger = createContextLogger('GoogleRoutesService');

const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

/**
 * Compute optimized route using Google Routes API
 */
export async function computeRoutes(
  input: ComputeRoutesInput
): Promise<Result<ComputeRoutesResponse>> {
  logger.info('Computing routes', {
    intermediateCount: input.intermediates?.length ?? 0,
    optimize: input.optimizeWaypointOrder,
  });

  const apiKey = config.googleMaps.apiKey;
  if (!apiKey) {
    return {
      success: false,
      error: new Error('Google Maps API key not configured'),
    };
  }

  try {
    const requestBody = {
      origin: input.origin,
      destination: input.destination,
      intermediates: input.intermediates,
      travelMode: input.travelMode,
      routingPreference: input.routingPreference ?? 'TRAFFIC_AWARE',
      polylineQuality: input.polylineQuality ?? 'HIGH_QUALITY',
      computeAlternativeRoutes: false,
      optimizeWaypointOrder: input.optimizeWaypointOrder ?? false,
    };

    if (input.departureTime) {
      (requestBody as any).departureTime = input.departureTime.toISOString();
    }

    // Field mask specifies which fields to return
    const fieldMask = [
      'routes.duration',
      'routes.distanceMeters',
      'routes.polyline.encodedPolyline',
      'routes.legs',
      'routes.optimizedIntermediateWaypointIndex',
    ].join(',');

    const response = await fetch(ROUTES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Routes API error', { status: response.status, error: errorText });
      return {
        success: false,
        error: new Error(`Routes API error: ${response.status}`),
      };
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        routes: data.routes ?? [],
        optimizedIntermediateWaypointIndex:
          data.routes?.[0]?.optimizedIntermediateWaypointIndex,
      },
    };
  } catch (error) {
    logger.error('Routes computation error', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Create a waypoint from coordinates
 */
export function createWaypoint(
  latitude: number,
  longitude: number,
  vehicleStopover = true
): Waypoint {
  return {
    location: {
      latLng: { latitude, longitude },
    },
    vehicleStopover,
  };
}

/**
 * Parse duration string (e.g., "3600s") to seconds
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)s$/);
  return match ? parseInt(match[1], 10) : 0;
}
```

---

## Frontend Maps Integration

### React Google Maps Setup

```typescript
// src/components/maps/MapProvider.tsx
import { LoadScript } from '@react-google-maps/api';

const LIBRARIES: ('places' | 'geometry')[] = ['places', 'geometry'];

export function MapProvider({ children }: { children: React.ReactNode }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return <div>Google Maps API key not configured</div>;
  }

  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={LIBRARIES}>
      {children}
    </LoadScript>
  );
}
```

### Map Component

```typescript
// src/components/maps/RouteMap.tsx
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import type { Route, Booking } from '../../types';

interface RouteMapProps {
  route: Route;
  bookings: Booking[];
}

export function RouteMap({ route, bookings }: RouteMapProps) {
  const center = {
    lat: bookings[0]?.latitude ?? 0,
    lng: bookings[0]?.longitude ?? 0,
  };

  // Decode polyline if available
  const path = route.routeGeometry?.encodedPolyline
    ? decodePolyline(route.routeGeometry.encodedPolyline)
    : [];

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '500px' }}
      center={center}
      zoom={12}
    >
      {/* Stop markers */}
      {bookings.map((booking, index) => (
        <Marker
          key={booking.id}
          position={{ lat: booking.latitude!, lng: booking.longitude! }}
          label={String(index + 1)}
        />
      ))}

      {/* Route polyline */}
      {path.length > 0 && (
        <Polyline
          path={path}
          options={{
            strokeColor: '#4285F4',
            strokeWeight: 4,
          }}
        />
      )}
    </GoogleMap>
  );
}
```

### Address Autocomplete Component

```typescript
// src/components/locations/AddressAutocomplete.tsx
import { useRef, useCallback } from 'react';
import { Autocomplete } from '@react-google-maps/api';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, placeId?: string, coordinates?: { lat: number; lng: number }) => void;
  placeholder?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Enter address',
}: AddressAutocompleteProps) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();

      if (place.formatted_address) {
        const coordinates = place.geometry?.location
          ? {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            }
          : undefined;

        onChange(place.formatted_address, place.place_id, coordinates);
      }
    }
  }, [onChange]);

  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{
        componentRestrictions: { country: 'us' },
        types: ['address'],
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input"
      />
    </Autocomplete>
  );
}
```

---

## Error Handling

### Common Error Codes

| Status | Meaning | Action |
|--------|---------|--------|
| `OK` | Success | - |
| `ZERO_RESULTS` | No results | Handle gracefully |
| `OVER_QUERY_LIMIT` | Rate limited | Implement backoff |
| `REQUEST_DENIED` | Invalid API key | Check configuration |
| `INVALID_REQUEST` | Bad parameters | Validate input |

### Retry Logic

```typescript
async function fetchWithRetry(url: string, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OVER_QUERY_LIMIT' && attempt < maxRetries) {
        // Exponential backoff
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }

      return data;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}
```

## Best Practices

1. **Use session tokens** for autocomplete to reduce billing
2. **Batch geocoding requests** to respect rate limits
3. **Cache results** when appropriate
4. **Validate coordinates** before API calls
5. **Handle errors gracefully** with user-friendly messages
6. **Use field masks** in Routes API to reduce response size
