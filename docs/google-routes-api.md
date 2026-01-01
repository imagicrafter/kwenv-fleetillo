# Google Routes API Client

A robust, production-ready client for the Google Routes API (v2) with comprehensive error handling, retry logic, and batching capabilities.

## Features

- ✅ **Full TypeScript Support**: Complete type definitions for all API requests and responses
- ✅ **Error Handling**: Comprehensive error handling with retry logic and exponential backoff
- ✅ **Batching**: Built-in support for batch route computation with concurrency limiting
- ✅ **Validation**: Input validation for waypoints, coordinates, and request parameters
- ✅ **Route Matrix**: Support for computing distance/duration matrices between multiple origins and destinations
- ✅ **Utility Functions**: Helper functions for route calculations and data transformations

## Installation

The Google Routes API client is already integrated into the RouteIQ TypeScript project. No additional installation is required.

## Configuration

The client uses the same Google Maps API key configured in your environment:

```bash
GOOGLE_MAPS_API_KEY=your_api_key_here
```

## Basic Usage

### Computing a Single Route

```typescript
import { computeRoutes } from '@/services/google-routes.service.js';
import type { ComputeRoutesInput } from '@/types/google-routes.js';

const input: ComputeRoutesInput = {
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
  travelMode: 'DRIVE',
  routingPreference: 'TRAFFIC_AWARE',
};

const result = await computeRoutes(input);

if (result.success) {
  const route = result.data.routes[0];
  console.log(`Distance: ${route.distanceMeters}m`);
  console.log(`Duration: ${route.duration}`);
  console.log(`Polyline: ${route.polyline?.encodedPolyline}`);
} else {
  console.error('Error:', result.error.message);
}
```

### Using Different Waypoint Formats

```typescript
// Using coordinates
const coordsInput = {
  origin: {
    location: {
      latLng: { latitude: 37.7749, longitude: -122.4194 },
    },
  },
  destination: {
    location: {
      latLng: { latitude: 34.0522, longitude: -118.2437 },
    },
  },
};

// Using Place IDs
const placeIdInput = {
  origin: {
    placeId: 'ChIJIQBpAG2ahYAR_6128GcTUEo', // San Francisco
  },
  destination: {
    placeId: 'ChIJE9on3F3HwoAR9AhGJW_fL-I', // Los Angeles
  },
};

// Using addresses
const addressInput = {
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
};
```

### Computing Routes with Intermediate Waypoints

```typescript
const input: ComputeRoutesInput = {
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
  intermediates: [
    {
      location: {
        latLng: { latitude: 36.7783, longitude: -119.4179 }, // Fresno
      },
    },
  ],
  travelMode: 'DRIVE',
  optimizeWaypointOrder: true, // Optimize the order of intermediate waypoints
};

const result = await computeRoutes(input);
```

### Computing a Route Matrix

```typescript
import { computeRouteMatrix } from '@/services/google-routes.service.js';
import type { ComputeRouteMatrixInput } from '@/types/google-routes.js';

const input: ComputeRouteMatrixInput = {
  origins: [
    {
      waypoint: {
        location: { latLng: { latitude: 37.7749, longitude: -122.4194 } }, // SF
      },
    },
    {
      waypoint: {
        location: { latLng: { latitude: 37.3382, longitude: -121.8863 } }, // San Jose
      },
    },
  ],
  destinations: [
    {
      waypoint: {
        location: { latLng: { latitude: 34.0522, longitude: -118.2437 } }, // LA
      },
    },
    {
      waypoint: {
        location: { latLng: { latitude: 32.7157, longitude: -117.1611 } }, // San Diego
      },
    },
  ],
  travelMode: 'DRIVE',
};

const result = await computeRouteMatrix(input);

if (result.success) {
  result.data.elements.forEach((element) => {
    console.log(
      `Origin ${element.originIndex} → Destination ${element.destinationIndex}:`,
      `${element.distanceMeters}m, ${element.duration}`
    );
  });
}
```

### Batch Route Computation

```typescript
import { batchComputeRoutes } from '@/services/google-routes.service.js';

const routesToCompute = [
  {
    input: {
      origin: { location: { latLng: { latitude: 37.7749, longitude: -122.4194 } } },
      destination: { location: { latLng: { latitude: 34.0522, longitude: -118.2437 } } },
      travelMode: 'DRIVE',
    },
    requestId: 'route-1',
  },
  {
    input: {
      origin: { location: { latLng: { latitude: 40.7128, longitude: -74.0060 } } },
      destination: { location: { latLng: { latitude: 34.0522, longitude: -118.2437 } } },
      travelMode: 'DRIVE',
    },
    requestId: 'route-2',
  },
];

const result = await batchComputeRoutes(routesToCompute, {
  concurrency: 5, // Process 5 routes at a time
  delayMs: 200,   // Wait 200ms between batches
});

if (result.success) {
  result.data.forEach((item) => {
    if (item.success) {
      console.log(`Route ${item.requestId}:`, item.result?.routes[0]?.distanceMeters);
    } else {
      console.error(`Route ${item.requestId} failed:`, item.error?.message);
    }
  });
}
```

## Utility Functions

### Get Optimal Route

```typescript
import { getOptimalRoute } from '@/services/google-routes.service.js';

const result = await computeRoutes(input);
if (result.success) {
  const optimalRoute = getOptimalRoute(result.data); // Returns first route
}
```

### Calculate Route Totals

```typescript
import { calculateRouteTotals } from '@/services/google-routes.service.js';

const route = result.data.routes[0];
const totals = calculateRouteTotals(route);

console.log(`Total Distance: ${totals.totalDistanceMeters}m`);
console.log(`Total Duration: ${totals.totalDurationSeconds}s`);
```

### Type Conversion Utilities

```typescript
import {
  parseDuration,
  parseDurationMinutes,
  metersToKilometers,
  metersToMiles,
} from '@/types/google-routes.js';

// Parse duration strings
const seconds = parseDuration('3600s'); // 3600
const minutes = parseDurationMinutes('3600s'); // 60

// Convert distances
const km = metersToKilometers(5000); // 5
const miles = metersToMiles(8046.72); // ~5
```

## Advanced Options

### Route Modifiers

```typescript
const input: ComputeRoutesInput = {
  origin: { /* ... */ },
  destination: { /* ... */ },
  routeModifiers: {
    avoidTolls: true,
    avoidHighways: false,
    avoidFerries: true,
    avoidIndoor: false,
  },
};
```

### Polyline Options

```typescript
const input: ComputeRoutesInput = {
  origin: { /* ... */ },
  destination: { /* ... */ },
  polylineQuality: 'HIGH_QUALITY',
  polylineEncoding: 'ENCODED_POLYLINE',
};
```

### Departure/Arrival Time

```typescript
const input: ComputeRoutesInput = {
  origin: { /* ... */ },
  destination: { /* ... */ },
  departureTime: new Date('2024-12-25T09:00:00Z'),
  routingPreference: 'TRAFFIC_AWARE',
};
```

## Error Handling

The client includes comprehensive error handling with specific error codes:

```typescript
import { GoogleRoutesErrorCodes } from '@/services/google-routes.service.js';

const result = await computeRoutes(input);

if (!result.success) {
  const error = result.error;

  switch (error.code) {
    case GoogleRoutesErrorCodes.MISSING_API_KEY:
      console.error('API key not configured');
      break;
    case GoogleRoutesErrorCodes.QUOTA_EXCEEDED:
      console.error('API quota exceeded - retry later');
      break;
    case GoogleRoutesErrorCodes.ZERO_RESULTS:
      console.error('No routes found');
      break;
    case GoogleRoutesErrorCodes.INVALID_WAYPOINT:
      console.error('Invalid waypoint:', error.details);
      break;
    default:
      console.error('Error:', error.message);
  }

  // Check if error is retryable
  if (error.isRetryable) {
    console.log('This error can be retried');
  }
}
```

## Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| `GOOGLEROUTES_MISSING_API_KEY` | API key not configured | No |
| `GOOGLEROUTES_INVALID_WAYPOINT` | Invalid waypoint data | No |
| `GOOGLEROUTES_INVALID_REQUEST` | Invalid request parameters | No |
| `GOOGLEROUTES_MAX_WAYPOINTS_EXCEEDED` | Too many waypoints (max 25) | No |
| `GOOGLEROUTES_MAX_ROUTE_LENGTH_EXCEEDED` | Route too long | No |
| `GOOGLEROUTES_ZERO_RESULTS` | No routes found | No |
| `GOOGLEROUTES_REQUEST_DENIED` | API request denied | No |
| `GOOGLEROUTES_QUOTA_EXCEEDED` | API quota exceeded | Yes |
| `GOOGLEROUTES_API_ERROR` | General API error | Yes |
| `GOOGLEROUTES_TIMEOUT` | Request timeout | Yes |
| `GOOGLEROUTES_NETWORK_ERROR` | Network error | Yes |

## Retry Logic

The client automatically retries failed requests with exponential backoff:

- **Default retries**: 3 attempts
- **Base delay**: 1000ms
- **Exponential backoff**: Yes (doubles each retry)
- **Jitter**: Random 0-200ms added to prevent thundering herd
- **Timeout**: 30 seconds per request

Retryable errors (quota exceeded, timeouts, service errors) are automatically retried.

## Rate Limiting

When using batch processing, the client respects rate limits:

- **Default concurrency**: 5 concurrent requests
- **Default delay**: 200ms between batches
- **Configurable**: Both can be adjusted via options

```typescript
await batchComputeRoutes(routes, {
  concurrency: 3,  // Process 3 at a time
  delayMs: 500,    // Wait 500ms between batches
});
```

## Limitations

- **Maximum intermediate waypoints**: 25
- **Request timeout**: 30 seconds (configurable)
- **API quota**: Subject to Google Cloud project quotas

## Integration with RouteIQ

Store route data in the database:

```typescript
import { computeRoutes } from '@/services/google-routes.service.js';
import { metersToKilometers, parseDurationMinutes } from '@/types/google-routes.js';
import { RouteService } from '@/services/route.service.js';

const result = await computeRoutes(input);

if (result.success) {
  const route = result.data.routes[0];

  // Store route in database
  await RouteService.create({
    routeName: 'SF to LA Route',
    routeDate: new Date(),
    totalDistanceKm: metersToKilometers(route.distanceMeters),
    totalDurationMinutes: parseDurationMinutes(route.duration),
    optimizationType: 'time',
    routeGeometry: {
      polyline: route.polyline?.encodedPolyline,
      bounds: route.viewport,
    },
    optimizationMetadata: {
      googleRoutesVersion: 'v2',
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
    },
    status: 'optimized',
  });
}
```

## Testing

The service includes comprehensive unit tests:

```bash
npm test -- google-routes.service.test.ts
```

## API Reference

For detailed API documentation, see:
- [Google Routes API Documentation](https://developers.google.com/maps/documentation/routes)
- [Type Definitions](/src/types/google-routes.ts)
- [Service Implementation](/src/services/google-routes.service.ts)

## License

This implementation is part of the RouteIQ TypeScript project.
