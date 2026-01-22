# Design: Issue #18 - CSV Parser & Data Normalization for Legacy Import

## Overview

This document describes the technical architecture for parsing legacy CSV data and storing it in staging tables for review before committing to production. The design supports a two-phase import workflow: Parse → Stage → Review → Commit.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Import Pipeline                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   CSV File                                                                  │
│      │                                                                      │
│      ▼                                                                      │
│   ┌──────────────┐                                                          │
│   │  CsvParser   │ ─── Loads CSV, validates columns, streams rows          │
│   └──────┬───────┘                                                          │
│          │                                                                  │
│          ▼                                                                  │
│   ┌──────────────────┐                                                      │
│   │  DataNormalizer  │ ─── Extracts customers, locations, bookings         │
│   └──────┬───────────┘                                                      │
│          │                                                                  │
│          ▼                                                                  │
│   ┌──────────────────┐                                                      │
│   │  GeocodingBatch  │ ─── Validates addresses, adds coordinates           │
│   └──────┬───────────┘                                                      │
│          │                                                                  │
│          ▼                                                                  │
│   ┌──────────────────┐     ┌───────────────────┐                            │
│   │  ImportService   │────▶│  import_batches   │ (audit log)               │
│   └──────┬───────────┘     └───────────────────┘                            │
│          │                                                                  │
│          ▼                                                                  │
│   ┌──────────────────┐                                                      │
│   │  import_staging  │ ─── Holds parsed data for review                    │
│   └──────┬───────────┘                                                      │
│          │                                                                  │
│          ▼ (manual trigger)                                                 │
│   ┌──────────────────┐     ┌─────────────────────────────────────┐         │
│   │  CommitService   │────▶│  customers / locations / bookings   │         │
│   └──────────────────┘     └─────────────────────────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### New Tables

#### `import_batches`

Tracks each import run for audit and status management.

```sql
CREATE TABLE fleetillo.import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_file TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'staged', 'committed', 'failed', 'rolled_back')),
    processed_at TIMESTAMPTZ,
    summary JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    error_message TEXT
);

CREATE INDEX idx_import_batches_status ON fleetillo.import_batches(status);
CREATE INDEX idx_import_batches_created_at ON fleetillo.import_batches(created_at DESC);
```

#### `import_staging`

Holds parsed records for review before committing.

```sql
CREATE TABLE fleetillo.import_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES fleetillo.import_batches(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'location', 'booking')),
    raw_data JSONB NOT NULL,
    parsed_data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'committed', 'error', 'commit_failed', 'skipped')),
    target_id UUID,  -- References the created production record
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_import_staging_batch ON fleetillo.import_staging(batch_id);
CREATE INDEX idx_import_staging_status ON fleetillo.import_staging(batch_id, status);
CREATE INDEX idx_import_staging_entity ON fleetillo.import_staging(batch_id, entity_type);
```

## File Structure

### New Files

```
dispatch-service/src/
├── services/
│   └── import/
│       ├── index.ts                 # Module exports
│       ├── csv-parser.service.ts    # CSV loading and validation
│       ├── data-normalizer.ts       # Entity extraction and normalization
│       ├── import.service.ts        # Orchestration and batch management
│       └── commit.service.ts        # Staging to production commit
├── types/
│   └── import.types.ts              # Import-related TypeScript interfaces
└── utils/
    ├── customer-extractor.ts        # Brand extraction from DKW-prefixed strings
    ├── gallons-parser.ts            # Trap capacity parsing
    ├── notes-parser.ts              # Metadata extraction from notes
    └── driver-matcher.ts            # Fuzzy matching for drivers
```

## TypeScript Interfaces

```typescript
// import.types.ts

export interface ImportBatch {
  id: string;
  sourceFile: string;
  createdAt: Date;
  status: 'processing' | 'staged' | 'committed' | 'failed' | 'rolled_back';
  processedAt?: Date;
  summary: ImportSummary;
  createdBy?: string;
  errorMessage?: string;
}

export interface ImportSummary {
  totalRows: number;
  customersExtracted: number;
  locationsExtracted: number;
  bookingsGenerated: number;
  errorsCount: number;
  needsReviewCount: number;
}

export interface StagingRecord {
  id: string;
  batchId: string;
  rowNumber: number;
  entityType: 'customer' | 'location' | 'booking';
  rawData: Record<string, unknown>;
  parsedData: ParsedCustomer | ParsedLocation | ParsedBooking;
  status: 'pending' | 'committed' | 'error' | 'commit_failed' | 'skipped';
  targetId?: string;
  errorMessage?: string;
}

export interface ParsedCustomer {
  normalizedName: string;      // Uppercase, trimmed for matching
  displayName: string;         // Original casing
  sourceRowNumbers: number[];  // All rows that contributed
}

export interface ParsedLocation {
  customerRef: string;         // normalizedName of parent customer
  locationName: string;        // Full name after DKW- prefix
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    fullAddress: string;
  };
  coordinates?: { lat: number; lng: number };
  metadata: LocationMetadata;
  tags: string[];
  notes?: string;
  sourceRowNumbers: number[];
}

export interface LocationMetadata {
  capacityGallons?: number;
  trapCount?: number;
  capacityNotes?: string;
  hoseLengthReq?: string;
  requiresTanker?: boolean;
  preferredServiceTime?: string;
}

export interface ParsedBooking {
  locationRef: string;         // customerNormalizedName + '|' + locationName
  driverId?: string;
  scheduledDate: string;       // ISO date
  appStatus: 'confirmed' | 'scheduled' | 'completed';
  crmStatus: 'SCHEDULED' | 'DISPATCHED' | 'COMPLETED';
  crmId: string;               // SHA256 hash
  sourceRowNumber: number;
}

export interface CsvRow {
  Customer: string;
  Address: string;
  City: string;
  State: string;
  ZipCode: string;
  Gallons: string;
  Notes: string;
  'Job/Est Date': string;
  Status: string;
  Name: string;  // Driver name
}
```

## Key Functions

### CsvParserService

```typescript
class CsvParserService {
  /**
   * Load and validate CSV file structure
   */
  async loadCsv(filePath: string): Promise<CsvRow[]>;
  
  /**
   * Validate required columns exist
   */
  validateColumns(headers: string[]): void | never;
}
```

### DataNormalizer

```typescript
class DataNormalizer {
  /**
   * Extract customer brand from DKW-prefixed location string
   * "DKW-Applebee's #1025138" → { brand: "Applebee's", normalized: "APPLEBEES" }
   */
  extractCustomer(customerField: string): { brand: string; normalized: string };
  
  /**
   * Extract location name from DKW-prefixed string
   * "DKW-Applebee's #1025138" → "Applebee's #1025138"
   */
  extractLocationName(customerField: string): string;
  
  /**
   * Parse gallons field for capacity info
   * "2- 2000" → { trapCount: 2, capacityGallons: 2000 }
   */
  parseGallons(gallons: string): Partial<LocationMetadata>;
  
  /**
   * Extract structured metadata from notes field
   */
  parseNotes(notes: string): { metadata: Partial<LocationMetadata>; remainingNotes: string };
  
  /**
   * Process all rows into normalized entities
   */
  normalize(rows: CsvRow[]): {
    customers: Map<string, ParsedCustomer>;
    locations: Map<string, ParsedLocation>;
    bookings: ParsedBooking[];
    errors: ParseError[];
  };
}
```

### ImportService

```typescript
class ImportService {
  /**
   * Start a new import batch
   */
  async createBatch(sourceFile: string): Promise<ImportBatch>;
  
  /**
   * Parse CSV and populate staging table
   */
  async parseAndStage(batchId: string, filePath: string): Promise<ImportSummary>;
  
  /**
   * Get batch status and summary
   */
  async getBatchStatus(batchId: string): Promise<ImportBatch>;
  
  /**
   * List recent import batches
   */
  async listBatches(limit?: number): Promise<ImportBatch[]>;
}
```

### CommitService

```typescript
class CommitService {
  /**
   * Commit all pending staging records to production
   */
  async commitBatch(batchId: string): Promise<CommitResult>;
  
  /**
   * Rollback a committed batch (delete created records)
   */
  async rollbackBatch(batchId: string): Promise<RollbackResult>;
  
  /**
   * Commit in order: customers → locations → bookings
   */
  private async commitCustomers(batchId: string): Promise<void>;
  private async commitLocations(batchId: string): Promise<void>;
  private async commitBookings(batchId: string): Promise<void>;
}
```

## Data Flow: Customer Extraction

```
Input: "DKW-Applebee's #1025138"
       │
       ▼ Strip "DKW-" prefix
"Applebee's #1025138"
       │
       ▼ Check for "#" separator
"Applebee's" (brand before #)
       │
       ▼ Normalize
"APPLEBEES" (uppercase, trim, remove apostrophe)
       │
       ▼ Deduplicate in Map<normalized, ParsedCustomer>
Single customer record with all source rows
```

## Data Flow: Staging to Commit

```
┌─────────────────┐
│ import_staging  │
│ status=pending  │
└────────┬────────┘
         │
         ▼ CommitService.commitBatch()
┌─────────────────────────────────────────────────────────────┐
│  For each entity_type in [customer, location, booking]:     │
│  1. SELECT pending records                                  │
│  2. Resolve references (customer → id, location → id)       │
│  3. INSERT/UPSERT into production table                     │
│  4. UPDATE staging: status=committed, target_id=new_id      │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────────────┐
│ import_staging  │     │ customers/locations/    │
│ status=committed│     │ bookings (production)   │
│ target_id=UUID  │     └─────────────────────────┘
└─────────────────┘
```

## Error Handling

| Error Type | Handling | Status |
|------------|----------|--------|
| Missing required column | Abort entire import | batch: failed |
| Row parse failure | Log error, continue | staging: error |
| Geocoding failure | Add 'Needs Review' tag | staging: pending |
| Commit failure | Log error, continue | staging: commit_failed |
| >10% row failures | Abort import | batch: failed |

## Performance Considerations

1. **Batch Geocoding**: Process 50 addresses at a time with 200ms delays
2. **Streaming CSV**: Use csv-parse stream mode for large files
3. **Transaction Batching**: Commit staging inserts in batches of 100
4. **Index Usage**: Leverage indexes for staging queries by batch_id and status

## Dependencies

- **Issue #15**: Schema enhancements for tags, metadata columns (can develop in parallel)
- **Issue #19**: Database Upsert will use staging data for production inserts
- **csv-parse**: Already in package.json
- **fuse.js**: Add for fuzzy driver matching
