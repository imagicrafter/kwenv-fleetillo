# OptiRoute Type Definitions Guide

This guide documents all TypeScript types used in the OptiRoute application.

## Core Types

### Result Type

All service operations return a `Result<T>` type for consistent error handling:

```typescript
// src/types/index.ts

/**
 * Result type for all service operations.
 * Provides consistent success/failure handling without exceptions.
 */
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

// Usage examples:
// Success: { success: true, data: client }
// Failure: { success: false, error: new Error('Not found') }
```

### Pagination Types

```typescript
// src/types/index.ts

/**
 * Parameters for paginated queries
 */
export interface PaginationParams {
  page: number;           // 1-indexed page number
  limit: number;          // Items per page (default: 20, max: 100)
  sortBy?: string;        // Column to sort by
  sortOrder?: 'asc' | 'desc';  // Sort direction (default: 'desc')
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### Common Types

```typescript
// src/types/index.ts

/**
 * UUID string type alias
 */
export type ID = string;

/**
 * Timestamp fields common to all entities
 */
export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Soft delete field
 */
export interface SoftDeletable {
  deletedAt?: Date;
}

/**
 * Geographic coordinates
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}
```

---

## Entity Types

### Client

```typescript
// src/types/client.ts

export type ClientStatus = 'active' | 'inactive' | 'suspended' | 'archived';

export interface Client {
  id: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;

  // Primary/Billing Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;

  // Service Address (if different)
  serviceAddressLine1?: string;
  serviceAddressLine2?: string;
  serviceCity?: string;
  serviceState?: string;
  servicePostalCode?: string;
  serviceCountry?: string;

  // Geolocation
  latitude?: number;
  longitude?: number;

  // Metadata
  status: ClientStatus;
  notes?: string;
  tags?: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CreateClientInput {
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  status?: ClientStatus;
  notes?: string;
  tags?: string[];
}

export type UpdateClientInput = Partial<CreateClientInput>;

export interface ClientFilters {
  status?: ClientStatus;
  city?: string;
  state?: string;
  searchTerm?: string;
  includeDeleted?: boolean;
}
```

### Service

```typescript
// src/types/service.ts

export type ServiceType =
  | 'maintenance'
  | 'repair'
  | 'inspection'
  | 'installation'
  | 'consultation'
  | 'other';

export type ServiceStatus = 'active' | 'inactive' | 'discontinued';

export interface Service {
  id: string;
  name: string;
  code?: string;
  serviceType: ServiceType;
  description?: string;

  // Duration (in minutes)
  averageDurationMinutes: number;
  minimumDurationMinutes?: number;
  maximumDurationMinutes?: number;

  // Pricing
  basePrice?: number;
  priceCurrency?: string;

  // Scheduling
  requiresAppointment: boolean;
  maxPerDay?: number;

  // Requirements
  equipmentRequired?: string[];
  skillsRequired?: string[];

  // Metadata
  status: ServiceStatus;
  notes?: string;
  tags?: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CreateServiceInput {
  name: string;
  code?: string;
  serviceType: ServiceType;
  description?: string;
  averageDurationMinutes: number;
  minimumDurationMinutes?: number;
  maximumDurationMinutes?: number;
  basePrice?: number;
  priceCurrency?: string;
  requiresAppointment?: boolean;
  maxPerDay?: number;
  equipmentRequired?: string[];
  skillsRequired?: string[];
  status?: ServiceStatus;
  notes?: string;
  tags?: string[];
}

export type UpdateServiceInput = Partial<CreateServiceInput>;

export interface ServiceFilters {
  status?: ServiceStatus;
  serviceType?: ServiceType;
  searchTerm?: string;
  includeDeleted?: boolean;
}
```

### Location

```typescript
// src/types/location.ts

export type LocationType =
  | 'client'
  | 'depot'
  | 'disposal'
  | 'maintenance'
  | 'home'
  | 'other';

export interface Location {
  id: string;
  clientId?: string;
  name: string;
  locationType: LocationType;

  // Address
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;

  // Geolocation
  latitude?: number;
  longitude?: number;

  // Flags
  isPrimary: boolean;

  // Metadata
  notes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CreateLocationInput {
  clientId?: string;
  name: string;
  locationType: LocationType;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isPrimary?: boolean;
  notes?: string;
}

export type UpdateLocationInput = Partial<CreateLocationInput>;

export interface LocationFilters {
  clientId?: string;
  locationType?: LocationType;
  city?: string;
  includeDeleted?: boolean;
}
```

### Vehicle

```typescript
// src/types/vehicle.ts

export type VehicleStatus =
  | 'available'
  | 'in_use'
  | 'maintenance'
  | 'out_of_service'
  | 'retired';

export type FuelType =
  | 'gasoline'
  | 'diesel'
  | 'electric'
  | 'hybrid'
  | 'propane'
  | 'natural_gas'
  | 'other';

export interface Vehicle {
  id: string;
  name: string;
  description?: string;

  // Identification
  licensePlate?: string;
  vin?: string;

  // Specifications
  make?: string;
  model?: string;
  year?: number;
  color?: string;

  // Capacity
  maxCapacityWeight?: number;
  maxCapacityVolume?: number;
  maxPassengers?: number;

  // Service capabilities (array of service IDs)
  serviceTypes: string[];

  // Status
  status: VehicleStatus;

  // Current location
  currentLatitude?: number;
  currentLongitude?: number;
  lastLocationUpdate?: Date;

  // Fuel
  fuelType?: FuelType;
  fuelCapacity?: number;
  currentFuelLevel?: number;

  // Maintenance
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  odometerReading?: number;

  // Assignment
  assignedDriverId?: string;
  homeLocationId?: string;

  // Metadata
  notes?: string;
  tags?: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CreateVehicleInput {
  name: string;
  description?: string;
  licensePlate?: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  maxCapacityWeight?: number;
  maxCapacityVolume?: number;
  serviceTypes?: string[];
  status?: VehicleStatus;
  fuelType?: FuelType;
  homeLocationId?: string;
  notes?: string;
  tags?: string[];
}

export type UpdateVehicleInput = Partial<CreateVehicleInput>;

export interface VehicleFilters {
  status?: VehicleStatus;
  serviceType?: string;  // Filter by compatible service
  searchTerm?: string;
  includeDeleted?: boolean;
}
```

### Booking

```typescript
// src/types/booking.ts

export type BookingType = 'one_time' | 'recurring';

export type RecurrencePattern =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled';

export type BookingPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Booking {
  id: string;
  bookingNumber?: string;

  // Foreign keys
  clientId: string;
  serviceId: string;
  vehicleId?: string;
  locationId?: string;

  // Booking type
  bookingType: BookingType;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: Date;
  parentBookingId?: string;

  // Scheduling
  scheduledDate: Date;
  scheduledStartTime: string;  // HH:MM format
  scheduledEndTime?: string;
  estimatedDurationMinutes?: number;

  // Actual timing
  actualStartTime?: Date;
  actualEndTime?: Date;
  actualDurationMinutes?: number;

  // Status
  status: BookingStatus;

  // Service location (override)
  serviceAddressLine1?: string;
  serviceAddressLine2?: string;
  serviceCity?: string;
  serviceState?: string;
  servicePostalCode?: string;
  serviceCountry?: string;

  // Geolocation (resolved)
  latitude?: number;
  longitude?: number;

  // Pricing
  quotedPrice?: number;
  finalPrice?: number;
  priceCurrency?: string;

  // Priority and notes
  priority: BookingPriority;
  specialInstructions?: string;
  internalNotes?: string;
  cancellationReason?: string;

  // Communication flags
  clientNotified: boolean;
  reminderSent: boolean;
  confirmationSent: boolean;

  // Metadata
  tags?: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CreateBookingInput {
  clientId: string;
  serviceId: string;
  vehicleId?: string;
  locationId?: string;
  bookingType?: BookingType;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: string;
  scheduledDate: string;  // YYYY-MM-DD
  scheduledStartTime: string;  // HH:MM
  estimatedDurationMinutes?: number;
  priority?: BookingPriority;
  specialInstructions?: string;
  internalNotes?: string;
  tags?: string[];
}

export type UpdateBookingInput = Partial<CreateBookingInput> & {
  status?: BookingStatus;
  cancellationReason?: string;
};

export interface BookingFilters {
  clientId?: string;
  serviceId?: string;
  vehicleId?: string;
  status?: BookingStatus;
  priority?: BookingPriority;
  date?: string;           // Exact date
  startDate?: string;      // Date range start
  endDate?: string;        // Date range end
  includeDeleted?: boolean;
}
```

### Route

```typescript
// src/types/route.ts

export type OptimizationType =
  | 'time'
  | 'distance'
  | 'balanced'
  | 'priority'
  | 'custom';

export type RouteStatus =
  | 'draft'
  | 'planned'
  | 'optimized'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface Route {
  id: string;
  routeName: string;
  routeCode?: string;

  // Vehicle assignment
  vehicleId?: string;

  // Date and time
  routeDate: Date;
  plannedStartTime?: string;
  plannedEndTime?: string;
  actualStartTime?: Date;
  actualEndTime?: Date;

  // Metrics
  totalDistanceKm?: number;
  totalDurationMinutes?: number;
  totalStops: number;

  // Optimization
  optimizationType: OptimizationType;
  optimizationScore?: number;
  algorithmVersion?: string;
  optimizationMetadata?: Record<string, unknown>;

  // Status
  status: RouteStatus;

  // Capacity
  plannedCapacityWeight?: number;
  plannedCapacityVolume?: number;
  actualCapacityWeight?: number;
  actualCapacityVolume?: number;

  // Cost
  estimatedCost?: number;
  actualCost?: number;
  costCurrency?: string;

  // Constraints
  maxDurationMinutes?: number;
  maxDistanceKm?: number;
  requiredSkills?: string[];

  // Route data
  stopSequence: string[];  // Array of booking IDs
  routeGeometry?: RouteGeometry;
  geoFenceData?: Record<string, unknown>;

  // Audit
  createdBy?: string;
  assignedTo?: string;
  notes?: string;
  tags?: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface RouteGeometry {
  encodedPolyline?: string;
  legs: RouteLeg[];
}

export interface RouteLeg {
  startLocation: Coordinates;
  endLocation: Coordinates;
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline?: string;
}

export interface CreateRouteInput {
  routeName: string;
  routeCode?: string;
  vehicleId?: string;
  routeDate: string;
  plannedStartTime?: string;
  optimizationType?: OptimizationType;
  maxDurationMinutes?: number;
  maxDistanceKm?: number;
  notes?: string;
  tags?: string[];
}

export type UpdateRouteInput = Partial<CreateRouteInput> & {
  status?: RouteStatus;
  stopSequence?: string[];
};

export interface RouteFilters {
  vehicleId?: string;
  status?: RouteStatus;
  date?: string;
  startDate?: string;
  endDate?: string;
  includeDeleted?: boolean;
}
```

---

## Database Row Types

Each entity has a corresponding Row type that matches the database schema (snake_case):

```typescript
// Example: ClientRow
export interface ClientRow {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  notes: string | null;
  tags: string[] | null;
  created_at: string;  // ISO timestamp
  updated_at: string;
  deleted_at: string | null;
}
```

---

## Row Conversion Functions

Each entity module exports conversion functions:

```typescript
// Convert database row to TypeScript entity
function rowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    companyName: row.company_name ?? undefined,
    // ... convert all fields
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
  };
}

// Convert create input to database row
function createInputToRow(input: CreateClientInput): Partial<ClientRow> {
  return {
    name: input.name,
    company_name: input.companyName ?? null,
    // ... convert all fields
    status: input.status ?? 'active',
  };
}

// Convert update input to database row (only provided fields)
function updateInputToRow(input: UpdateClientInput): Partial<ClientRow> {
  const row: Partial<ClientRow> = {};
  if (input.name !== undefined) row.name = input.name;
  if (input.companyName !== undefined) row.company_name = input.companyName ?? null;
  // ... only add fields that are explicitly provided
  return row;
}
```

---

## Type Patterns

### Optional vs Nullable

- TypeScript: Use `?` for optional fields (`companyName?: string`)
- Database: Use `null` for missing values (`company_name: string | null`)
- Conversion: `row.company_name ?? undefined` (null to undefined)

### Dates

- TypeScript: Use `Date` objects
- Database: ISO timestamp strings
- Conversion: `new Date(row.created_at)`

### Enums

- Define as union types: `type Status = 'active' | 'inactive'`
- Validate on input, cast on output: `row.status as Status`

### Arrays

- TypeScript: `string[]`
- Database: PostgreSQL arrays `TEXT[]`
- Supabase handles conversion automatically
