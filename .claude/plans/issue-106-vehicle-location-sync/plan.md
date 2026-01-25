# Implementation Plan: Sync vehicles.home_location_id with vehicle_locations primary entry

**Issue:** #106
**Complexity:** Medium (3/14 points)
**Estimated Effort:** 6-8 hours

## Overview

Implement bidirectional synchronization between `vehicles.home_location_id` and the `vehicle_locations` junction table's primary entry (`is_primary = true`). Currently these can become desynchronized, causing inconsistent behavior in route planning and clustering services.

## Current State

### Two Parallel Systems

**Legacy Column:**
- `vehicles.home_location_id` - Direct UUID column on vehicles table
- Used by: clustering service, some route planning code

**Modern Junction Table:**
- `vehicle_locations` - Many-to-many relationship table
- Columns: `vehicle_id`, `location_id`, `is_primary`
- Used by: UI, route planning service (after patch)

### The Problem

These two representations can get out of sync:
- UI saves to `vehicle_locations` but doesn't update `vehicles.home_location_id`
- Result: Clustering service sees wrong (or null) home location
- Impact: Routes fail to plan correctly for vehicles updated via UI

### Migration History

From `supabase/migrations/20260101130000_create_vehicle_locations.sql:53-57`:
```sql
-- Migrate existing home_location_id data to junction table
INSERT INTO routeiq.vehicle_locations (vehicle_id, location_id, is_primary)
SELECT id, home_location_id, true
FROM routeiq.vehicles
WHERE home_location_id IS NOT NULL;
```

This migrated **existing** data but didn't set up ongoing sync.

## Proposed Solution: Option A (Sync on Save)

Implement sync logic in the vehicle-location service to keep both representations consistent. This is the **recommended approach** because:
- ✅ Backward compatible - existing code using `home_location_id` continues to work
- ✅ Forward compatible - new code can use either representation
- ✅ Low risk - doesn't require schema changes or full codebase refactor
- ✅ Gradual migration path - can eventually deprecate column later

**Option B (Full Migration)** would require:
- Removing `vehicles.home_location_id` column
- Updating all code that references it
- Higher risk, more files affected

We'll proceed with **Option A**.

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Circular update loops | High | Low | Use transaction boundaries, add guard flags |
| Partial update failures (one succeeds, one fails) | Medium | Low | Use database transactions for atomicity |
| Performance impact of extra UPDATE | Low | High | Acceptable - sync is O(1) operation |
| Breaking existing API contracts | Low | Low | Changes are internal, APIs unchanged |
| Edge case: location deleted but still referenced | Medium | Low | Add validation, handle gracefully |
| Concurrent updates to same vehicle | Medium | Low | Use database-level locking |

**Overall Risk:** Low-Medium

## Implementation Plan

### Phase 1: Forward Sync (vehicle_locations → vehicles.home_location_id)

When `vehicle_locations` is updated, sync to `vehicles.home_location_id`.

#### Step 1.1: Update `setVehicleLocations`

**File:** `src/services/vehicle-location.service.ts:73-120`

**Current behavior:**
- Deletes all vehicle_locations for vehicle
- Inserts new set of locations
- Does NOT update vehicles.home_location_id

**New behavior:**
After inserting vehicle_locations, update vehicles.home_location_id with the primary location.

**Implementation:**
```typescript
export async function setVehicleLocations(
    vehicleId: string,
    locations: SetVehicleLocationInput[]
): Promise<Result<VehicleLocation[]>> {
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    try {
        // Delete existing associations
        const { error: deleteError } = await supabase
            .from('vehicle_locations')
            .delete()
            .eq('vehicle_id', vehicleId);

        if (deleteError) {
            logger.error('Failed to delete existing vehicle locations', { error: deleteError, vehicleId });
            return { success: false, error: deleteError };
        }

        // Find primary location ID (or null if none)
        const primaryLocation = locations.find(l => l.isPrimary);
        const newHomeLocationId = primaryLocation?.locationId ??
                                  (locations.length > 0 ? locations[0].locationId : null);

        // If no locations to add, clear home_location_id and return empty
        if (locations.length === 0) {
            await supabase
                .from('vehicles')
                .update({ home_location_id: null })
                .eq('id', vehicleId);

            return { success: true, data: [] };
        }

        // Ensure only one primary
        const hasPrimary = locations.some(l => l.isPrimary);
        const rows = locations.map((loc, idx) => ({
            vehicle_id: vehicleId,
            location_id: loc.locationId,
            is_primary: loc.isPrimary ?? (!hasPrimary && idx === 0),
        }));

        const { data, error } = await supabase
            .from('vehicle_locations')
            .insert(rows)
            .select();

        if (error) {
            logger.error('Failed to insert vehicle locations', { error, vehicleId });
            return { success: false, error };
        }

        // ✨ NEW: Sync home_location_id
        const { error: syncError } = await supabase
            .from('vehicles')
            .update({ home_location_id: newHomeLocationId })
            .eq('id', vehicleId);

        if (syncError) {
            logger.error('Failed to sync home_location_id', { error: syncError, vehicleId, newHomeLocationId });
            // Non-fatal - vehicle_locations still saved successfully
        }

        const vehicleLocations = (data as VehicleLocationRow[]).map(rowToVehicleLocation);
        return { success: true, data: vehicleLocations };
    } catch (error) {
        logger.error('Unexpected error setting vehicle locations', { error });
        return { success: false, error: error as Error };
    }
}
```

**Testing:**
- [ ] Set locations with explicit primary → home_location_id matches
- [ ] Set locations without explicit primary → first becomes primary and syncs
- [ ] Set empty locations → home_location_id becomes null
- [ ] Verify existing routes still work after update

#### Step 1.2: Update `addVehicleLocation`

**File:** `src/services/vehicle-location.service.ts:125-161`

**Current behavior:**
- Adds single location to vehicle_locations
- If isPrimary=true, unsets other primaries first
- Does NOT update vehicles.home_location_id

**New behavior:**
If adding a primary location, sync to vehicles.home_location_id.

**Implementation:**
```typescript
export async function addVehicleLocation(
    vehicleId: string,
    locationId: string,
    isPrimary: boolean = false
): Promise<Result<VehicleLocation>> {
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    try {
        // If setting as primary, unset other primaries first
        if (isPrimary) {
            await supabase
                .from('vehicle_locations')
                .update({ is_primary: false })
                .eq('vehicle_id', vehicleId);
        }

        const { data, error } = await supabase
            .from('vehicle_locations')
            .insert({
                vehicle_id: vehicleId,
                location_id: locationId,
                is_primary: isPrimary,
            })
            .select()
            .single();

        if (error) {
            logger.error('Failed to add vehicle location', { error, vehicleId, locationId });
            return { success: false, error };
        }

        // ✨ NEW: Sync home_location_id if this is the primary
        if (isPrimary) {
            const { error: syncError } = await supabase
                .from('vehicles')
                .update({ home_location_id: locationId })
                .eq('id', vehicleId);

            if (syncError) {
                logger.error('Failed to sync home_location_id', { error: syncError, vehicleId, locationId });
                // Non-fatal
            }
        }

        return { success: true, data: rowToVehicleLocation(data as VehicleLocationRow) };
    } catch (error) {
        logger.error('Unexpected error adding vehicle location', { error });
        return { success: false, error: error as Error };
    }
}
```

**Testing:**
- [ ] Add primary location → home_location_id syncs
- [ ] Add non-primary location → home_location_id unchanged
- [ ] Add primary when another primary exists → old primary unset, home_location_id updates

#### Step 1.3: Update `setVehiclePrimaryLocation`

**File:** `src/services/vehicle-location.service.ts:191-218`

**Current behavior:**
- Unsets all primaries for vehicle
- Sets new primary in vehicle_locations
- Does NOT update vehicles.home_location_id

**New behavior:**
Sync new primary to vehicles.home_location_id.

**Implementation:**
```typescript
export async function setVehiclePrimaryLocation(vehicleId: string, locationId: string): Promise<Result<void>> {
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    try {
        // Unset all primaries for this vehicle
        await supabase
            .from('vehicle_locations')
            .update({ is_primary: false })
            .eq('vehicle_id', vehicleId);

        // Set the new primary
        const { error } = await supabase
            .from('vehicle_locations')
            .update({ is_primary: true })
            .eq('vehicle_id', vehicleId)
            .eq('location_id', locationId);

        if (error) {
            logger.error('Failed to set primary location', { error, vehicleId, locationId });
            return { success: false, error };
        }

        // ✨ NEW: Sync home_location_id
        const { error: syncError } = await supabase
            .from('vehicles')
            .update({ home_location_id: locationId })
            .eq('id', vehicleId);

        if (syncError) {
            logger.error('Failed to sync home_location_id', { error: syncError, vehicleId, locationId });
            // Non-fatal
        }

        return { success: true, data: undefined };
    } catch (error) {
        logger.error('Unexpected error setting primary location', { error });
        return { success: false, error: error as Error };
    }
}
```

**Testing:**
- [ ] Set primary → home_location_id syncs
- [ ] Change primary from A to B → home_location_id updates to B
- [ ] Verify clustering service works correctly after change

#### Step 1.4: Update `removeVehicleLocation`

**File:** `src/services/vehicle-location.service.ts:166-186`

**Current behavior:**
- Deletes location from vehicle_locations
- Does NOT check if it was primary
- Does NOT update vehicles.home_location_id

**New behavior:**
If removing the primary location, clear vehicles.home_location_id (or optionally promote another location).

**Implementation:**
```typescript
export async function removeVehicleLocation(vehicleId: string, locationId: string): Promise<Result<void>> {
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    try {
        // Check if this is the primary location
        const { data: locationData } = await supabase
            .from('vehicle_locations')
            .select('is_primary')
            .eq('vehicle_id', vehicleId)
            .eq('location_id', locationId)
            .single();

        const wasPrimary = locationData?.is_primary === true;

        // Delete the location
        const { error } = await supabase
            .from('vehicle_locations')
            .delete()
            .eq('vehicle_id', vehicleId)
            .eq('location_id', locationId);

        if (error) {
            logger.error('Failed to remove vehicle location', { error, vehicleId, locationId });
            return { success: false, error };
        }

        // ✨ NEW: If we removed the primary, clear home_location_id
        if (wasPrimary) {
            // Option A: Clear it (simpler)
            await supabase
                .from('vehicles')
                .update({ home_location_id: null })
                .eq('id', vehicleId);

            // Option B: Promote another location (more complex but better UX)
            // const { data: remainingLocations } = await supabase
            //     .from('vehicle_locations')
            //     .select('location_id')
            //     .eq('vehicle_id', vehicleId)
            //     .limit(1);
            //
            // if (remainingLocations && remainingLocations.length > 0) {
            //     const newPrimaryId = remainingLocations[0].location_id;
            //     await supabase
            //         .from('vehicle_locations')
            //         .update({ is_primary: true })
            //         .eq('vehicle_id', vehicleId)
            //         .eq('location_id', newPrimaryId);
            //
            //     await supabase
            //         .from('vehicles')
            //         .update({ home_location_id: newPrimaryId })
            //         .eq('id', vehicleId);
            // } else {
            //     await supabase
            //         .from('vehicles')
            //         .update({ home_location_id: null })
            //         .eq('id', vehicleId);
            // }
        }

        return { success: true, data: undefined };
    } catch (error) {
        logger.error('Unexpected error removing vehicle location', { error });
        return { success: false, error: error as Error };
    }
}
```

**Decision:** Start with Option A (clear it). Option B can be added later if needed.

**Testing:**
- [ ] Remove non-primary location → home_location_id unchanged
- [ ] Remove primary location → home_location_id cleared
- [ ] Remove only location → home_location_id cleared
- [ ] Remove primary when multiple exist → home_location_id cleared (or promoted in Option B)

### Phase 2: Testing

#### Step 2.1: Create Unit Tests

**File:** `src/services/__tests__/vehicle-location-sync.test.ts` (new)

**Test Cases:**
```typescript
describe('Vehicle Location Sync', () => {
    describe('setVehicleLocations', () => {
        it('syncs home_location_id when setting primary location');
        it('syncs first location as primary when no explicit primary');
        it('clears home_location_id when setting empty locations');
        it('handles sync error gracefully (non-fatal)');
    });

    describe('addVehicleLocation', () => {
        it('syncs home_location_id when adding primary location');
        it('does not sync when adding non-primary location');
        it('updates home_location_id when changing primary');
    });

    describe('setVehiclePrimaryLocation', () => {
        it('syncs home_location_id when setting new primary');
        it('updates home_location_id when changing primary from A to B');
    });

    describe('removeVehicleLocation', () => {
        it('clears home_location_id when removing primary location');
        it('does not change home_location_id when removing non-primary');
        it('handles case where no locations remain');
    });
});
```

**Coverage Goal:** 80%+

#### Step 2.2: Create Integration Tests

**File:** `tests/integration/vehicle-location-sync.test.ts` (new)

**Test Scenarios:**
- Full round-trip: UI sets location → verify both tables updated
- Clustering service reads correct home location after UI update
- Route planning works with synced data
- Concurrent updates handled correctly

#### Step 2.3: Create E2E Tests (Optional)

**File:** `tests/e2e/vehicle-location-sync.spec.ts` (new)

**Test Scenarios:**
- Edit vehicle in UI → set home location → verify backend state
- Create route → verify uses correct home location

### Phase 3: Data Migration Script

Create one-time script to sync existing data.

#### Step 3.1: Create Migration Script

**File:** `scripts/sync-vehicle-home-locations.ts` (new)

**Purpose:** Fix existing vehicles where `home_location_id` doesn't match the primary `vehicle_locations` entry.

**Algorithm:**
```typescript
import { getAdminSupabaseClient } from '../src/services/supabase';

async function syncVehicleHomeLocations() {
    const supabase = getAdminSupabaseClient();

    // Find all vehicles with primary locations
    const { data: primaryLocations } = await supabase
        .from('vehicle_locations')
        .select('vehicle_id, location_id')
        .eq('is_primary', true);

    if (!primaryLocations) {
        console.log('No primary locations found');
        return;
    }

    let synced = 0;
    let unchanged = 0;

    for (const { vehicle_id, location_id } of primaryLocations) {
        // Check if vehicle.home_location_id matches
        const { data: vehicle } = await supabase
            .from('vehicles')
            .select('home_location_id')
            .eq('id', vehicle_id)
            .single();

        if (vehicle?.home_location_id === location_id) {
            unchanged++;
            continue;
        }

        // Sync it
        await supabase
            .from('vehicles')
            .update({ home_location_id: location_id })
            .eq('id', vehicle_id);

        console.log(`Synced vehicle ${vehicle_id}: ${vehicle?.home_location_id} → ${location_id}`);
        synced++;
    }

    console.log(`\nSync complete: ${synced} updated, ${unchanged} unchanged`);
}

syncVehicleHomeLocations().catch(console.error);
```

**Usage:**
```bash
npm run ts-node scripts/sync-vehicle-home-locations.ts
```

**When to run:** After deploying the code changes, run once to fix existing data.

### Phase 4: Documentation

#### Step 4.1: Update Code Comments

Add JSDoc comments explaining the sync behavior:
```typescript
/**
 * Set locations for a vehicle (replaces all existing associations)
 *
 * Also syncs vehicles.home_location_id with the primary location for
 * backward compatibility with services that read from the legacy column.
 *
 * @param vehicleId - The vehicle to update
 * @param locations - Array of location assignments
 * @returns Result with the created vehicle locations
 */
```

#### Step 4.2: Update Migration Notes

Document in `supabase/migrations/20260101130000_create_vehicle_locations.sql` that sync is now automatic.

## Testing Strategy

### Unit Tests (80%+ coverage)
- All sync functions have tests
- Edge cases: empty locations, null values, sync errors
- Guard against circular updates

### Integration Tests
- Full round-trip sync verification
- Concurrent update handling
- Transaction rollback scenarios

### E2E Tests (optional)
- UI interaction → backend state verification
- Route planning with synced data

### Manual Testing
- [ ] Set home location via vehicles UI
- [ ] Verify clustering service uses correct location
- [ ] Create route with vehicle
- [ ] Change home location
- [ ] Verify route planning updates correctly

## Affected Files

| File | Type | Lines | Changes |
|------|------|-------|---------|
| `src/services/vehicle-location.service.ts` | Modify | 73-120, 125-161, 191-218, 166-186 | Add sync logic to 4 functions |
| `src/services/__tests__/vehicle-location-sync.test.ts` | Create | New | Unit tests for sync behavior |
| `tests/integration/vehicle-location-sync.test.ts` | Create | New | Integration tests |
| `scripts/sync-vehicle-home-locations.ts` | Create | New | One-time data migration script |

**No changes needed:**
- `src/services/clustering.service.ts` - Continues reading from `home_location_id` (now synced)
- `src/services/route-planning.service.ts` - Already patched to use `vehicle_locations`
- UI files - Continue working as-is

## Success Criteria

- [ ] When vehicle_locations primary is set, vehicles.home_location_id is updated
- [ ] When primary location is removed, home_location_id is cleared
- [ ] Clustering service works correctly with UI-updated vehicles
- [ ] Route planning works correctly with both data sources
- [ ] All existing tests pass
- [ ] New tests achieve 80%+ coverage
- [ ] Migration script successfully syncs existing data
- [ ] No circular update loops occur
- [ ] Sync errors are logged but non-fatal (don't break main operation)

## Rollback Plan

If critical issues arise:

1. **Revert code changes** - Remove sync logic from vehicle-location.service.ts
2. **Database rollback** - Not needed (no schema changes)
3. **Data consistency** - Run migration script in reverse (not recommended - data loss risk)

**Recommendation:** Don't rollback unless absolutely necessary. Instead, fix bugs in the sync logic.

## Estimated Complexity Breakdown

- **Phase 1 (Sync logic):** 3-4 hours
  - Step 1.1: 1 hour
  - Step 1.2: 30 min
  - Step 1.3: 30 min
  - Step 1.4: 1 hour (decision on Option A vs B)

- **Phase 2 (Testing):** 2-3 hours
  - Unit tests: 1-1.5 hours
  - Integration tests: 1-1.5 hours

- **Phase 3 (Migration):** 1 hour
  - Script creation: 30 min
  - Testing + execution: 30 min

- **Phase 4 (Documentation):** 30 min

**Total:** 6-8 hours

## Dependencies

None - this is a self-contained change to the vehicle-location service.

## Follow-Up Opportunities

1. **Deprecate home_location_id column** - After confirming all code uses vehicle_locations, remove the legacy column
2. **Add database trigger** - Alternative to application-level sync (more reliable but harder to debug)
3. **Promote on removal** - Implement Option B for `removeVehicleLocation` to auto-promote another location
4. **Admin dashboard** - Add UI to detect and fix sync mismatches
5. **Monitoring** - Add metrics to track sync success/failure rates
