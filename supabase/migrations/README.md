# Database Migrations

This directory contains SQL migrations for the RouteIQ database.

## Migration Files

Migrations are executed in chronological order based on their timestamp prefix.

### Migration: 20251228110000_add_referential_integrity_constraints.sql

**Purpose**: Enhance database referential integrity with comprehensive foreign key constraints, validation functions, and helper utilities.

**What it does**:

1. **Documents Existing Foreign Key Constraints**:
   - Adds comments to all existing FK constraints for better understanding
   - Documents cascade behavior (RESTRICT, CASCADE, SET NULL)

2. **Adds Validation for Array-Based Relationships**:
   - Creates `validate_route_stop_sequence()` function
   - Ensures all booking IDs in `routes.stop_sequence` reference valid bookings
   - Auto-updates `total_stops` count based on array length

3. **Adds Check Constraints for Data Integrity**:
   - Route times validation (end > start)
   - Non-negative values for distances, durations, costs, capacities
   - Optimization score range (0-100)

4. **Adds Performance Indexes**:
   - GIN indexes for array lookups
   - Composite indexes for common query patterns
   - Partial indexes on non-deleted records

5. **Creates Helper Functions**:
   - `can_delete_booking(UUID)`: Check if booking can be safely deleted
   - `get_routes_for_booking(UUID)`: Find all routes containing a booking
   - `validate_booking_for_route()`: Warn about invalid booking statuses

## How to Apply Migrations

### Option 1: Using Supabase CLI (Recommended)

```bash
# Make sure you're logged in to Supabase
supabase login

# Link your project (first time only)
supabase link --project-ref vtaufnxworztolfdwlll

# Push migrations to remote database
supabase db push
```

### Option 2: Using Supabase Dashboard (Manual)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/vtaufnxworztolfdwlll
2. Navigate to **SQL Editor** → **New Query**
3. Copy the contents of the migration file
4. Execute the SQL

### Option 3: Using Node.js Script

```bash
# Set your service role key in .env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Run the migration script
npm run build:scripts
node dist/scripts/apply-migration.js
```

## Foreign Key Relationships Summary

### Existing Constraints

1. **bookings.client_id → clients.id** (ON DELETE RESTRICT)
   - Prevents deletion of clients with bookings

2. **bookings.service_id → services.id** (ON DELETE RESTRICT)
   - Prevents deletion of services with bookings

3. **bookings.vehicle_id → vehicles.id** (ON DELETE SET NULL)
   - Allows vehicle deletion, nullifies booking reference

4. **bookings.parent_booking_id → bookings.id** (ON DELETE CASCADE)
   - Deletes child recurring bookings when parent is deleted

5. **maintenance_schedules.vehicle_id → vehicles.id** (ON DELETE CASCADE)
   - Deletes maintenance records when vehicle is deleted

6. **routes.vehicle_id → vehicles.id** (ON DELETE RESTRICT)
   - Prevents deletion of vehicles with assigned routes

7. **routes.stop_sequence → bookings.id** (VALIDATED via trigger)
   - Ensures all booking IDs exist and are not deleted

### Future Constraints (TODO)

When users/drivers tables are created:

- **routes.created_by → users.id**
- **routes.assigned_to → users.id** or **drivers.id**
- **vehicles.assigned_driver_id → drivers.id**

## Verification

After applying the migration, verify it with:

```bash
# Run Playwright tests
npm run test:e2e tests/database-relationships.spec.ts
```

The test suite will verify:
- Foreign key constraints are enforced
- Cascade behaviors work correctly
- Validation functions reject invalid data
- Helper functions return expected results

## Rollback

If you need to rollback this migration, you can:

1. Drop the added functions:
```sql
DROP FUNCTION IF EXISTS routeiq.validate_route_stop_sequence();
DROP FUNCTION IF EXISTS routeiq.can_delete_booking(UUID);
DROP FUNCTION IF EXISTS routeiq.get_routes_for_booking(UUID);
DROP FUNCTION IF EXISTS routeiq.validate_booking_for_route();
```

2. Drop the added constraints:
```sql
ALTER TABLE routeiq.routes DROP CONSTRAINT IF EXISTS routes_valid_planned_times;
ALTER TABLE routeiq.routes DROP CONSTRAINT IF EXISTS routes_valid_actual_times;
-- etc...
```

3. Drop the added indexes:
```sql
DROP INDEX IF EXISTS routeiq.idx_bookings_route_lookup;
DROP INDEX IF EXISTS routeiq.idx_bookings_id_deleted;
DROP INDEX IF EXISTS routeiq.idx_routes_stop_sequence;
```

## Notes

- All migrations use `IF EXISTS` / `IF NOT EXISTS` clauses for idempotency
- Migrations can be safely re-run without causing errors
- The migration does not modify existing data
- RLS policies remain unchanged
