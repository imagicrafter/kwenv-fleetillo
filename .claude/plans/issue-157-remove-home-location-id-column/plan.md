# Plan: Issue #157 - Remove vehicles.home_location_id column and all sync machinery

## Summary

Remove the deprecated `vehicles.home_location_id` column, its sync machinery, and all dead code references. The `vehicle_locations` junction table with `is_primary = true` is already the source of truth (used by route planning since PR #156). The old column is always empty/null but code still writes to it, creating confusion about the canonical source of vehicle home locations.

## Requirements

- Drop `home_location_id` column from `vehicles` table via migration
- Remove `syncVehicleHomeLocation()` function and all call sites
- Remove `home_location_id` from `VehicleRow` type and converters
- Keep `Vehicle.homeLocationId` field (populated at runtime by `getVehiclePrimaryLocationIds()`)
- Delete obsolete scripts (`sync-vehicle-home-locations.ts`, `fix-routes.js`, `check-routes.js`)
- Update seed script to use junction table instead of direct column
- Regenerate tenant migration for `kwenv_fleetillo`
- Archive stale plan folder for closed issue #106

## Codebase Discovery

### Affected Code Directories

| Directory | Contains | Affected |
|-----------|----------|----------|
| `src/types/` | TypeScript interfaces and converters | Yes |
| `src/services/` | Business logic, Supabase queries | Yes |
| `src/scripts/` | Seed/demo data scripts | Yes |
| `scripts/` | One-off utility scripts | Yes (delete 3 files) |
| `supabase/migrations/` | SQL schema migrations | Yes |
| `tests/unit/services/` | Jest unit tests | Yes |
| `src/services/__tests__/` | Jest service tests | Yes |
| `.claude/plans/` | Planning documents | Yes (archive stale plan) |
| `src/services/clustering.service.ts` | Clustering logic | No (reads `homeLocationId` from enriched objects) |
| `src/services/route-planning.service.ts` | Route planning | No (already uses junction table enrichment) |

### Entry Points

- Backend server (`src/server.ts`) — uses vehicle service
- Seed script (`src/scripts/seed-demo.ts`) — creates demo vehicles with locations
- One-off scripts (`scripts/`) — standalone utilities

## Impact Analysis

### Direct References (21 files match, 10 require changes)

**Must modify:**
1. `src/types/vehicle.ts` — `VehicleRow`, `rowToVehicle()`, `vehicleInputToRow()`
2. `src/services/vehicle-location.service.ts` — `syncVehicleHomeLocation()` and 4 call sites
3. `src/scripts/seed-demo.ts` — `homeLocationId` assignment in vehicle creation
4. `tests/unit/services/vehicle-location-sync.test.ts` — entire file tests sync behavior
5. `src/services/__tests__/vehicle-location.service.test.ts` — mock expectations for sync
6. `supabase/migrations/20260120000000_create_fleetillo_schema.sql` — column + index definition
7. `supabase/migrations/tenant_kwenv_fleetillo.sql` — regenerate after base migration update

**Must delete:**
8. `scripts/sync-vehicle-home-locations.ts` — one-time migration script, no longer needed
9. `scripts/fix-routes.js` — debug script reading dropped column
10. `scripts/check-routes.js` — debug script reading dropped column

**Must archive:**
11. `.claude/plans/issue-106-sync-vehicle-home-location/` — stale plan for closed issue
12. `.claude/plans/issue-106-vehicle-location-sync/` — stale plan for closed issue (if exists)

**No change needed (reads `homeLocationId` from enriched Vehicle objects):**
- `src/services/clustering.service.ts` — reads `vehicle.homeLocationId` (populated at runtime)
- `src/services/route-planning.service.ts` — enriches vehicles via `getVehiclePrimaryLocationIds()` (PR #156)

### Runtime References

- `syncVehicleHomeLocation()` writes `{ home_location_id: value }` to Supabase `vehicles` table — this will error once column is dropped
- Seed script sets `homeLocationId` on `CreateVehicleInput` which flows to `vehicleInputToRow()` writing `home_location_id`

### Affected Layers

| Layer | Impact |
|-------|--------|
| Database | DROP COLUMN migration, remove index |
| Backend | Remove sync function, update type converters |
| API | None — no controller exposes homeLocationId directly |
| Frontend | None — UI reads from vehicle_locations junction table |
| Config | None |

## Approach

The cleanup is mechanical: remove the column via migration, then delete all code that reads/writes it. The `Vehicle.homeLocationId` TypeScript field is **kept** because it's populated at runtime by `getVehiclePrimaryLocationIds()` in `route-planning.service.ts` (PR #156). Only the database column `home_location_id` on `VehicleRow` and its sync machinery are removed.

The seed script needs updating to use the `vehicle_locations` junction table (via `setVehicleLocations()` or direct insert) instead of passing `homeLocationId` in `CreateVehicleInput`. The seed script already calls `setVehicleLocations()` later in its flow (line 1153-1158), so the `homeLocationId` field on input just needs to be removed.

### Key Decisions

1. **Keep `Vehicle.homeLocationId` field**: This runtime-only field is populated by enrichment in route planning and clustering. Removing it would break those services.
2. **Update consolidated migration in-place**: Since `20260120000000_create_fleetillo_schema.sql` is the "create from scratch" migration, remove the column definition there rather than adding a separate DROP migration. Add a new incremental migration for existing databases.
3. **Regenerate tenant migration**: Re-run `create-tenant-schema.ts` after updating the base migration.

## Implementation

### Files to Modify

| File | Changes |
|------|---------|
| `src/types/vehicle.ts` | Remove `home_location_id` from `VehicleRow` (line 140), remove from `rowToVehicle()` (line 234), remove from `vehicleInputToRow()` (line 297), remove `homeLocationId` from `CreateVehicleInput` (line 176) |
| `src/services/vehicle-location.service.ts` | Delete `syncVehicleHomeLocation()` function (lines 304-339), remove all 4 call sites in `setVehicleLocations()`, `addVehicleLocation()`, `removeVehicleLocation()`, `setVehiclePrimaryLocation()` |
| `src/scripts/seed-demo.ts` | Remove `homeLocationId` variable and assignment (lines 1073-1092, 1133). Keep `setVehicleLocations()` call at line 1153-1158 which already handles junction table. |
| `src/services/__tests__/vehicle-location.service.test.ts` | Remove mock expectations for `vehicles.update` with `home_location_id` |
| `supabase/migrations/20260120000000_create_fleetillo_schema.sql` | Remove `home_location_id` column from vehicles CREATE TABLE (line 424), remove index (line 443) |

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/YYYYMMDDHHMMSS_drop_vehicle_home_location_id.sql` | Incremental migration: `ALTER TABLE DROP COLUMN`, `DROP INDEX` for existing databases |

### Files to Delete

| File | Reason |
|------|--------|
| `scripts/sync-vehicle-home-locations.ts` | One-time migration script, column being removed |
| `scripts/fix-routes.js` | Debug script reading dropped column |
| `scripts/check-routes.js` | Debug script reading dropped column |
| `tests/unit/services/vehicle-location-sync.test.ts` | Tests sync to dropped column |

### Files to Archive

| File | Destination |
|------|-------------|
| `.claude/plans/issue-106-sync-vehicle-home-location/` | `.claude/plans/archive/completed/` |
| `.claude/plans/issue-106-vehicle-location-sync/` | `.claude/plans/archive/completed/` (if exists) |

### Database Changes

**New incremental migration** (`supabase/migrations/YYYYMMDDHHMMSS_drop_vehicle_home_location_id.sql`):

```sql
-- Drop the deprecated home_location_id column from vehicles table.
-- Vehicle home locations are now managed exclusively via the vehicle_locations
-- junction table with is_primary = true (since PR #150/#156).

DROP INDEX IF EXISTS fleetillo.idx_vehicles_home_location;
ALTER TABLE fleetillo.vehicles DROP COLUMN IF EXISTS home_location_id;
```

**Update consolidated migration** (`20260120000000_create_fleetillo_schema.sql`):
- Remove line 424: `home_location_id UUID REFERENCES fleetillo.locations(id),`
- Remove line 443: `CREATE INDEX idx_vehicles_home_location ON fleetillo.vehicles(home_location_id);`

**Regenerate tenant migration**: Run `npx tsx scripts/create-tenant-schema.ts kwenv_fleetillo` after updating the base migration.

## Boundary Crossing Checklist

- [x] **Database ↔ Backend**: Column removed from both schema and `VehicleRow` type
- [x] **Backend ↔ API**: No API changes needed (controllers don't expose `homeLocationId` directly)
- [x] **API ↔ Frontend**: No frontend changes needed (UI reads from junction table)
- [x] **Code ↔ Config**: No config changes needed

## Tasks

- [ ] 1. Create incremental DROP COLUMN migration
- [ ] 2. Update consolidated migration (remove column + index from CREATE TABLE)
- [ ] 3. Remove `home_location_id` from `VehicleRow` and converters in `src/types/vehicle.ts`
- [ ] 4. Remove `homeLocationId` from `CreateVehicleInput` in `src/types/vehicle.ts`
- [ ] 5. Delete `syncVehicleHomeLocation()` and all call sites in `vehicle-location.service.ts`
- [ ] 6. Update seed script to remove `homeLocationId` assignment
- [ ] 7. Delete obsolete scripts (`sync-vehicle-home-locations.ts`, `fix-routes.js`, `check-routes.js`)
- [ ] 8. Delete `vehicle-location-sync.test.ts`, update `vehicle-location.service.test.ts`
- [ ] 9. Regenerate `tenant_kwenv_fleetillo.sql`
- [ ] 10. Archive stale `.claude/plans/issue-106-*` folders
- [ ] 11. Run build and tests to verify no regressions

## Verification Strategy

### Static Verification

```bash
npm run build    # TypeScript compilation — no references to removed fields
npm test         # Unit tests pass (sync tests deleted, others unaffected)
```

### Search Verification

After implementation, these greps should return **zero results** in source code (excluding plan docs, archived plans, and this plan itself):

```bash
# No references to the dropped column in source or migration code
grep -r "home_location_id" --include="*.ts" --include="*.js" src/ scripts/
grep -r "syncVehicleHomeLocation" --include="*.ts" src/

# Consolidated migration should not reference the column
grep "home_location_id" supabase/migrations/20260120000000_create_fleetillo_schema.sql
```

### Runtime Verification

1. Start dev server, create a vehicle, assign a primary location via `vehicle_locations`
2. Run route planning preview — vehicles should still have home locations (via enrichment)
3. Verify no errors in logs from sync attempts to non-existent column

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Seed script breaks without `homeLocationId` on input | Medium | Verify seed still uses `setVehicleLocations()` for junction table |
| Other code reads `home_location_id` not found in grep | Low | `DROP COLUMN IF EXISTS` is safe; build will catch TypeScript references |
| Tenant schema out of sync | Low | Regenerate immediately after base migration update |
