# Implementation Plan: Sync vehicles.home_location_id with vehicle_locations primary entry

**Issue:** #106
**Tier:** Medium (bug)
**Estimated Effort:** 4-6 hours

## Overview

Ensure `vehicles.home_location_id` stays in sync with the `vehicle_locations` junction table's primary entry (`is_primary = true`). The UI saves to `vehicle_locations`, but the clustering service reads from `vehicles.home_location_id`. Without sync, route planning clustering fails for vehicles whose location was updated via the UI.

## Current State Analysis

### Sync Helper Already Exists

The `vehicle-location.service.ts` file already contains a `syncVehicleHomeLocation` helper (lines 253-267) and it is already called from all four mutation functions:

| Function | Calls syncVehicleHomeLocation? | Notes |
|----------|-------------------------------|-------|
| `setVehicleLocations` | Yes (line 119) | Syncs primary after insert |
| `addVehicleLocation` | Yes (line 170) | Syncs when isPrimary=true |
| `removeVehicleLocation` | Yes (line 205) | Clears when primary was removed |
| `setVehiclePrimaryLocation` | Yes (line 241) | Syncs new primary |

### The Actual Problem

Despite the sync helper existing, there are **remaining gaps**:

1. **Silent failure with no Result propagation**: `syncVehicleHomeLocation` catches errors silently. If the sync fails, the caller has no idea -- this can leave data inconsistent without any trace in the `Result<T>`.

2. **No error logging for the actual sync UPDATE result**: The helper does `await supabase.from('vehicles').update(...)` but doesn't check the Supabase `.error` response (only catches thrown exceptions via try/catch). A Supabase query error (e.g., RLS policy blocking the update) would be silently swallowed.

3. **setVehicleLocations edge case**: Lines 117-123 have a guard for `locations.length === 0` that calls `syncVehicleHomeLocation(supabase, vehicleId, null)` to clear the home location. However, the `primaryLoc` check on line 120 is dead code because `locations.length === 0` is checked first (lines 92-94 return early before line 120 is reached). The sync on line 119 only fires when a primary exists. If all locations are removed and none was primary, `home_location_id` is NOT cleared.

4. **No existing data migration**: Vehicles that were updated via UI before the sync was added may have stale `home_location_id` values that don't match `vehicle_locations.is_primary`.

5. **Unit tests use fragile Supabase mock chains**: The existing test file at `src/services/__tests__/vehicle-location.service.test.ts` has complex mock chains that are brittle and may not accurately reflect real behavior.

6. **Clustering service reads homeLocationId without fallback**: `clustering.service.ts` lines 204-213 skip vehicles entirely if `vehicle.homeLocationId` is falsy. If sync failed silently, those vehicles become invisible to route planning.

### Earlier Plan (Outdated)

A plan file exists at `.claude/plans/issue-106-vehicle-location-sync/plan.md` but was drafted before the sync helper was added. This new plan supersedes it and reflects the actual code state.

## Proposed Solution: Option A (Harden Existing Sync)

Since the sync mechanism already exists, the work is to **harden it**, fix edge cases, add proper error propagation, provide a data migration script, and ensure adequate test coverage.

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Silent sync failures hide data inconsistency | High | Medium | Return sync errors in Result, add structured logging |
| Stale data in production from pre-sync period | Medium | High | One-time migration script |
| Performance impact of extra UPDATE | Low | High | Acceptable -- single row update |
| Breaking existing API contracts | Low | Low | Changes are internal, APIs unchanged |
| Clustering skips vehicles with null homeLocationId | High | Medium | Add fallback to query vehicle_locations if null |

**Overall Risk:** Low-Medium

## Implementation Plan

### Phase 1: Harden syncVehicleHomeLocation Helper

**File:** `src/services/vehicle-location.service.ts`

#### Step 1.1: Improve syncVehicleHomeLocation error handling

**Current code (lines 253-267):**
```typescript
async function syncVehicleHomeLocation(
    supabase: GenericSupabaseClient,
    vehicleId: string,
    primaryLocationId: string | null
): Promise<void> {
    try {
        await supabase
            .from('vehicles')
            .update({ home_location_id: primaryLocationId })
            .eq('id', vehicleId);
    } catch (error) {
        logger.error('Failed to sync vehicle home location', { error, vehicleId, primaryLocationId });
        // Non-blocking error
    }
}
```

**Changes:**
- Check the Supabase `.error` response (not just thrown exceptions).
- Log both the Supabase error and the caught exception path.
- Return a boolean indicating success/failure so callers can optionally warn.

**New signature:**
```typescript
async function syncVehicleHomeLocation(
    supabase: GenericSupabaseClient,
    vehicleId: string,
    primaryLocationId: string | null
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('vehicles')
            .update({ home_location_id: primaryLocationId })
            .eq('id', vehicleId);

        if (error) {
            logger.error('Failed to sync vehicle home_location_id', {
                vehicleId,
                primaryLocationId,
                supabaseError: error.message,
                code: error.code,
            });
            return false;
        }

        logger.debug('Synced vehicle home_location_id', { vehicleId, primaryLocationId });
        return true;
    } catch (error) {
        logger.error('Unexpected error syncing vehicle home_location_id', {
            error,
            vehicleId,
            primaryLocationId,
        });
        return false;
    }
}
```

**Key principle:** Sync errors remain non-fatal (do not fail the main operation) but are now properly logged and detectable.

#### Step 1.2: Fix setVehicleLocations empty-locations edge case

**Current code (lines 92-94, 117-123):**
```typescript
// Line 92-94: returns early if locations.length === 0
if (locations.length === 0) {
    return { success: true, data: [] };
}

// Line 117-123: dead code for the empty case
const primaryLoc = vehicleLocations.find(l => l.isPrimary);
if (primaryLoc) {
    await syncVehicleHomeLocation(supabase, vehicleId, primaryLoc.locationId);
} else if (locations.length === 0) {
    await syncVehicleHomeLocation(supabase, vehicleId, null);
}
```

**Fix:** Move the sync-to-null call BEFORE the early return for empty locations.

```typescript
if (locations.length === 0) {
    await syncVehicleHomeLocation(supabase, vehicleId, null);
    return { success: true, data: [] };
}
```

And simplify the post-insert sync:
```typescript
const primaryLoc = vehicleLocations.find(l => l.isPrimary);
if (primaryLoc) {
    await syncVehicleHomeLocation(supabase, vehicleId, primaryLoc.locationId);
}
```

### Phase 2: Add Clustering Fallback

**File:** `src/services/clustering.service.ts`

#### Step 2.1: Optional -- Add vehicle_locations fallback in route-planning

The clustering service's `clusterBookingsByDepot` function (lines 204-213) skips vehicles without `homeLocationId`. While the sync fix should prevent this, a defensive fallback would add resilience.

**Current code:**
```typescript
for (const vehicle of vehicles) {
    if (!vehicle.homeLocationId) {
        logger.warn('Vehicle has no home location, skipping', { vehicleId: vehicle.id });
        continue;
    }
    // ...
}
```

**This is a read-only consumer** -- it receives Vehicle objects from the caller (route-planning.service.ts). The fix belongs in the caller, not in the clustering service itself.

**In `route-planning.service.ts` (createTimeAwareAllocation, line 279):**

The route-planning service already fetches `vehicle.homeLocationId` for depot lookups. If sync is working correctly, this will always be populated. As a **future enhancement**, the caller could fall back to querying `vehicle_locations` when `homeLocationId` is null, but this is not required for the immediate fix since Phase 1 ensures sync works.

**Decision:** Skip this for now. Document as a follow-up enhancement. The sync fix in Phase 1 is the proper solution.

### Phase 3: Data Migration Script

**File:** `scripts/sync-vehicle-home-locations.ts` (new)

Create a one-time script to fix existing data where `home_location_id` is out of sync with `vehicle_locations.is_primary`.

**Algorithm:**
1. Query all `vehicle_locations` where `is_primary = true`.
2. For each, check if the corresponding `vehicles.home_location_id` matches.
3. If not, update it.
4. Also check for vehicles that have `home_location_id` set but NO matching primary in `vehicle_locations` -- insert the junction record.
5. Log all changes.

**Implementation outline:**
```typescript
import { initializeSupabase, getAdminSupabaseClient } from '../src/services/supabase';
import { createContextLogger } from '../src/utils/logger';

const logger = createContextLogger('SyncVehicleHomeLocations');

async function syncVehicleHomeLocations(): Promise<void> {
    await initializeSupabase();
    const supabase = getAdminSupabaseClient();
    if (!supabase) {
        logger.error('Admin client not available');
        return;
    }

    // Direction 1: vehicle_locations (primary) -> vehicles.home_location_id
    const { data: primaryLocations } = await supabase
        .from('vehicle_locations')
        .select('vehicle_id, location_id')
        .eq('is_primary', true);

    let syncedForward = 0;

    for (const { vehicle_id, location_id } of primaryLocations || []) {
        const { data: vehicle } = await supabase
            .from('vehicles')
            .select('home_location_id')
            .eq('id', vehicle_id)
            .single();

        if (vehicle?.home_location_id !== location_id) {
            await supabase
                .from('vehicles')
                .update({ home_location_id: location_id })
                .eq('id', vehicle_id);
            logger.info('Forward sync', {
                vehicleId: vehicle_id,
                oldHomeLocationId: vehicle?.home_location_id,
                newHomeLocationId: location_id,
            });
            syncedForward++;
        }
    }

    // Direction 2: vehicles.home_location_id -> vehicle_locations (if missing)
    const { data: vehiclesWithHome } = await supabase
        .from('vehicles')
        .select('id, home_location_id')
        .not('home_location_id', 'is', null)
        .is('deleted_at', null);

    let syncedReverse = 0;

    for (const vehicle of vehiclesWithHome || []) {
        const { data: existing } = await supabase
            .from('vehicle_locations')
            .select('id')
            .eq('vehicle_id', vehicle.id)
            .eq('location_id', vehicle.home_location_id)
            .single();

        if (!existing) {
            // Unset any existing primaries first
            await supabase
                .from('vehicle_locations')
                .update({ is_primary: false })
                .eq('vehicle_id', vehicle.id);

            await supabase
                .from('vehicle_locations')
                .insert({
                    vehicle_id: vehicle.id,
                    location_id: vehicle.home_location_id,
                    is_primary: true,
                });
            logger.info('Reverse sync', {
                vehicleId: vehicle.id,
                locationId: vehicle.home_location_id,
            });
            syncedReverse++;
        }
    }

    logger.info('Sync complete', { syncedForward, syncedReverse });
}

syncVehicleHomeLocations().catch((error) => {
    logger.error('Sync script failed', error);
    process.exit(1);
});
```

**When to run:** After deploying Phase 1 code changes. Run once in production.

### Phase 4: Testing

#### Step 4.1: Update Existing Unit Tests

**File:** `src/services/__tests__/vehicle-location.service.test.ts`

The existing test file tests sync behavior but has fragile mock chains. Refactor to:
- Validate `syncVehicleHomeLocation` is called with correct arguments.
- Test the empty-locations edge case fix.
- Test sync failure handling (non-fatal behavior).

**New/updated test cases:**
```
describe('VehicleLocationService Home Location Sync', () => {
    describe('setVehicleLocations', () => {
        it('syncs home_location_id when setting primary location');
        it('syncs first location as primary when no explicit primary set');
        it('clears home_location_id when setting empty locations'); // BUG FIX
        it('handles sync error gracefully without failing main operation');
    });

    describe('addVehicleLocation', () => {
        it('syncs home_location_id when adding primary location');
        it('does NOT sync when adding non-primary location');
    });

    describe('setVehiclePrimaryLocation', () => {
        it('syncs home_location_id when changing primary');
    });

    describe('removeVehicleLocation', () => {
        it('clears home_location_id when removing primary location');
        it('does NOT clear home_location_id when removing non-primary');
    });
});
```

**Coverage Goal:** 80%+ on vehicle-location.service.ts

#### Step 4.2: Integration Test

**File:** `tests/unit/vehicle-location-sync.test.ts` (new)

Test the full round-trip against real Supabase:
1. Create a vehicle with `home_location_id` set.
2. Use `setVehicleLocations` to change primary.
3. Re-read vehicle and verify `home_location_id` updated.
4. Use `removeVehicleLocation` on primary.
5. Re-read vehicle and verify `home_location_id` is null.
6. Clean up test data.

## Affected Files

| File | Action | Changes |
|------|--------|---------|
| `src/services/vehicle-location.service.ts` | Modify | Harden syncVehicleHomeLocation, fix empty-locations edge case |
| `src/services/__tests__/vehicle-location.service.test.ts` | Modify | Update tests, add edge case coverage |
| `scripts/sync-vehicle-home-locations.ts` | Create | One-time data migration script |
| `tests/unit/vehicle-location-sync.test.ts` | Create | Integration test for sync round-trip |

**No changes needed:**
- `src/services/clustering.service.ts` -- Reads `homeLocationId` which will now be reliably synced.
- `src/services/route-planning.service.ts` -- Already uses `getVehiclePrimaryLocation` with fallback to `homeLocationId`.
- `src/types/vehicle.ts` -- No type changes needed.
- `src/types/vehicle-location.ts` -- No type changes needed.
- UI files -- Continue working as-is.
- Database schema -- No migration needed (both columns already exist).

## Success Criteria

- [ ] `syncVehicleHomeLocation` checks Supabase `.error` response and logs failures
- [ ] `setVehicleLocations([])` correctly clears `home_location_id` (edge case fix)
- [ ] All four mutation functions sync `home_location_id` correctly
- [ ] Sync errors are non-fatal but logged at `error` level
- [ ] Migration script fixes existing data inconsistencies
- [ ] Unit tests cover sync behavior including edge cases (80%+ coverage)
- [ ] Integration test verifies full round-trip sync
- [ ] Clustering service correctly processes vehicles after sync
- [ ] All existing tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)

## Rollback Plan

If critical issues arise:
1. **Revert code changes** -- The sync helper already existed; reverting would restore the current (slightly broken) behavior.
2. **Database rollback** -- Not needed (no schema changes).
3. **Data fix** -- Re-run migration script to reconcile data.

## Estimated Complexity Breakdown

| Phase | Effort | Description |
|-------|--------|-------------|
| Phase 1: Harden sync helper + fix edge case | 1-2 hours | Small code changes, careful testing |
| Phase 2: Clustering fallback (deferred) | 0 hours | Documented as follow-up |
| Phase 3: Data migration script | 1 hour | Script creation + manual testing |
| Phase 4: Testing | 2-3 hours | Unit + integration tests |
| **Total** | **4-6 hours** | |

## Follow-Up Opportunities

1. **Clustering fallback** -- If `homeLocationId` is null, query `vehicle_locations` as fallback in route-planning.
2. **Database trigger** -- Add a PostgreSQL trigger to auto-sync, removing dependency on application code.
3. **Deprecate home_location_id** -- Once all consumers use `vehicle_locations`, remove the legacy column.
4. **Monitoring** -- Add a scheduled job to detect sync mismatches and alert.
5. **Archive old plan** -- Remove `.claude/plans/issue-106-vehicle-location-sync/` since this plan supersedes it.
