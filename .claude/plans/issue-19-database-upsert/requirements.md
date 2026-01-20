# Requirements: Issue #19 - Database Upsert & Booking Generation for Legacy Import

## Introduction

The system needs to ingest legacy booking data from an external CRM/scheduling system. This data consists of 278 unique customers (brands), 870 locations (sites), and 1,193 booking records from Q1 2026. The import must be idempotent, meaning re-running the import should not create duplicate records or overwrite validated data. Each entity has specific business rules for matching and merging that must be respected to maintain data integrity.

This feature is the final step in the data import pipeline, taking the parsed/normalized data from Issue #18 (CSV Parser) and loading it into the production database. It depends on the schema enhancements from Issue #15 which adds `tags`, `metadata`, `crm_id`, and `crm_status` columns.

## Glossary

- **Customer (Brand)**: A business entity (e.g., "Applebee's", "Bojangles") that owns or operates one or more service locations. Stored in `customers` table.
- **Location (Site)**: A physical address where service is performed (e.g., "Applebee's #1025138"). Each location belongs to exactly one customer. Stored in `locations` table.
- **Booking**: A scheduled or completed service visit at a location. Each booking links to exactly one location. Stored in `bookings` table.
- **CRM ID**: A unique external reference identifier generated from booking attributes (customer + location + date + driver hash). Prevents duplicate imports.
- **CRM Status**: The status value from the external system (e.g., "SCHEDULED", "COMPLETED") preserved for audit purposes.
- **Idempotency**: The property that running the import multiple times produces the same result as running it once.
- **Upsert**: Insert if not exists, update if exists (based on matching criteria).

## Requirements

### Requirement 1: Customer Upsert

**User Story:** As a data administrator, I want to import customers from legacy data, so that I can establish the parent entities for location linkage.

#### Acceptance Criteria

1. WHEN a customer record is submitted for import, THE system SHALL normalize the customer name (trim whitespace, convert to uppercase for matching).
2. WHEN a customer with the normalized name already exists, THE system SHALL return the existing customer ID without creating a duplicate.
3. WHEN a customer with the normalized name does not exist, THE system SHALL create a new customer record with status 'active'.
4. THE system SHALL maintain a count of customers created vs matched for logging purposes.
5. IF customer creation fails, THEN THE system SHALL log the error and skip dependent locations.

### Requirement 2: Location Upsert with Metadata Merge

**User Story:** As a data administrator, I want to import locations linked to their customers, so that I can establish the site records for booking linkage.

#### Acceptance Criteria

1. WHEN a location record is submitted, THE system SHALL require a valid `customer_id` (FK constraint).
2. THE system SHALL match existing locations using:
   - Primary: `customer_id` + SHA256 hash of normalized address
   - Secondary: `customer_id` + geospatial proximity check (within 50 meters)
3. WHEN a location match is found, THE system SHALL:
   - Preserve existing verified coordinates (do not overwrite if non-null)
   - Merge new metadata values into existing metadata (existing non-null values take precedence)
   - Add 'Imported' to the tags array if not already present
4. WHEN no location match is found, THE system SHALL create a new location with all provided fields.
5. WHEN an address cannot be geocoded, THE system SHALL:
   - Create the location anyway
   - Add 'Needs Review' to the tags array
   - Log the issue for manual resolution
6. THE system SHALL maintain counts of locations created, updated, and flagged for logging.

### Requirement 3: Booking Generation with CRM Tracking

**User Story:** As a data administrator, I want to import booking records linked to their locations, so that historical service data is available in the system.

#### Acceptance Criteria

1. WHEN a booking record is submitted, THE system SHALL require a valid `location_id` (FK constraint).
2. WHEN a booking record is submitted, THE system SHALL generate a unique `crm_id`:
   - Formula: SHA256(customer_name + "|" + location_name + "|" + scheduled_date + "|" + driver_name)
3. WHEN a booking with the same `crm_id` already exists, THE system SHALL skip the record without error.
4. THE system SHALL map CSV status values to app status codes:
   | CSV Status | App Status | CRM Status |
   |------------|------------|------------|
   | Scheduled | confirmed | SCHEDULED |
   | Dispatched | scheduled | DISPATCHED |
   | Closed and Complete | completed | COMPLETED |
   | Completed | completed | COMPLETED |

   > **Future Consideration:** A future enhancement will require the app to become the source of record for booking scheduling. The status mapping should be designed to support additional CRM statuses beyond SCHEDULED, allowing the app to independently manage booking confirmation and scheduling states.
5. WHEN status is 'completed', THE system SHALL also set `actual_start_time` equal to `scheduled_date`.
6. THE system SHALL link all imported bookings to the 'GT-PUMP' service type.
7. WHEN a driver can be matched, THE system SHALL set `driver_id` on the booking.
8. THE system SHALL maintain counts of bookings created vs skipped for logging.

### Requirement 4: Import Orchestration and Order

**User Story:** As a data administrator, I want the import to run in the correct order, so that foreign key constraints are satisfied.

#### Acceptance Criteria

1. THE system SHALL process entities in order: Customers → Locations → Bookings.
2. IF a parent entity fails to import, THEN THE system SHALL skip dependent child entities.
3. THE system SHALL support processing the full dataset in a single import run.
4. THE system SHALL log a summary report at completion showing:
   - Customers: [created] new, [matched] existing
   - Locations: [created] new, [updated] existing, [flagged] needs review
   - Bookings: [created] new, [skipped] duplicates
5. THE system SHALL complete the import of 1,193 bookings in under 5 minutes (excluding geocoding delays).

### Requirement 5: Idempotency Guarantee

**User Story:** As a data administrator, I want to re-run the import safely, so that I can correct issues without creating duplicates.

#### Acceptance Criteria

1. WHEN the import is run against data that has already been imported, THE system SHALL create zero new records.
2. THE system SHALL not overwrite existing verified data (coordinates, non-empty metadata).
3. THE system SHALL preserve the original `crm_id` on all imported bookings for traceability.
4. AFTER a second import run, THE database SHALL contain exactly:
   - 278 customers
   - 870 locations
   - 1,193 bookings

### Requirement 6: Error Handling and Recovery

**User Story:** As a data administrator, I want clear error reporting, so that I can identify and fix data issues.

#### Acceptance Criteria

1. WHEN an individual record fails, THE system SHALL continue processing remaining records (no full rollback).
2. THE system SHALL log each error with:
   - Row number from source data
   - Entity type (customer/location/booking)
   - Error message
   - Identifying data (name, address, or date)
3. THE system SHALL write all errors to a structured log file for post-processing.
4. IF more than 10% of records fail, THE system SHALL abort and report the issue.

### Requirement 7: Data Validation Spot Checks

**User Story:** As a data administrator, I want to verify import accuracy, so that I can trust the imported data.

#### Acceptance Criteria

1. AFTER import, THE system SHALL generate a validation report listing every customer with their expected vs actual location count.
2. AFTER import, THE system SHALL flag any customer where the location count does not match the source data.
3. Sample validation checks SHALL include:
   - Customer "Applebee's" = exactly 30 linked locations
   - Customer "Bojangles" = exactly 222 linked locations
4. AFTER import, all locations tagged 'Needs Review' SHALL have a corresponding log entry explaining the issue.
5. AFTER import, all bookings with `crm_status` = 'COMPLETED' SHALL have `status` = 'completed' and `actual_start_time` populated.
6. THE system SHALL verify that total imported counts match source data (278 customers, 870 locations, 1,193 bookings).
