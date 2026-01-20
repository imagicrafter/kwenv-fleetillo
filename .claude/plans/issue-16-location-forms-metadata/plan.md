# Plan: Issue #16 - Update Location Management Forms for metadata and tags

## Summary

Add UI inputs to `locations.html` for managing location-specific requirements stored in the `metadata` JSONB column and `tags` array. This enables operators to capture site-specific information like trap capacity, service frequency, and access requirements.

## Prerequisites

- Issue #15 (Schema enhancements) must be complete - adds `tags TEXT[]` and `metadata JSONB` columns to locations table

## Files to Modify

### UI Updates

**[MODIFY] `shared/public/locations.html`**

Add new form fields in the location modal:

1. **Tags Input Section**
   - Pill-style multi-select for location tags
   - Dynamic add/remove functionality
   - Suggested tags dropdown

2. **Location Requirements Section** (stored in `metadata` JSONB)
   
   Standard fields with explicit inputs:
   - `Capacity (Gallons)` - numeric input for trap size
   - `Trap Count` - numeric input for number of traps
   - `Service Frequency (Weeks)` - numeric input for how often service is needed
   
   Access requirements:
   - `Hose Length Required` - text input for equipment needed
   - `Requires Tanker` - checkbox
   - `Preferred Service Time` - text input for timing constraints
   
   Flexible attributes:
   - Key-value editor for other custom fields
   - Add/remove rows dynamically

3. **JavaScript Updates**
   - Serialize metadata fields to JSONB on save
   - Deserialize metadata JSONB to form fields on edit
   - Handle tags array parsing/serialization

### Service Layer Updates

**[MODIFY] `src/services/location.service.ts`**
- Update `CreateLocationInput` interface to include `tags` and `metadata`
- Update `inputToRow` function to handle new fields
- Update `rowToLocation` function to parse metadata correctly

**[MODIFY] `src/types/location.ts`** (if exists, else create)
- Add type definitions for metadata structure
- Add LocationMetadata interface

### API Updates

**[MODIFY] `src/controllers/location.controller.ts`** (if needed)
- Ensure metadata JSONB is properly validated
- Handle tags array input

## Implementation Tasks

- [ ] 0. Create feature branch `issue/16-location-forms-metadata`
- [ ] 1. Verify schema has `tags` and `metadata` columns (depends on #15)
- [ ] 2. Add tags pill input component to locations form
- [ ] 3. Add Location Requirements section with standard fields
- [ ] 4. Add flexible key-value editor for custom metadata
- [ ] 5. Add JavaScript handlers for form serialization
- [ ] 6. Update location service to handle new fields
- [ ] 7. Add CSS styles for new components
- [ ] 8. Test form submission creates location with metadata
- [ ] 9. Test form edit loads and displays existing metadata
- [ ] 10. Verify Google Places autocomplete still works

## UI Component Specifications

### Tags Pill Input

```html
<div class="form-group">
    <label>Tags</label>
    <div class="tags-input-container">
        <div class="tags-pills" id="tags-pills">
            <!-- Dynamically added pills -->
        </div>
        <input type="text" id="tag-input" placeholder="Add tag...">
    </div>
</div>
```

### Location Requirements Form

```html
<div class="form-section">
    <h4>Location Requirements</h4>
    
    <!-- Standard Fields -->
    <div class="form-grid">
        <div class="form-group">
            <label for="capacity-gallons">Capacity (Gallons)</label>
            <input type="number" id="capacity-gallons" min="0">
        </div>
        <div class="form-group">
            <label for="trap-count">Trap Count</label>
            <input type="number" id="trap-count" min="0">
        </div>
        <div class="form-group">
            <label for="service-frequency">Service Frequency (Weeks)</label>
            <input type="number" id="service-frequency" min="1">
        </div>
    </div>
    
    <!-- Access Requirements -->
    <div class="form-grid">
        <div class="form-group">
            <label for="hose-length">Hose Length Required</label>
            <input type="text" id="hose-length" placeholder="e.g., 50ft">
        </div>
        <div class="form-group">
            <label for="preferred-time">Preferred Service Time</label>
            <input type="text" id="preferred-time" placeholder="e.g., Before 10am">
        </div>
    </div>
    <div class="form-group">
        <label><input type="checkbox" id="requires-tanker"> Requires Tanker</label>
    </div>
    
    <!-- Flexible Attributes -->
    <div class="custom-fields-section">
        <label>Custom Attributes</label>
        <div id="custom-fields-container">
            <!-- Dynamic key-value rows -->
        </div>
        <button type="button" id="add-custom-field">+ Add Field</button>
    </div>
</div>
```

## Verification

### Build Verification
```bash
npm run build
```

### Manual UI Testing

1. **Create location with metadata:**
   - Navigate to Locations page
   - Click "+ New Location"
   - Fill required fields (name, type, address)
   - Add 2-3 tags
   - Set Capacity (Gallons) = 500
   - Set Trap Count = 2
   - Set Service Frequency = 4 weeks
   - Check "Requires Tanker"
   - Add custom field: Key="access_code", Value="1234"
   - Save - verify success

2. **Edit location - verify metadata loads:**
   - Click edit on the created location
   - Verify all metadata fields are populated correctly
   - Modify Trap Count to 3
   - Save - verify update succeeds

3. **Verify address autocomplete still works:**
   - Create new location
   - Type address - verify suggestions appear
   - Select suggestion - verify coordinates populate

## Estimated Effort

3-4 hours (includes CSS styling and thorough testing)
