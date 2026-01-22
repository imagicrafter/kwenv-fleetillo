# Design: Issue #3 - Vehicle Geofencing

## Overview

Implement geofencing to define geographic boundaries and monitor when vehicles enter or exit these areas. Supports both circular and polygon geofences with real-time event detection on location updates.

### Key Design Decisions

1. **JSONB storage**: Store geofence coordinates as JSONB rather than PostGIS to avoid new dependencies and simplify deployment
2. **Point-in-polygon algorithm**: Use ray casting for polygon containment, simple radius check for circles
3. **State tracking**: Store last known geofence state per vehicle to detect transitions
4. **Many-to-many assignment**: Junction table for flexible vehicle-geofence relationships
5. **Event-driven detection**: Check geofences on each vehicle location update

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Geofence System                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐      ┌─────────────────────────────────┐  │
│  │  Geofence CRUD  │      │     Vehicle Location Update     │  │
│  │    (Admin UI)   │      │        (Tracked/Manual)         │  │
│  └────────┬────────┘      └───────────────┬─────────────────┘  │
│           │                               │                     │
│           ▼                               ▼                     │
│  ┌─────────────────┐      ┌─────────────────────────────────┐  │
│  │ geofences table │      │     GeofenceDetector Service    │  │
│  └─────────────────┘      │                                 │  │
│           │               │  1. Get assigned geofences      │  │
│           ▼               │  2. Check containment           │  │
│  ┌─────────────────┐      │  3. Compare with last state     │  │
│  │vehicle_geofences│──────│  4. Generate ENTER/EXIT events  │  │
│  │  (assignments)  │      └───────────────┬─────────────────┘  │
│  └─────────────────┘                      │                     │
│                                           ▼                     │
│                          ┌─────────────────────────────────┐   │
│                          │      geofence_events table      │   │
│                          │  (vehicle_id, geofence_id,      │   │
│                          │   event_type, timestamp)        │   │
│                          └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### New Tables

#### `geofences`

```sql
CREATE TABLE fleetillo.geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('circle', 'polygon')),
    center_lat DOUBLE PRECISION,      -- For circle type
    center_lng DOUBLE PRECISION,      -- For circle type
    radius_meters DOUBLE PRECISION,   -- For circle type
    vertices JSONB,                   -- For polygon type: [{"lat": N, "lng": N}, ...]
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_geofences_name ON fleetillo.geofences(name);
```

#### `vehicle_geofences` (Assignment Junction Table)

```sql
CREATE TABLE fleetillo.vehicle_geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES fleetillo.vehicles(id) ON DELETE CASCADE,
    geofence_id UUID NOT NULL REFERENCES fleetillo.geofences(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(vehicle_id, geofence_id)
);

CREATE INDEX idx_vehicle_geofences_vehicle ON fleetillo.vehicle_geofences(vehicle_id);
CREATE INDEX idx_vehicle_geofences_geofence ON fleetillo.vehicle_geofences(geofence_id);
```

#### `geofence_events`

```sql
CREATE TABLE fleetillo.geofence_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES fleetillo.vehicles(id) ON DELETE CASCADE,
    geofence_id UUID NOT NULL REFERENCES fleetillo.geofences(id) ON DELETE CASCADE,
    event_type VARCHAR(10) NOT NULL CHECK (event_type IN ('ENTER', 'EXIT')),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_geofence_events_vehicle ON fleetillo.geofence_events(vehicle_id, created_at DESC);
CREATE INDEX idx_geofence_events_geofence ON fleetillo.geofence_events(geofence_id, created_at DESC);
```

#### `vehicle_geofence_state` (Last Known State)

```sql
CREATE TABLE fleetillo.vehicle_geofence_state (
    vehicle_id UUID NOT NULL REFERENCES fleetillo.vehicles(id) ON DELETE CASCADE,
    geofence_id UUID NOT NULL REFERENCES fleetillo.geofences(id) ON DELETE CASCADE,
    is_inside BOOLEAN NOT NULL DEFAULT false,
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (vehicle_id, geofence_id)
);
```

## TypeScript Interfaces

```typescript
// src/types/geofence.ts

export interface Geofence {
  id: string;
  name: string;
  type: 'circle' | 'polygon';
  centerLat?: number;      // Circle only
  centerLng?: number;      // Circle only
  radiusMeters?: number;   // Circle only
  vertices?: LatLng[];     // Polygon only
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface VehicleGeofenceAssignment {
  id: string;
  vehicleId: string;
  geofenceId: string;
  createdAt: Date;
}

export interface GeofenceEvent {
  id: string;
  vehicleId: string;
  geofenceId: string;
  eventType: 'ENTER' | 'EXIT';
  latitude: number;
  longitude: number;
  createdAt: Date;
}

export interface GeofenceState {
  vehicleId: string;
  geofenceId: string;
  isInside: boolean;
  lastCheckedAt: Date;
}
```

## Components and Interfaces

### GeofenceService

```typescript
class GeofenceService {
  // CRUD Operations
  async createGeofence(input: CreateGeofenceInput): Promise<Geofence>;
  async updateGeofence(id: string, input: UpdateGeofenceInput): Promise<Geofence>;
  async deleteGeofence(id: string): Promise<void>;
  async getGeofence(id: string): Promise<Geofence>;
  async getGeofences(): Promise<Geofence[]>;
  
  // Assignment Operations
  async assignVehicleToGeofence(vehicleId: string, geofenceId: string): Promise<void>;
  async unassignVehicleFromGeofence(vehicleId: string, geofenceId: string): Promise<void>;
  async getVehicleGeofences(vehicleId: string): Promise<Geofence[]>;
  async getGeofenceVehicles(geofenceId: string): Promise<Vehicle[]>;
}
```

### GeofenceDetectorService

```typescript
class GeofenceDetectorService {
  /**
   * Check vehicle location against all assigned geofences
   * Called on each location update
   */
  async checkVehicleLocation(vehicleId: string, lat: number, lng: number): Promise<GeofenceEvent[]>;
  
  /**
   * Determine if point is inside geofence
   */
  isInsideGeofence(lat: number, lng: number, geofence: Geofence): boolean;
  
  /**
   * Point-in-circle check
   */
  private isInsideCircle(lat: number, lng: number, centerLat: number, centerLng: number, radiusMeters: number): boolean;
  
  /**
   * Point-in-polygon using ray casting algorithm
   */
  private isInsidePolygon(lat: number, lng: number, vertices: LatLng[]): boolean;
}
```

### GeofenceEventService

```typescript
class GeofenceEventService {
  async getEventsForVehicle(vehicleId: string, startDate: Date, endDate: Date): Promise<GeofenceEvent[]>;
  async getEventsForGeofence(geofenceId: string, startDate: Date, endDate: Date): Promise<GeofenceEvent[]>;
}
```

## API Design

### Geofence CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rpc` (geofences.create) | Create geofence |
| GET | `/api/rpc` (geofences.getAll) | List all geofences |
| GET | `/api/rpc` (geofences.getById) | Get single geofence |
| PUT | `/api/rpc` (geofences.update) | Update geofence |
| DELETE | `/api/rpc` (geofences.delete) | Delete geofence |

### Assignments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rpc` (geofences.assignVehicle) | Assign vehicle to geofence |
| DELETE | `/api/rpc` (geofences.unassignVehicle) | Remove assignment |
| GET | `/api/rpc` (geofences.getVehicleGeofences) | Get geofences for vehicle |

### Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rpc` (geofenceEvents.getForVehicle) | Query events by vehicle |
| GET | `/api/rpc` (geofenceEvents.getForGeofence) | Query events by geofence |

## Geofence Detection Algorithm

```
On Vehicle Location Update(vehicleId, lat, lng):
  1. Get assigned geofences for vehicle
  2. For each geofence:
     a. Check if point is inside geofence
     b. Get last known state from vehicle_geofence_state
     c. If state changed (outside→inside or inside→outside):
        - Create geofence_event (ENTER or EXIT)
        - Update vehicle_geofence_state
  3. Return list of generated events
```

### Point-in-Circle

```typescript
function isInsideCircle(lat: number, lng: number, centerLat: number, centerLng: number, radiusMeters: number): boolean {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat - centerLat) * Math.PI / 180;
  const dLng = (lng - centerLng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(centerLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance <= radiusMeters;
}
```

### Point-in-Polygon (Ray Casting)

```typescript
function isInsidePolygon(lat: number, lng: number, vertices: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].lng, yi = vertices[i].lat;
    const xj = vertices[j].lng, yj = vertices[j].lat;
    if (((yi > lat) !== (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}
```

## Testing Strategy

### Unit Tests
- Geofence CRUD operations
- Point-in-circle calculations with various edge cases
- Point-in-polygon calculations
- State transition detection

### Integration Tests
- Full event detection flow
- Assignment management
- Event querying

### Manual Verification
- Draw geofence on map UI
- Move vehicle and verify events in UI
