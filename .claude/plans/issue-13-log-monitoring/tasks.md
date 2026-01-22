# Tasks: Issue #13 - Automated DigitalOcean Log Monitoring

## Overview

Implement a DigitalOcean Function that runs daily to detect errors in logs and triage them with LLM analysis, storing results in Supabase.

## Tasks

- [ ] 0. Create Feature Branch
  - Create `issue/13-log-monitoring`
  - Branch from main

---

### Phase 1: Database Schema

- [ ] 1. Create Database Migration
  - [ ] 1.1 Create `detected_errors` table
    - fingerprint, error_message, stack_trace, service_name
    - first_seen, last_seen, occurrence_count
    - context_logs (JSONB), analysis (JSONB)
    - status (new, acknowledged, resolved, ignored)
    - _Requirements: 4_
  - [ ] 1.2 Create `error_log_entries` table
    - detected_error_id, raw_log, timestamp, log_level
  - [ ] 1.3 Create indexes for fingerprint, status, last_seen

- [ ] 2. Checkpoint - Schema Ready
  - Migration runs successfully
  - Tables exist in Supabase

---

### Phase 2: DO Function Setup

- [ ] 3. Create Function Project Structure
  - [ ] 3.1 Create `functions/log-monitor/` directory
  - [ ] 3.2 Create `project.yml` with CRON trigger (daily 6 AM UTC)
  - [ ] 3.3 Initialize `packages/default/log-monitor/` with package.json
  - [ ] 3.4 Configure TypeScript with tsconfig.json
  - [ ] 3.5 Add dependencies: @supabase/supabase-js, openai
    - _Requirements: 5_

- [ ] 4. Checkpoint - Function Scaffolding
  - Function deploys to DO (even if empty handler)
  - CRON trigger configured

---

### Phase 3: Core Services

- [ ] 5. Implement DigitalOcean API Client
  - [ ] 5.1 Create `do-client.ts`
  - [ ] 5.2 Implement `fetchLogs(appId, startTime, endTime)`
  - [ ] 5.3 Handle pagination for large log volumes
  - [ ] 5.4 Add retry logic with exponential backoff
    - _Requirements: 1_

- [ ] 6. Implement Log Parser
  - [ ] 6.1 Create `log-parser.ts`
  - [ ] 6.2 Parse JSON-formatted logs (extract level, message, timestamp)
  - [ ] 6.3 Parse unstructured text logs (pattern matching)
  - [ ] 6.4 Extract stack traces when present
    - _Requirements: 2_

- [ ] 7. Implement Fingerprinting
  - [ ] 7.1 Add `generateFingerprint()` function
  - [ ] 7.2 Normalize messages (remove timestamps, UUIDs, numbers)
  - [ ] 7.3 Include first stack frame in fingerprint
  - [ ] 7.4 Write unit tests for fingerprint consistency
    - _Requirements: 3_

- [ ] 8. Implement Context Capture
  - [ ] 8.1 Track log line positions during parsing
  - [ ] 8.2 Extract N lines before each error (configurable via env)
  - [ ] 8.3 Return context with each detected error

- [ ] 9. Checkpoint - Parsing Works
  - Can parse sample logs and generate fingerprints
  - Unit tests pass

---

### Phase 4: LLM Integration

- [ ] 10. Implement LLM Triage
  - [ ] 10.1 Create `llm-triage.ts`
  - [ ] 10.2 Build prompt with error + context
  - [ ] 10.3 Call OpenAI/Anthropic API
  - [ ] 10.4 Parse structured JSON response
  - [ ] 10.5 Handle API errors gracefully (fallback to no analysis)
    - _Requirements: 6_

- [ ] 11. Checkpoint - LLM Works
  - Can send error to LLM and receive triage response

---

### Phase 5: Database Operations

- [ ] 12. Implement Supabase Client
  - [ ] 12.1 Create `db-client.ts`
  - [ ] 12.2 Initialize Supabase with service key
  - [ ] 12.3 Implement `findByFingerprint(fingerprint)`
  - [ ] 12.4 Implement `upsertError(error, analysis)`
  - [ ] 12.5 Implement `insertLogEntry(errorId, rawLog)`
    - _Requirements: 4_

- [ ] 13. Checkpoint - DB Operations Work
  - Can read/write detected_errors table

---

### Phase 6: Main Handler

- [ ] 14. Implement Main Handler
  - [ ] 14.1 Create `index.ts` entry point
  - [ ] 14.2 Fetch logs for previous 24 hours
  - [ ] 14.3 Parse and detect error-level entries
  - [ ] 14.4 If no errors: log "no errors" and exit early
  - [ ] 14.5 For each unique fingerprint:
    - Check if exists in DB
    - If new: call LLM triage
    - Upsert to database
  - [ ] 14.6 Store raw log entries
    - _Requirements: 5, 6_

- [ ] 15. Checkpoint - End-to-End Works
  - Function runs, fetches logs, stores errors

---

### Phase 7: Deployment & Testing

- [ ] 16. Deploy to DigitalOcean
  - [ ] 16.1 Set environment variables in DO
  - [ ] 16.2 Deploy function with `doctl serverless deploy`
  - [ ] 16.3 Verify CRON trigger is scheduled

- [ ] 17. Validation Testing
  - [ ] 17.1 Manually trigger function
  - [ ] 17.2 Verify errors are detected and stored
  - [ ] 17.3 Review LLM triage quality
  - [ ] 17.4 Query detected_errors table to confirm data

- [ ] 18. Final Checkpoint
  - Function deployed and scheduled
  - Errors are being detected
  - LLM triage providing useful analysis
  - Ready for validation period

## Notes

- Phase 1 scope: Table logging only, no notifications
- Daily schedule allows validation before increasing frequency
- LLM only called when errors detected (token efficient)
- Future phases can add: notifications, GitHub issues, dashboard UI
