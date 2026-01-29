# Implementation Plan: Issue #144 - Add Custom Fields to Vehicles Table

Add custom fields support for vehicles, following the established locations pattern.

## Overview

This feature enables users to define and manage custom metadata fields for vehicles through the Settings UI, mirroring the existing implementation for locations. Custom fields are stored in a JSONB column with GIN index for efficient queries.

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Database migration required | Low | Simple ALTER TABLE, follows proven pattern |
| Breaking changes to Vehicle type | Low | Add optional field, backward compatible |
| UI complexity | Low | Reuse existing custom fields UI pattern |
| Data migration | None | New column defaults to empty object |

## Implementation Phases

### Phase 1: Database Layer

**Files to modify:**
- `supabase/migrations/` (new migration file)

**Tasks:**
1. Create migration `20260127000000_add_vehicle_metadata.sql`:
   ```sql
   -- Add metadata JSONB column to vehicles table
   ALTER TABLE fleetillo.vehicles
   ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

   -- Add GIN index for efficient JSONB queries
   CREATE INDEX IF NOT EXISTS idx_vehicles_metadata
   ON fleetillo.vehicles USING GIN(metadata);

   COMMENT ON COLUMN fleetillo.vehicles.metadata IS 'JSONB storage for custom vehicle fields configured in Settings';
   ```

### Phase 2: TypeScript Types

**Files to modify:**
- `src/types/vehicle.ts`
- `src/types/settings.ts`

**Tasks:**

1. **Update Vehicle interface** in `src/types/vehicle.ts`:
   - Add `metadata?: Record<string, unknown>` to `Vehicle` interface
   - Add `metadata?: Record<string, unknown> | null` to `VehicleRow` interface
   - Update `vehicleInputToRow()` to include metadata mapping
   - Update `rowToVehicle()` to include metadata mapping

2. **Add settings key** in `src/types/settings.ts`:
   - Add `VEHICLES_CUSTOM_FIELDS: 'vehicles.customFields'` to `SettingKeys`

### Phase 3: Service Layer

**Files to modify:**
- `src/services/vehicle.service.ts`

**Tasks:**

1. **Update CRUD operations** to handle metadata:
   - `createVehicle()`: Include metadata in insert
   - `updateVehicle()`: Include metadata in update (with proper undefined filtering)
   - Ensure metadata is selected in all query operations

2. **Follow immutability pattern**: Spread metadata when updating to avoid overwriting unrelated custom fields

### Phase 4: Settings UI

**Files to modify:**
- `web-launcher/public/settings.html`

**Tasks:**

1. **Add Vehicle Custom Fields section** to Custom Fields tab:
   - Create section header "Vehicle Custom Fields"
   - Add container for field list: `<div id="vehicle-custom-fields-list">`
   - Add "Add Custom Field" button

2. **JavaScript functions** (following locations pattern):
   - `renderVehicleCustomFields(fields)` - Render field editor rows
   - `addVehicleCustomField()` - Add new field definition
   - `removeVehicleCustomField(index)` - Remove field
   - `updateVehicleCustomField(index, prop, value)` - Update field property

3. **Load/Save integration**:
   - Load `vehicles.customFields` in `loadSettings()`
   - Save `vehicles.customFields` in `saveSettings()`

### Phase 5: Vehicle Management UI

**Files to modify:**
- `web-launcher/public/vehicles.html`

**Tasks:**

1. **Load custom field configuration** on page load:
   - Fetch `vehicles.customFields` setting
   - Store in page-level variable for modal rendering

2. **Render custom fields in Add/Edit modal**:
   - Dynamically generate form fields based on configuration
   - Handle field types: text, number, boolean, select
   - Apply suffix for number fields (units)
   - Show required indicator for required fields

3. **Save custom field values**:
   - Collect custom field values from modal
   - Include in vehicle.metadata when saving
   - Validate required fields

4. **Display in edit mode**:
   - Populate custom field values from existing vehicle.metadata

## Affected Files Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `supabase/migrations/20260127000000_add_vehicle_metadata.sql` | **NEW** | Add metadata column and GIN index |
| `src/types/vehicle.ts` | MODIFY | Add metadata to interfaces |
| `src/types/settings.ts` | MODIFY | Add VEHICLES_CUSTOM_FIELDS key |
| `src/services/vehicle.service.ts` | MODIFY | Handle metadata in CRUD |
| `web-launcher/public/settings.html` | MODIFY | Add vehicle custom fields UI |
| `web-launcher/public/vehicles.html` | MODIFY | Render custom fields in forms |

## Testing Requirements

### Unit Tests
- Vehicle service CRUD operations with metadata
- Type conversion functions handle metadata correctly

### Integration Tests
- Custom field configuration saves to settings
- Vehicle with custom fields persists correctly
- Custom field values round-trip through API

### Manual Testing Checklist
1. **Settings Configuration**:
   - [ ] Navigate to Settings → Custom Fields
   - [ ] Add vehicle custom field (text type)
   - [ ] Add vehicle custom field (number with suffix)
   - [ ] Add vehicle custom field (select with options)
   - [ ] Add vehicle custom field (boolean)
   - [ ] Save settings, verify toast success
   - [ ] Refresh page, verify fields persist

2. **Vehicle Creation**:
   - [ ] Navigate to Vehicles page
   - [ ] Click "Add Vehicle"
   - [ ] Verify custom fields appear in modal
   - [ ] Fill in custom field values
   - [ ] Save vehicle, verify success

3. **Vehicle Editing**:
   - [ ] Edit existing vehicle
   - [ ] Verify custom field values populated
   - [ ] Modify values, save
   - [ ] Verify changes persist

4. **Data Integrity**:
   - [ ] Query vehicle via API, verify metadata present
   - [ ] Verify GIN index exists in database

## Dependencies

- Existing `CustomFieldDefinition` type in settings.ts (reused, not modified)
- Settings service `updateMultiple()` function (reused)
- Locations custom fields UI pattern (referenced for consistency)

## Implementation Notes

1. **Follow the locations pattern exactly** - The existing implementation is well-tested and provides a good template

2. **UI considerations**:
   - Place "Vehicle Custom Fields" section below "Location Custom Fields" in the Custom Fields tab
   - Use identical styling and interaction patterns

3. **Backward compatibility**:
   - Vehicles without metadata should default to empty object `{}`
   - Custom fields are optional - existing vehicles work unchanged

4. **Query efficiency**:
   - GIN index enables efficient JSONB queries: `metadata->>'fieldKey' = 'value'`
   - Can be used for filtering vehicles by custom field values in future

## Estimated Complexity

**Points: 5** (Medium tier)
- Clear pattern to follow from locations implementation
- No complex business logic
- Straightforward database change
- UI changes follow existing patterns
