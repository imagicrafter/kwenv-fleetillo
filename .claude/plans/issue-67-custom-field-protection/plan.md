# Plan: Issue #67 - Protect Custom Fields from Deletion

## Overview

Prevent accidental data loss when deleting custom field definitions by:
1. Warning users when existing data would be affected
2. Preserving orphaned metadata on location saves

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Silent data loss on save | High | Preserve unknown metadata keys |
| User confusion about orphaned data | Medium | Show affected location count before delete |
| Breaking existing functionality | Low | Backend change is additive |

## Implementation Phases

### Phase 1: Backend API (2-3 hours)

**Add RPC endpoint to check custom field usage:**

File: `web-launcher/server.js`

```javascript
// New RPC: settings.checkCustomFieldUsage
// Query: SELECT COUNT(*) FROM locations WHERE metadata ? '${fieldKey}'
// Returns: { count: number, fieldKey: string }
```

### Phase 2: Frontend Delete Protection (2-3 hours)

**File: `web-launcher/public/settings.html`**

1. Before deleting a custom field, call the new API endpoint
2. If `count > 0`, show confirmation dialog:
   - "This custom field has values saved in X locations. Deleting it will make those values inaccessible. Are you sure?"
3. Only proceed with deletion after user confirmation

### Phase 3: Metadata Preservation (1-2 hours)

**File: `web-launcher/public/locations.html`**

1. When collecting metadata for save, merge new values with existing metadata
2. Preserve any keys that aren't in current field definitions
3. This prevents overwriting orphaned data on save

## Affected Files

| File | Change Type |
|------|-------------|
| `web-launcher/server.js` | Add RPC endpoint |
| `web-launcher/public/settings.html` | Add delete confirmation |
| `web-launcher/public/locations.html` | Preserve metadata on save |

## Testing Requirements

1. **Unit test**: RPC returns correct count for existing/non-existing fields
2. **Integration test**: Delete flow shows warning when values exist
3. **Manual test**: Save location preserves orphaned metadata keys

## Estimated Complexity

- **Total effort**: 5-8 hours
- **Risk level**: Low-Medium
- **Dependencies**: None (builds on existing #16 implementation)

## Acceptance Criteria

- [ ] API endpoint returns count of locations with custom field values
- [ ] Delete confirmation shows when count > 0
- [ ] Orphaned metadata preserved on location save
- [ ] No regression in existing custom field functionality
