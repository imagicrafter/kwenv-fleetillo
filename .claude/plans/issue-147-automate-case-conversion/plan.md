# Plan: Issue #147 - Automate snake_case / camelCase Conversion (Hybrid Approach)

## Overview

Replace 26+ manually-written per-entity converter functions (`rowToEntity` / `entityInputToRow`) with a generic case-conversion utility in `src/utils/case-conversion.ts`. Each entity retains a thin wrapper that handles only date fields and other non-automatable transformations. This eliminates field-by-field boilerplate, prevents silent bugs when DB columns are added, and reduces maintenance cost across all 13 entity types.

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Subtle behavior change in `null` vs `undefined` handling | High | Generic converter uses `?? undefined` for all nullable values; verify with unit tests per entity |
| Date fields silently remain as ISO strings | High | Per-entity overrides explicitly wrap date fields with `new Date()`; enforce via TypeScript strict types |
| JSONB / nested object fields lose structure | Medium | Generic converter passes JSONB values through unmodified; no deep recursion needed |
| Booking has complex join logic (`customers`, `services`, `locations`) | Medium | Booking keeps manual `rowToBooking` with `...rowToEntity()` base; join fields remain manual overrides |
| `entityToRow` must preserve partial-update semantics (skip `undefined`) | High | Generic `entityToRow` filters `undefined` entries before conversion; verified by existing service tests |
| Custom `inputToRow` functions with default values (e.g., `status: 'pending'`) | Medium | Per-entity `inputToRow` wrappers apply defaults before or after calling generic converter |
| Fields with identical snake_case and camelCase names (e.g., `id`, `name`, `status`) | Low | No conversion needed; `snakeToCamel('id') === 'id'` is a no-op, harmless |
| `Date | string` union inputs in some CreateInput types (Driver, Booking) | Medium | `entityToRow` needs a date serialization option or per-entity pre-processing |

## Complexity Estimate

**Medium** -- Pure refactoring with no DB schema changes, no API changes, no new endpoints. Risk is concentrated in behavioral correctness, not architectural complexity.

**Estimated effort**: 11 entity type files to refactor (Settings has no row converters; Location type does not exist yet as a standalone entity file), 1 new utility file, 1 new test file, CLAUDE.md updates.

## Dependencies

- **Issue #144** (vehicles custom fields) and **Issue #145** (drivers custom fields): Both reported bugs from missed converter fields. This issue resolves the root cause. Can run in parallel but should merge after #144/#145 to avoid conflicts in `vehicle.ts` and `driver.ts`.
- No database migration required.
- No external API changes.

## Affected Entities (11 with converters)

| Entity | File | rowToEntity | inputToRow | Special Cases |
|--------|------|:-----------:|:----------:|---------------|
| Vehicle | `src/types/vehicle.ts` | Yes | Yes | 5 date fields, `metadata` JSONB, `serviceTypes` array default `[]` |
| Driver | `src/types/driver.ts` | Yes | Yes | 3 date fields, `Date\|string` union inputs, `formatDateForDb` helper, `tags` default `[]`, cast on `preferredChannel`, default on `fallbackEnabled` |
| Booking | `src/types/booking.ts` | Yes | Yes (create + update) | 7 date fields, `Date\|string` unions, complex join handling (`customers`, `services`, `locations`, `routes`), backwards-compat logic for `serviceItems`, separate `updateBookingInputToRow` |
| Route | `src/types/route.ts` | Yes | Yes (create + update) | 5 date fields, join for `vehicleName`/`driverName`, `Date` in routeDate, separate `updateRouteInputToRow` |
| Service | `src/types/service.ts` | Yes | Yes | No date fields beyond timestamps; straightforward |
| Customer | `src/types/customer.ts` | Yes | Yes | No date fields beyond timestamps; straightforward |
| Activity | `src/types/activity.ts` | Yes | Yes | No date fields beyond `createdAt`; JSONB `oldValue`/`newValue` |
| RouteToken | `src/types/route-token.ts` | Yes | Yes | `expiresAt` date field; `inputToRow` takes extra params (`token`, `expiresAt`) |
| DispatchJob | `src/types/dispatch-job.ts` | Yes | Yes | 3 date fields, `Date\|string` union input, `driverIds` array default `[]` |
| MaintenanceSchedule | `src/types/maintenanceSchedule.ts` | Yes | Yes | 4 date fields, date-only format `.split('T')[0]` |
| VehicleLocation | `src/types/vehicle-location.ts` | Yes | No `inputToRow` | 1 date field (`createdAt`); minimal |

**Not affected**: Settings (`src/types/settings.ts`) -- uses key-value pattern, not row converters. Location does not have a standalone type file with converters.

## Implementation Phases

### Phase 1: Create Generic Case Conversion Utility

**File**: `src/utils/case-conversion.ts` (new, ~120 lines)

1. Implement `snakeToCamel(str: string): string`
2. Implement `camelToSnake(str: string): string`
3. Implement `rowToEntity<T>(row: Record<string, unknown>): T`
   - Converts all keys from snake_case to camelCase
   - Converts `null` values to `undefined` (matches existing `?? undefined` pattern)
   - Passes arrays and JSONB objects through unmodified (no deep conversion)
4. Implement `entityToRow<T>(entity: Record<string, unknown>): T`
   - Converts all keys from camelCase to snake_case
   - Filters out entries where `value === undefined` (preserves partial-update semantics)
   - Converts `undefined` optional values to `null` for DB (matches existing `?? null` pattern)
5. Implement `dateFields(obj: Record<string, unknown>, fields: string[]): Record<string, unknown>`
   - Helper that converts specified string fields to `Date` objects
   - Used by per-entity wrappers: `dateFields(baseEntity, ['createdAt', 'updatedAt', 'deletedAt', 'scheduledDate'])`
6. Implement `serializeDates(obj: Record<string, unknown>, fields: string[], format?: 'iso' | 'date-only'): Record<string, unknown>`
   - Helper for `inputToRow`: serializes `Date` objects to ISO strings or date-only (`YYYY-MM-DD`)
   - Handles `Date | string` union inputs
7. Export all functions as named exports

### Phase 2: Unit Tests for Case Conversion Utility

**File**: `tests/unit/utils/case-conversion.test.ts` (new, ~200 lines)

Test cases:
- `snakeToCamel`: basic conversion, single word (no-op), consecutive underscores, leading/trailing underscores
- `camelToSnake`: basic conversion, single word (no-op), consecutive uppercase
- `rowToEntity`: simple row, null-to-undefined conversion, array passthrough, JSONB passthrough, empty row
- `entityToRow`: simple entity, undefined filtering (partial update), nested JSONB passthrough
- `dateFields`: string-to-Date conversion, null/undefined handling, missing fields
- `serializeDates`: Date-to-ISO, Date-to-date-only, string passthrough, `Date | string` union

### Phase 3: Refactor Simple Entities (No Special Cases Beyond Timestamps)

Refactor entities that have only `createdAt`, `updatedAt`, `deletedAt` as date fields and no complex join logic or default values.

**Order** (simplest first):
1. **VehicleLocation** (`src/types/vehicle-location.ts`) -- only `rowTo`, no `inputToRow`, 1 date field
2. **Customer** (`src/types/customer.ts`) -- standard pattern, no special cases
3. **Service** (`src/types/service.ts`) -- standard pattern, no special cases
4. **Activity** (`src/types/activity.ts`) -- standard pattern, JSONB passthrough

**Pattern for each**:
```typescript
import { rowToEntity, entityToRow, dateFields } from '../utils/case-conversion';

// BEFORE: 30+ lines of manual mapping
export function rowToCustomer(row: CustomerRow): Customer {
  return {
    ...rowToEntity<Customer>(row),
    // Override only timestamp fields
    ...dateFields(row, ['created_at', 'updated_at', 'deleted_at']),
  } as Customer;
}

// BEFORE: 30+ lines of if-checks
export function customerInputToRow(input: CreateCustomerInput): Partial<CustomerRow> {
  return entityToRow<Partial<CustomerRow>>(input);
}
```

### Phase 4: Refactor Medium-Complexity Entities

Entities with additional date fields beyond timestamps.

1. **MaintenanceSchedule** (`src/types/maintenanceSchedule.ts`) -- 4 extra date fields (date-only format)
2. **DispatchJob** (`src/types/dispatch-job.ts`) -- 3 extra date fields, array defaults
3. **RouteToken** (`src/types/route-token.ts`) -- `expiresAt` date field, custom `inputToRow` signature
4. **Vehicle** (`src/types/vehicle.ts`) -- 5 date fields (some date-only), `metadata` JSONB, array defaults

**Pattern**: Use generic base + date field overrides:
```typescript
export function rowToVehicle(row: VehicleRow): Vehicle {
  return {
    ...rowToEntity<Vehicle>(row),
    // Date overrides
    ...dateFields(row, [
      'created_at', 'updated_at', 'deleted_at',
      'last_location_update', 'last_maintenance_date', 'next_maintenance_date',
    ]),
    // Array defaults (DB null -> empty array)
    serviceTypes: row.service_types ?? [],
  } as Vehicle;
}
```

### Phase 5: Refactor Complex Entities

Entities with join handling, separate update converters, backwards-compat logic, or `Date | string` union inputs.

1. **Driver** (`src/types/driver.ts`) -- `Date | string` inputs, `formatDateForDb` helper, type casts, defaults
2. **Route** (`src/types/route.ts`) -- join fields (`vehicleName`, `driverName`), separate `updateRouteInputToRow`
3. **Booking** (`src/types/booking.ts`) -- most complex: joins, backwards-compat, separate `updateBookingInputToRow`, 7+ date fields, `Date | string` unions

**Approach for Booking**:
- Keep the `rowToBooking` function structure but replace the simple field mappings with `...rowToEntity<Booking>(row)` as a base
- All join-field logic (`customers`, `services`, `locations`, `routes`) stays as manual overrides
- The backwards-compat `serviceItems` / `serviceIds` logic stays manual
- Date fields use `dateFields()` helper
- `bookingInputToRow` and `updateBookingInputToRow` use `entityToRow()` as base with date serialization overrides

### Phase 6: Verify and Update Documentation

1. Run `npm run build` -- ensure zero TypeScript errors
2. Run `npm test` -- ensure all existing unit tests pass
3. Run `npm run lint` -- ensure no lint violations
4. Update `CLAUDE.md` Section 7 (Type System Pattern):
   - Replace the manual converter examples with the hybrid pattern
   - Document `src/utils/case-conversion.ts` as the standard utility
   - Show how to add a new entity using the generic approach
5. Update `CLAUDE.md` Section 8 (Common Patterns):
   - Add case-conversion utility usage to the Service CRUD pattern
6. Update `CLAUDE.md` Section 4 (Code Style):
   - Update the snake_case / camelCase bullet to reference the automated utility

## Testing Requirements

### New Tests (Phase 2)
- `tests/unit/utils/case-conversion.test.ts` -- comprehensive unit tests for the utility

### Regression Tests
- All existing unit tests in `tests/unit/` must continue to pass
- All existing E2E tests in `tests/e2e/` must continue to pass
- Focus areas: CRUD operations for all 11 entities, partial updates, date handling

### Manual Verification
- Spot-check a few entities via the web UI to verify data round-trips correctly
- Verify that partial updates (e.g., updating only vehicle name) do not null out other fields

## File Change Summary

| Action | File | Est. Lines Changed |
|--------|------|--------------------|
| Create | `src/utils/case-conversion.ts` | ~120 |
| Create | `tests/unit/utils/case-conversion.test.ts` | ~200 |
| Refactor | `src/types/vehicle.ts` | ~80 lines removed |
| Refactor | `src/types/driver.ts` | ~60 lines removed |
| Refactor | `src/types/booking.ts` | ~100 lines removed |
| Refactor | `src/types/route.ts` | ~80 lines removed |
| Refactor | `src/types/service.ts` | ~40 lines removed |
| Refactor | `src/types/customer.ts` | ~50 lines removed |
| Refactor | `src/types/activity.ts` | ~20 lines removed |
| Refactor | `src/types/route-token.ts` | ~10 lines removed |
| Refactor | `src/types/dispatch-job.ts` | ~20 lines removed |
| Refactor | `src/types/maintenanceSchedule.ts` | ~40 lines removed |
| Refactor | `src/types/vehicle-location.ts` | ~5 lines removed |
| Update | `CLAUDE.md` | ~30 lines changed |

**Net effect**: ~500+ lines of boilerplate removed across 11 entity files, replaced by ~120 lines of shared utility code.

## Success Criteria

- [ ] All 11 entity converters use the generic utility with per-entity date/special-case overrides
- [ ] No manual field-by-field mapping except for date transformations, join fields, and backwards-compat logic
- [ ] All existing unit tests pass (`npm test`)
- [ ] All existing E2E tests pass (`npm run test:e2e`)
- [ ] TypeScript build succeeds (`npm run build`)
- [ ] Lint passes (`npm run lint`)
- [ ] New unit tests cover: simple conversion, date override, partial update filtering, nested JSONB fields, `null` to `undefined` conversion, `Date | string` union handling
- [ ] `CLAUDE.md` updated to document the new hybrid pattern for future entity development
