# Foreign Key Constraints and Referential Integrity

This document describes the foreign key constraints implemented in the RouteIQ database to ensure referential integrity.

## Overview

The RouteIQ database enforces referential integrity through:
1. **Foreign key constraints** with appropriate cascade behaviors
2. **Validation triggers** for array-based relationships
3. **Check constraints** for data quality
4. **Helper functions** for relationship queries

## Foreign Key Relationships

### 1. Bookings Table

#### bookings.client_id → clients.id
- **Type**: Foreign Key
- **Cascade Behavior**: `ON DELETE RESTRICT`
- **Purpose**: Prevents deletion of clients who have bookings
- **Rationale**: Preserve historical booking data even if client relationship ends

```sql
client_id UUID NOT NULL REFERENCES routeiq.clients(id) ON DELETE RESTRICT
```

**Example**:
- ✅ Create booking with valid client_id
- ❌ Delete client with existing bookings (blocked)
- ✅ Soft delete client (set deleted_at) - bookings remain

#### bookings.service_id → services.id
- **Type**: Foreign Key
- **Cascade Behavior**: `ON DELETE RESTRICT`
- **Purpose**: Prevents deletion of services that have bookings
- **Rationale**: Preserve booking history and service records

```sql
service_id UUID NOT NULL REFERENCES routeiq.services(id) ON DELETE RESTRICT
```

**Example**:
- ✅ Create booking with valid service_id
- ❌ Delete service with existing bookings (blocked)
- ✅ Mark service as discontinued (status = 'discontinued')

#### bookings.vehicle_id → vehicles.id
- **Type**: Foreign Key (Optional)
- **Cascade Behavior**: `ON DELETE SET NULL`
- **Purpose**: Allows vehicle deletion while preserving booking records
- **Rationale**: Vehicle assignments may change; historical data shows "unknown vehicle"

```sql
vehicle_id UUID REFERENCES routeiq.vehicles(id) ON DELETE SET NULL
```

**Example**:
- ✅ Create booking without vehicle_id
- ✅ Create booking with vehicle_id
- ✅ Delete vehicle - booking.vehicle_id set to NULL
- ✅ Reassign booking to different vehicle

#### bookings.parent_booking_id → bookings.id
- **Type**: Self-referencing Foreign Key
- **Cascade Behavior**: `ON DELETE CASCADE`
- **Purpose**: Auto-delete child recurring bookings when parent is deleted
- **Rationale**: Recurring instances shouldn't exist without their parent

```sql
parent_booking_id UUID REFERENCES routeiq.bookings(id) ON DELETE CASCADE
```

**Example**:
- ✅ Create recurring parent booking (weekly service)
- ✅ Create child booking instances with parent_booking_id
- ✅ Delete parent - all child instances automatically deleted
- ❌ Cannot have orphaned child bookings

### 2. Maintenance Schedules Table

#### maintenance_schedules.vehicle_id → vehicles.id
- **Type**: Foreign Key
- **Cascade Behavior**: `ON DELETE CASCADE`
- **Purpose**: Auto-delete maintenance records when vehicle is deleted
- **Rationale**: Maintenance records are meaningless without the vehicle

```sql
vehicle_id UUID NOT NULL REFERENCES routeiq.vehicles(id) ON DELETE CASCADE
```

**Example**:
- ✅ Create maintenance schedule for vehicle
- ✅ Delete vehicle - all maintenance records automatically deleted
- ✅ Export/archive vehicle data before deletion if needed

### 3. Routes Table

#### routes.vehicle_id → vehicles.id
- **Type**: Foreign Key (Optional)
- **Cascade Behavior**: `ON DELETE RESTRICT`
- **Purpose**: Prevents deletion of vehicles assigned to routes
- **Rationale**: Routes need vehicle assignments for execution

```sql
vehicle_id UUID REFERENCES routeiq.vehicles(id) ON DELETE RESTRICT
```

**Example**:
- ✅ Create route with vehicle assignment
- ❌ Delete vehicle with assigned routes (blocked)
- ✅ Unassign vehicle from route first, then delete
- ✅ Update route with different vehicle

#### routes.stop_sequence → bookings.id[] (Array Validation)
- **Type**: Array Validation Trigger
- **Validation**: All booking IDs must exist and not be deleted
- **Purpose**: Ensures route integrity - all stops must be valid bookings
- **Auto-behavior**: Updates `total_stops` count automatically

```sql
CREATE TRIGGER trigger_validate_route_stop_sequence
    BEFORE INSERT OR UPDATE OF stop_sequence ON routeiq.routes
    FOR EACH ROW
    EXECUTE FUNCTION routeiq.validate_route_stop_sequence();
```

**Example**:
- ✅ Create route with valid booking IDs in stop_sequence
- ❌ Create route with non-existent booking ID (validation error)
- ❌ Create route with deleted booking ID (validation error)
- ✅ total_stops auto-calculated from array length

## Future Foreign Key Constraints

When users/drivers tables are created:

### routes.created_by → users.id
- **Planned Type**: Foreign Key
- **Planned Behavior**: `ON DELETE SET NULL`
- **Purpose**: Track route creator, allow user deletion

### routes.assigned_to → drivers.id
- **Planned Type**: Foreign Key
- **Planned Behavior**: `ON DELETE SET NULL`
- **Purpose**: Track driver assignment, allow driver deletion

### vehicles.assigned_driver_id → drivers.id
- **Planned Type**: Foreign Key
- **Planned Behavior**: `ON DELETE SET NULL`
- **Purpose**: Track vehicle-driver assignment, allow driver deletion

## Check Constraints

### Routes Table Data Quality

```sql
-- Time validation
CONSTRAINT routes_valid_planned_times
    CHECK (planned_end_time IS NULL OR planned_start_time IS NULL OR planned_end_time > planned_start_time)

CONSTRAINT routes_valid_actual_times
    CHECK (actual_end_time IS NULL OR actual_start_time IS NULL OR actual_end_time > actual_start_time)

-- Metric validation
CONSTRAINT routes_valid_distance
    CHECK (total_distance_km IS NULL OR total_distance_km >= 0)

CONSTRAINT routes_valid_duration
    CHECK (total_duration_minutes IS NULL OR total_duration_minutes >= 0)

CONSTRAINT routes_valid_optimization_score
    CHECK (optimization_score IS NULL OR (optimization_score >= 0 AND optimization_score <= 100))

-- Capacity validation
CONSTRAINT routes_valid_capacity_weight
    CHECK ((planned_capacity_weight IS NULL OR planned_capacity_weight >= 0) AND
           (actual_capacity_weight IS NULL OR actual_capacity_weight >= 0))

CONSTRAINT routes_valid_capacity_volume
    CHECK ((planned_capacity_volume IS NULL OR planned_capacity_volume >= 0) AND
           (actual_capacity_volume IS NULL OR actual_capacity_volume >= 0))

-- Cost validation
CONSTRAINT routes_valid_costs
    CHECK ((estimated_cost IS NULL OR estimated_cost >= 0) AND
           (actual_cost IS NULL OR actual_cost >= 0))
```

## Helper Functions

### can_delete_booking(booking_uuid UUID)
Checks if a booking can be safely deleted (not referenced in any active route).

```sql
SELECT routeiq.can_delete_booking('booking-uuid-here');
-- Returns: true (can delete) or false (referenced in routes)
```

**Usage**:
```typescript
const canDelete = await supabase.rpc('can_delete_booking', {
  booking_uuid: bookingId
});

if (!canDelete) {
  console.warn('Cannot delete: Booking is assigned to routes');
}
```

### get_routes_for_booking(booking_uuid UUID)
Returns all routes that include a specific booking.

```sql
SELECT * FROM routeiq.get_routes_for_booking('booking-uuid-here');
-- Returns: route_id, route_name, route_date, status
```

**Usage**:
```typescript
const routes = await supabase.rpc('get_routes_for_booking', {
  booking_uuid: bookingId
});

console.log(`Booking is in ${routes.length} routes`);
```

### validate_route_stop_sequence()
Trigger function that validates all booking IDs in stop_sequence exist.

**Automatic behavior**:
- Validates on INSERT/UPDATE of stop_sequence
- Throws error if any booking ID doesn't exist
- Throws error if any booking ID is soft-deleted
- Auto-updates total_stops field

### validate_booking_for_route()
Trigger function that warns about bookings with inappropriate status.

**Automatic behavior**:
- Checks booking status on INSERT/UPDATE of stop_sequence
- Logs warning if booking status is not 'confirmed', 'scheduled', or 'pending'
- Does NOT block the operation (warning only)

## Migration File

**File**: `supabase/migrations/20251228110000_add_referential_integrity_constraints.sql`

**Sections**:
1. Documents existing FK constraints with comments
2. Creates validation functions for array-based relationships
3. Adds check constraints for data integrity
4. Creates performance indexes
5. Creates helper functions for queries
6. Documents future FK constraints

**How to Apply**:

### Option 1: Supabase CLI
```bash
supabase db push
```

### Option 2: Supabase Dashboard
1. Go to SQL Editor
2. Copy migration SQL
3. Execute

### Option 3: Via URL Parameter
```bash
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f supabase/migrations/20251228110000_add_referential_integrity_constraints.sql
```

## Verification

### Automated Tests

**Playwright Test**: `tests/e2e/database-relationships-verification.spec.ts`
- Tests all FK constraints
- Verifies cascade behaviors
- Tests validation triggers
- Checks helper functions

**Standalone Script**: `scripts/verify-foreign-keys.ts`
- Runs without web server
- Tests FK constraints directly
- Provides detailed console output

**Run Tests**:
```bash
# Playwright (requires web server)
npm run test:e2e tests/e2e/database-relationships-verification.spec.ts

# Standalone (no web server needed)
npx ts-node scripts/verify-foreign-keys.ts
```

### Manual Verification

**Check FK constraints**:
```sql
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'routeiq'
ORDER BY tc.table_name, tc.constraint_name;
```

**Check triggers**:
```sql
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'routeiq'
  AND trigger_name LIKE '%validate%'
ORDER BY event_object_table, trigger_name;
```

**Check functions**:
```sql
SELECT
    routine_name,
    routine_type,
    data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'routeiq'
  AND routine_name IN (
    'validate_route_stop_sequence',
    'can_delete_booking',
    'get_routes_for_booking',
    'validate_booking_for_route'
  )
ORDER BY routine_name;
```

## Best Practices

### 1. Deleting Records

**DO**:
- Use soft delete (set `deleted_at`) for most tables
- Check `can_delete_booking()` before deleting bookings
- Unassign vehicles from routes before deleting vehicles
- Mark services as 'discontinued' instead of deleting

**DON'T**:
- Hard delete clients or services with bookings
- Delete vehicles assigned to active routes
- Delete parent bookings without considering child instances

### 2. Creating Relationships

**DO**:
- Validate IDs exist before creating relationships
- Use transactions for multi-table operations
- Check for soft-deleted records (deleted_at IS NULL)
- Provide meaningful error messages

**DON'T**:
- Assume FK violations mean the record doesn't exist (might be soft-deleted)
- Skip validation when building stop_sequence arrays
- Create circular parent-child relationships in bookings

### 3. Updating Relationships

**DO**:
- Validate new IDs before updating FKs
- Consider cascade effects when changing relationships
- Update related records in transactions
- Log relationship changes for audit trail

**DON'T**:
- Update FKs without checking constraints
- Change parent_booking_id on existing child bookings
- Modify stop_sequence without validation

## Troubleshooting

### "foreign key constraint violation"
**Cause**: Trying to delete a record referenced by other tables
**Solution**:
1. Check which tables reference this record
2. Either delete/update the referencing records first
3. Or use soft delete instead of hard delete

### "Invalid stop_sequence: One or more booking IDs do not exist"
**Cause**: stop_sequence contains non-existent or deleted booking IDs
**Solution**:
1. Verify all booking IDs exist: `SELECT id FROM bookings WHERE id = ANY(array['id1', 'id2'])`
2. Check for soft-deleted bookings: `WHERE deleted_at IS NULL`
3. Remove invalid IDs from stop_sequence array

### "update_updated_at_column() does not exist"
**Cause**: Migration ran out of order
**Solution**: Run schema creation migration first:
```bash
supabase db push --file supabase/migrations/20251227070000_create_routeiq_schema.sql
```

## Summary

### Cascade Behaviors at a Glance

| Relationship | Cascade Behavior | Effect |
|---|---|---|
| bookings → clients | RESTRICT | Cannot delete client with bookings |
| bookings → services | RESTRICT | Cannot delete service with bookings |
| bookings → vehicles | SET NULL | Delete vehicle, nullify booking.vehicle_id |
| bookings → parent_booking | CASCADE | Delete parent, delete all children |
| maintenance → vehicles | CASCADE | Delete vehicle, delete all maintenance |
| routes → vehicles | RESTRICT | Cannot delete vehicle with routes |
| routes → bookings (array) | VALIDATED | All booking IDs must exist |

### Protection Level

- **High Protection (RESTRICT)**: clients, services, vehicles (when in use)
- **Medium Protection (SET NULL)**: vehicles (in bookings), optional FKs
- **Low Protection (CASCADE)**: Dependent records (maintenance, child bookings)

### Data Integrity Features

- ✅ 7 Foreign key constraints
- ✅ 4 Validation triggers
- ✅ 8 Check constraints
- ✅ 3 Helper functions
- ✅ Comprehensive indexes
- ✅ Automated tests
- ✅ Complete documentation

