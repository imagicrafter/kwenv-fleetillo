# Implementation Plan: Issue #80 - Add Tags Support for Bookings

## Overview

Add user-facing tags functionality to the bookings UI, enabling users to add, view, edit, and filter bookings by tags. The backend support for tags already exists; this issue focuses on frontend implementation in `bookings.html` and `booking-create.html`.

## Requirements

1. Display tags as colored badges/chips on the bookings table
2. Add tag input field to booking create/edit modal
3. Add tags filter dropdown to the bookings filter bar
4. Support comma-separated tag input with chip display
5. Persist tags through API on create/update operations
6. Enable filtering bookings by one or more tags (OR logic)

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Frontend-only changes, no schema changes | **Low** | Backend already complete |
| Tag input UX complexity | Medium | Reuse patterns from drivers.html/vehicles.html |
| Filter dropdown with many tags | Medium | Limit initial display, add search |
| Breaking existing functionality | Low | Additive changes only |

## Architecture Analysis

### Backend Status (ALREADY COMPLETE)

The following files already have full tags support:

| File | Status | Tags Functionality |
|------|--------|-------------------|
| `src/types/booking.ts` | Complete | `tags?: string[]` in all interfaces |
| `src/services/booking.service.ts` | Complete | `query.contains('tags', filters.tags)` |
| `src/controllers/booking.controller.ts` | Complete | Parses `tags` query param |
| `supabase/migrations/20251227073000_create_bookings_table.sql` | Complete | `tags TEXT[] DEFAULT '{}'` with GIN index |

### Frontend Files Requiring Changes

| File | Change Required |
|------|-----------------|
| `web-launcher/public/bookings.html` | Tags column, filter, modal input |
| `src/public/booking-create.html` | Tags input section |

## Implementation Phases

### Phase 1: Tags Display in Bookings Table

**File: `web-launcher/public/bookings.html`**

1. **Add Tags Column to Table Header**
   - Add new `<th>Tags</th>` column between Status and Price
   - Why: Show tags in the main bookings list

2. **Render Tags as Chips in Table Body**
   - In JS `renderBookingsTable()` function, add tag chip rendering
   - Use `.tag-chip` CSS class (already used in drivers.html, locations.html)
   - Example output:
     ```html
     <td class="tags-cell">
       <span class="tag-chip">urgent</span>
       <span class="tag-chip">priority</span>
     </td>
     ```

3. **Add Tag Chip CSS Styles**
   - Style: `background: rgba(88, 166, 255, 0.2); color: #58a6ff; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem;`

### Phase 2: Tags Filter in Filter Bar

**File: `web-launcher/public/bookings.html`**

1. **Add Tags Filter Dropdown**
   - Multi-select dropdown for tags
   - HTML:
     ```html
     <div class="filter-group">
       <label>Tags</label>
       <select id="filter-tags" multiple>
         <option value="">All Tags</option>
         <!-- Populated dynamically -->
       </select>
     </div>
     ```

2. **Load Available Tags from API**
   - Create function `loadTagsFilter()` that fetches distinct tags
   - Query bookings API and extract unique tags from results

3. **Apply Tags Filter to API Query**
   - Modify `loadBookings()` function to include `tags` parameter
   - Example: `?tags=urgent,priority` (comma-separated)

4. **Update Clear Filters to Reset Tags**

### Phase 3: Tags Input in Modal

**File: `web-launcher/public/bookings.html`**

1. **Add Tags Input Section to Modal Form**
   ```html
   <div class="form-group">
     <label for="booking-tags">Tags</label>
     <div class="tags-input-container">
       <div id="booking-tags-chips" class="tag-chips-container"></div>
       <input type="text" id="booking-tags-input"
              placeholder="Type a tag and press Enter or comma">
     </div>
     <p class="field-hint">Press Enter or comma to add a tag</p>
   </div>
   ```

2. **Implement Tag Input Behavior**
   - Functions needed:
     - `addTag(tag)` - Add chip to container
     - `removeTag(tag)` - Remove chip
     - `getSelectedTags()` - Return array of tag strings
     - `setSelectedTags(tags)` - Populate chips from array

3. **Include Tags in Form Submission**
   - Modify form submit handler: `payload.tags = getSelectedTags()`

4. **Populate Tags When Editing Existing Booking**
   - In `openEditModal()`, call `setSelectedTags(booking.tags || [])`

5. **Clear Tags on Modal Close/Reset**

### Phase 4: Tags in Create Booking Page

**File: `src/public/booking-create.html`**

1. Add tags input section (same as modal)
2. Copy tag input JavaScript
3. Include tags in create payload

### Phase 5: CSS and Polish

1. Tag chip styles
2. Tag color variations (optional)
3. Responsive adjustments
4. "+N more" indicator for overflow

## Affected Files Summary

| File | Type | Changes |
|------|------|---------|
| `web-launcher/public/bookings.html` | Frontend | Tags column, filter, modal input |
| `src/public/booking-create.html` | Frontend | Tags input section |

## Testing Strategy

### Integration Tests
- Verify `GET /api/v1/bookings?tags=urgent` returns filtered results

### E2E Tests
**File: `tests/e2e/booking-tags.e2e.spec.ts`** (New)

1. Tag Display Test: Create booking with tags, verify tags show in table
2. Tag Filter Test: Filter by tag, verify only matching bookings shown
3. Tag Create Test: Add tags in create form, verify saved to API
4. Tag Edit Test: Edit booking to add/remove tags, verify persisted
5. Tag Clear Test: Clear tags, verify empty array saved

## Success Criteria

- [ ] Tags display as chips in bookings table
- [ ] Tags filter dropdown works with single and multiple tag selection
- [ ] Tags can be added via Enter or comma key in modal
- [ ] Tags persist when creating new booking
- [ ] Tags persist when editing existing booking
- [ ] Tags can be cleared/removed individually
- [ ] Tags work in booking-create.html page
- [ ] E2E tests pass for all tag operations
