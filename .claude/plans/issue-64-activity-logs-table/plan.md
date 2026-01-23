# Plan: Issue #64 - Missing activity_logs Table in fleetillo Schema

## Overview

The `activity_logs` table exists in the `routeiq` schema but the application now queries the `fleetillo` schema. Need to create/migrate the table to the correct schema.

## Root Cause Analysis

- Migration `20260106200000_create_activity_logs_table.sql` creates `routeiq.activity_logs`
- Recent migration `20260120000000_create_fleetillo_schema.sql` changed app to use `fleetillo` schema
- `activity.service.ts` queries `activity_logs` without schema prefix, using session default

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Data loss if table dropped | High | Create new table, don't drop old |
| Triggers referencing old table | Medium | Update triggers to use new schema |
| Mixed schema references | Low | Audit all activity_logs references |

## Implementation

### Option A: Create Table in fleetillo Schema (Recommended)

**New migration file**: `20260123000000_create_activity_logs_fleetillo.sql`

```sql
-- Create activity_logs in fleetillo schema
CREATE TABLE IF NOT EXISTS fleetillo.activity_logs (
  -- Same schema as routeiq.activity_logs
);

-- Copy existing data (optional)
INSERT INTO fleetillo.activity_logs 
SELECT * FROM routeiq.activity_logs
ON CONFLICT DO NOTHING;

-- Update any triggers
```

### Option B: Set Search Path (Alternative)

Update session/connection to include both schemas in search path.

## Affected Files

| File | Change Type |
|------|-------------|
| `supabase/migrations/` | New migration file |
| `supabase/migrations/20260106200100_create_activity_triggers.sql` | Update schema references |
| `src/services/activity.service.ts` | Verify no hardcoded schema |

## Testing Requirements

1. Run migration locally
2. Verify dashboard loads activity logs
3. Verify new activities are logged correctly
4. Check triggers fire and log to correct table

## Estimated Complexity

- **Total effort**: 2-3 hours
- **Risk level**: Medium (database migration)
- **Dependencies**: Database access, migration tooling

## Acceptance Criteria

- [ ] `fleetillo.activity_logs` table exists
- [ ] Dashboard displays activity logs without error
- [ ] New activities are logged to correct table
- [ ] Existing data migrated (if applicable)
