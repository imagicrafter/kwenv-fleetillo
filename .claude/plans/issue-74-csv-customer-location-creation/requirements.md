# Requirements: Issue #74 - Enable Customer and Location Creation via Booking CSV Import

## Introduction

The current booking CSV import workflow requires users to provide existing `customerId` and `locationId` UUIDs for every booking row. This forces users to manually create all customers and locations in the system before importing bookings, which creates significant friction for bulk onboarding and data migration scenarios.

This enhancement enables users to create new customers and locations on-the-fly during the booking CSV import process. When a CSV row does not include a `customerId`, the system will use customer identification fields (name, email) to either find an existing customer or create a new one. Similarly, when no `locationId` is provided, the system will create a new location using the address fields in the CSV row.

This capability is essential for customer onboarding, legacy data migration, and scenarios where users are importing data from external systems that don't use Fleetillo's UUID-based identifiers.

## Glossary

- **CSV Import**: The process of uploading a comma-separated values file to create multiple bookings at once
- **Customer Resolution**: The process of determining whether to use an existing customer or create a new one based on identifying information
- **Location Resolution**: The process of determining whether to use an existing location or create a new one based on address information
- **Entity Creation Mode**: A flag indicating whether the import should create new customers/locations when they don't exist

## Requirements

### Requirement 1: Extended CSV Schema for Customer Creation

**User Story:** As a fleet operator importing bookings, I want to include customer details in my CSV file so that new customers can be created automatically during import.

#### Acceptance Criteria
1. WHEN a CSV file includes columns `customerName`, `customerEmail`, and optionally `customerPhone`, THE system SHALL accept these as valid CSV fields
2. WHEN `customerId` is empty AND `customerName` is provided, THE system SHALL use `customerName` and `customerEmail` to resolve or create the customer
3. WHEN `customerId` is provided, THE system SHALL ignore any customer creation fields and use the provided UUID
4. IF `customerEmail` is provided without `customerId`, THE system SHALL use email as the primary lookup key for existing customers
5. IF `customerName` is provided without `customerEmail` AND without `customerId`, THE system SHALL search for existing customers by name (case-insensitive)

### Requirement 2: Extended CSV Schema for Location Creation

**User Story:** As a fleet operator importing bookings, I want to include location details in my CSV file so that new service locations can be created automatically during import.

#### Acceptance Criteria
1. WHEN a CSV file includes columns `locationName`, `locationAddressLine1`, `locationCity`, `locationState`, `locationPostalCode`, and optionally `locationAddressLine2`, `locationCountry`, THE system SHALL accept these as valid CSV fields
2. WHEN `locationId` is empty AND location address fields are provided, THE system SHALL create a new location using those fields
3. WHEN `locationId` is provided, THE system SHALL ignore any location creation fields and use the provided UUID
4. WHEN creating a new location, THE system SHALL associate it with the resolved/created customer from the same row
5. IF a location with matching address already exists for the customer, THE system SHALL reuse that existing location instead of creating a duplicate

### Requirement 3: Customer Resolution Logic

**User Story:** As a fleet operator, I want the system to intelligently find existing customers so that I don't create duplicates during import.

#### Acceptance Criteria
1. WHEN `customerId` is empty AND `customerEmail` is provided, THE system SHALL search for an existing customer with that email address (case-insensitive)
2. IF an existing customer is found by email, THE system SHALL use that customer's ID for the booking
3. IF no existing customer is found by email, THE system SHALL create a new customer with the provided details
4. WHEN `customerId` is empty AND only `customerName` is provided (no email), THE system SHALL search for an exact name match (case-insensitive)
5. IF multiple customers match by name alone, THE system SHALL return a validation error asking for email to disambiguate
6. WHEN creating a new customer, THE system SHALL set status to 'active' by default

### Requirement 4: Location Resolution Logic

**User Story:** As a fleet operator, I want the system to avoid creating duplicate locations for the same customer at the same address.

#### Acceptance Criteria
1. WHEN location fields are provided AND a `customerId` or resolved customer exists, THE system SHALL search for an existing location at that address for that customer
2. IF an existing location matches (same customer, same addressLine1, city, state, postalCode), THE system SHALL reuse that location
3. IF no matching location exists, THE system SHALL create a new location associated with the customer
4. WHEN creating a new location, THE system SHALL set `location_type` to 'client' by default
5. WHEN creating a new location, THE system SHALL set `is_primary` to true if the customer has no other locations
6. IF location address fields are incomplete (missing required fields), THE system SHALL return a validation error

### Requirement 5: Transactional Integrity

**User Story:** As a fleet operator, I want import operations to either fully succeed or fully fail so that I don't end up with partial data.

#### Acceptance Criteria
1. WHEN processing a CSV row that creates customer, location, AND booking, THE system SHALL create all three entities atomically
2. IF any entity creation fails within a row, THE system SHALL rollback all changes for that row
3. THE system SHALL continue processing subsequent rows even if one row fails
4. THE system SHALL report which rows succeeded and which failed with specific error messages
5. WHEN an entire import fails at the database level, THE system SHALL rollback all changes across all rows

### Requirement 6: Geocoding for New Locations

**User Story:** As a fleet operator, I want newly created locations to have latitude/longitude coordinates so they can be used in route planning.

#### Acceptance Criteria
1. WHEN a new location is created via CSV import, THE system SHALL attempt to geocode the address to obtain coordinates
2. IF geocoding succeeds, THE system SHALL store the latitude and longitude on the location record
3. IF geocoding fails, THE system SHALL still create the location but log a warning
4. THE system SHALL NOT block location creation on geocoding failure

### Requirement 7: Error Reporting

**User Story:** As a fleet operator, I want clear error messages when import fails so that I can fix issues in my CSV file.

#### Acceptance Criteria
1. WHEN customer creation fails, THE system SHALL report: "Row N: Failed to create customer - [specific error]"
2. WHEN location creation fails, THE system SHALL report: "Row N: Failed to create location - [specific error]"
3. WHEN customer lookup is ambiguous, THE system SHALL report: "Row N: Multiple customers found with name '[name]'. Please provide customerEmail to disambiguate."
4. WHEN required fields are missing for entity creation, THE system SHALL report which fields are required
5. THE system SHALL include the original CSV row data in error reports for debugging

### Requirement 8: Backward Compatibility

**User Story:** As an existing user, I want my current CSV files with UUIDs to continue working without modification.

#### Acceptance Criteria
1. WHEN a CSV file contains only `customerId` and `locationId` columns (existing format), THE system SHALL process it as before
2. WHEN both `customerId` AND customer creation fields are provided, THE system SHALL use `customerId` and ignore creation fields
3. WHEN both `locationId` AND location creation fields are provided, THE system SHALL use `locationId` and ignore creation fields
4. THE system SHALL NOT require the new customer/location columns to be present

### Requirement 9: CSV Template Update

**User Story:** As a fleet operator, I want an updated CSV template that shows all available columns including the new entity creation fields.

#### Acceptance Criteria
1. THE system SHALL provide a downloadable CSV template with all supported columns
2. THE template SHALL include example data showing both UUID-based and creation-based imports
3. THE template SHALL include header comments explaining each column's purpose
4. THE template SHALL clearly indicate which columns are required vs optional
