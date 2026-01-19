# Tasks: Issue #10 - AI Assistant GitHub Issues Support

## Overview

Implement GitHub issue creation and status tracking through the OptiRoute AI Assistant. This uses a sub-agent architecture where the main support agent detects issue-related intent and hands off to a specialized Issue Agent that guides users through the issue creation workflow.

## Tasks

- [ ] 0. Create Feature Branch
  - Create `issue/10-github-issues-support`

- [ ] 1. Database Setup
  - [ ] 1.1 Create Supabase migration for `user_issue_mappings` table
    - Schema: `id UUID`, `conversation_id TEXT`, `github_issue_number INTEGER`, `issue_type TEXT`, `created_at TIMESTAMPTZ`
    - Index on `conversation_id`
    - _Requirements: 4.5, 5.1_
  - [ ] 1.2 Grant table permissions to existing roles
    - `authenticated`: SELECT, INSERT
    - `optiroute_viewer`: SELECT

- [ ] 2. Checkpoint - Database Ready
  - Verify migration applies cleanly
  - Test table access with roles

- [ ] 3. GitHub Tool Implementation
  - [ ] 3.1 Create `gradient-agents/optiroute-support-agent/tools/github.py`
    - Implement `GitHubTool` class with `api_base` and `repo` configuration
    - Implement `create_issue(title, body, labels, metadata)` method
    - Implement `get_issue(issue_number)` method
    - Implement `list_user_issues(conversation_id)` method using Supabase mapping
    - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2_
  - [ ] 3.2 Add input sanitization for markdown injection prevention
    - Escape user-provided content in issue body
    - _Requirements: 6.4_
  - [ ] 3.3 Add rate limit awareness
    - Check X-RateLimit-Remaining header
    - Return warning when limit approaching
    - _Requirements: 6.2, 6.3_
  - [ ] 3.4 Write unit tests for `GitHubTool`
    - Mock GitHub API responses
    - Test success/failure cases
    - Test rate limiting behavior
    - _Requirements: 7.2_

- [ ] 4. Checkpoint - GitHub Tool Complete
  - Unit tests pass
  - Manual test: create test issue via tool

- [ ] 5. Issue Agent Implementation
  - [ ] 5.1 Create `gradient-agents/optiroute-issue-agent/` directory structure
    - `main.py`, `tools/`, `requirements.txt`
  - [ ] 5.2 Implement Issue Agent system prompt
    - Classification logic for bug/enhancement/question
    - Detail gathering workflow
    - Draft generation template
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2_
  - [ ] 5.3 Add `create_github_issue` tool to agent's TOOLS_SCHEMA
    - Parameters: title, body, issue_type
    - _Requirements: 4.1_
  - [ ] 5.4 Add `get_issue_status` tool to agent's TOOLS_SCHEMA
    - Parameters: issue_number
    - _Requirements: 5.1, 5.2_
  - [ ] 5.5 Implement handoff return protocol
    - Return `{"handoff": "support-agent", "result": {...}}` when complete
    - _Requirements: Design: Handoff Protocol_

- [ ] 6. Checkpoint - Issue Agent Complete
  - Agent responds correctly to issue scenarios
  - Draft generation working

- [ ] 7. Support Agent Intent Detection
  - [ ] 7.1 Add intent detection prompt to `optiroute-support-agent/main.py`
    - Bug indicators: "isn't working", "found a bug", "there's an error"
    - Feature indicators: "I wish", "can you add", "feature request"
    - _Requirements: 1.1, 1.2, 1.4, 1.5_
  - [ ] 7.2 Implement handoff response for detected intent
    - Return `{"handoff": "issue-agent", "context": {...}}`
    - Pass detected type and initial description
    - _Requirements: 1.4_

- [ ] 8. Checkpoint - Intent Detection Complete
  - Test phrases trigger handoff
  - Context passes correctly

- [ ] 9. Server-Side GitHub Proxy
  - [ ] 9.1 Add GitHub API proxy endpoints to `web-launcher/server.js`
    - POST `/api/github/issues` - create issue
    - GET `/api/github/issues/:number` - get status
    - _Requirements: 4.1, 5.1_
  - [ ] 9.2 Add GITHUB_PAT environment variable handling
    - Read from `process.env.GITHUB_PAT`
    - Return 500 if not configured
    - _Requirements: 6.1_
  - [ ] 9.3 Implement request sanitization
    - Validate required fields
    - Sanitize title and body
    - _Requirements: 6.4_
  - [ ] 9.4 Store issue mapping to Supabase on creation
    - Insert conversation_id + issue_number mapping
    - _Requirements: 4.5_

- [ ] 10. Checkpoint - Proxy Endpoints Complete
  - Test POST creates issue in GitHub
  - Test GET retrieves status
  - Mapping stored in database

- [ ] 11. Agent Router Integration
  - [ ] 11.1 Update router in `web-launcher/server.js` to detect handoff signals
    - Parse agent response for `{"handoff": "issue-agent"}`
    - Route subsequent messages to issue agent endpoint
    - _Requirements: Design: Agent Handoff Flow_
  - [ ] 11.2 Implement agent state tracking in session
    - Store current agent in session
    - Handle return handoff to support agent
  - [ ] 11.3 Pass conversation_id for issue mapping
    - Generate or reuse conversation ID
    - Pass to issue agent for storage

- [ ] 12. Checkpoint - Multi-Agent Routing Complete
  - Handoff from support to issue agent works
  - Return to support agent works
  - Conversation ID persists

- [ ] 13. Quick Reply Bubbles (UI)
  - [ ] 13.1 Add quick reply component to chat interface
    - Render selectable bubbles below assistant messages
    - Bubbles disappear on selection or new message
  - [ ] 13.2 Add welcome message bubbles
    - "I have an issue", "Request a feature", "Check issue status"
  - [ ] 13.3 Add draft review bubble
    - "Looks Good" button after draft presentation
  - [ ] 13.4 Add post-submission bubbles
    - "Report Another Issue", "Done"

- [ ] 14. Checkpoint - UI Complete
  - Quick replies render correctly
  - Clicking bubble sends message
  - All workflow stages have appropriate bubbles

- [ ] 15. Integration Testing
  - [ ] 15.1 End-to-end bug report flow
    - Detect intent → gather details → show draft → create issue → confirm
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 4.3_
  - [ ] 15.2 End-to-end feature request flow
    - _Requirements: 1.2, 2.2, 3.1, 4.2_
  - [ ] 15.3 Issue status query flow
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ] 15.4 Error handling tests
    - GitHub API failure
    - Rate limit exceeded
    - Network timeout
    - _Requirements: 4.4, 6.2, 6.3, 7.2_

- [ ] 16. Checkpoint - Feature Complete
  - All integration tests pass
  - Manual testing done for all workflows

- [ ] 17. Documentation & Cleanup
  - [ ] 17.1 Add environment variable documentation
    - `GITHUB_PAT` - GitHub personal access token
    - `GITHUB_REPO` - Target repository (default: imagicrafter/optiroute)
  - [ ] 17.2 Update agent README with issue agent info
  - [ ] 17.3 Add error logging for audit trail
    - Log all issue creation attempts
    - _Requirements: 7.3_

- [ ] 18. Final Checkpoint
  - All tests pass
  - Build succeeds
  - Environment documentation complete
  - Ready for deployment

## Notes

- The GitHub PAT must have `repo` scope for issue creation
- Rate limits: 5000 requests/hour for authenticated requests
- Conversation context maintained for 1 hour (session timeout)
- Issue agent runs as separate Gradient deployment or inline based on architecture
- The `user-submitted` label will be auto-applied to all assistant-created issues
