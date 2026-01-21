---
name: plan-check
description: Orchestrator skill that generates plans for all GitHub issues that need planning. Use this skill when issues have been triaged with 'plan: medium' or 'plan: complex' labels but don't yet have 'plan ready'. For medium issues, spawns sub-agents in parallel. For complex issues, guides human through staged approval of requirements, design, and tasks documents. Supports resuming partially completed planning sessions by detecting existing documents.
allowed-tools:
  - Bash(gh:*)
  - Bash(mkdir:*)
  - Bash(ls:*)
  - Bash(test:*)
  - Bash([*)
  - Bash(for *)
  - Bash(.claude/skills/plan-check/scripts/open_preview.sh:*)
  - Read
  - Glob
  - Grep
  - Task
  - Write
  - Edit
  - AskUserQuestion
---

# Plan Check Orchestrator

Generate plans for all triaged issues that need planning documentation.

## How to Run

Invoke the plan-check skill to start the planning workflow:
```
/plan-check
```

### What Happens

1. **Discovery** - Lists all issues with `plan: medium` or `plan: complex` labels that don't yet have `plan ready`
2. **Medium issues** - Spawns sub-agents in parallel to generate `plan.md` documents (no approval needed)
3. **Complex issues** - Runs a staged workflow with human approval gates:
   - Stage 1: Generate and review `requirements.md`
   - Stage 2: Generate and review `design.md`
   - Stage 3: Generate and review `tasks.md`
   - Stage 4: Add `plan ready` label

### Reviewing Documents

When a document is staged for review, it will be **automatically opened in VS Code preview mode** using the helper script at `.claude/skills/plan-check/scripts/open_preview.sh`.

Preview mode renders:
- Mermaid diagrams (flowcharts, sequence diagrams)
- Markdown tables
- Formatted code blocks
- Task checkboxes

After reviewing, type `approve` to proceed or provide feedback for revisions.

**Manual fallback:** If auto-preview doesn't work, press `Cmd+Shift+V` (Mac) or `Ctrl+Shift+V` (Windows/Linux).

---

## Overview

This orchestrator handles two different flows based on issue complexity:

**Medium tier:** Spawn sub-agents in parallel to generate `plan.md` documents
**Complex tier:** Interactive staged workflow with human approval gates

## IMPORTANT: Autonomous Operation

**DO NOT stop for human approval except when presenting a completed document for review.**

All of the following operations should proceed autonomously WITHOUT asking for permission:
- Listing issues from GitHub
- Checking for existing plan directories
- Reading existing plan documents
- Creating directories
- Analyzing the codebase
- Generating documents

**ONLY stop and ask for human approval AFTER:**
- A requirements.md document has been fully generated and is ready for review
- A design.md document has been fully generated and is ready for review
- A tasks.md document has been fully generated and is ready for review

When ready for review:
1. Open the document in VS Code preview mode using `open_preview.sh`
2. Use `AskUserQuestion` to get approval or feedback

## Planning Labels

| Label | Needs Planning? | Documents Required |
|-------|-----------------|-------------------|
| `plan: simple` + `plan ready` | No | None |
| `plan: medium` (no `plan ready`) | **Yes** | `plan.md` |
| `plan: complex` (no `plan ready`) | **Yes** | `requirements.md`, `design.md`, `tasks.md` |

## Process

### Step 1: List Issues Needing Plans

```bash
# Get medium issues without plan ready
gh issue list --state open --label "plan: medium" --json number,title,labels

# Get complex issues without plan ready
gh issue list --state open --label "plan: complex" --json number,title,labels
```

Filter out any that already have `plan ready` label.

### Step 2: Report Summary

```
## Plan Generation Summary

**Medium issues needing plans:** [N]
**Complex issues needing plans:** [N]

### Medium (will run in parallel):
- #[N]: [title]

### Complex (will run sequentially with approval gates):
- #[N]: [title]
```

If no issues need plans, report that and stop.

### Step 3: Handle Medium Tier Issues (Parallel)

For each medium issue, spawn a sub-agent using the Task tool:

```
Generate a plan for GitHub issue #[NUMBER].

Use the generate-plan skill instructions from .claude/skills/generate-plan/SKILL.md

Issue details:
- Number: [NUMBER]
- Title: [TITLE]
- Tier: medium

Tasks:
1. Read full issue with `gh issue view [NUMBER]`
2. Analyze the codebase to understand scope and affected files
3. Create directory: mkdir -p .claude/plans/issue-[N]-[slug]
4. Generate plan.md following the template
5. Add `plan ready` label: gh issue edit [NUMBER] --add-label "plan ready"
6. Post summary comment to the issue

Return the plan location and confirmation.
```

**Run all medium sub-agents in parallel.**

### Step 4: Handle Complex Tier Issues (Sequential with Approval)

For each complex issue, run the staged approval workflow **sequentially** (one complex issue at a time, with human approval between stages).

#### Step 4a: Detect Partial Progress

Before starting each complex issue, check for existing plan documents to determine the resume point:

```bash
# Determine plan directory (try both .agent and .claude locations)
PLAN_DIR=".agent/plans/issue-[N]-[slug]"
if [ ! -d "$PLAN_DIR" ]; then
  PLAN_DIR=".claude/plans/issue-[N]-[slug]"
fi

# Check which documents exist
HAS_REQUIREMENTS=false
HAS_DESIGN=false
HAS_TASKS=false

[ -f "$PLAN_DIR/requirements.md" ] && HAS_REQUIREMENTS=true
[ -f "$PLAN_DIR/design.md" ] && HAS_DESIGN=true
[ -f "$PLAN_DIR/tasks.md" ] && HAS_TASKS=true

# Determine resume stage
if [ "$HAS_TASKS" = true ]; then
  RESUME_STAGE="complete"
elif [ "$HAS_DESIGN" = true ]; then
  RESUME_STAGE="tasks"
elif [ "$HAS_REQUIREMENTS" = true ]; then
  RESUME_STAGE="design"
else
  RESUME_STAGE="requirements"
fi
```

**Report resume status:**

| Documents Found | Resume From | Action |
|-----------------|-------------|--------|
| None | Stage 1: Requirements | Start fresh |
| requirements.md only | Stage 2: Design | Skip requirements |
| requirements.md + design.md | Stage 3: Tasks | Skip requirements and design |
| All three documents | Stage 4: Complete | Just add label |

**If resuming:**
1. Announce: "Found existing documents for issue #[N]. Resuming from Stage [N]: [Stage Name]."
2. Proceed directly to the next stage that needs work - do NOT ask for permission to continue
3. Only stop for approval after generating a NEW document

#### Stage 1: Requirements

**Skip this stage if `requirements.md` already exists.**

**Proceed autonomously through steps 1-5, then stop for approval at step 6:**

1. Announce: "Starting planning for complex issue #[N]: [title]"
2. Read full issue: `gh issue view [NUMBER]`
3. Analyze the codebase thoroughly
4. Create directory: `mkdir -p .claude/plans/issue-[N]-[slug]`
5. Generate `requirements.md` using the generate-requirements skill template
6. **APPROVAL GATE:** Open document for review and wait for approval:

   a. **Open in Preview Mode:**
      ```bash
      .claude/skills/plan-check/scripts/open_preview.sh ".claude/plans/issue-[N]-[slug]/requirements.md"
      ```

   b. **Request Review:** Use `AskUserQuestion` with:
      - Question: "I've generated the requirements document for issue #[N] and opened it in VS Code preview mode. Please review the document."
      - Header: "Requirements"
      - Options:
        - Label: "Approve", Description: "Requirements look good, proceed to design phase"
        - Label: "Needs revision", Description: "I have feedback on the requirements"


**Wait for human approval before proceeding to Stage 2.**

If human provides feedback:
- Incorporate feedback and regenerate requirements.md
- Present again and ask for approval

#### Stage 2: Design

**Skip this stage if `design.md` already exists.**

After requirements approval (or if resuming with existing requirements.md):

**Proceed autonomously through steps 1-2, then stop for approval at step 3:**

1. Announce: "Generating design document based on approved requirements..."
2. Generate `design.md` using the generate-design skill template
   - Must reference and align with the approved requirements.md
3. **APPROVAL GATE:** Open document for review and wait for approval:

   a. **Open in Preview Mode:**
      ```bash
      .claude/skills/plan-check/scripts/open_preview.sh ".claude/plans/issue-[N]-[slug]/design.md"
      ```

   b. **Request Review:** Use `AskUserQuestion` with:
      - Question: "I've generated the design document for issue #[N] and opened it in VS Code preview mode. The document includes architecture diagrams and component interfaces. Please review."
      - Header: "Design"
      - Options:
        - Label: "Approve", Description: "Design looks good, proceed to tasks phase"
        - Label: "Needs revision", Description: "I have feedback on the design"

**Wait for human approval before proceeding to Stage 3.**

If human provides feedback:
- Incorporate feedback and regenerate design.md
- Present again and ask for approval

#### Stage 3: Tasks

**Skip this stage if `tasks.md` already exists.**

After design approval (or if resuming with existing design.md):

**Proceed autonomously through steps 1-2, then stop for approval at step 3:**

1. Announce: "Generating tasks document based on approved design..."
2. Generate `tasks.md` using the generate-tasks skill template
   - Must reference requirements from requirements.md
   - Must align with architecture from design.md
3. **APPROVAL GATE:** Open document for review and wait for approval:

   a. **Open in Preview Mode:**
      ```bash
      .claude/skills/plan-check/scripts/open_preview.sh ".claude/plans/issue-[N]-[slug]/tasks.md"
      ```

   b. **Request Review:** Use `AskUserQuestion` with:
      - Question: "I've generated the tasks document for issue #[N] and opened it in VS Code preview mode. The document includes a structured task list with checkboxes and requirement traceability. Please review."
      - Header: "Tasks"
      - Options:
        - Label: "Approve", Description: "Tasks look good, finalize planning"
        - Label: "Needs revision", Description: "I have feedback on the tasks"

**Wait for human approval before proceeding to Stage 4.**

#### Stage 4: Complete

After tasks approval (or if all documents already exist):

1. Add `plan ready` label: `gh issue edit [NUMBER] --add-label "plan ready"`
2. Post summary comment to the issue
3. Announce: "Planning complete for issue #[N]. All documents approved and 'plan ready' label added."
4. Move to next complex issue (if any)

### Step 5: Final Report

After all issues are planned:

```
## Planning Complete

### Medium Issues (parallel)
| Issue | Title | Status |
|-------|-------|--------|
| #N | ... | ✓ plan ready |

### Complex Issues (staged approval)
| Issue | Title | Status |
|-------|-------|--------|
| #N | ... | ✓ plan ready |

**Total plans created:** [N]
**All issues labeled:** plan ready

**Next steps:**
Query ready issues with: `gh issue list --label "plan ready"`
```

---

## Complex Tier Document Templates

### requirements.md Template

```markdown
# Requirements: Issue #[N] - [Title]

## Introduction
[2-3 paragraphs: feature purpose, how it fits into system, why needed]

## Glossary
- **Term1**: Definition
- **Term2**: Definition

## Requirements

### Requirement 1: [Descriptive Name]

**User Story:** As a [role], I want [capability], so that [benefit].

#### Acceptance Criteria
1. WHEN [trigger], THE system SHALL [behavior]
2. WHEN [trigger], THE system SHALL [behavior]
3. IF [condition], THEN THE system SHALL [behavior]
4. IF [error], THEN THE system SHALL [error handling]

### Requirement 2: [Descriptive Name]

**User Story:** As a [role], I want [capability], so that [benefit].

#### Acceptance Criteria
1. WHEN [trigger], THE system SHALL [behavior]
2. IF [condition], THEN THE system SHALL [behavior]

<!-- Add more requirements as needed. Each should have testable acceptance criteria. -->
```

### design.md Template

```markdown
# Design: Issue #[N] - [Title]

## Overview
[Technical approach, architecture, key design decisions]

### Key Design Decisions
1. **[Decision 1]**: [Rationale and trade-offs]
2. **[Decision 2]**: [Rationale and trade-offs]

## Architecture

\`\`\`mermaid
flowchart TB
    subgraph System["System Name"]
        A[Component A]
        B[Component B]
    end
    A --> B
    B --> DB[(Database)]
\`\`\`

### Request Flow

\`\`\`mermaid
sequenceDiagram
    participant Client
    participant API
    participant Service
    participant DB
    Client->>API: Request
    API->>Service: Process
    Service->>DB: Query
    DB-->>Service: Result
    Service-->>API: Response
    API-->>Client: Response
\`\`\`

## Components and Interfaces

### [Component Name]
[Component responsibility]

\`\`\`typescript
interface ComponentInterface {
  method1(param: ParamType): Promise<ReturnType>;
  method2(param: ParamType): ReturnType;
}
\`\`\`

## Data Models

### Database Schema
\`\`\`sql
CREATE TABLE table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column1 VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
\`\`\`

### TypeScript Types
\`\`\`typescript
interface EntityName {
  id: string;
  field1: string;
  createdAt: Date;
}
\`\`\`

## API Design

### [METHOD] [/api/v1/endpoint]
[Description]

**Request:**
\`\`\`json
{ "field1": "value" }
\`\`\`

**Response (200):**
\`\`\`json
{ "id": "uuid", "status": "success" }
\`\`\`

**Error (4xx/5xx):**
\`\`\`json
{ "error": { "code": "ERROR_CODE", "message": "description" } }
\`\`\`

## Error Handling

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| VALIDATION_ERROR | 400 | Request validation failed |
| NOT_FOUND | 404 | Resource not found |

## Testing Strategy

### Unit Tests
- [Component] - [what to verify]

### Integration Tests
- [Flow] - [what to verify]
```

### tasks.md Template

```markdown
# Tasks: Issue #[N] - [Title]

## Overview
[Brief description of implementation approach]

## Tasks

- [ ] 0. Create Feature Branch
  - Create `issue/[N]-[description]`

- [ ] 1. [Database/Infrastructure Setup]
  - [ ] 1.1 [Subtask]
    - [Details]
    - _Requirements: 1.1, 1.2_
  - [ ] 1.2 [Subtask]
    - _Requirements: 1.3_

- [ ] 2. Checkpoint - Infrastructure Complete
  - Verify migrations run
  - Verify repository functions work

- [ ] 3. [Core Logic Implementation]
  - [ ] 3.1 [Subtask]
    - _Requirements: 2.1_
  - [ ] 3.2 [Subtask]
    - _Requirements: 2.2_
  - [ ] 3.3 Write unit tests

- [ ] 4. Checkpoint - Core Logic Complete
  - Run unit tests
  - Verify functionality

- [ ] 5. [API Layer]
  - [ ] 5.1 Implement [endpoint]
    - _Requirements: 3.1_
  - [ ] 5.2 Write API tests

- [ ] 6. [UI/Integration]
  - [ ] 6.1 [Subtask]
    - _Requirements: 4.1_

- [ ] 7. Checkpoint - Feature Complete
  - All tests pass
  - Manual testing done

- [ ] 8. Documentation & Cleanup
  - [ ] 8.1 Update API docs
  - [ ] 8.2 Add code comments

- [ ] 9. Final Checkpoint
  - All tests pass
  - Build succeeds
  - Documentation updated

## Notes
- [Implementation notes]
- [Constraints]
```

---

## Error Handling

If generation fails at any stage:
- Report the error to the human
- Ask if they want to retry or skip this issue
- Do NOT add `plan ready` label to failed/skipped issues

## Output Format

```json
{
  "medium_issues": [
    {"issue": 5, "status": "success", "plan_directory": ".claude/plans/issue-5-slug/"}
  ],
  "complex_issues": [
    {
      "issue": 3,
      "status": "success",
      "plan_directory": ".claude/plans/issue-3-slug/",
      "stages": {
        "requirements": "approved",
        "design": "approved",
        "tasks": "approved"
      }
    }
  ],
  "status": "complete"
}
```
