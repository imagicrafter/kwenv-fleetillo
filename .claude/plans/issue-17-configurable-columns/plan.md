# Configurable Custom Field Columns in Locations Table

## Overview
Enable users to select which custom fields appear as columns in the locations table, with guardrails to prevent too many columns and ensure a clean, consistent UX.

## Current State
- **Custom fields**: Stored in `fleetillo.settings` with key `locations.customFields` (array of definitions)
- **Field values**: Stored in `fleetillo.locations.metadata` (JSONB column)
- **Current table**: 7 fixed columns (Name/Type, Address, Customer, City/State, Tags, Status, Actions)
- **No column selection UI**: All tables show fixed columns only

## Solution Design

### Settings Schema
Create new setting: `locations.tableColumns`

```typescript
interface LocationTableColumnConfig {
  visibleCustomFields: string[];  // Array of custom field keys to display
}
```

**Default**: If setting doesn't exist or is empty, show NO custom field columns

### Column Limits
- **Hard limit**: 4 custom field columns maximum (total 11 columns: 7 fixed + 4 custom)
- **Visual feedback**: Show counter "X of 4 selected", disable checkboxes when limit reached
- **Warning**: Yellow indicator at 3/4 columns

### UI Design
**Placement**: Gear icon (⚙️) in table header, next to search/filter

**Dropdown structure**:
- Header: "Custom Field Columns" + counter
- List: Checkbox per custom field with label + type badge
- Footer: "Reset" + "Apply" buttons

### Field Rendering in Table
| Field Type | Display Format | Example |
|------------|----------------|---------|
| text | Plain text | "ABC-123" |
| number | Number + suffix | "500 gallons" |
| boolean | Checkmark/X | "✓" or "✗" |
| select | Selected option | "Weekly" |
| null/empty | Dash | "-" |

## Implementation Plan

### Phase 1: MVP (Core Functionality)

#### 1. Add Type Definitions
**File**: `src/types/settings.ts`
- Add `LOCATIONS_TABLE_COLUMNS: 'locations.tableColumns'` to `SettingKeys`
- Define `LocationTableColumnConfig` interface

#### 2. Build Column Selector UI
**File**: `web-launcher/public/locations.html`

**HTML additions**:
```html
<!-- Gear icon button in top bar actions area (after filter dropdown) -->
<button class="btn-icon" id="column-selector-btn" data-tooltip="Configure Columns">
  <svg><!-- gear icon --></svg>
</button>

<!-- Dropdown menu (hidden by default) -->
<div id="column-selector-dropdown" class="column-selector-dropdown" style="display: none;">
  <div class="dropdown-header">
    <h4>Custom Field Columns</h4>
    <span class="column-count" id="column-count">0 of 4 selected</span>
  </div>
  <div class="column-list" id="column-list">
    <!-- Dynamically populated with checkboxes -->
  </div>
  <div class="dropdown-footer">
    <button class="btn-text" id="reset-columns-btn">Reset</button>
    <button class="btn-primary" id="apply-columns-btn">Apply</button>
  </div>
</div>
```

**JavaScript additions**:
```javascript
// State variables
let selectedCustomColumns = [];
const MAX_CUSTOM_COLUMNS = 4;

// Load column configuration on page init
async function loadColumnConfiguration() {
  const columnsResult = await window.apiClient.settings.getSetting('locations.tableColumns');
  selectedCustomColumns = columnsResult?.data?.visibleCustomFields || [];
}

// Render column selector dropdown
function renderColumnSelector() {
  // Generate checkboxes for each custom field
  // Disable if limit reached
  // Show field label + type badge
}

// Toggle column selection
function toggleColumn(fieldKey) {
  // Add/remove from selectedCustomColumns
  // Respect MAX_CUSTOM_COLUMNS limit
  // Re-render selector
}

// Save preferences
async function saveColumnPreferences() {
  await window.apiClient.settings.updateMultiple({
    'locations.tableColumns': {
      visibleCustomFields: selectedCustomColumns
    }
  });
  await loadLocations(); // Reload table
}

// Reset to default (no custom columns)
function resetColumnPreferences() {
  selectedCustomColumns = [];
  renderColumnSelector();
}
```

**Event listeners**:
- Gear icon click: Open/close dropdown
- Checkbox change: Toggle column selection
- Apply button: Save preferences and reload table
- Reset button: Clear all selections

#### 3. Dynamic Table Rendering
**File**: `web-launcher/public/locations.html`

**Modify `renderTable()` function**:
```javascript
function renderTable(locations) {
  // 1. Build header row dynamically
  const fixedHeaders = ['Name/Type', 'Address', 'Customer', 'City/State', 'Tags', 'Status'];
  const customHeaders = getVisibleCustomFieldHeaders(); // From selectedCustomColumns
  const allHeaders = [...fixedHeaders, ...customHeaders, 'Actions'];

  // 2. Render header
  thead.innerHTML = allHeaders.map(h => `<th>${h}</th>`).join('');

  // 3. Render body rows
  locations.forEach(loc => {
    // Fixed columns (existing code)
    // + Custom field columns (new)
    const customCells = renderCustomFieldCells(loc);
    // + Actions column
  });
}

// Helper: Get headers for selected custom fields
function getVisibleCustomFieldHeaders() {
  return selectedCustomColumns
    .map(key => customFieldDefinitions.find(f => f.key === key)?.label)
    .filter(Boolean);
}

// Helper: Render custom field cells for a location
function renderCustomFieldCells(location) {
  return selectedCustomColumns
    .map(key => {
      const field = customFieldDefinitions.find(f => f.key === key);
      const value = location.metadata?.[field.key];
      const formatted = formatCustomFieldValue(value, field);
      return `<td>${formatted}</td>`;
    })
    .join('');
}

// Helper: Format value by field type
function formatCustomFieldValue(value, field) {
  if (value == null || value === '') return '-';

  switch (field.type) {
    case 'boolean':
      return value ? '✓' : '✗';
    case 'number':
      return field.suffix ? `${value} ${field.suffix}` : value;
    default:
      return value;
  }
}
```

#### 4. Add CSS Styling
**File**: `web-launcher/public/locations.html` (inline styles section)

```css
/* Column Selector Dropdown */
.column-selector-dropdown {
  position: absolute;
  top: 60px;
  right: 120px;
  width: 320px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 100;
}

.dropdown-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.column-count {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.column-count.warning {
  color: var(--warning-color);
  font-weight: 600;
}

.column-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 8px;
}

.column-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
}

.column-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.field-type-badge {
  background: rgba(88, 166, 255, 0.15);
  color: var(--accent-primary);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
}

.btn-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.1);
}
```

### Phase 2: Polish & UX Enhancements

#### Visual Improvements
- Add field type badges (pill-style: "number", "text", "boolean", "select")
- Add warning indicator (⚠️) when at 3/4 column limit
- Add tooltips to disabled checkboxes explaining limit
- Smooth fade-in/out animations for dropdown

#### Better Feedback
- Loading spinner on "Apply" button while saving
- Toast notification on successful save
- Error messages if save fails
- Empty state message when no custom fields defined

#### Accessibility
- Keyboard navigation (Tab, Enter, Escape)
- ARIA labels for screen readers
- Focus trap when dropdown open
- Focus return to gear icon on close

### Phase 3: Future Enhancements (Optional)

#### Column Reordering
- Drag handles on each column item
- Visual preview of column order
- Store order in `columnOrder` array

#### Saved Views
- "Save View" button to store current configuration
- Dropdown to switch between saved views
- Preset views: "Default", "Detailed", "Compact"

#### Per-User Preferences
- Create `user_preferences` table
- Migrate from global setting to per-user
- Fallback to global default if no user preference

## Critical Files

| File | Purpose | Changes |
|------|---------|---------|
| `src/types/settings.ts` | Type definitions | Add `LocationTableColumnConfig` interface + setting key |
| `web-launcher/public/locations.html` | Main implementation | Add column selector UI + dynamic table rendering |
| `web-launcher/public/styles.css` | Styling | Add column selector dropdown styles (or inline) |
| `src/services/settings.service.ts` | Reference | No changes needed (existing API sufficient) |

## Verification Testing

### Manual Testing
1. **Open locations page** → Click gear icon → Column selector dropdown appears
2. **Select 2 custom fields** → Click Apply → Table shows 2 new columns
3. **Reload page** → Selected columns persist
4. **Select 4 fields** → 5th checkbox becomes disabled with tooltip
5. **Click Reset** → All selections cleared
6. **Check formatting**:
   - Number fields show with suffix (e.g., "500 gallons")
   - Boolean fields show ✓ or ✗
   - Empty values show "-"

### E2E Test (Playwright)
```typescript
test('user can configure custom field columns', async ({ page }) => {
  await page.goto('/locations.html');
  await page.click('[id="column-selector-btn"]');
  await page.check('input[value="capacity_gallons"]');
  await page.click('#apply-columns-btn');
  await expect(page.locator('th:has-text("Capacity")')).toBeVisible();

  // Verify persistence
  await page.reload();
  await expect(page.locator('th:has-text("Capacity")')).toBeVisible();
});
```

## Trade-offs & Decisions

### Global vs. Per-User Settings
**Decision**: Start with global setting (all users see same columns)
- **Pro**: Simple to implement, no new tables needed
- **Con**: Not personalized per user
- **Future**: Migrate to per-user in Phase 3 if needed

### Hard Limit vs. Soft Warning
**Decision**: Hard limit of 4 columns
- **Pro**: Prevents UI degradation, clear guardrails
- **Con**: Less flexible
- **Rationale**: Better UX on smaller screens, prevents horizontal scrolling

### Dropdown vs. Modal
**Decision**: Dropdown for Phase 1-2
- **Pro**: Faster interaction, less context switching
- **Con**: Less space for advanced features
- **Future**: Consider modal for Phase 3 with drag-and-drop reordering

## Success Metrics
- Users can configure columns in < 30 seconds
- Table renders in < 500ms with 4 custom columns
- Settings persist 100% of the time
- 50%+ adoption within first week

## Research Sources
- [Data Table Design UX Patterns - Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- [Best Practices for Usable Data Tables - UX Planet](https://uxplanet.org/best-practices-for-usable-and-efficient-data-table-in-applications-4a1d1fb29550)
- [Designing Table Column Customization - Andrew Coyle](https://coyleandrew.medium.com/customize-columns-table-ui-pattern-b3a5a8d49701)
- [Table UI for Large Datasets - Andrew Coyle](https://www.andrewcoyle.com/blog/table-ui-considerations-for-large-datasets)
