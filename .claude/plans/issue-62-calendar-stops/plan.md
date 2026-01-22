# Plan: Issue #62 - Calendar Not Displaying All Route Stops

## Overview

Calendar view shows only 4 of 6 stops for route RT-20260121-002. Missing bookings BK-20260121-031 and BK-20260121-010.

## Investigation Required

Need to determine root cause:
1. **Query issue**: API not returning all bookings for route
2. **Rendering issue**: Frontend not displaying all returned data
3. **Data issue**: Bookings not properly linked to route

## Diagnostic Steps

### Step 1: Verify Data

```sql
SELECT b.booking_number, b.route_id, r.route_number
FROM bookings b
JOIN routes r ON b.route_id = r.id
WHERE r.route_number = 'RT-20260121-002';
```

### Step 2: Check API Response

1. Open browser DevTools → Network tab
2. Navigate to calendar view for the route
3. Inspect API response for route stops
4. Compare returned bookings vs. expected 6

### Step 3: Check Frontend Rendering

1. Look for any filtering logic in calendar rendering
2. Check for hidden/collapsed elements
3. Verify stop positioning doesn't cause overlap/hiding

## Potential Causes

| Cause | Likelihood | Fix |
|-------|------------|-----|
| Query limit/pagination | Medium | Increase limit or paginate |
| Booking status filter | Medium | Include all relevant statuses |
| Frontend rendering bug | Low | Debug calendar component |
| Data integrity issue | Low | Fix booking-route relationship |

## Affected Files (To Investigate)

| File | Purpose |
|------|---------|
| `web-launcher/public/calendar.html` | Calendar UI and rendering |
| `web-launcher/server.js` | RPC endpoints for route/booking data |
| Database queries | Route stop retrieval logic |

## Testing Requirements

1. Reproduce issue with provided route/bookings
2. Verify all 6 bookings visible after fix
3. Test with other routes to ensure no regression
4. Check edge cases (overlapping times, many stops)

## Estimated Complexity

- **Total effort**: 3-5 hours (depends on root cause)
- **Risk level**: Low
- **Dependencies**: Access to test data

## Acceptance Criteria

- [ ] All 6 stops visible for RT-20260121-002
- [ ] BK-20260121-031 and BK-20260121-010 displayed
- [ ] No regression on other route displays
- [ ] Root cause documented
