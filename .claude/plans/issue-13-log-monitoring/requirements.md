# Requirements: Issue #13 - Automated DigitalOcean Log Monitoring for Proactive Bug Detection

## Introduction

The system currently lacks visibility into runtime errors and exceptions occurring in production. This feature introduces automated log monitoring that fetches logs from DigitalOcean App Platform, detects error patterns, and logs them to a table for analysis.

**Phase 1 Scope:** Table logging only - no notifications, no GitHub integration. This enables validation and tuning of error detection before creating alerts.

## Glossary

- **Log Entry**: A single line or structured JSON object from DigitalOcean App Platform logs
- **Error Fingerprint**: A hash derived from error message and context to identify unique errors
- **Detected Error**: A record in the `detected_errors` table representing a unique error pattern

## Requirements

### Requirement 1: Log Fetching

**User Story:** As a system, I want to fetch recent logs from DigitalOcean App Platform, so that I can analyze them for errors.

#### Acceptance Criteria
1. WHEN the log monitoring job runs, THE system SHALL fetch logs from DigitalOcean API for the configured app
2. THE system SHALL support fetching logs from the last N minutes (configurable, default: 15 minutes)
3. THE system SHALL handle pagination if log volume exceeds single API response
4. IF the DigitalOcean API is unavailable, THEN THE system SHALL retry with exponential backoff
5. THE system SHALL store a watermark to avoid processing duplicate entries

### Requirement 2: Error Detection

**User Story:** As a system, I want to identify error-level log entries, so that I can process them for tracking.

#### Acceptance Criteria
1. WHEN parsing log entries, THE system SHALL identify entries with level: 'error' or 'fatal'
2. THE system SHALL extract structured data from JSON-formatted logs
3. THE system SHALL handle unstructured text logs by pattern matching for keywords: 'Error:', 'Exception:', 'FATAL'
4. THE system SHALL extract stack traces when present
5. THE system SHALL capture context (timestamp, service name, request ID if available)

### Requirement 3: Error Fingerprinting

**User Story:** As a system, I want to generate unique fingerprints for errors, so that I can correlate related occurrences.

#### Acceptance Criteria
1. THE system SHALL generate a fingerprint from: error message (normalized), stack trace top frame (if present)
2. THE fingerprint SHALL be deterministic - same error produces same fingerprint
3. THE system SHALL normalize error messages (remove timestamps, IDs, dynamic values) before fingerprinting

### Requirement 4: Table Logging

**User Story:** As a developer, I want detected errors logged to a database table, so that I can review and tune detection.

#### Acceptance Criteria
1. WHEN a new error fingerprint is detected, THE system SHALL insert a record into `detected_errors` table
2. WHEN an existing fingerprint recurs, THE system SHALL update the occurrence count and last_seen timestamp
3. THE record SHALL include: fingerprint, error_message, stack_trace, first_seen, last_seen, occurrence_count, sample_log_entry, service_name
4. THE system SHALL store raw log entries in a separate `error_log_entries` table for debugging
5. THE system SHALL provide an API endpoint to query detected errors for review

### Requirement 5: DigitalOcean Function Execution

**User Story:** As a system, I want log monitoring to run as a serverless function on a daily schedule for validation.

#### Acceptance Criteria
1. THE system SHALL deploy log monitoring as a DigitalOcean Function
2. THE function SHALL be triggered on a CRON schedule (once daily, e.g., 6:00 AM UTC)
3. THE function SHALL fetch logs via DigitalOcean API for the previous 24 hours
4. THE function SHALL complete within 60 seconds under normal conditions
5. IF the function fails, DigitalOcean SHALL log the failure
6. THE function SHALL use environment variables for: DO API token, app ID, Supabase credentials

### Requirement 6: Conditional LLM Triage

**User Story:** As a developer, I want errors analyzed by an LLM only when errors are detected, so that I don't waste tokens on clean logs.

#### Acceptance Criteria
1. THE function SHALL first perform fingerprint-based error detection (no LLM)
2. IF no errors are detected, THE function SHALL log "no errors" and complete (no LLM call)
3. IF errors are detected, THE function SHALL collect log lines preceding each error for context
4. THE function SHALL send the error + preceding context to an LLM for triage
5. THE LLM SHALL generate: error summary, likely root cause, severity assessment, suggested fix
6. THE LLM response SHALL be stored in the `detected_errors.analysis` JSONB column
7. THE preceding log lines SHALL be included in the `detected_errors.context_logs` column

## Out of Scope (Future Phases)

- GitHub issue creation (Phase 2)
- Slack/email notifications (Phase 2)
- Dashboard UI (Phase 2)
- AI-assisted error analysis (Phase 3)

## Non-Functional Requirements

- **Latency**: New errors should be logged within 15 minutes of occurrence
- **Storage**: Error records should be retained for at least 30 days
- **Security**: DigitalOcean API token must be stored securely as environment variable
