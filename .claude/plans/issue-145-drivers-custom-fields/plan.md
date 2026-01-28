# Implementation Plan - Add Driver Custom Fields

Add support for custom fields on the drivers entity, configurable via Settings UI and editable in the Drivers interface.

## User Review Required

> [!IMPORTANT]
> This feature requires a schema change to the `drivers` table to add a `custom_fields` JSONB column. Please ensure the database migration is applied or the schema is updated in Supabase.

## Proposed Changes

### Backend

#### [MODIFY] [src/types/settings.ts](file:///Users/justinmartin/github/fleetillo/src/types/settings.ts)
- Add `DRIVERS_CUSTOM_FIELDS: 'drivers.customFields'` to `SettingKeys`.

#### [MODIFY] [src/types/driver.ts](file:///Users/justinmartin/github/fleetillo/src/types/driver.ts)
- Update `Driver` interface to include `customFields?: Record<string, any>`.
- Update `DriverRow` interface to include `custom_fields: Record<string, any> | null`.
- Update `driverInputToRow` and `rowToDriver` mappers.

#### [MODIFY] [src/services/driver.service.ts](file:///Users/justinmartin/github/fleetillo/src/services/driver.service.ts)
- Ensure `custom_fields` are selected and updated in CRUD operations.

### Frontend

#### [MODIFY] [web-launcher/public/settings.html](file:///Users/justinmartin/github/fleetillo/web-launcher/public/settings.html)
- Add "Driver Custom Fields" section to the "Custom Fields" tab.
- Update `saveSettings` to collect and save `drivers.customFields`.
- Reuse/Refactor the custom field management UI logic to support multiple entities (Drivers, Locations).

#### [MODIFY] [web-launcher/public/drivers.html](file:///Users/justinmartin/github/fleetillo/web-launcher/public/drivers.html)
- Fetch `drivers.customFields` setting on page load.
- Dynamically render input fields in the "Add/Edit Driver" modal based on the configuration.
- (Optional) Update the drivers table to dispay custom field values or add a "View Details" option.

## Verification Plan

### Manual Verification
1. **Configure Custom Field**:
   - Go to Settings > Custom Fields.
   - Add a new Driver Custom Field (e.g., "Label": "Employee ID", "Type": "Text").
   - Save Settings and verify toast success.
2. **Create Driver with Custom Field**:
   - Go to Drivers page.
   - Click "Add Driver".
   - Verify "Employee ID" field appears in the modal.
   - Fill in details and Save.
3. **Verify Persistence**:
   - Refresh page.
   - Edit the newly created driver.
   - Verify the custom field value is preserved.
4. **List View**:
   - Verify the driver appears in the list (field value might not be shown in main column unless explicitly added, but ensures no regression).
