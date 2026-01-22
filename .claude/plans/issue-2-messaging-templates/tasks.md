# Tasks: Issue #2 - Messaging Templates

## Overview

Implement database-backed messaging templates with a UI for customization, Handlebars-style variable substitution, and version history for rollback.

## Tasks

- [ ] 0. Create Feature Branch
  - Create `issue/2-messaging-templates`
  - Branch from main

---

### Phase 1: Database Schema

- [ ] 1. Create Database Migration
  - [ ] 1.1 Create `message_templates` table
    - name, channel, subject, body, variables (JSONB)
    - is_default, is_active, timestamps
    - Unique constraint on (name, channel)
    - _Requirements: 1_
  - [ ] 1.2 Create `template_versions` table
    - template_id, version, subject, body, changed_by
  - [ ] 1.3 Create indexes for channel and name lookups

- [ ] 2. Seed Default Templates
  - [ ] 2.1 Create seed script for default templates
  - [ ] 2.2 Add: dispatch_request (telegram, email)
  - [ ] 2.3 Add: dispatch_confirmed (telegram, email)

- [ ] 3. Checkpoint - Schema Ready
  - Migration runs successfully
  - Default templates seeded

---

### Phase 2: Template Repository

- [ ] 4. Create Template Repository
  - [ ] 4.1 Create `src/services/template.repository.ts`
  - [ ] 4.2 Implement `findByNameAndChannel()`
  - [ ] 4.3 Implement `findAll()` with channel filter
  - [ ] 4.4 Implement `create()` with syntax validation
  - [ ] 4.5 Implement `update()` with version creation
  - [ ] 4.6 Implement `delete()` (soft delete)
    - _Requirements: 1, 3_

- [ ] 5. Checkpoint - Repository Works
  - CRUD operations work against Supabase

---

### Phase 3: Template Engine Enhancement

- [ ] 6. Enhance Template Engine
  - [ ] 6.1 Add database template loading to existing `TemplateEngine`
  - [ ] 6.2 Implement in-memory cache with TTL
  - [ ] 6.3 Implement file fallback loader
  - [ ] 6.4 Add cache invalidation method
  - [ ] 6.5 Add syntax validation with error reporting
    - _Requirements: 2, 5_

- [ ] 7. Create Variable Registry
  - [ ] 7.1 Define standard variables list
  - [ ] 7.2 Add `getAvailableVariables()` method
  - [ ] 7.3 Add variable validation at render time

- [ ] 8. Checkpoint - Engine Works
  - Can load templates from DB
  - Falls back to file if DB unavailable
  - Caching works correctly

---

### Phase 4: API Layer

- [ ] 9. Add Template API Routes
  - [ ] 9.1 Add to dispatch-service routes
  - [ ] 9.2 Implement `templates.getAll` handler
  - [ ] 9.3 Implement `templates.getById` handler
  - [ ] 9.4 Implement `templates.create` handler
  - [ ] 9.5 Implement `templates.update` handler
  - [ ] 9.6 Implement `templates.delete` handler
  - [ ] 9.7 Implement `templates.validate` handler
    - _Requirements: 3_

- [ ] 10. Add Version Endpoints
  - [ ] 10.1 Implement `templates.getVersions`
  - [ ] 10.2 Implement `templates.rollback`
    - _Requirements: 6_

- [ ] 11. Checkpoint - API Works
  - All CRUD endpoints functional
  - Validation endpoint returns errors for invalid templates

---

### Phase 5: Admin UI

- [ ] 12. Create Templates Page
  - [ ] 12.1 Create `templates.html` in web-launcher/public
  - [ ] 12.2 Add channel tabs (Telegram, Email, SMS)
  - [ ] 12.3 Add template list table with actions
  - [ ] 12.4 Add "New Template" button
    - _Requirements: 4_

- [ ] 13. Create Template Editor Modal
  - [ ] 13.1 Create modal with name, channel, subject, body fields
  - [ ] 13.2 Add variables sidebar with click-to-insert
  - [ ] 13.3 Add live preview panel with sample data
  - [ ] 13.4 Add syntax validation on save
  - [ ] 13.5 Connect to API for create/update
    - _Requirements: 4_

- [ ] 14. Add Navigation Link
  - [ ] 14.1 Add "Templates" link to admin navigation

- [ ] 15. Checkpoint - UI Works
  - Can view, create, edit, delete templates
  - Live preview updates correctly

---

### Phase 6: Integration & Testing

- [ ] 16. Update Dispatch Flow
  - [ ] 16.1 Update dispatch message sending to use enhanced TemplateEngine
  - [ ] 16.2 Verify Telegram messages use DB templates
  - [ ] 16.3 Verify email messages use DB templates

- [ ] 17. Write Tests
  - [ ] 17.1 Unit tests for template rendering
  - [ ] 17.2 Unit tests for syntax validation
  - [ ] 17.3 Integration tests for CRUD API

- [ ] 18. Final Checkpoint
  - All tests pass
  - Dispatch flow uses DB templates
  - UI fully functional
  - Ready for deployment

## Notes

- Handlebars syntax: `{{variable_name}}`
- File-based templates remain as fallback
- Default templates seeded on first deployment
- Version history enables rollback if needed
