# Plan: Issue #41 - Add UI for Managing Tags on Drivers and Locations

## Overview

Add tag management UI to drivers and locations pages, following the existing pattern in `customers.html`. Backend support already exists from PR #40.

## Files to Modify

### Display Tags in List Views

#### `shared/public/drivers.html` & `web-launcher/public/drivers.html`
- Add Tags column to the drivers table
- Render tags using the same styled spans pattern from customers.html
- Update JavaScript to read `tags` array from driver objects

#### `shared/public/locations.html` & `web-launcher/public/locations.html`
- Add Tags column to the locations table
- Render tags using the same styled spans pattern from customers.html
- Update JavaScript to read `tags` array from location objects

### Add Tag Input to Forms

#### Driver Create/Edit Modal
- Add tag input field below existing fields
- Implement tag chip UI with delete buttons
- Add comma-separated or enter-key tag creation
- Wire up to form submission

#### Location Create/Edit Modal
- Add tag input field below existing fields
- Implement tag chip UI with delete buttons
- Add comma-separated or enter-key tag creation
- Wire up to form submission

## Implementation Pattern

### Tag Display (from customers.html)
```javascript
const tags = entity.tags || [];
const tagsHtml = tags.map(tag => 
  `<span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-right: 4px;">${tag}</span>`
).join('');
```

### Tag Input Component
```html
<div class="form-group">
  <label>Tags</label>
  <div class="tag-input-container">
    <div id="tagChips" class="tag-chips"></div>
    <input type="text" id="tagInput" placeholder="Add tag and press Enter">
  </div>
</div>
```

### Tag Input JavaScript
```javascript
let currentTags = [];

tagInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const tag = tagInput.value.trim();
    if (tag && !currentTags.includes(tag)) {
      currentTags.push(tag);
      renderTagChips();
    }
    tagInput.value = '';
  }
});

function renderTagChips() {
  tagChips.innerHTML = currentTags.map((tag, i) => 
    `<span class="tag-chip">${tag} <span class="tag-remove" data-index="${i}">×</span></span>`
  ).join('');
}
```

## Task Sequence

1. **Update drivers.html** - Add tags column and display logic
2. **Update locations.html** - Add tags column and display logic
3. **Add tag input to driver form** - Create/edit modal
4. **Add tag input to location form** - Create/edit modal
5. **Add CSS styles** - Tag chips and input styling
6. **Test with demo data** - Verify tags display and save correctly

## Out of Scope (Optional Enhancements)

- Autocomplete suggestions from existing tags
- Tag filter dropdowns on list views

These can be added in a follow-up issue if needed.

## Verification

- [ ] Tags display in driver list view
- [ ] Tags display in location list view
- [ ] Can add tags when creating driver
- [ ] Can add tags when editing driver
- [ ] Can remove individual tags from driver
- [ ] Can add tags when creating location
- [ ] Can add tags when editing location
- [ ] Can remove individual tags from location
- [ ] Tags persist after page refresh
