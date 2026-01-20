# Design: Issue #19 - Database Upsert & Booking Generation for Legacy Import

## Overview

This document describes the technical architecture for the import service that loads legacy CRM data into the Fleetillo database. The design follows existing service patterns and introduces a new `ImportService` for orchestrating the upsert operations.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         ImportService                            │
│  Orchestrates: Customer → Location → Booking pipeline            │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ CustomerUpsert  │  │ LocationUpsert  │  │ BookingUpsert   │
│ - normalize     │  │ - address hash  │  │ - crm_id gen    │
│ - match/create  │  │ - geo proximity │  │ - status map    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Supabase                                 │
│  Tables: customers, locations, bookings                          │
└─────────────────────────────────────────────────────────────────┘
```

## New Files

| File | Purpose |
|------|---------|
| `src/services/import.service.ts` | Main import orchestration service |
| `src/types/import.ts` | Import-specific types and interfaces |
| `src/utils/import-helpers.ts` | Hash generation, normalization utilities |

## Interfaces

### Import Input Types

```typescript
interface ImportCustomerInput {
  name: string;
  metadata?: Record<string, unknown>;
}

interface ImportLocationInput {
  customerName: string;        // Used for customer lookup
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

interface ImportBookingInput {
  customerName: string;        // For crm_id generation
  locationName: string;        // For location lookup + crm_id
  scheduledDate: Date;
  csvStatus: 'Scheduled' | 'Dispatched' | 'Closed and Complete' | 'Completed';
  driverName?: string;         // For driver matching + crm_id
}
```

### Import Result Types

```typescript
interface ImportResult {
  customers: { created: number; matched: number; errors: ImportError[] };
  locations: { created: number; updated: number; flagged: number; errors: ImportError[] };
  bookings: { created: number; skipped: number; errors: ImportError[] };
  validationReport: CustomerLocationCount[];
  duration: number;
}

interface ImportError {
  rowNumber: number;
  entityType: 'customer' | 'location' | 'booking';
  message: string;
  identifier: string;
}

interface CustomerLocationCount {
  customerName: string;
  expected: number;
  actual: number;
  matches: boolean;
}
```

## Key Functions

### ImportService

```typescript
class ImportService {
  // Main entry point
  async runImport(data: ParsedImportData): Promise<Result<ImportResult>>
  
  // Customer operations
  async upsertCustomer(input: ImportCustomerInput): Promise<Result<{ id: string; created: boolean }>>
  private normalizeCustomerName(name: string): string
  
  // Location operations
  async upsertLocation(input: ImportLocationInput): Promise<Result<{ id: string; action: 'created' | 'updated' }>>
  private generateAddressHash(address: NormalizedAddress): string
  private findLocationByProximity(customerId: string, lat: number, lon: number): Promise<Location | null>
  private mergeMetadata(existing: Record<string, unknown>, incoming: Record<string, unknown>): Record<string, unknown>
  
  // Booking operations
  async upsertBooking(input: ImportBookingInput): Promise<Result<{ id: string; action: 'created' | 'skipped' }>>
  private generateCrmId(customer: string, location: string, date: Date, driver: string): string
  private mapCsvStatusToApp(csvStatus: string): { appStatus: string; crmStatus: string }
  
  // Validation
  async generateValidationReport(): Promise<CustomerLocationCount[]>
}
```

### Helper Utilities

```typescript
// src/utils/import-helpers.ts

// SHA256 hash generation for crm_id and address matching
function sha256(input: string): string

// Normalize address components for consistent hashing
function normalizeAddress(address: AddressComponents): NormalizedAddress

// Calculate distance between two coordinates
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number
```

## Status Mapping

| CSV Status | App Status | CRM Status | Notes |
|------------|------------|------------|-------|
| `Scheduled` | `confirmed` | `SCHEDULED` | Ready for routing |
| `Dispatched` | `scheduled` | `DISPATCHED` | Assigned but not sent |
| `Closed and Complete` | `completed` | `COMPLETED` | Historical |
| `Completed` | `completed` | `COMPLETED` | Historical |

> **Future Consideration:** The mapping is designed to be extensible. When the app becomes the source of record for scheduling, additional `crmStatus` values can be added without changing the `appStatus` semantics.

## Data Flow

### Customer Upsert

```
1. Normalize name: trim + uppercase
2. Query: SELECT id FROM customers WHERE UPPER(name) = ?
3. If found: return existing id
4. If not found: INSERT INTO customers (name, status) VALUES (?, 'active')
5. Return new id
```

### Location Upsert

```
1. Resolve customer_id from customerName
2. Generate address_hash: SHA256(normalized address)
3. Query by hash: SELECT * FROM locations WHERE customer_id = ? AND address_hash = ?
4. If not found and lat/lon provided:
   - Query by proximity: Find within 50m using PostGIS
5. If found:
   - Merge metadata (existing takes precedence)
   - Add 'Imported' tag if not present
   - UPDATE location
6. If not found:
   - INSERT new location
   - If no lat/lon: add 'Needs Review' tag
```

### Booking Upsert

```
1. Resolve location_id from customerName + locationName
2. Generate crm_id: SHA256(customer|location|date|driver)
3. Query: SELECT id FROM bookings WHERE crm_id = ?
4. If found: skip (idempotent)
5. If not found:
   - Map csvStatus → appStatus + crmStatus
   - If completed: set actual_start_time = scheduled_date
   - Lookup service_type_id for 'GT-PUMP'
   - Optionally match driver_id
   - INSERT booking
```

## Error Handling

- Individual record failures logged but don't stop processing
- If >10% of any entity type fails, abort import
- All errors written to structured log with row numbers

## Performance

- No transactions per record (each upsert is independent)
- Bulk operations where possible (batch customer lookups)
- Target: <5 minutes for full dataset (excluding geocoding)

## Dependencies

- **Issue #14**: Customers table (clients → customers rename)
- **Issue #15**: Schema enhancements (tags, metadata, crm_id, crm_status columns)
- **Issue #18**: CSV Parser provides `ParsedImportData` input
