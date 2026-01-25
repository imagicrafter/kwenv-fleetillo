# Tasks: Issue #74 - Enable Customer and Location Creation via Booking CSV Import

## Overview

This task list implements the CSV entity resolution feature in phases: customer service extensions, location service extensions, new resolution service, CSV service updates, and testing.

## Tasks

- [ ] 0. Create Feature Branch
  - Create `issue/74-csv-customer-location-creation`
  - Ensure branch is up to date with main

- [ ] 1. Customer Service Extensions
  - [ ] 1.1 Add `findCustomerByEmail` method
    - Add to `src/services/customer.service.ts`
    - Query: `SELECT * FROM customers WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`
    - Return single customer or null
    - _Requirements: 3.1, 3.2_
  - [ ] 1.2 Add `findCustomersByName` method
    - Add to `src/services/customer.service.ts`
    - Query: `SELECT * FROM customers WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL`
    - Return array of matching customers
    - _Requirements: 3.4, 3.5_
  - [ ] 1.3 Write unit tests for new customer methods
    - Test case-insensitive email lookup
    - Test case-insensitive name lookup
    - Test handling of multiple name matches
    - Test null return when not found

- [ ] 2. Checkpoint - Customer Extensions Complete
  - Run `npm test -- --grep "customer.service"`
  - Verify all customer lookup tests pass

- [ ] 3. Location Service Extensions
  - [ ] 3.1 Add `findLocationByAddress` method
    - Add to `src/services/location.service.ts`
    - Parameters: customerId, addressLine1, city, state, postalCode
    - Query with case-insensitive matching
    - Return single location or null
    - _Requirements: 4.1, 4.2_
  - [ ] 3.2 Add `hasLocations` helper method
    - Check if customer has any existing locations
    - Used to determine `is_primary` flag for new locations
    - _Requirements: 4.5_
  - [ ] 3.3 Write unit tests for new location methods
    - Test address matching logic
    - Test is_primary determination

- [ ] 4. Checkpoint - Location Extensions Complete
  - Run `npm test -- --grep "location.service"`
  - Verify all location tests pass

- [ ] 5. CSV Entity Resolution Service (NEW)
  - [ ] 5.1 Create `src/services/csv-entity-resolution.service.ts`
    - Create file with logger and type definitions
    - Define `CSVEntityResolutionResult` interface
    - Define `ResolveCustomerInput` interface
    - Define `ResolveLocationInput` interface
  - [ ] 5.2 Implement `resolveCustomer` function
    - If customerId provided: verify exists and return
    - If email provided: lookup by email
    - If only name: lookup by name, error if multiple matches
    - If not found: create new customer
    - Return { customerId, created: boolean }
    - _Requirements: 1.2, 3.1-3.6_
  - [ ] 5.3 Implement `resolveLocation` function
    - If locationId provided: verify exists and return
    - If address fields provided: lookup by address for customer
    - If not found: geocode and create new location
    - Set is_primary based on existing locations
    - Return { locationId, created: boolean }
    - _Requirements: 2.2-2.6, 4.1-4.6, 6.1-6.4_
  - [ ] 5.4 Implement `resolveEntities` main function
    - Coordinate customer and location resolution
    - Handle errors and return comprehensive result
    - _Requirements: 5.1-5.4_
  - [ ] 5.5 Add service export to `src/services/index.ts`
  - [ ] 5.6 Write comprehensive unit tests
    - Test customer resolution with ID
    - Test customer resolution with email
    - Test customer resolution with name
    - Test customer creation
    - Test location resolution with ID
    - Test location resolution with address
    - Test location creation with geocoding
    - Test full entity resolution flow

- [ ] 6. Checkpoint - Entity Resolution Service Complete
  - Run `npm test -- --grep "csv-entity-resolution"`
  - Verify all resolution tests pass
  - Manual test: call service with sample data

- [ ] 7. CSV Service Updates
  - [ ] 7.1 Extend `CSVBookingRow` interface
    - Add optional `customerName`, `customerEmail`, `customerPhone`
    - Add optional `locationName`, `locationAddressLine1-2`, `locationCity`, `locationState`, `locationPostalCode`, `locationCountry`
    - _Requirements: 1.1, 2.1_
  - [ ] 7.2 Update `REQUIRED_COLUMNS` validation
    - Change `customerId` from required to conditionally required
    - If no customerId, require customerName
    - _Requirements: 1.2, 8.1_
  - [ ] 7.3 Update `validateCSVRow` function
    - Add validation for new customer fields
    - Add validation for new location fields
    - Validate location fields are complete if any provided
    - _Requirements: 1.2, 2.2, 7.4_
  - [ ] 7.4 Update `CSVParseResult` interface
    - Add `customersCreated` count
    - Add `locationsCreated` count
    - _Requirements: 7.1_

- [ ] 8. Checkpoint - CSV Service Updates Complete
  - Run `npm test -- --grep "csv.service"`
  - Verify validation tests pass for new fields

- [ ] 9. Booking Controller Integration
  - [ ] 9.1 Update import endpoint handler
    - Import entity resolution service
    - Call `resolveEntities` before `createBooking`
    - Track customers/locations created counts
    - _Requirements: 5.1-5.5_
  - [ ] 9.2 Update response format
    - Include `customersCreated` in response
    - Include `locationsCreated` in response
    - Include geocoding warnings
    - _Requirements: 7.1-7.5_
  - [ ] 9.3 Add error handling for resolution failures
    - Return specific error messages per requirement
    - Include row number in errors
    - _Requirements: 7.1-7.5_

- [ ] 10. Checkpoint - Integration Complete
  - Run `npm run build` to verify no TypeScript errors
  - Run full test suite: `npm test`
  - Manual test with sample CSV

- [ ] 11. Integration Tests
  - [ ] 11.1 Create `tests/integration/csv-import-entities.test.ts`
    - Test import with UUID-only rows (backward compatibility)
    - Test import creating new customers
    - Test import creating new locations
    - Test import with mixed entities
    - Test ambiguous customer name error
    - _Requirements: 8.1-8.4_
  - [ ] 11.2 Add test fixtures
    - Create sample CSV files for each scenario
    - Add to `tests/fixtures/csv/`

- [ ] 12. E2E Tests
  - [ ] 12.1 Update `tests/e2e/booking-csv-import.e2e.spec.ts`
    - Add test for customer creation via CSV
    - Add test for location creation via CSV
    - Add test verifying geocoded coordinates
    - Add backward compatibility test
    - _Requirements: All_

- [ ] 13. Checkpoint - Tests Complete
  - Run `npm test` - all tests pass
  - Run `npm run test:e2e` - E2E tests pass
  - Review test coverage for new code

- [ ] 14. Documentation & Template Update
  - [ ] 14.1 Update CSV template file
    - Add new columns with headers
    - Add example rows showing entity creation
    - Add header comments explaining usage
    - _Requirements: 9.1-9.4_
  - [ ] 14.2 Update API documentation
    - Document new CSV columns
    - Document response format changes
    - Add examples

- [ ] 15. Final Checkpoint
  - [ ] All tests pass (`npm test && npm run test:e2e`)
  - [ ] Build succeeds (`npm run build`)
  - [ ] Manual testing complete:
    - [ ] Import CSV with existing UUIDs works
    - [ ] Import CSV creating new customer works
    - [ ] Import CSV creating new location works
    - [ ] Geocoding populates coordinates
    - [ ] Error messages are clear and helpful
  - [ ] Documentation updated
  - [ ] PR ready for review

## Notes

- **Geocoding**: Use existing `geocodeAddress` from `googlemaps.service.ts`. Don't block on geocoding failures.
- **Case sensitivity**: All lookups (email, name, address) should be case-insensitive.
- **is_primary**: First location for a customer should have `is_primary = true`.
- **Backward compatibility**: Critical - existing CSV files must continue working.

## Requirement Traceability

| Requirement | Tasks |
|-------------|-------|
| R1: Extended CSV Schema for Customer | 7.1, 7.2, 7.3 |
| R2: Extended CSV Schema for Location | 7.1, 7.3 |
| R3: Customer Resolution Logic | 1.1, 1.2, 5.2 |
| R4: Location Resolution Logic | 3.1, 3.2, 5.3 |
| R5: Transactional Integrity | 5.4, 9.1 |
| R6: Geocoding for New Locations | 5.3 |
| R7: Error Reporting | 9.2, 9.3 |
| R8: Backward Compatibility | 7.2, 11.1 |
| R9: CSV Template Update | 14.1, 14.2 |
