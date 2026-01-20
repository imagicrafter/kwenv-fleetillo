# Comprehensive Data Import & Modernization Plan

## Executive Summary
This plan outlines the strategy to modernize the `locations` schema and implement a robust data import process for the "Grease Trap Pumping" service. It incorporates feedback to handle complex address parsing, client deduplication, and structured metadata extraction from legacy notes.

## Phase 1: Foundation (Backend & Schema)

### Issue 1: [Backend] Schema Enhancements
**Goal**: Enable flexible attribute storage and driver assignments.
**Tasks**:
- [ ] **Migration**: Add columns to `locations` table:
    - `tags` (text[], default `{}`) - For labeling (e.g., 'Imported', 'Priority').
    - `metadata` (jsonb, default `{}`) - For flexible attributes (e.g., `capacity_gallons`, `hose_length`, `requires_tanker`, `service_frequency_weeks`).
    - `preferred_driver_id` (uuid, nullable, FK to `drivers`) - To store the primary driver for a location.
- [ ] **Verification**: Run `npm run db:check` to confirm schema changes.

### Issue 2: [Backend] Service Type Configuration
**Goal**: Ensure the specific service exists for the import to map to.
**Tasks**:
- [ ] Create "Grease Trap Pumping" service in the database if it doesn't exist.
- [ ] Define default metadata schema for this service (optional, but good for UI hints).
- [ ] **Verification**: Ensure `service_id` is available for the import script.

## Phase 2: Frontend Data Management

### Issue 3: [Frontend] Update Location Management Forms
**Goal**: Allow operators to view and edit the new fields.
**Tasks**:
- [ ] **Create/Edit Location Form**:
    - Add **Tags** input (pill selector).
    - Add **Preferred Driver** dropdown.
    - Add **Metadata Editor**:
        - **Standard Fields**: Explicit inputs for `Capacity (Gallons)` and `Service Frequency (Weeks)`.
        - **Generic**: Key-value pair editor for other metadata (e.g., `Hose Length`).
- [ ] **Verification**: Save a location and verify `metadata` column in Supabase.

### Issue 4: [Frontend] Enhanced Lists & Views
**Goal**: Surface the new data in the daily workflow.
**Tasks**:
- [ ] **Location List**: Add columns for "Preferred Driver" and "Tags".
- [ ] **Client Details**: Display metadata summary (e.g., "1500 gal / 4 wks") in the locations card.

## Phase 3: The Import Script (Core Logic)

### Issue 5: [Script] Robust Data Import Implementation
**Goal**: intelligently parse, clean, and import the legacy CSV.

**Detailed Logic Requirements**:

#### 1. Pre-processing & Normalization
- **Client Strategy**:
  - Parse `Client Name` field.
  - **Pattern**: `DKW-{Brand} #{StoreNum}` -> Client Name = `{Brand}`, Location Name = `{Brand} #{StoreNum}`.
  - **Deduplication**: Normalize strings (trim, uppercase) to avoid duplicate Client records.
- **Address Strategy**:
  - **Sanitization**: Remove Customer Name prefixes if present in the Address column (heuristic: if address starts with `DKW-`, strip until first number).
  - **Validation**: Use Google Places API (TextSearch) to standardize the address string before Geocoding.
- **Driver Mapping**:
  - Fuzzy match CSV "Name" column to existing `drivers` table.
  - Warn if no match found (or create placeholder driver if policy allows).

#### 2. Metadata Extraction
- **Notes Parsing**: Extract structured data from free-text notes into `metadata`.
  - Regex for `hose:(\d+)` -> `metadata.hose_length`.
  - Regex for `Tanker:\s*(Yes|No)` -> `metadata.requires_tanker`.
  - Regex for `ServiceTime:\s*(.*)` -> `metadata.preferred_service_time`.
- **Gallons**: Parse dynamic values (e.g., "2- 2000") -> `metadata.capacity_gallons` (store as string or structural JSON if complex).
- **Frequency**: Map CSV weeks -> `metadata.service_frequency_weeks`.

#### 3. Idempotency & Upsert Strategy
- **Client Matching**: By Normalized Name.
- **Location Matching**:
  - Primary: `client_id` + `address_hash`.
  - Secondary: `client_id` + Geospacial check (within 50 meters of existing).
- **Update Logic**:
  - If exists: Merge `metadata`, add 'Imported' tag, update `last_service_date`.
  - If new: Create record.

#### 4. Booking Generation
- **Historical**: If Status = "Closed/Complete", create a past Booking record (for history).
- **Future**: If Status = "Scheduled", create a future Booking record assigned to the matched driver.

## Phase 4: Automation (Future)

### Issue 6: [Backend] Automated Booking Service (Post-Import)
**Goal**: Auto-generate future bookings based on `last_service_date` + `service_frequency_weeks`.
**Tasks**:
- [ ] Scheduled Job (Cron) to scan locations.
- [ ] Logic: If `today > last_service_date + frequency`, create Draft Booking.

## Implementation Order
1. **Issue 1 & 2** (Backend Schema & Setup)
2. **Issue 5** (Import Script - Development & Dry Runs)
3. **Issue 3 & 4** (Frontend Updates - can parallelize with Script)
4. **Issue 6** (Automation - Phase 2)
