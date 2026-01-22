# Tasks: Issue #19 - Database Upsert & Booking Generation for Legacy Import

## Overview

Implementation of the ImportService that loads legacy CRM data into Fleetillo. This follows existing service patterns and implements upsert logic for customers, locations, and bookings with idempotency guarantees.

## Dependencies

- **Issue #14**: ✅ COMPLETED - Customers table exists (`fleetillo.customers` schema)
- **Issue #15**: Schema enhancements - tags, metadata, crm_id, crm_status columns (REQUIRED)
- **Issue #18**: CSV Parser provides `ParsedImportData` input (can develop in parallel)

## Tasks

- [ ] 0. Create Feature Branch
  - Create `issue/19-database-upsert`
  - Base off `main` after Issue #15 schema changes are merged

- [ ] 1. Type Definitions
  - [ ] 1.1 Create `src/types/import.ts`
    - Define `ImportCustomerInput`, `ImportLocationInput`, `ImportBookingInput`
    - Define `ImportResult`, `ImportError`, `CustomerLocationCount`
    - Define `ParsedImportData` interface (coordinates with Issue #18)
    - _Requirements: 1, 2, 3_

- [ ] 2. Helper Utilities
  - [ ] 2.1 Create `src/utils/import-helpers.ts`
    - Implement `sha256()` hash function using Node crypto
    - Implement `normalizeAddress()` for consistent address hashing
    - Implement `haversineDistance()` for 50m proximity matching
    - Add unit tests for all utilities
    - _Requirements: 2.2, 3.2_

- [ ] 3. Checkpoint - Foundation Complete
  - Verify types compile correctly
  - Run unit tests for helpers
  - All utilities working independently

- [ ] 4. Customer Upsert
  - [ ] 4.1 Extend `client.service.ts` with upsert method
    - Add `normalizeCustomerName()` private method
    - Add `upsertCustomer(input: ImportCustomerInput)` method
    - Query by normalized name (UPPER)
    - Return existing ID if found, create if not
    - Track created vs matched counts
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [ ] 4.2 Write integration tests for customer upsert
    - Test create new customer
    - Test match existing customer (case-insensitive)
    - Test idempotency on re-run

- [ ] 5. Location Upsert
  - [ ] 5.1 Add `address_hash` column to locations table (if not in Issue #15)
    - Create migration for new column
    - Add index on `(customer_id, address_hash)` for fast lookup
  - [ ] 5.2 Extend `location.service.ts` with upsert method
    - Add `generateAddressHash()` using SHA256
    - Add `findLocationByProximity()` using PostGIS ST_DWithin (50m)
    - Add `mergeMetadata()` helper (existing values take precedence)
    - Add `upsertLocation(input: ImportLocationInput)` method
    - Add 'Imported' tag on update, 'Needs Review' tag when no coordinates
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [ ] 5.3 Write integration tests for location upsert
    - Test create new location
    - Test match by address hash
    - Test match by proximity (PostGIS)
    - Test metadata merge preserves existing
    - Test 'Needs Review' tag when geocoding fails

- [ ] 6. Checkpoint - Entity Upsert Complete
  - Customers and Locations upsert working independently
  - All edge cases covered by tests
  - Foreign key constraints respected

- [ ] 7. Booking Upsert
  - [ ] 7.1 Extend `booking.service.ts` with upsert method
    - Add `generateCrmId()` using SHA256(customer|location|date|driver)
    - Add `mapCsvStatusToApp()` with full status mapping table
    - Add `upsertBooking(input: ImportBookingInput)` method
    - Link to 'GT-PUMP' service type
    - Set `actual_start_time` when completed
    - Optionally match `driver_id` by name
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_
  - [ ] 7.2 Write integration tests for booking upsert
    - Test create new booking
    - Test skip when crm_id exists (idempotency)
    - Test all status mappings
    - Test driver matching

- [ ] 8. Import Orchestration Service
  - [ ] 8.1 Create `src/services/import.service.ts`
    - Implement `runImport(data: ParsedImportData)` main entry point
    - Process in order: Customers → Locations → Bookings
    - Skip children if parent fails
    - Track counts: created, matched/updated, skipped, errors
    - Abort if >10% of any entity type fails
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.4_
  - [ ] 8.2 Implement error logging
    - Log each error with row number, entity type, message, identifier
    - Write structured log file for post-processing
    - _Requirements: 6.2, 6.3_
  - [ ] 8.3 Implement validation report
    - Add `generateValidationReport()` method
    - Query customer-location counts vs expected
    - Flag mismatches
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 9. Checkpoint - Import Service Complete
  - Full pipeline working end-to-end
  - Integration tests passing
  - Error handling working

- [ ] 10. Full Integration Tests
  - [ ] 10.1 Create test with sample dataset
    - Subset of real data (10 customers, 50 locations, 100 bookings)
    - Verify counts match expected
  - [ ] 10.2 Create idempotency test
    - Run import twice
    - Verify second run produces 0 new records
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ] 10.3 Create spot check tests
    - Verify Applebee's = 30 locations
    - Verify Bojangles = 222 locations
    - _Requirements: 7.3, 7.6_

- [ ] 11. Performance Validation
  - [ ] 11.1 Test with full dataset
    - 278 customers, 870 locations, 1,193 bookings
    - Verify <5 minutes completion (excluding geocoding)
    - _Requirement: 4.5_

- [ ] 12. Final Checkpoint
  - All tests passing
  - Performance target met
  - No linting errors
  - Full dataset import verified

## Notes

- This service depends on Issue #18 for the CSV parser output format
- Coordinate the `ParsedImportData` interface with Issue #18 implementation
- The import script will be a CLI command, not an API endpoint (for now)
- Consider adding a dry-run mode for validation without database writes
