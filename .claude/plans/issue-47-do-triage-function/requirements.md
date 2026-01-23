# Requirements: Issue #47 - Automated Issue Triage via DigitalOcean Function

## Introduction

This document defines requirements for automating GitHub issue triage through a DigitalOcean Function triggered by webhooks. Currently, issue triage requires manual execution of `/issue-check`. Automation will ensure new issues are immediately categorized, reducing contributor wait time and keeping the backlog organized.

This system integrates with the existing triage-issue skill logic, applying the same 7-factor complexity scoring system but triggered automatically on issue events.

## Glossary

- **Webhook**: HTTP callback triggered by GitHub when events occur
- **DO Function**: Serverless function running on DigitalOcean App Platform
- **Complexity Scoring**: 0-14 point system evaluating issue complexity
- **Triage Labels**: `plan: simple`, `plan: medium`, `plan: complex`

## Requirements

### Requirement 1: Webhook Integration

**User Story:** As a repository maintainer, I want new issues to be automatically triaged, so that contributors see complexity labels immediately.

#### Acceptance Criteria

1. WHEN a new issue is opened, THE system SHALL trigger the DO function within 30 seconds
2. WHEN an issue is reopened, THE system SHALL re-evaluate triage if labels are missing
3. THE system SHALL validate webhook signatures using HMAC-SHA256
4. IF webhook signature is invalid, THEN THE system SHALL reject the request with 401

### Requirement 2: Skip Logic

**User Story:** As a system, I want to skip already-triaged issues, so that labels aren't overwritten.

#### Acceptance Criteria

1. IF an issue has `plan: simple`, `plan: medium`, `plan: complex`, or `plan ready` label, THEN THE system SHALL skip triage
2. WHEN skipping, THE system SHALL return 200 OK with skip reason
3. THE system SHALL log skipped issues for monitoring

### Requirement 3: AI-Powered Analysis

**User Story:** As a triage bot, I want to use AI to analyze issue complexity, so that scoring is consistent.

#### Acceptance Criteria

1. THE system SHALL send issue title and body to an AI model for analysis
2. THE system SHALL use the 7-factor complexity scoring system
3. WHEN AI analysis completes, THE system SHALL calculate total score (0-14)
4. IF AI service is unavailable, THEN THE system SHALL log error and skip labeling

### Requirement 4: GitHub API Actions

**User Story:** As a triage bot, I want to apply labels and post comments, so that issues are properly categorized.

#### Acceptance Criteria

1. WHEN score is 0-2, THE system SHALL apply `plan: simple` and `plan ready` labels
2. WHEN score is 3-6, THE system SHALL apply `plan: medium` label
3. WHEN score is 7+, THE system SHALL apply `plan: complex` label
4. THE system SHALL post an assessment comment with scoring breakdown
5. THE system SHALL use a GitHub token with minimal scopes (issues:write)

### Requirement 6: Shared Command Infrastructure

**User Story:** As a maintainer, I want the triage logic to be identical between the local CLI and the serverless function, so that I only maintain one source of truth.

#### Acceptance Criteria

1. THE system SHALL utilize a dedicated shared repository to store command definitions and prompts
2. THE DigitalOcean Function SHALL consume the `issue-check` logic directly from this shared source
3. THE system SHALL ensure logic parity between local and cloud execution

### Requirement 7: Multi-Tenant Repo Registration

**User Story:** As an admin, I want to register which repositories are active for triage, so that the function can support multiple repos safely.

#### Acceptance Criteria

1. THE system SHALL store registered repositories in a Supabase table (`repo_registrations`)
2. WHEN a webhook is received, THE system SHALL check if the payload's `repository.full_name` exists and is active in the table
3. IF the repo is not registered, THE system SHALL ignore the webhook (return 200/403)
4. THE system SHALL allow storing specific configuration (e.g., specific branch or command version) per registered repo
