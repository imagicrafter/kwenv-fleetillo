# Implementation Plan: Issue #82 - Add Tag Management to Customer Edit Form

## Overview

Add tag management UI to the customer create/edit form in `customers.html`. The backend infrastructure (database schema, TypeScript types, service layer) is already complete. This is a frontend-only implementation following the established tag input patterns from `drivers.html` and `locations.html`.

## Requirements

1. Add tag input field to customer create/edit modal
2. Display tags as removable chips in the form
3. Allow adding tags via Enter key or comma separator
4. Persist tags when creating/updating customers via API
5. Pre-populate tags when editing an existing customer
6. Clear tags when modal closes or form resets

## Risk Assessment

| Risk | Level | Description | Mitigation |
|------|-------|-------------|------------|
| Backend changes | **None** | Backend fully supports tags | Already complete |
| Pattern complexity | **Low** | Exact patterns exist in drivers.html | Copy and adapt |
| Form validation | **Low** | Tag input is optional | Non-breaking addition |
| UI consistency | **Low** | Must match existing tag UI | Use same CSS classes |
| Breaking existing form | **Low** | Additive changes only | No modifications to existing fields |

## Architecture Analysis

### Backend Status: COMPLETE

| Component | File | Status |
|-----------|------|--------|
| Database Schema | `supabase/migrations/20260120000000_create_fleetillo_schema.sql:71` | `tags TEXT[]` exists |
| TypeScript Types | `src/types/customer.ts` | All interfaces include `tags` |
| Service Layer | `src/services/customer.service.ts` | Tags filtering and CRUD |
| API Client | `web-launcher/public/js/api-client.js` | Generic proxy works |

### Frontend Status: PARTIAL

| Component | File | Status |
|-----------|------|--------|
| Table Display | `customers.html:704-706` | Tags shown in table |
| Tag Input UI | `customers.html` | **MISSING** - Needs implementation |
| Tag Management JS | `customers.html` | **MISSING** - Needs implementation |
| CSS Styles | `customers.html` | **MISSING** - Needs tag-chip styles |

## Implementation Phases

### Phase 1: Add Tag Chip CSS Styles

**File**: `web-launcher/public/customers.html`
**Location**: Inside `<style>` section (after line 530)

Add `.tag-chip` and `.tag-chip .tag-remove` styles matching drivers.html pattern.

### Phase 2: Add Tag Input Field to Modal Form

**File**: `web-launcher/public/customers.html`
**Location**: Inside `<form id="add-customer-form">`, before `<div class="form-actions">` (around line 294)

Add tag input form group with:
- Container div with flex-wrap styling
- Chips container (`#customer-tag-chips`)
- Text input (`#customer-tag-input`)
- Helper text for Enter/comma instructions

### Phase 3: Add Tag Management JavaScript

**File**: `web-launcher/public/customers.html`
**Location**: Inside `<script>` block

1. Add `currentCustomerTags` state variable
2. Add `renderCustomerTagChips()` function - renders chips with remove buttons
3. Add `setupCustomerTagInput()` function - handles Enter/comma key events
4. Initialize on DOMContentLoaded

### Phase 4: Integrate Tags with Form Operations

1. **openModal(false)**: Reset `currentCustomerTags = []` and call `renderCustomerTagChips()`
2. **Edit mode**: Load existing tags from customer and render
3. **Form submission**: Include `tags: currentCustomerTags` in payload
4. **closeModal**: Clear `currentCustomerTags`

## Affected Files Summary

| File | Type | Changes |
|------|------|---------|
| `web-launcher/public/customers.html` | Frontend | CSS styles, HTML form field, JavaScript tag management |

## Testing Strategy

### Manual Testing Checklist
- [ ] Create customer with multiple tags via Enter key
- [ ] Create customer with tags via comma key
- [ ] Remove tag by clicking X button
- [ ] Duplicate tags are ignored
- [ ] Edit customer - tags pre-populate
- [ ] Edit customer - add/remove tags and save
- [ ] Cancel modal - tags reset on next open
- [ ] Tags display correctly in table

### Integration Tests
- `POST /api/v1/customers` accepts tags array
- `PUT /api/v1/customers/:id` updates tags
- `GET /api/v1/customers` returns tags

## Code Pattern Reference

Follow established patterns from:
- `web-launcher/public/drivers.html` (lines 1066-1138 for JS, 505-530 for CSS)
- `web-launcher/public/locations.html` (lines 867-909 for JS, 244-268 for CSS)

## Key Variable/Element Names

- State array: `currentCustomerTags`
- Chips container: `customer-tag-chips`
- Text input: `customer-tag-input`
- Render function: `renderCustomerTagChips()`
- Setup function: `setupCustomerTagInput()`

## Success Criteria

- [ ] Tag input field appears in customer create/edit modal
- [ ] Can add tags using Enter key
- [ ] Can add tags using comma key
- [ ] Can remove tags by clicking X button
- [ ] Duplicate tags are prevented
- [ ] Tags persist when creating new customer
- [ ] Tags pre-populate when editing existing customer
- [ ] Tags clear when closing modal
- [ ] Tags display in customer list table
- [ ] No regression in existing customer form functionality
