# Requirements: Issue #18 - CSV Parser & Data Normalization for Legacy Import

## Introduction

The Fleetillo system needs to parse and normalize legacy booking data from an external CRM/scheduling system. The source file contains 1,193 booking records with embedded customer (brand) and location (site) information that must be extracted and properly linked before database import.

This is the first step in the data import pipeline, producing normalized data structures that Issue #19 (Database Upsert) will consume. The critical insight is that the CSV `Customer` column contains LOCATION identifiers (e.g., "DKW-Applebee's #1025138"), NOT customer names - the actual customer is the brand extracted from this field.

## Glossary

- **Customer (Brand)**: A business entity (e.g., "Applebee's", "Bojangles") that owns or operates one or more service locations. Extracted from the CSV Customer field.
- **Location (Site)**: A physical address where service is performed (e.g., "Applebee's #1025138"). Each location belongs to exactly one customer.
- **Booking**: A scheduled or completed service visit at a location.
- **DKW Prefix**: Legacy identifier prefix ("DKW-") that must be stripped during parsing.
- **Normalization**: The process of standardizing data to a consistent format for matching and deduplication.
- **ParsedImportData**: The output data structure containing normalized customers, locations, and bookings ready for database import.
- **Import Batch**: A tracked group of records from a single import run, identified by a unique batch_id.
- **Staging Table**: Intermediate storage where parsed data is held for review before committing to production tables.
- **Commit**: The process of moving validated staging records into production tables (customers, locations, bookings).

## Requirements

### Requirement 1: CSV File Loading and Validation

**User Story:** As a data administrator, I want to load the legacy CSV file and validate its structure, so that I can ensure the data is parseable before processing.

#### Acceptance Criteria

1. WHEN a CSV file path is provided, THE system SHALL load and parse the file using the csv-parse library.
2. THE system SHALL validate that required columns exist: `Customer`, `Address`, `City`, `State`, `ZipCode`, `Gallons`, `Notes`, `Job/Est Date`, `Status`, `Name` (driver).
3. IF any required column is missing, THEN THE system SHALL abort with a descriptive error message.
4. THE system SHALL report the total row count after loading.
5. THE system SHALL skip empty rows without error.

### Requirement 2: Customer (Brand) Extraction

**User Story:** As a data administrator, I want to extract unique customer brands from location identifiers, so that I can establish parent entities for location linkage.

#### Acceptance Criteria

1. WHEN a CSV row is processed, THE system SHALL extract the customer brand using this algorithm:
   - Strip "DKW-" prefix from the Customer field
   - If "#" exists: Brand = text before "#"
   - Else if " - " exists: Brand = text before " - "
   - Else: Brand = full remaining string after prefix
2. THE system SHALL normalize brand names for matching: trim whitespace, convert to uppercase.
3. THE system SHALL deduplicate customers: "Applebee's" and "APPLEBEE'S" yield ONE customer.
4. THE system SHALL produce exactly 278 unique customer records from the source data.
5. THE system SHALL track the source row numbers that contribute to each customer.

### Requirement 3: Location Name Extraction and Linking

**User Story:** As a data administrator, I want to extract location names and link them to their parent customers, so that I can establish site records with proper relationships.

#### Acceptance Criteria

1. WHEN a CSV row is processed, THE system SHALL extract the location name as the full string after "DKW-" prefix.
2. THE system SHALL link each location to its parent customer (resolved from the same row's Customer field).
3. THE system SHALL deduplicate locations: unique by normalized(customer_name + location_name).
4. THE system SHALL produce exactly 870 unique location records from the source data.
5. WHEN extracting locations, THE system SHALL track all source row numbers that reference each location.

### Requirement 4: Address Normalization and Geocoding

**User Story:** As a data administrator, I want addresses parsed and geocoded, so that locations have accurate coordinates for routing.

#### Acceptance Criteria

1. WHEN an address is processed, THE system SHALL sanitize by removing any "DKW-{...}" prefix.
2. THE system SHALL construct full address from: Address, City, State, ZipCode columns.
3. THE system SHALL call Google Places TextSearch API to validate and geocode addresses.
4. WHEN geocoding succeeds, THE system SHALL store latitude and longitude with the location.
5. WHEN geocoding fails or returns low confidence, THE system SHALL:
   - Still create the location record
   - Add 'Needs Review' to the location's tags array
   - Log the issue with row number and raw address
6. THE system SHALL rate-limit geocoding calls with minimum 200ms delay between requests.
7. THE system SHALL support batch processing up to 50 addresses per batch.

### Requirement 5: Notes Field Metadata Extraction

**User Story:** As a data administrator, I want structured data extracted from freeform notes, so that location requirements are captured in queryable fields.

#### Acceptance Criteria

1. WHEN a Notes field is processed, THE system SHALL extract using these patterns:
   | Pattern | Target Field | Example |
   |---------|--------------|---------|
   | `hose:(\d+)` | metadata.hose_length_req | "hose:30" → 30 |
   | `Tanker:\s*(Yes\|No)` | metadata.requires_tanker | "Tanker: Yes" → true |
   | `ServiceTime:\s*(.+?)(?=hose:\|Tanker:\|$)` | metadata.preferred_service_time | "pump before 11 AM" |
2. AFTER extraction, THE system SHALL store remaining text (location hints, contact info) in location.notes.
3. IF no patterns match, THE system SHALL preserve the entire notes field as location.notes.
4. THE system SHALL handle case-insensitive pattern matching.

### Requirement 6: Gallons Field Parsing to Capacity

**User Story:** As a data administrator, I want trap capacity parsed from various formats, so that location requirements accurately reflect equipment needs.

#### Acceptance Criteria

1. WHEN Gallons field contains a simple number (e.g., "1500"), THE system SHALL store it as metadata.capacity_gallons.
2. WHEN Gallons field matches multi-trap pattern `(\d+)-\s*(\d+)` (e.g., "2- 2000"), THE system SHALL extract:
   - metadata.trap_count = first number
   - metadata.capacity_gallons = second number
3. WHEN Gallons field contains unrecognized format, THE system SHALL:
   - Store raw value in metadata.capacity_notes
   - Add 'Needs Review' to location tags
4. THE system SHALL handle variations: "2- 1500", "2-1500", "2 - 1500".

### Requirement 7: Driver Matching

**User Story:** As a data administrator, I want driver names matched to existing driver records, so that historical bookings retain driver attribution.

#### Acceptance Criteria

1. WHEN a CSV row contains a Name (driver) field, THE system SHALL attempt fuzzy matching against `drivers.first_name + ' ' + drivers.last_name`.
2. THE system SHALL use a fuzzy matching threshold of 0.8 similarity score.
3. WHEN a match is found, THE system SHALL store the matching driver_id with the booking.
4. WHEN no match is found, THE system SHALL:
   - Set driver_id to null
   - Log a warning with the unmatched name and row number
5. THE system SHALL match all 12 known drivers from the source data.

### Requirement 8: Booking Record Generation

**User Story:** As a data administrator, I want booking records generated with proper status mapping, so that historical service data is accurately represented.

#### Acceptance Criteria

1. WHEN a CSV row is processed, THE system SHALL generate a booking record linked to the resolved location.
2. THE system SHALL map date: Job/Est Date → scheduledDate.
3. THE system SHALL map CSV status to app status codes:
   | CSV Status | App Status | CRM Status |
   |------------|------------|------------|
   | Scheduled | confirmed | SCHEDULED |
   | Dispatched | scheduled | DISPATCHED |
   | Closed and Complete | completed | COMPLETED |
   | Completed | completed | COMPLETED |
4. THE system SHALL produce exactly 1,193 booking records from the source data.
5. FOR each booking, THE system SHALL generate a unique crm_id using: SHA256(customer + "|" + location + "|" + date + "|" + driver).

### Requirement 9: Staging Table Output

**User Story:** As a data administrator, I want parsed data written to a staging table, so that I can review and validate before committing to production tables.

#### Acceptance Criteria

1. THE system SHALL insert parsed records into the `import_staging` table with:
   - `batch_id` linking to the import batch
   - `row_number` from the source CSV
   - `raw_data` (JSONB) containing original CSV row values
   - `parsed_data` (JSONB) containing normalized/transformed data
   - `entity_type` ('customer', 'location', or 'booking')
   - `status` set to 'pending'
2. THE system SHALL ensure all foreign key references are valid within parsed_data (location → customer, booking → location).
3. THE system SHALL be queryable for review: users can inspect staging data before commit.
4. THE system SHALL support JSON export of staging data for offline debugging.

### Requirement 10: Error Handling and Reporting

**User Story:** As a data administrator, I want clear error reporting, so that I can identify and fix data issues before import.

#### Acceptance Criteria

1. WHEN an individual row fails to parse, THE system SHALL continue processing remaining rows.
2. THE system SHALL log each error with: row number, field name, error message, raw value.
3. THE system SHALL insert failed rows into `import_staging` with `status='error'` and `error_message` populated.
4. THE system SHALL produce a summary report showing:
   - Total rows processed
   - Customers extracted
   - Locations extracted
   - Bookings generated
   - Errors encountered
   - Items flagged for review
5. IF more than 10% of rows fail, THE system SHALL abort and report the threshold exceeded.

### Requirement 11: Import Batch Management

**User Story:** As a data administrator, I want each import run tracked as a batch, so that I have a complete audit trail of all import attempts.

#### Acceptance Criteria

1. WHEN an import is started, THE system SHALL create an `import_batches` record with:
   - Unique `id` (UUID)
   - `source_file` (original filename)
   - `created_at` timestamp
   - `status` set to 'processing'
2. WHEN parsing completes, THE system SHALL update the batch with:
   - `status` = 'staged' (ready for review)
   - `summary` (JSONB) containing row counts and statistics
3. THE system SHALL support querying batch history to view past imports.
4. WHEN a batch is committed to production, THE system SHALL update `status` = 'committed' and set `processed_at`.
5. THE system SHALL prevent re-committing already committed batches.

### Requirement 12: Staging to Production Commit

**User Story:** As a data administrator, I want to commit validated staging data to production tables, so that reviewed data becomes live in the system.

#### Acceptance Criteria

1. THE system SHALL provide a commit operation that processes all 'pending' records in a batch.
2. WHEN committing, THE system SHALL process entities in order: Customers → Locations → Bookings.
3. WHEN a staging record is successfully committed, THE system SHALL:
   - Update `import_staging.status` to 'committed'
   - Store the production record ID in `import_staging.target_id`
4. WHEN a staging record fails to commit, THE system SHALL:
   - Update `import_staging.status` to 'commit_failed'
   - Store the error in `import_staging.error_message`
   - Continue processing remaining records
5. THE system SHALL support rollback by using `target_id` references to identify records to delete.
6. THE system SHALL update `import_batches.status` to 'committed' when all records are processed.
