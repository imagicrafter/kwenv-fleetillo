# Tasks: Issue #47 - Automated Issue Triage via DigitalOcean Function

## Overview

Implement a DigitalOcean Function that receives GitHub webhooks and automatically triages new issues using AI analysis.

## Tasks

- [ ] 0. Create Feature Branch
  - Create `issue/47-do-triage-function`

### Phase 0: Shared Infrastructure & Database

- [ ] 1. Shared Commands Setup
  - [ ] 1.1 Create/verify shared `agent-commands` repo logic
  - [ ] 1.2 Configure function to consume shared logic

- [ ] 2. Database Registration Table
  - [ ] 2.1 Create migration for `repo_registrations` table
    - Columns: `full_name`, `is_active`, `config`
    - _Requirements: 7.1_
  - [ ] 2.2 Seed initial repo (current project)
  - [ ] 2.3 Create RLS policies for security (if publicly accessible)

---

### Phase 1: Function Setup & Validation

- [ ] 3. Webhook Handling with Lookup
  - [ ] 3.1 Implement generic webhook receiver
  - [ ] 3.2 Add Supabase client to Function
  - [ ] 3.3 Implement `validateRepo` lookup against Supabase
    - _Requirements: 7.2, 7.3_

- [ ] 2. Webhook Signature Validation
  - [ ] 2.1 Implement HMAC-SHA256 validation
    - _Requirements: 1.3, 5.1_
  - [ ] 2.2 Add error handling for invalid signatures
    - _Requirements: 1.4_

- [ ] 3. Checkpoint - Function Skeleton
  - Deploy to DO and verify webhook receives test events

---

### Phase 2: Core Logic

- [ ] 4. Skip Logic Implementation
  - [ ] 4.1 Parse existing labels from payload
  - [ ] 4.2 Check for triage labels
    - _Requirements: 2.1, 2.2_
  - [ ] 4.3 Add logging for skipped issues
    - _Requirements: 2.3_

- [ ] 5. AI Analysis Integration
  - [ ] 5.1 Create analyzer module
  - [ ] 5.2 Build analysis prompt with 7 factors
    - _Requirements: 3.2_
  - [ ] 5.3 Integrate with DO GenAI
    - _Requirements: 3.1_
  - [ ] 5.4 Parse AI response to extract score
    - _Requirements: 3.3_
  - [ ] 5.5 Add error handling for AI failures
    - _Requirements: 3.4_

- [ ] 6. Checkpoint - Analysis Working
  - Test with sample payloads, verify scoring

---

### Phase 3: GitHub Integration

- [ ] 7. GitHub API Client
  - [ ] 7.1 Implement label application
    - _Requirements: 4.1, 4.2, 4.3_
  - [ ] 7.2 Implement comment posting
    - _Requirements: 4.4_
  - [ ] 7.3 Use minimal token scopes
    - _Requirements: 4.5_

- [ ] 8. Checkpoint - Full Flow
  - Test complete flow: webhook → analysis → label

---

### Phase 4: Security & Deployment

- [ ] 9. Security Hardening
  - [ ] 9.1 Environment variable configuration
    - _Requirements: 5.2_
  - [ ] 9.2 Rate limiting
    - _Requirements: 5.3_
  - [ ] 9.3 Secret-safe error logging
    - _Requirements: 5.4_

- [ ] 10. GitHub Webhook Configuration
  - [ ] 10.1 Create webhook in repository settings
  - [ ] 10.2 Configure secret
  - [ ] 10.3 Select events (issues: opened, reopened)

- [ ] 11. Final Checkpoint
  - Create test issue, verify automatic triage
  - Verify labels and comment applied

---

## Notes

- Uses same 7-factor scoring as manual `/issue-check`
- Only triggers on `opened` and `reopened` events
- Related: Issue #13 (log monitoring) uses similar DO function pattern

## Dependencies

- DigitalOcean account with Functions enabled
- GitHub PAT with `issues:write` scope
- DO GenAI access (or alternative AI provider)
