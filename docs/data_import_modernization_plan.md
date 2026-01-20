# Comprehensive Data Import & Modernization Plan

## Executive Summary
This plan outlines the strategy to modernize the `locations` schema and implement a robust data import process for the "Grease Trap Pumping" service (Service Code: `GT-PUMP`). It incorporates feedback to handle complex address parsing, client deduplication, and structured metadata extraction from legacy notes, while respecting the CRM as the source of truth for recurrence handling.

### Source Data Summary
- **File**: `docs/client_artifacts/ExpanedTechDaySheetReport_01_01_2026_03_31_2026.xlsx - Worksheet.csv`
- **Records**: 1,193 rows (bookings/service visits)
- **Unique Customers (Brands)**: 278 (e.g., "Applebee's", "Bojangles", "BCS")
- **Unique Locations (Sites)**: 870 (e.g., "Applebee's #1025138", "BCS - College Park Elementary")
- **Drivers**: 12
- **Date Range**: Q1 2026

### Entity Relationships
```
Customer (1) ──────< Location (many)
   │                    │
   │ e.g., "Applebee's" │ e.g., "Applebee's #1025138"
   │      has 30        │      "Applebee's #1130"
   │      locations     │      "Applebee's #1133"
   │                    │
   └────────────────────┼──────< Booking (many)
                        │           │
                        │           │ e.g., Service visit on 01/08/2026
                        │           │       Service visit on 03/05/2026
```

**Critical**: The CSV `Customer` column contains LOCATION identifiers (e.g., "DKW-Applebee's #1025138"), NOT customer names. The actual customer is the brand extracted from this field.

---

## Phase 1: Foundation (Backend & Schema)

### Issue 0: [Backend] Rename `clients` to `customers` for Terminology Consistency
**Goal**: Align database, code, and UI terminology before import development begins.

**Background**: The database uses `clients` but the UI and business domain use "Customers". This creates confusion during development. Resolving this before the import ensures all new code uses consistent terminology.

**Tasks**:
- [ ] **Database Migration**:
    ```sql
    ALTER TABLE routeiq.clients RENAME TO customers;
    ALTER INDEX idx_clients_status RENAME TO idx_customers_status;
    ALTER INDEX idx_clients_city RENAME TO idx_customers_city;
    ALTER INDEX idx_clients_deleted_at RENAME TO idx_customers_deleted_at;
    ALTER INDEX idx_clients_name RENAME TO idx_customers_name;
    ALTER INDEX idx_clients_email RENAME TO idx_customers_email;
    -- Update FK references in locations table
    ALTER TABLE routeiq.locations RENAME COLUMN client_id TO customer_id;
    -- Update FK references in bookings table
    ALTER TABLE routeiq.bookings RENAME COLUMN client_id TO customer_id;
    ```
- [ ] **TypeScript Types** (`src/types/`):
    - Rename `client.ts` → `customer.ts`
    - Rename types: `Client` → `Customer`, `ClientRow` → `CustomerRow`, `CreateClientInput` → `CreateCustomerInput`, etc.
- [ ] **Service Layer** (`src/services/`):
    - Rename `client.service.ts` → `customer.service.ts`
    - Update all function names and references
- [ ] **Controller** (`src/controllers/`):
    - Rename `client.controller.ts` → `customer.controller.ts`
- [ ] **Routes** (`src/routes/`):
    - Rename `client.routes.ts` → `customer.routes.ts`
    - Update route path: `/api/clients` → `/api/customers`
- [ ] **Update imports** in `src/services/index.ts`, `src/routes/index.ts`, and any other aggregation files
- [ ] **Update tests** to use new terminology
- [ ] **Verify**: Run `npm run build` and `npm test` to confirm no breaking changes

**Acceptance Criteria**:
- [ ] Database table is named `customers`
- [ ] All TypeScript code uses `Customer` terminology
- [ ] API endpoint is `/api/customers`
- [ ] All tests pass
- [ ] UI continues to work (already uses "Customers" labels)

**Estimated Effort**: 1-2 hours

---

### Issue 1: [Backend] Schema Enhancements & Service Configuration
**Goal**: Enable flexible attribute storage, legacy CRM tracking, and ensure service type exists.

**Tasks**:
- [ ] **Migration**: Add columns to `locations` table:
    - `tags` (text[], default `{}`) - For labeling (e.g., 'Imported', 'Needs Review').
    - `metadata` (jsonb, default `{}`) - For **location-specific requirements**, including:
        - `capacity_gallons` (number) - Grease trap capacity at this location
        - `trap_count` (number) - Number of traps at this location
        - `service_frequency_weeks` (number) - How often this location needs service
        - `hose_length_req` (string) - Hose length required to reach the trap
        - `requires_tanker` (boolean) - Whether a tanker truck is needed
        - `preferred_service_time` (string) - Access/timing constraints
        - `capacity_notes` (string) - Complex capacity descriptions
- [ ] **Migration**: Add columns to `bookings` table:
    - `crm_status` (text) - To track the external CRM status (e.g., "SCHEDULED", "COMPLETED").
    - `crm_id` (text, unique) - External Reference ID to prevent duplicate imports.
- [ ] **Service Setup**: Verify/Create "GT-PUMP" service (name, code, average duration).
    - *Note: The service type only defines WHAT work is done. Site-specific requirements are stored on each Location.*
- [ ] **Drivers Setup**: Verify `drivers` table exists with `first_name`, `last_name`, `status` fields. Pre-create the 12 drivers from CSV if they don't exist:
    - Amari Dinkins, Jiro Prioleau, William Emerson, Jamel Lloyd
    - John Elledge, Travis Menius, CHRLS Route, Upstate Route 2
    - OuterBanks Route, MB Route, Augusta Route, WNC Route

**Acceptance Criteria**:
- [ ] Migration runs without errors
- [ ] `npm run db:check` passes
- [ ] GT-PUMP service exists in database
- [ ] All 12 drivers exist in drivers table

---

## Phase 2: Frontend Data Management

### Issue 2: [Frontend] Update Location Management Forms
**Goal**: Allow operators to view and edit the new fields.

**Tasks**:
- [ ] **Create/Edit Location Form**:
    - **Customer Labeling**: Ensure UI refers to "Clients" table as "Customers".
    - **Tags Input**: Pill selector for `tags`.
    - **Location Requirements Editor** (stored in `metadata` JSONB):
        - **Standard Fields**: Explicit inputs for:
            - `Capacity (Gallons)` - trap size at this location
            - `Trap Count` - number of traps
            - `Service Frequency (Weeks)` - how often this location needs service
        - **Access Requirements**:
            - `Hose Length Required` - equipment needed to reach trap
            - `Requires Tanker` - checkbox
            - `Preferred Service Time` - access/timing constraints
        - **Flexible Attributes**: Key-value editor for other location-specific requirements.
- [ ] **Address Validation**: Ensure the form uses Google Places Autocomplete to save standardized addresses and coordinates.

**Acceptance Criteria**:
- [ ] Can create location with tags and metadata
- [ ] Metadata persists correctly in Supabase
- [ ] Address autocomplete populates lat/lon

### Issue 3: [Frontend] Enhanced Lists & Views
**Goal**: Surface the new data in the daily workflow.

**Tasks**:
- [ ] **Location List**: Add columns for "Tags" and "Capacity".
- [ ] **Customer (Client) Details**: Display metadata summary (e.g., "1500 gal / 4 wks") in the locations card.

**Acceptance Criteria**:
- [ ] Location list shows Tags and Capacity columns
- [ ] Client detail page shows location metadata

---

## Phase 3: The Import Script (Core Logic)

### Issue 4: [Script] CSV Parser & Data Normalization
**Goal**: Parse and clean the legacy CSV data.

**Tasks**:

#### 1. Customer & Location Parsing Strategy

**Critical Distinction:**
- The CSV `Customer` column contains **LOCATION identifiers**, not customer names
- The actual **Customer (Client)** is the BRAND extracted from this field
- Multiple locations belong to a single customer

- [ ] **Source**: `Customer` column (e.g., `DKW-{Brand} #{StoreNum}`)
- [ ] **Two-Step Parsing**:
    ```
    Step 1: Extract CUSTOMER (Brand)
      1. Strip "DKW-" prefix
      2. If "#" exists: Brand = text before "#"
      3. Else if " - " exists: Brand = text before " - "
      4. Else: Brand = full remaining string

    Step 2: Extract LOCATION name
      - Location Name = full string after "DKW-" prefix
    ```
- [ ] **Examples**:
    | CSV Customer Field | → Customer (Brand) | → Location Name |
    |--------------------|-------------------|-----------------|
    | `DKW-Applebee's #1025138` | Applebee's | Applebee's #1025138 |
    | `DKW-Applebee's #1130` | Applebee's | Applebee's #1130 |
    | `DKW-BCS - College Park Elementary` | BCS | BCS - College Park Elementary |
    | `DKW-BCS - H.E. Bonner Elementary` | BCS | BCS - H.E. Bonner Elementary |
    | `DKW-Doc's BBQ` | Doc's BBQ | Doc's BBQ |
- [ ] **Customer Deduplication**: Normalize brand names (trim, uppercase) before matching.
    - "Applebee's" and "APPLEBEE'S" → same customer record
- [ ] **Location Uniqueness**: Unique by `customer_id` (FK) + `location_name` (normalized).
    - Prevents creating duplicate locations for the same customer

#### 2. Address Normalization
- [ ] **Sanitization**: Remove `DKW-{...}` prefix if present in address string.
- [ ] **Validation Pipeline**:
    1. Run Google Places TextSearch with raw address.
    2. Accept result if confidence > threshold.
    3. **Fallback**: Flag for manual review (Tag: 'Needs Review').
- [ ] **Rate Limiting**: 200ms delay between geocoding calls.

#### 3. Notes Field Extraction → Location Requirements
- [ ] **Regex Patterns** (extract into `locations.metadata`):
    | Pattern | Target Field | Description |
    |---------|--------------|-------------|
    | `hose:(\d+)` | `metadata.hose_length_req` | Equipment needed to reach trap |
    | `Tanker:\s*(Yes\|No)` | `metadata.requires_tanker` | Whether tanker truck required |
    | `ServiceTime:\s*(.+?)(?=hose:\|Tanker:\|$)` | `metadata.preferred_service_time` | Access/timing constraints |
- [ ] **Notes Preservation**: After extraction, store remaining text (location hints, contact info) in `locations.notes`.

#### 4. Gallons Field Parsing → Location Capacity
- [ ] **Standard**: Direct number → `locations.metadata.capacity_gallons` (trap size at this location)
- [ ] **Multi-Trap**: Pattern `(\d+)-\s*(\d+)` (e.g., "2- 2000") →
    ```json
    { "trap_count": 2, "capacity_gallons": 2000 }
    ```
- [ ] **Complex Text**: Store raw value in `locations.metadata.capacity_notes` and add Tag: 'Needs Review'.

#### 5. Driver Matching
- [ ] Fuzzy match CSV "Name" column to `drivers.first_name + ' ' + drivers.last_name`.
- [ ] Store matched `driver_id` for historical booking attribution.
- [ ] Log warning if no match found.

**Acceptance Criteria**:
- [ ] 278 unique customers (brands) extracted correctly
- [ ] 870 unique locations parsed and linked to correct customer
- [ ] All addresses normalized or flagged for review
- [ ] Notes extraction produces valid metadata
- [ ] Multi-trap gallons handled correctly

---

### Issue 5: [Script] Database Upsert & Booking Generation
**Goal**: Idempotently load data into the database.

**Tasks**:

#### 1. Order of Operations
```
1. Customers (Clients) - 278 brand records (e.g., "Applebee's", "Bojangles")
   ↓
2. Locations - 870 site records, each linked to ONE customer via client_id
   ↓
3. Bookings - 1,193 service records, each linked to ONE location via location_id
```

**Relationship Enforcement:**
- Each Location MUST have a valid `customer_id` (FK to customers)
- Each Booking MUST have a valid `location_id` (FK to locations)
- Never create duplicate customers for the same brand
- Never create duplicate locations for the same customer+site

#### 2. Idempotency Strategy
- [ ] **Customer Matching**: By normalized name (e.g., "APPLEBEES").
- [ ] **Location Matching**:
    - Primary: `customer_id` + `address_hash` (SHA256 of normalized address)
    - Secondary: `customer_id` + geospatial check (within 50m)
- [ ] **Booking Matching**: By `crm_id` (unique constraint prevents duplicates).
- [ ] **CRM ID Generation**:
    ```
    crm_id = SHA256(customer + "|" + location + "|" + date + "|" + driver)
    Example: SHA256("DKW-Bojangles #542|1045 S Lake Blvd...|2026-01-01|Amari Dinkins")
    ```

#### 3. Update Logic
- [ ] **Locations**: If exists, merge location requirements into `metadata` (don't overwrite verified coordinates or existing non-empty metadata values), add 'Imported' tag.
- [ ] **Bookings**: Skip if `crm_id` already exists.

#### 4. Booking Generation
- [ ] **Date Mapping**: `Job/Est Date` → `bookings.scheduled_date`
- [ ] **Status Mapping**:
    | CSV Status | App Status | CRM Status | Notes |
    |------------|------------|------------|-------|
    | `Scheduled` | `confirmed` | SCHEDULED | Ready for routing |
    | `Dispatched` | `scheduled` | DISPATCHED | Assigned but not sent to driver |
    | `Closed and Complete` | `completed` | COMPLETED | Historical record |
    | `Completed` | `completed` | COMPLETED | Historical record |
- [ ] **Historical Bookings**: For `completed` status, also set `actual_start_time` = `scheduled_date`.
- [ ] **Service Type**: Always link to `GT-PUMP` service.
- [ ] **Driver Attribution**: For historical bookings, assign matched `driver_id` if available.

**Acceptance Criteria**:
- [ ] Exactly 278 customers created (no duplicates on re-run)
- [ ] Exactly 870 locations created, each linked to correct customer
- [ ] All 1,193 bookings created with correct status and location linkage
- [ ] Re-running import creates 0 new records (idempotent)
- [ ] Spot check: "Applebee's" customer has exactly 30 locations
- [ ] Spot check: "Bojangles" customer has exactly 222 locations
- [ ] Locations tagged 'Needs Review' have clear issues logged

---

## Implementation Order

```
1. Issue 0 (Rename clients → customers)
   ↓
2. Issue 1 (Backend Schema & Setup)
   ↓
3. Issue 4 (CSV Parser - can develop offline)
   ↓
4. Issue 5 (Database Upsert - requires Issue 1)
   ↓
5. Issues 2 & 3 (Frontend - can parallelize after Issue 1)
```

**Dependencies:**
- Issue 0 must complete before any other work (terminology foundation)
- Issue 1 must complete before Issue 5 (schema changes needed for upsert)
- Issue 4 can be developed in parallel with Issue 1 (parser is standalone)
- Issues 2 & 3 can be developed in parallel after Issue 1

---

## Appendix: Data Patterns Reference

### Customer vs Location Parsing Examples
```
CSV "Customer" Field              → Customer (Brand)    → Location Name
─────────────────────────────────────────────────────────────────────────
DKW-Applebee's #1025138          → Applebee's          → Applebee's #1025138
DKW-Applebee's #1130             → Applebee's          → Applebee's #1130
DKW-BCS - College Park Elementary → BCS                 → BCS - College Park Elementary
DKW-BCS - H.E. Bonner Elementary  → BCS                 → BCS - H.E. Bonner Elementary
DKW-Bojangles #542               → Bojangles           → Bojangles #542
DKW-Doc's BBQ                    → Doc's BBQ           → Doc's BBQ
```

### Top Customers by Location Count
| Customer (Brand) | Location Count |
|------------------|----------------|
| Bojangles | 222 |
| Buffalo Wild Wings | 33 |
| Applebee's | 30 |
| Burger King | 29 |
| Hardee's | 28 |
| BCS (Berkeley County Schools) | 25 |
| SCDC | 23 |
| Red Robin | 20 |
| Taco Bell | 20 |
| DSD2 | 19 |

### Address Variations
```
"505 N Belair Rd Evans, GA 30809"                    → Clean
"437 Killian Rd Columbia, South Carolina 29203-9608" → State spelled out
"DKW-Biscuitville #2232715 Clemson Road Columbia, SC 29229" → Has prefix
"MIDWAY PARK NC 28544 MIDWAY PARK, NC 28544"        → Duplicated city
```

### Notes Field Structured Data
```
"hose:30 Tanker: Yes  ServiceTime: pump before 11 AM"
"hose:50 Tanker: NO  ServiceTime: EARLY AS POSSIBLE"
"back center in mulch hose: Tanker:   ServiceTime:"
"Call location to schedule or email vrussell@hghosp.com ahead of time"
```

### Multi-Value Gallons
```
"2- 2000 gallon traps"           → trap_count: 2, capacity_gallons: 2000
"2- 1500"                        → trap_count: 2, capacity_gallons: 1500
"1500 outside ... and 150 inside" → capacity_notes: (raw), Needs Review tag
```

### Frequency Distribution
| Weeks | Count | Percentage |
|-------|-------|------------|
| 12 | 604 | 51% |
| 16 | 211 | 18% |
| 8 | 134 | 11% |
| 4 | 86 | 7% |
| 18 | 55 | 5% |
| Other | 103 | 8% |
