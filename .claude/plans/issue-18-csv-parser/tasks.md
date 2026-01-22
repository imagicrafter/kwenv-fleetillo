# Tasks: Issue #18 - CSV Parser & Data Normalization for Legacy Import

## Overview

Implement a CSV parsing pipeline that extracts customers, locations, and bookings from legacy data, stores them in staging tables for review, and supports commit to production.

## Tasks

- [ ] 0. Create Feature Branch
  - Create `issue/18-csv-parser`
  - Branch from main

---

### Phase 1: Database Infrastructure

- [ ] 1. Create Migration for Import Tables
  - [ ] 1.1 Create `import_batches` table
    - Columns: id, source_file, created_at, status, processed_at, summary (JSONB), error_message
    - Status enum: processing, staged, committed, failed, rolled_back
    - _Requirements: 11_
  - [ ] 1.2 Create `import_staging` table
    - Columns: id, batch_id, row_number, entity_type, raw_data (JSONB), parsed_data (JSONB), status, target_id, error_message
    - Foreign key to import_batches
    - Indexes on batch_id, status, entity_type
    - _Requirements: 9_
  - [ ] 1.3 Run migration and verify

- [ ] 2. Checkpoint - Infrastructure Complete
  - Verify tables exist in database
  - Test basic inserts

---

### Phase 2: Utility Functions

- [ ] 3. Implement Customer Extractor
  - [ ] 3.1 Create `dispatch-service/src/utils/customer-extractor.ts`
    - Strip "DKW-" prefix
    - Extract brand before "#" or " - "
    - Normalize: uppercase, trim, remove special chars
    - _Requirements: 2_
  - [ ] 3.2 Write unit tests with sample data

- [ ] 4. Implement Gallons Parser
  - [ ] 4.1 Create `dispatch-service/src/utils/gallons-parser.ts`
    - Parse simple numbers → capacity_gallons
    - Parse multi-trap format "2- 2000" → trap_count + capacity_gallons
    - Handle unrecognized formats → capacity_notes + needs review
    - _Requirements: 6_
  - [ ] 4.2 Write unit tests

- [ ] 5. Implement Notes Parser
  - [ ] 5.1 Create `dispatch-service/src/utils/notes-parser.ts`
    - Extract hose:N → metadata.hose_length_req
    - Extract Tanker: Yes/No → metadata.requires_tanker
    - Extract ServiceTime → metadata.preferred_service_time
    - Return remaining notes
    - _Requirements: 5_
  - [ ] 5.2 Write unit tests

- [ ] 6. Implement Driver Matcher
  - [ ] 6.1 Add fuse.js dependency: `npm install fuse.js`
  - [ ] 6.2 Create `dispatch-service/src/utils/driver-matcher.ts`
    - Load existing drivers from database
    - Fuzzy match with 0.8 threshold
    - Return driver_id or null with warning
    - _Requirements: 7_
  - [ ] 6.3 Write unit tests

- [ ] 7. Checkpoint - Utilities Complete
  - Run all utility unit tests
  - Verify extraction accuracy

---

### Phase 3: Core Services

- [ ] 8. Create TypeScript Interfaces
  - [ ] 8.1 Create `dispatch-service/src/types/import.types.ts`
    - ImportBatch, ImportSummary, StagingRecord
    - ParsedCustomer, ParsedLocation, ParsedBooking
    - CsvRow, LocationMetadata
    - _Design: TypeScript Interfaces section_

- [ ] 9. Implement CsvParserService
  - [ ] 9.1 Create `dispatch-service/src/services/import/csv-parser.service.ts`
    - loadCsv(filePath) - load and parse CSV
    - validateColumns(headers) - check required columns exist
    - _Requirements: 1_
  - [ ] 9.2 Write integration tests with sample CSV

- [ ] 10. Implement DataNormalizer
  - [ ] 10.1 Create `dispatch-service/src/services/import/data-normalizer.ts`
    - extractCustomer() - use customer-extractor
    - extractLocationName() - strip DKW prefix
    - parseGallons() - use gallons-parser
    - parseNotes() - use notes-parser
    - normalize() - process all rows
    - _Requirements: 2, 3, 5, 6_
  - [ ] 10.2 Create index.ts with module exports
  - [ ] 10.3 Write tests for normalize() function

- [ ] 11. Checkpoint - Core Parsing Complete
  - Test full normalize pipeline with sample data
  - Verify customer/location/booking counts match expected

---

### Phase 4: Import Orchestration

- [ ] 12. Implement ImportService
  - [ ] 12.1 Create `dispatch-service/src/services/import/import.service.ts`
    - createBatch() - insert import_batches record
    - parseAndStage() - orchestrate parsing, call geocoding, write to staging
    - getBatchStatus() - query batch by id
    - listBatches() - list recent imports
    - _Requirements: 9, 10, 11_
  - [ ] 12.2 Integrate geocoding with rate limiting (200ms delay, batch of 50)
    - _Requirements: 4_
  - [ ] 12.3 Write integration tests

- [ ] 13. Implement Booking Generation
  - [ ] 13.1 Add status mapping logic
    - Scheduled → confirmed/SCHEDULED
    - Dispatched → scheduled/DISPATCHED
    - Completed/Closed and Complete → completed/COMPLETED
    - _Requirements: 8_
  - [ ] 13.2 Generate crm_id using SHA256
  - [ ] 13.3 Write tests

- [ ] 14. Checkpoint - Import Pipeline Complete
  - Test full import flow with sample CSV
  - Verify staging table populated correctly
  - Verify batch status updates

---

### Phase 5: Commit to Production

- [ ] 15. Implement CommitService
  - [ ] 15.1 Create `dispatch-service/src/services/import/commit.service.ts`
    - commitBatch() - process all pending records
    - commitCustomers() - insert to customers table
    - commitLocations() - insert to locations table with customer FK
    - commitBookings() - insert to bookings table with location FK
    - _Requirements: 12_
  - [ ] 15.2 Implement rollbackBatch() for cleanup
  - [ ] 15.3 Write integration tests

- [ ] 16. Checkpoint - Commit Flow Complete
  - Test commit creates production records
  - Test rollback removes records
  - Verify target_id populated in staging

---

### Phase 6: Error Handling & Reporting

- [ ] 17. Add Error Handling
  - [ ] 17.1 Continue processing on row errors
  - [ ] 17.2 Abort if >10% rows fail
  - [ ] 17.3 Insert failed rows to staging with status='error'
    - _Requirements: 10_

- [ ] 18. Implement Summary Reporting
  - [ ] 18.1 Generate ImportSummary with counts
  - [ ] 18.2 Support JSON export of staging data
    - _Requirements: 10_

- [ ] 19. Checkpoint - Error Handling Complete
  - Test with malformed CSV data
  - Verify error rows in staging
  - Verify summary counts accurate

---

### Phase 7: Final Verification

- [ ] 20. End-to-End Testing
  - [ ] 20.1 Test with full legacy CSV file (1,193 rows)
  - [ ] 20.2 Verify expected counts:
    - 278 unique customers
    - 870 unique locations
    - 1,193 bookings
  - [ ] 20.3 Test geocoding with real API (small sample)

- [ ] 21. Documentation
  - [ ] 21.1 Add code comments to public functions
  - [ ] 21.2 Document import workflow in README

- [ ] 22. Final Checkpoint
  - All tests pass
  - Build succeeds
  - Sample import runs successfully

## Notes

- Issue #19 (Database Upsert) will consume staging data for production upserts
- Issue #15 provides schema enhancements (tags, metadata columns) - can develop in parallel
- Consider adding CLI command for running imports: `npm run import -- path/to/file.csv`
