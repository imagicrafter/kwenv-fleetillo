# Plan: Issue #89 - Deprecate Legacy service_id Column

## Overview

Remove the deprecated `service_id` column from the bookings table and migrate all dependent code to use the `service_ids` array. This completes the migration from single-service to multi-service booking support.

## Scope

- Remove deprecated TypeScript fields (`serviceId`, `service_id`)
- Update all services referencing the legacy column
- Clean up migration scripts
- Drop database column (final step after code deployment)

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Route cost calculations break | MEDIUM | Refactor joins to use service_ids array with proper lookups |
| Dispatch service breaks | MEDIUM | Coordinated update of external service |
| Database migration order | HIGH | Deploy code FIRST, then run migration |
| Data integrity loss | LOW | Existing backfill script has migrated data; verify first |

## Affected Files

### Type Definitions
| File | Changes |
|------|---------|
| `src/types/booking.ts` | Remove deprecated `serviceId`, `service_id` properties |

### Core Services
| File | Changes |
|------|---------|
| `src/services/booking.service.ts` | Remove service_id validation and queries |
| `src/services/route-cost.service.ts` | Refactor joins at lines 119-122, 163-166, 241-244 |
| `src/services/route-planning.service.ts` | Update service type grouping |

### External Service
| File | Changes |
|------|---------|
| `dispatch-service/src/db/entities.repository.ts` | Remove service_id references (lines 72, 527-528) |

### Tests
| File | Changes |
|------|---------|
| `tests/unit/services/route-planning.service.test.ts` | Update mock data |

### Scripts (Cleanup)
| File | Action |
|------|--------|
| `src/scripts/backfill-service-ids.ts` | DELETE - no longer needed |
| `src/scripts/diagnose-vehicle-services.ts` | Update to use service_ids |
| `src/scripts/seed-legacy.ts` | Update to use service_ids |

### Database
- Drop FK constraint: `bookings.service_id -> services.id`
- Drop index: `idx_bookings_service_id`
- Affected schemas: fleetillo, routeiq, optiroute

## Implementation Phases

### Phase 1: Verification

1. Run verification query to ensure all bookings have `service_ids` populated
2. Document any bookings with NULL or empty `service_ids`
3. Fix any data issues before proceeding

```sql
SELECT COUNT(*) FROM bookings
WHERE service_ids IS NULL OR array_length(service_ids, 1) IS NULL;
```

### Phase 2: Type Updates

1. Update `src/types/booking.ts`:
   - Remove `serviceId?: string` property
   - Remove `service_id?: string` property
   - Update any JSDoc comments

### Phase 3: Service Updates

1. **booking.service.ts**:
   - Remove `service_id` from INSERT/UPDATE queries
   - Remove validation for service_id field
   - Update any SELECT queries

2. **route-cost.service.ts**:
   - Refactor `getRouteCosts()` to join via `service_ids` array
   - Use `ANY(service_ids)` or lateral join patterns
   - Maintain calculation accuracy

3. **route-planning.service.ts**:
   - Update service grouping logic
   - Use `service_ids[1]` or appropriate array access

### Phase 4: Dispatch Service

1. Update `dispatch-service/src/db/entities.repository.ts`:
   - Line 72: Remove from SELECT clause
   - Lines 527-528: Remove from query logic
2. Deploy dispatch service changes

### Phase 5: Test Updates

1. Update mock data in test files
2. Remove any `serviceId` or `service_id` from test fixtures
3. Ensure all tests pass

### Phase 6: Script Cleanup

1. Delete `src/scripts/backfill-service-ids.ts`
2. Update `diagnose-vehicle-services.ts` if needed
3. Update `seed-legacy.ts` to use `service_ids`

### Phase 7: Database Migration (LAST)

**IMPORTANT: Only run after ALL code changes are deployed**

```sql
-- Migration: drop_service_id_column
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_id_fkey;
DROP INDEX IF EXISTS idx_bookings_service_id;
ALTER TABLE bookings DROP COLUMN service_id;
```

## Testing Requirements

### Unit Tests
- Booking service operations without service_id
- Route cost calculations with service_ids array
- Route planning service grouping

### Integration Tests
- Create booking with only service_ids
- Update booking without service_id
- Route cost API returns correct values
- Dispatch service functions correctly

### Regression Tests
- Verify existing bookings remain accessible
- Verify route calculations produce same results

## Success Criteria

- [ ] All bookings have `service_ids` populated (verified)
- [ ] No TypeScript code references `service_id` or `serviceId`
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Route cost calculations produce consistent results
- [ ] Dispatch service functions correctly
- [ ] Database migration completes without errors
- [ ] No runtime errors in production

## Estimated Complexity

- Phase 1 (Verification): 1 point
- Phase 2 (Types): 1 point
- Phase 3 (Services): 5 points
- Phase 4 (Dispatch): 3 points
- Phase 5 (Tests): 2 points
- Phase 6 (Scripts): 1 point
- Phase 7 (Database): 2 points

**Total: 15 points (Medium tier)**

## Deployment Order

1. Deploy main app code changes (Phases 2-6)
2. Deploy dispatch service changes (Phase 4)
3. Verify production stability
4. Run database migration (Phase 7)
5. Monitor for issues
