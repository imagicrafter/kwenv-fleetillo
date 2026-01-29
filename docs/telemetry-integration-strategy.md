# Telemetry Integration Strategy - Pre-Plan Document

## Overview

This document outlines the strategy for integrating Fleetillo with telemetry services (e.g., Samsara, Geotab, Verizon Connect) to enable comparison of planned routes against actual vehicle tracking data.

**Status:** Pre-planning document for future implementation
**Created:** 2026-01-27
**Purpose:** Reference for implementation planning phase

---

## Goals

1. **Push** planned routes to telemetry providers for execution tracking
2. **Pull** actual telemetry data (GPS tracks, timestamps, driver behavior)
3. **Compare** planned vs. actual performance metrics
4. **Analyze** route optimization effectiveness and driver efficiency

---

## Architecture Principles

### ✅ Generic & Provider-Agnostic
- Use flexible metadata JSONB columns (same pattern as locations table)
- No provider-specific database tables
- Support multiple telemetry providers simultaneously
- Easy to add new providers without schema changes

### ✅ Minimal Schema Changes
- Add `metadata JSONB` to vehicles and drivers tables
- Add `telemetry_data JSONB` and `telemetry_synced_at` to routes table
- Follow existing Fleetillo patterns (same as locations metadata)

### ✅ Pluggable Provider Architecture
- Abstract `TelemetryProvider` base class
- Concrete implementations for each provider (Samsara, Geotab, etc.)
- Registry pattern for managing multiple providers

---

## Database Schema Enhancements

### Add Metadata to Vehicles Table

```sql
ALTER TABLE fleetillo.vehicles
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_vehicles_metadata
ON fleetillo.vehicles USING GIN(metadata);

COMMENT ON COLUMN fleetillo.vehicles.metadata IS 'JSONB storage for vehicle integration data (telemetry_provider, external_ids, device_info, etc.)';
```

### Add Metadata to Drivers Table

```sql
ALTER TABLE fleetillo.drivers
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_drivers_metadata
ON fleetillo.drivers USING GIN(metadata);

COMMENT ON COLUMN fleetillo.drivers.metadata IS 'JSONB storage for driver integration data (telemetry_provider, external_ids, mobile_app_info, etc.)';
```

### Add Telemetry Tracking to Routes Table

```sql
ALTER TABLE fleetillo.routes
ADD COLUMN IF NOT EXISTS telemetry_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS telemetry_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_routes_telemetry_data
ON fleetillo.routes USING GIN(telemetry_data);

CREATE INDEX IF NOT EXISTS idx_routes_telemetry_synced
ON fleetillo.routes(telemetry_synced_at)
WHERE deleted_at IS NULL;

COMMENT ON COLUMN fleetillo.routes.telemetry_data IS 'JSONB storage for actual route telemetry (GPS tracks, metrics, provider-specific data)';
COMMENT ON COLUMN fleetillo.routes.telemetry_synced_at IS 'Timestamp of last telemetry data sync from external provider';
```

---

## Metadata Structure Examples

### Vehicle Metadata

```typescript
interface VehicleMetadata {
  // Telemetry provider configuration
  telemetry?: {
    provider: 'samsara' | 'geotab' | 'verizon' | 'custom';
    enabled: boolean;
    external_id: string;
    device_id?: string;
    last_sync?: string; // ISO timestamp
  };

  // Multiple providers supported simultaneously
  integrations?: {
    samsara?: {
      vehicle_id: string;
      name: string;
      vin_match: boolean;
    };
    geotab?: {
      device_id: string;
      serial_number: string;
    };
  };

  // Custom fields for any use case
  custom_fields?: Record<string, any>;
}
```

**Example:**
```json
{
  "telemetry": {
    "provider": "samsara",
    "enabled": true,
    "external_id": "281474979614382",
    "last_sync": "2026-01-27T10:30:00Z"
  },
  "integrations": {
    "samsara": {
      "vehicle_id": "281474979614382",
      "name": "Truck 101",
      "vin_match": true
    }
  },
  "custom_fields": {
    "fleet_number": "F-101",
    "department": "operations"
  }
}
```

### Driver Metadata

```typescript
interface DriverMetadata {
  // Telemetry provider configuration
  telemetry?: {
    provider: 'samsara' | 'geotab' | 'verizon' | 'custom';
    enabled: boolean;
    external_id: string;
    username?: string;
    last_sync?: string;
  };

  // Multiple providers
  integrations?: {
    samsara?: {
      driver_id: string;
      external_id: string;
      username: string;
    };
  };

  // Custom fields
  custom_fields?: Record<string, any>;
}
```

### Route Telemetry Data

```typescript
interface RouteTelemetryData {
  // Provider info
  provider: 'samsara' | 'geotab' | 'verizon' | 'custom';
  external_route_id?: string;

  // Actual tracking data
  actual_metrics?: {
    start_time?: string;
    end_time?: string;
    distance_km?: number;
    duration_minutes?: number;
    idle_time_minutes?: number;
    fuel_consumed?: number;
  };

  // GPS tracking
  gps_track?: Array<{
    lat: number;
    lng: number;
    timestamp: string;
    speed?: number;
    heading?: number;
  }>;

  // Driver behavior
  driver_behavior?: {
    harsh_braking: number;
    harsh_acceleration: number;
    speeding_incidents: number;
    distracted_driving?: number;
  };

  // Service execution
  stops?: Array<{
    booking_id: string;
    arrival_time?: string;
    departure_time?: string;
    location: { lat: number; lng: number };
    completed: boolean;
  }>;

  // Analytics (computed)
  analytics?: {
    distance_variance_km: number;
    distance_variance_percent: number;
    duration_variance_minutes: number;
    route_adherence_score: number; // 0-100
    efficiency_score: number; // 0-100
  };

  // Raw provider data
  raw?: Record<string, any>;
}
```

---

## Service Layer Architecture

### Abstract Telemetry Provider

```typescript
export abstract class TelemetryProvider {
  abstract readonly name: string;

  // Vehicle operations
  abstract syncVehicles(): Promise<Result<VehicleSyncResult[]>>;
  abstract getVehicleLocation(externalId: string): Promise<Result<LocationPoint>>;
  abstract getVehicleStats(externalId: string, dateRange: DateRange): Promise<Result<VehicleStats>>;

  // Driver operations
  abstract syncDrivers(): Promise<Result<DriverSyncResult[]>>;

  // Route operations
  abstract pushRoute(route: Route): Promise<Result<string>>; // Returns external route ID
  abstract pullRouteTelemetry(externalRouteId: string): Promise<Result<RouteTelemetryData>>;

  // Health check
  abstract healthCheck(): Promise<HealthStatus>;
}
```

### Telemetry Service (Provider Registry)

```typescript
export class TelemetryService {
  private providers: Map<string, TelemetryProvider> = new Map();

  registerProvider(provider: TelemetryProvider): void;
  getProvider(name: string): TelemetryProvider | undefined;

  async syncRouteTelemetry(routeId: string): Promise<Result<void>>;
  async computeAnalytics(route: Route, telemetry: RouteTelemetryData): RouteAnalytics;
}
```

### Samsara Provider Implementation

```typescript
export class SamsaraProvider extends TelemetryProvider {
  readonly name = 'samsara';

  private apiClient: SamsaraApiClient;

  // Implement all abstract methods
  async syncVehicles(): Promise<Result<VehicleSyncResult[]>>;
  async getVehicleLocation(externalId: string): Promise<Result<LocationPoint>>;
  async pushRoute(route: Route): Promise<Result<string>>;
  async pullRouteTelemetry(externalRouteId: string): Promise<Result<RouteTelemetryData>>;
  async healthCheck(): Promise<HealthStatus>;
}
```

---

## API Endpoints

```
# Telemetry Integration Management
GET    /api/v1/telemetry/status                    - Get integration status
POST   /api/v1/telemetry/providers/:provider/sync  - Sync vehicles/drivers from provider

# Vehicle/Driver Metadata Management
PUT    /api/v1/vehicles/:id/telemetry              - Configure vehicle telemetry
PUT    /api/v1/drivers/:id/telemetry               - Configure driver telemetry

# Route Telemetry
GET    /api/v1/routes/:id/telemetry                - Get route telemetry data
POST   /api/v1/routes/:id/telemetry/sync           - Trigger manual sync
POST   /api/v1/routes/:id/telemetry/push           - Push route to provider

# Analytics
GET    /api/v1/analytics/routes/:id                - Get route comparison analytics
GET    /api/v1/analytics/summary                   - Get aggregate analytics
GET    /api/v1/analytics/drivers/:id               - Get driver performance metrics
GET    /api/v1/analytics/insights                  - Get optimization insights

# Webhooks (for provider callbacks)
POST   /api/v1/webhooks/telemetry/:provider/routes     - Route status updates
POST   /api/v1/webhooks/telemetry/:provider/locations  - Location updates
```

---

## Configuration

### Environment Variables

```env
# Samsara Configuration
SAMSARA_API_URL=https://api.samsara.com
SAMSARA_API_TOKEN=your-api-token
SAMSARA_ORGANIZATION_ID=your-org-id

# General Telemetry Settings
TELEMETRY_ENABLED=true
TELEMETRY_AUTO_SYNC_ROUTES=true
TELEMETRY_SYNC_INTERVAL=300000  # 5 minutes
```

### Database Settings

Add to existing `settings` table:

```typescript
interface TelemetrySettings {
  enabled: boolean;
  providers: {
    samsara?: {
      apiToken: string;
      organizationId: string;
      enabled: boolean;
    };
    geotab?: {
      // ...
    };
  };
  autoSyncRoutes: boolean;
  syncInterval: number;
}
```

---

## Key Workflows

### 1. Initial Setup Workflow

1. Admin configures telemetry provider API credentials (Settings UI)
2. System fetches provider's vehicle list via API
3. Admin maps Fleetillo vehicles to provider vehicles (by VIN/license plate)
4. System updates vehicle metadata with provider external IDs
5. Repeat for drivers
6. Enable sync for desired vehicles/drivers

### 2. Route Lifecycle with Telemetry

```
1. PLAN ROUTE (Fleetillo)
   - User creates optimized route
   - Route status: 'optimized'

2. PUSH TO PROVIDER (Automatic if enabled)
   - Convert Fleetillo route to provider format
   - POST to provider's route creation API
   - Store external_route_id in route.telemetry_data
   - Route status: 'planned'

3. DISPATCH TO DRIVER
   - Send Telegram/Email notification (existing)
   - Driver sees route in provider's mobile app
   - Route status: 'dispatched'

4. TRACK EXECUTION (Provider → Fleetillo)
   - Real-time GPS tracking (polling or webhooks)
   - Route status: 'in_progress'

5. SYNC COMPLETION DATA (Automatic)
   - Pull final telemetry data from provider
   - Store in route.telemetry_data
   - Compute analytics
   - Route status: 'completed'

6. REVIEW INSIGHTS (Fleetillo UI)
   - View comparison dashboard
   - Analyze driver performance
   - Identify optimization opportunities
```

### 3. Analytics Computation

When telemetry data is synced, compute:

- **Distance Variance**: Actual vs. planned distance
- **Duration Variance**: Actual vs. planned duration
- **Route Adherence Score**: How closely route was followed (0-100)
- **Efficiency Score**: Overall efficiency considering fuel, idle time, stops (0-100)
- **Driver Behavior Metrics**: Safety incidents, speeding, harsh braking

---

## Example JSONB Queries

```sql
-- Find vehicles with Samsara integration enabled
SELECT * FROM fleetillo.vehicles
WHERE metadata @> '{"telemetry": {"provider": "samsara", "enabled": true}}';

-- Find vehicle by Samsara external ID
SELECT * FROM fleetillo.vehicles
WHERE metadata->'telemetry'->>'external_id' = '281474979614382';

-- Find routes with telemetry data
SELECT * FROM fleetillo.routes
WHERE telemetry_data IS NOT NULL
  AND telemetry_data @> '{"provider": "samsara"}';

-- Get routes with high adherence score
SELECT * FROM fleetillo.routes
WHERE (telemetry_data->'analytics'->>'route_adherence_score')::numeric > 90;

-- Find routes with significant distance variance
SELECT
  id,
  route_name,
  (telemetry_data->'analytics'->>'distance_variance_km')::numeric as variance
FROM fleetillo.routes
WHERE ABS((telemetry_data->'analytics'->>'distance_variance_km')::numeric) > 10
ORDER BY variance DESC;
```

---

## TypeScript Type Additions

### Update Existing Types

```typescript
// src/types/vehicle.ts
export interface Vehicle extends Timestamps {
  // ... existing fields ...
  metadata?: VehicleMetadata;
}

// src/types/driver.ts
export interface Driver extends Timestamps {
  // ... existing fields ...
  metadata?: DriverMetadata;
}

// src/types/route.ts
export interface Route extends Timestamps {
  // ... existing fields ...
  telemetryData?: RouteTelemetryData;
  telemetrySyncedAt?: Date;
}
```

### New Types

```typescript
// src/types/telemetry.ts
export type TelemetryProvider = 'samsara' | 'geotab' | 'verizon' | 'custom';

export interface VehicleMetadata {
  telemetry?: {
    provider: TelemetryProvider;
    enabled: boolean;
    external_id: string;
    device_id?: string;
    last_sync?: Date;
  };
  integrations?: Record<string, any>;
  custom_fields?: Record<string, any>;
}

export interface DriverMetadata {
  telemetry?: {
    provider: TelemetryProvider;
    enabled: boolean;
    external_id: string;
    username?: string;
    last_sync?: Date;
  };
  integrations?: Record<string, any>;
  custom_fields?: Record<string, any>;
}

export interface RouteTelemetryData {
  provider: TelemetryProvider;
  external_route_id?: string;
  actual_metrics?: ActualMetrics;
  gps_track?: LocationPoint[];
  driver_behavior?: DriverBehavior;
  stops?: StopExecution[];
  analytics?: RouteAnalytics;
  raw?: Record<string, any>;
}

export interface ActualMetrics {
  start_time?: Date;
  end_time?: Date;
  distance_km?: number;
  duration_minutes?: number;
  idle_time_minutes?: number;
  fuel_consumed?: number;
}

export interface RouteAnalytics {
  distance_variance_km: number;
  distance_variance_percent: number;
  duration_variance_minutes: number;
  duration_variance_percent: number;
  route_adherence_score: number; // 0-100
  time_efficiency_score: number; // 0-100
  fuel_efficiency_score: number; // 0-100
  overall_efficiency_score: number; // 0-100
}
```

---

## Success Metrics (KPIs)

Track these metrics to measure integration value:

1. **Route Adherence**: % of routes completed within planned parameters
2. **Time Efficiency**: Average variance between planned and actual duration
3. **Distance Efficiency**: Average variance between planned and actual distance
4. **Driver Performance**: Aggregate efficiency scores by driver
5. **Cost Accuracy**: Planned vs. actual cost variance
6. **Optimization Improvement**: Week-over-week improvement in route efficiency

---

## Samsara API Reference

### Key Endpoints

**Vehicles:**
- `GET /fleet/vehicles` - List all vehicles
- `GET /fleet/vehicles/{id}/locations` - Get vehicle location history
- `GET /fleet/vehicles/{id}/stats` - Get vehicle statistics

**Drivers:**
- `GET /fleet/drivers` - List all drivers
- `GET /fleet/drivers/{id}/stats` - Get driver statistics

**Routes:**
- `POST /fleet/routes` - Create a route
- `GET /fleet/routes/{id}` - Get route details
- `GET /fleet/routes/{id}/updates` - Get route updates/events

**Documentation:** https://developers.samsara.com/reference/overview

---

## Implementation Phases (High-Level)

### Phase 1: Foundation
- Database migrations (metadata columns)
- TypeScript type definitions
- Base TelemetryProvider abstract class
- TelemetryService registry

### Phase 2: Samsara Provider
- SamsaraApiClient implementation
- SamsaraProvider implementation
- Vehicle/driver sync functionality

### Phase 3: Route Synchronization
- Push routes to Samsara
- Pull telemetry data
- Analytics computation

### Phase 4: UI Integration
- Settings page for provider configuration
- Vehicle/driver metadata management
- Route telemetry visualization
- Analytics dashboard

### Phase 5: Testing & Refinement
- Unit tests
- Integration tests
- E2E tests
- Performance optimization

---

## Benefits of Generic Approach

✅ **Provider-Agnostic** - Not locked into Samsara
✅ **Minimal Schema Changes** - Just add metadata columns
✅ **Future-Proof** - Easy to add providers without schema changes
✅ **Follows Existing Patterns** - Same as locations metadata
✅ **No Over-Engineering** - Simple, flexible JSONB storage
✅ **Multiple Providers** - Support multiple systems simultaneously
✅ **Easy Migration** - Existing records unaffected

---

## Next Steps

1. Create GitHub issue for implementation
2. During planning phase, reference this strategy document
3. Create detailed implementation plan with specific tasks
4. Execute implementation in phases
5. Iterate based on real-world usage

---

**Document Version:** 1.0
**Last Updated:** 2026-01-27
**Status:** Pre-planning complete, awaiting implementation planning phase
