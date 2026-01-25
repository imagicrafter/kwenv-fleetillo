# Implementation Plan: Display configured work schedule hours in calendar

**Issue:** #124
**Complexity:** Medium (4/14 points)
**Estimated Effort:** 4-6 hours

## Overview

Modify the calendar to use configured work schedule hours from settings instead of hardcoded time ranges. Currently, the calendar displays:
- Week view: 6 AM - 9 PM (hardcoded)
- Day view: 6 AM - 8 PM (hardcoded)

The settings already store `schedule.dayStartTime` and `schedule.dayEndTime` (defaults: 08:00-17:00), but the calendar doesn't use them.

## Current State

### Hardcoded Time Ranges

**Week View** (`calendar.html:1870-1871`):
```javascript
// Time slots (6 AM to 9 PM)
for (let hour = 6; hour <= 21; hour++) {
```

**Day View** (`calendar.html:1979-1981`):
```javascript
// Time Range: 6 AM to 8 PM
const startHour = 6;
const endHour = 20;
```

### Existing Settings Infrastructure

- **API:** `window.apiClient.settings.getRouteSettings()`
- **Returns:** Object with `schedule.dayStartTime` and `schedule.dayEndTime`
- **Default Values:** `dayStartTime: '08:00'`, `dayEndTime: '17:00'`
- **Settings Page:** Already has time picker UI for managing these values

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Settings API latency delays calendar render | Low | Medium | Load settings in parallel with bookings data |
| Invalid/missing settings break calendar | Medium | Low | Use fallback defaults (08:00-17:00) if settings unavailable |
| End time before start time | Low | Low | Validate and clamp to minimum 4-hour range |
| Very short work day causes visual issues | Low | Low | Enforce minimum visible hours (e.g., 4 hours) |
| Settings change doesn't reflect until refresh | Low | High | Expected behavior - document in UI |

**Overall Risk:** Low

## Implementation Plan

### Phase 1: Load Work Schedule Settings

**Affected File:** `web-launcher/public/calendar.html`

#### Step 1.1: Add settings state variable
```javascript
let workScheduleSettings = null;
```

#### Step 1.2: Create settings loader function
```javascript
async function loadWorkScheduleSettings() {
    try {
        const settings = await window.apiClient.settings.getRouteSettings();

        // Parse time strings to hour numbers
        const startTime = settings?.schedule?.dayStartTime || '08:00';
        const endTime = settings?.schedule?.dayEndTime || '17:00';

        const startHour = parseInt(startTime.split(':')[0], 10);
        const endHour = parseInt(endTime.split(':')[0], 10);

        // Validate: ensure end > start and minimum 4-hour window
        const validatedStartHour = Math.max(0, Math.min(startHour, 20));
        const validatedEndHour = Math.max(validatedStartHour + 4, Math.min(endHour, 23));

        return {
            startHour: validatedStartHour,
            endHour: validatedEndHour
        };
    } catch (error) {
        console.error('Failed to load work schedule settings:', error);
        // Fallback to defaults
        return {
            startHour: 8,  // 8 AM
            endHour: 17    // 5 PM
        };
    }
}
```

#### Step 1.3: Load settings on initialization
Update the initialization flow to load settings:
```javascript
async function init() {
    // Load settings in parallel with other data
    const [settings, bookings, vehicles] = await Promise.all([
        loadWorkScheduleSettings(),
        window.apiClient.bookings.getAll(),
        window.apiClient.vehicles.getAll()
    ]);

    workScheduleSettings = settings;
    // ... rest of init logic
}
```

### Phase 2: Update Week View

**Location:** `calendar.html:1870-1925`

#### Step 2.1: Replace hardcoded hour range
```javascript
// BEFORE:
// Time slots (6 AM to 9 PM)
for (let hour = 6; hour <= 21; hour++) {

// AFTER:
// Time slots (work schedule hours)
const { startHour, endHour } = workScheduleSettings;
for (let hour = startHour; hour <= endHour; hour++) {
```

**Testing:** Verify week view displays correct time range after this change.

### Phase 3: Update Day View

**Location:** `calendar.html:1979-1981`

#### Step 3.1: Replace hardcoded constants
```javascript
// BEFORE:
// Time Range: 6 AM to 8 PM
const startHour = 6;
const endHour = 20;

// AFTER:
// Time Range: configured work schedule
const { startHour, endHour } = workScheduleSettings;
```

**Testing:** Verify day view displays correct time range after this change.

### Phase 4: Optional Enhancements

#### Step 4.1: Visual indicator for work hours boundary
Add subtle styling to show work hours vs extended hours if calendar supports times outside work schedule.

#### Step 4.2: Booking creation time validation
Consider restricting booking creation to work hours only (optional - may be too restrictive).

#### Step 4.3: Settings change reactivity
Add listener for settings changes to auto-refresh calendar (future enhancement).

## Testing Strategy

### Unit Tests
- [ ] `parseTimeToHour('08:00')` returns 8
- [ ] `parseTimeToHour('17:00')` returns 17
- [ ] Invalid time strings fall back to defaults
- [ ] End time before start time is corrected
- [ ] Time range validation enforces minimum window

### Integration Tests
- [ ] Settings API returns expected data structure
- [ ] Calendar renders with default settings (08:00-17:00)
- [ ] Calendar renders with custom settings (07:00-19:00)
- [ ] Calendar handles missing settings gracefully

### E2E Tests
- [ ] Change work schedule in settings → Refresh calendar → Verify time range updates
- [ ] Create booking within work hours
- [ ] Week view shows all configured hours
- [ ] Day view shows all configured hours
- [ ] Month view is unaffected (no hourly breakdown)

### Manual Testing Checklist
- [ ] Week view displays correct hours
- [ ] Day view displays correct hours
- [ ] Bookings render at correct times
- [ ] No visual regressions
- [ ] Time select dropdown in booking modal works correctly
- [ ] Settings page time pickers work correctly

## Affected Files

| File | Type | Changes |
|------|------|---------|
| `web-launcher/public/calendar.html` | Modify | Add settings loader, update week/day view hour ranges |

**No backend changes required** - all necessary APIs already exist.

## Success Criteria

- [x] Week view time range matches configured `dayStartTime` and `dayEndTime`
- [x] Day view time range matches configured `dayStartTime` and `dayEndTime`
- [x] Default values (08:00-17:00) work when settings not configured
- [x] Settings changes reflect in calendar after page refresh
- [x] Invalid/missing settings don't break calendar (fallback to defaults)
- [x] No visual regressions in any calendar view
- [x] Time validation prevents impossible ranges (end before start)
- [x] Minimum 4-hour window enforced

## Implementation Notes

### Why Minimum 4-Hour Window?
Prevents unusable calendar layouts if someone sets start=16:00 and end=16:00 (or similar edge cases).

### Why Not Real-Time Settings Sync?
Settings changes are infrequent. Requiring a page refresh is acceptable and avoids complex state management.

### Month View
Month view doesn't show hourly breakdowns, so it's unaffected by this change.

### Booking Modal Time Picker
The booking creation modal should continue to allow any time - work schedule is for display purposes, not enforcement.

## Rollback Plan

If issues arise:
1. Revert changes to hardcoded values (6 AM - 9 PM for week, 6 AM - 8 PM for day)
2. Settings infrastructure remains unchanged, so no backend rollback needed

## Estimated Complexity Breakdown

- **Phase 1 (Settings):** 1-2 hours (API integration, validation, error handling)
- **Phase 2 (Week View):** 1 hour (simple find-replace, testing)
- **Phase 3 (Day View):** 1 hour (simple find-replace, testing)
- **Phase 4 (Optional):** 1-2 hours (visual enhancements, if desired)
- **Testing:** 1-2 hours (manual + automated tests)

**Total:** 4-6 hours

## Dependencies

None - all required infrastructure exists.

## Follow-Up Opportunities

1. **Non-work hours styling** - Gray out hours before/after work schedule
2. **Booking time constraints** - Optionally restrict booking creation to work hours
3. **Real-time settings sync** - Use WebSocket or polling to auto-update calendar
4. **Per-user work schedules** - Different users/roles have different hours
5. **Per-day work schedules** - Monday-Friday might differ from Saturday-Sunday
