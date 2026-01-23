# Plan: Issue #56 - Tag Autocomplete Suggestions

## Overview

Add typeahead/autocomplete functionality to tag inputs across all pages (customers, drivers, locations, vehicles) to promote consistency and prevent duplicate tags.

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Performance with 10k+ tags | Medium | Server-side search with limit |
| Cross-entity tag confusion | Low | Optional scope parameter |
| Breaking existing tag UI | Low | Preserve existing behavior, add autocomplete |

## Implementation Phases

### Phase 1: Backend API (2-3 hours)

**File: `web-launcher/server.js`**

```javascript
// New RPC: tags.search
// GET /api/rpc/tags.search?q=urg&entity=drivers&limit=10
// Response: { tags: ["Urgent", "urgent-fix"], total: 2 }
```

Query implementation:
```sql
SELECT DISTINCT tag, COUNT(*) as usage_count
FROM (
  SELECT unnest(tags) as tag FROM customers
  UNION ALL
  SELECT unnest(tags) as tag FROM drivers
  UNION ALL  
  SELECT unnest(tags) as tag FROM locations
  UNION ALL
  SELECT unnest(tags) as tag FROM vehicles
) all_tags
WHERE tag ILIKE '%{query}%'
GROUP BY tag
ORDER BY usage_count DESC
LIMIT 10;
```

### Phase 2: Reusable Autocomplete Module (3-4 hours)

**New file: `web-launcher/public/js/tag-autocomplete.js`**

```javascript
function setupTagAutocomplete({
  inputId,
  chipsContainerId, 
  entityType,
  onTagsChange
}) {
  // Debounced search (200-300ms)
  // Dropdown rendering below input
  // Keyboard navigation (arrows, enter, escape)
  // Click to select
  // "Create new" option when no match
}
```

### Phase 3: Integration (2-3 hours)

Apply to all pages with tag inputs:
- `customers.html`
- `drivers.html`
- `locations.html`
- `vehicles.html`

## Affected Files

| File | Change Type |
|------|-------------|
| `web-launcher/server.js` | Add tags.search RPC |
| `web-launcher/public/js/tag-autocomplete.js` | New module |
| `web-launcher/public/customers.html` | Integrate autocomplete |
| `web-launcher/public/drivers.html` | Integrate autocomplete |
| `web-launcher/public/locations.html` | Integrate autocomplete |
| `web-launcher/public/vehicles.html` | Integrate autocomplete |

## UI/UX Design

```
┌─────────────────────────────────┐
│ [Urgent ×] [VIP ×]  urg█        │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ Urgent                      (5) │  ← suggestion with count
│ Urgent-fix                  (2) │
│ ─────────────────────────────── │
│ + Create "urg"                  │  ← create new option
└─────────────────────────────────┘
```

## Testing Requirements

1. **API test**: Search returns matching tags, case-insensitive
2. **UI test**: Suggestions appear after 2+ characters
3. **Keyboard test**: Arrow navigation, Enter select, Escape dismiss
4. **Performance test**: Response < 200ms with large dataset

## Estimated Complexity

- **Total effort**: 8-12 hours
- **Risk level**: Low-Medium
- **Dependencies**: #41 tag UI (already merged)

## Acceptance Criteria

- [ ] Typing shows relevant suggestions after 2+ chars
- [ ] Case-insensitive matching works
- [ ] Keyboard navigation functional
- [ ] Works on all 4 pages with tag inputs
- [ ] Responsive on mobile
- [ ] < 200ms response time
