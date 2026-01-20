---
name: execute
description: Execute implementation for a triaged and planned GitHub issue. Handles simple, medium, and complex tiers with appropriate sub-agent delegation.
argument-hint: <plan-folder-or-issue-number>
allowed-tools:
  - Bash(gh:*)
  - Bash(git:*)
  - Bash(npm:*)
  - Bash(npx:*)
  - Bash(pytest:*)
  - Bash(python:*)
  - Bash(go:*)
  - Bash(cargo:*)
  - Bash(cat:*)
  - Bash(head:*)
  - Bash(tail:*)
  - Bash(grep:*)
  - Bash(find:*)
  - Bash(ls:*)
  - Bash(mkdir:*)
  - Bash(test:*)
  - Bash(echo:*)
  - Bash(date:*)
  - Bash(wc:*)
  - Bash(sed:*)
  - Bash(jq:*)
  - Bash([*)
  - Read
  - Write
  - Edit
  - Task
  - Grep
  - Glob
---

# Execute Planned GitHub Issue

Execute implementation for a GitHub issue that has been triaged and has approved planning documents.

## Usage

```
/execute [issue-number-or-plan-folder]
```

## Overview

This command implements a GitHub issue based on its complexity tier:

| Tier | Complexity Score | Planning Documents | Execution Model |
|------|------------------|-------------------|-----------------|
| **Simple** | 0-2 | None required | Orchestrator implements directly |
| **Medium** | 3-6 | `plan.md` | Single sub-agent with full plan |
| **Complex** | 7+ | `requirements.md`, `design.md`, `tasks.md` | Task-by-task sub-agents with context continuity |

**Key Principles:**
- Orchestrator manages workflow, state, and context distribution
- Sub-agents perform implementation work in isolated context windows
- Orchestrator passes file *paths* to sub-agents, not file contents
- Complex tier uses **context continuity** via `execution-state.json` and `journal.md`
- Execution stops only on unrecoverable test failures
- Failed executions are labeled `needs review` for human intervention

## Prerequisites

- Issue must have a tier label (`plan: simple`, `plan: medium`, or `plan: complex`)
- Plan documents must be complete for the tier
- GitHub CLI must be authenticated

---

## IMPORTANT: Autonomous Operation

**DO NOT stop for human approval during execution.**

The plan was approved during the planning phase. This command executes the plan autonomously.

**ONLY stop when:**
- All tasks complete successfully → Create PR
- Tests fail after 3 fix attempts → Label `needs review` and stop
- Infrastructure error prevents continuation → Label `needs review` and stop

---

## Step 1: Argument Resolution and Validation

**Argument**: `$ARGUMENTS` - Plan folder path or issue number

### 1.1 Parse Argument

```bash
ARG="$1"

if [[ "$ARG" =~ ^[0-9]+$ ]]; then
  # Issue number provided - find the plan folder
  PLAN_FOLDER=$(find .claude/plans -maxdepth 1 -type d -name "issue-${ARG}-*" 2>/dev/null | head -1)
  if [ -z "$PLAN_FOLDER" ]; then
    echo "ERROR: No plan folder found for issue #${ARG}"
    echo "Expected: .claude/plans/issue-${ARG}-*"
    exit 1
  fi
  ISSUE_NUMBER="$ARG"
else
  # Full path provided - normalize it
  PLAN_FOLDER="${ARG%/}"  # Remove trailing slash if present
  # Extract issue number from folder name (e.g., issue-3-vehicle-geofencing -> 3)
  ISSUE_NUMBER=$(basename "$PLAN_FOLDER" | grep -oE 'issue-[0-9]+' | grep -oE '[0-9]+')

  if [ -z "$ISSUE_NUMBER" ]; then
    echo "ERROR: Could not extract issue number from folder: $PLAN_FOLDER"
    echo "Expected format: .claude/plans/issue-<number>-<slug>"
    exit 1
  fi
fi

echo "📁 Plan folder: $PLAN_FOLDER"
echo "🎫 Issue number: #$ISSUE_NUMBER"
```

### 1.2 Validate Plan Folder Exists

```bash
if [ ! -d "$PLAN_FOLDER" ]; then
  echo "ERROR: Plan folder does not exist: $PLAN_FOLDER"
  exit 1
fi

echo "✅ Plan folder exists"
```

### 1.3 Validate GitHub Issue Exists and Is Open

```bash
ISSUE_JSON=$(gh issue view "$ISSUE_NUMBER" --json state,title,body,labels 2>/dev/null)

if [ -z "$ISSUE_JSON" ]; then
  echo "ERROR: Could not fetch issue #$ISSUE_NUMBER"
  echo "Verify the issue exists and gh CLI is authenticated"
  exit 1
fi

ISSUE_STATE=$(echo "$ISSUE_JSON" | jq -r '.state')
ISSUE_TITLE=$(echo "$ISSUE_JSON" | jq -r '.title')
ISSUE_BODY=$(echo "$ISSUE_JSON" | jq -r '.body' | head -c 2000)

if [ "$ISSUE_STATE" != "OPEN" ]; then
  echo "ERROR: Issue #$ISSUE_NUMBER is not open (state: $ISSUE_STATE)"
  exit 1
fi

echo "✅ Issue #$ISSUE_NUMBER is open: $ISSUE_TITLE"
```

---

## Step 2: Detect Complexity Tier

### 2.1 Extract Labels

```bash
LABELS=$(echo "$ISSUE_JSON" | jq -r '.labels[].name' | tr '\n' ' ')
echo "📏 Issue labels: $LABELS"
```

### 2.2 Determine Tier from Labels

```bash
TIER=""

if echo "$LABELS" | grep -q "plan: simple"; then
  TIER="simple"
elif echo "$LABELS" | grep -q "plan: medium"; then
  TIER="medium"
elif echo "$LABELS" | grep -q "plan: complex"; then
  TIER="complex"
fi

if [ -z "$TIER" ]; then
  echo "ERROR: Issue #$ISSUE_NUMBER has no tier label"
  echo "Expected one of: 'plan: simple', 'plan: medium', 'plan: complex'"
  echo "Run the triage-issue skill first."
  exit 1
fi

echo "🎯 Detected tier: $TIER"
```

### 2.3 Validate Required Plan Documents

```bash
VALIDATION_PASSED=true
MISSING_FILES=""

case "$TIER" in
  simple)
    echo "📋 Simple tier: No plan documents required"
    ;;
  medium)
    if [ ! -f "$PLAN_FOLDER/plan.md" ]; then
      MISSING_FILES="plan.md"
      VALIDATION_PASSED=false
    else
      echo "📋 Medium tier: plan.md found"
    fi
    ;;
  complex)
    [ ! -f "$PLAN_FOLDER/requirements.md" ] && MISSING_FILES="$MISSING_FILES requirements.md"
    [ ! -f "$PLAN_FOLDER/design.md" ] && MISSING_FILES="$MISSING_FILES design.md"
    [ ! -f "$PLAN_FOLDER/tasks.md" ] && MISSING_FILES="$MISSING_FILES tasks.md"

    if [ -n "$MISSING_FILES" ]; then
      VALIDATION_PASSED=false
    else
      echo "📋 Complex tier: All plan documents found"
    fi
    ;;
esac

if [ "$VALIDATION_PASSED" = false ]; then
  echo "ERROR: Missing required plan documents:$MISSING_FILES"
  echo "Run the appropriate planning skill first."
  exit 1
fi

echo "✅ Tier validation passed: $TIER"
```

---

## Step 3: Git Setup

### 3.1 Verify GitHub CLI Access

```bash
if ! gh auth status &>/dev/null; then
  echo "ERROR: GitHub CLI not authenticated"
  echo "Run: gh auth login"
  exit 1
fi

echo "✅ GitHub CLI authenticated"
```

### 3.2 Fetch Latest and Create Feature Branch

```bash
git fetch origin

# Generate branch name from plan folder
# e.g., .claude/plans/issue-3-vehicle-geofencing -> issue/3-vehicle-geofencing
FOLDER_NAME=$(basename "$PLAN_FOLDER")
BRANCH_NAME="issue/${FOLDER_NAME#issue-}"

echo "🌿 Target branch: $BRANCH_NAME"

# Check if branch exists locally or remotely
BRANCH_EXISTS_LOCAL=$(git show-ref --verify --quiet "refs/heads/$BRANCH_NAME" && echo "yes" || echo "no")
BRANCH_EXISTS_REMOTE=$(git show-ref --verify --quiet "refs/remotes/origin/$BRANCH_NAME" && echo "yes" || echo "no")

if [ "$BRANCH_EXISTS_LOCAL" = "yes" ]; then
  echo "Branch exists locally, checking out..."
  git checkout "$BRANCH_NAME"
  git pull origin "$BRANCH_NAME" 2>/dev/null || true
elif [ "$BRANCH_EXISTS_REMOTE" = "yes" ]; then
  echo "Branch exists on remote, checking out..."
  git checkout -b "$BRANCH_NAME" "origin/$BRANCH_NAME"
else
  echo "Creating new branch from main..."
  git checkout main
  git pull origin main
  git checkout -b "$BRANCH_NAME"
fi

CURRENT_BRANCH=$(git branch --show-current)
echo "✅ On branch: $CURRENT_BRANCH"
```

---

## Step 4: Gather Context References (Orchestrator Only)

**CRITICAL**: The orchestrator gathers context *references* (paths, structure) but does NOT read file contents into its own context. This preserves context window space for orchestration logic.

### 4.1 Get Project Structure Summary

```bash
# Count source files by type (don't list all - just summarize)
echo "📊 Analyzing project structure..."

TS_COUNT=$(find . -type f -name "*.ts" -o -name "*.tsx" 2>/dev/null | grep -v node_modules | grep -v dist | wc -l)
PY_COUNT=$(find . -type f -name "*.py" 2>/dev/null | grep -v __pycache__ | grep -v venv | grep -v .venv | wc -l)
JS_COUNT=$(find . -type f -name "*.js" -o -name "*.jsx" 2>/dev/null | grep -v node_modules | grep -v dist | wc -l)
GO_COUNT=$(find . -type f -name "*.go" 2>/dev/null | wc -l)

echo "  TypeScript/TSX: $TS_COUNT files"
echo "  Python: $PY_COUNT files"
echo "  JavaScript/JSX: $JS_COUNT files"
echo "  Go: $GO_COUNT files"

# Get top-level directory structure (for sub-agent context)
PROJECT_DIRS=$(find . -maxdepth 2 -type d \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*" \
  -not -path "*/__pycache__/*" \
  -not -path "*/.venv/*" \
  -not -path "*/venv/*" \
  -not -path "*/.next/*" \
  -not -path "*/build/*" \
  | head -30)
```

### 4.2 Extract File References from Plan Documents

For medium/complex tiers, identify which files are mentioned in the plan (without reading full contents):

```bash
if [ "$TIER" != "simple" ]; then
  # Extract file paths mentioned in plan documents
  REFERENCED_FILES=$(grep -rohE '`[^`]+\.(ts|tsx|py|js|jsx|go|rs|rb|java|md|json|yaml|yml)`' "$PLAN_FOLDER"/*.md 2>/dev/null \
    | tr -d '`' \
    | sort -u \
    | head -20 \
    || echo "")

  if [ -n "$REFERENCED_FILES" ]; then
    echo "📎 Files referenced in plan:"
    echo "$REFERENCED_FILES" | sed 's/^/   /'
  fi
fi
```

### 4.3 Store Context for Sub-Agents

```bash
# These variables will be passed to sub-agents as context hints
CONTEXT_HINTS="
## Project Context

### Directory Structure
$PROJECT_DIRS

### Key Locations
- Source code: Look in src/, lib/, or project root
- Tests: Look in tests/, __tests__/, or *.test.* files
- Configuration: package.json, pyproject.toml, or similar

### Files Referenced in Plan
$REFERENCED_FILES
"
```

---

## Step 5: Detect Project Configuration

Invoke the detect-project skill to determine validation commands.

### 5.1 Run Project Detection

Read and execute the detect-project skill to set validation commands:

```bash
# Detection will set these variables:
# PROJECT_TYPE, TEST_CMD, TYPE_CHECK_CMD, LINT_CMD, FORMAT_CMD, BUILD_CMD

echo "🔍 Detecting project configuration..."
```

**Execute the detection logic from `.claude/skills/detect-project/SKILL.md`**

The skill should detect and set:

| Variable | Description | Example |
|----------|-------------|---------|
| `PROJECT_TYPE` | Primary language/framework | `node`, `python-modern`, `go` |
| `TEST_CMD` | Command to run tests | `npm test`, `pytest` |
| `TYPE_CHECK_CMD` | Type checking command | `npx tsc --noEmit`, `mypy .` |
| `LINT_CMD` | Linting command | `npx eslint .`, `ruff check .` |
| `FORMAT_CMD` | Format check command | `npx prettier --check .` |
| `BUILD_CMD` | Build command | `npm run build`, `go build ./...` |

### 5.2 Log Detected Commands

```bash
echo "📦 Project type: ${PROJECT_TYPE:-unknown}"
echo "🧪 Test command: ${TEST_CMD:-none}"
echo "📝 Type check: ${TYPE_CHECK_CMD:-none}"
echo "🔎 Lint command: ${LINT_CMD:-none}"
echo "🎨 Format check: ${FORMAT_CMD:-none}"
echo "🏗️  Build command: ${BUILD_CMD:-none}"
```

---

## Step 6: Execute by Tier

Branch to the appropriate execution path based on detected tier.

---

### 6A: Simple Tier - Direct Implementation

For simple issues (0-2 complexity), the orchestrator implements directly without spawning sub-agents.

```markdown
## Simple Tier Workflow

Simple issues typically involve:
- Single file changes
- Bug fixes with clear scope
- Documentation updates
- Configuration changes

**Process:**
1. Analyze the GitHub issue requirements
2. Identify affected file(s) - typically 1-2
3. Implement the fix directly
4. Run tests to verify no regressions
5. Proceed to validation and PR creation
```

**Implementation approach:**

```
For this simple issue, implement the fix directly:

Issue #$ISSUE_NUMBER: $ISSUE_TITLE

Description:
$ISSUE_BODY

Steps:
1. Identify the file(s) that need changes based on the issue description
2. Read those specific files to understand current implementation
3. Make the minimal changes needed to address the issue
4. If tests exist for the affected code, ensure they still pass
5. If the fix warrants a new test, add one

Constraints:
- Keep changes minimal and focused
- Follow existing code patterns
- Do not refactor unrelated code
```

**After implementation, proceed to Step 7 (Validation).**

---

### 6B: Medium Tier - Single Sub-Agent

For medium issues (3-6 complexity), spawn ONE sub-agent with the full `plan.md` context.

#### 6B.1 Prepare Sub-Agent Context

```bash
# Get task count from plan.md
TASK_COUNT=$(grep -cE "^- \[ \]" "$PLAN_FOLDER/plan.md" 2>/dev/null || echo "0")
echo "📋 Found $TASK_COUNT tasks in plan.md"
```

#### 6B.2 Spawn Implementation Sub-Agent

Use the **Task** tool to spawn a sub-agent with this prompt:

```
Implement a medium-complexity GitHub issue. Complete ALL tasks in sequence.

## Issue Context
- **Issue**: #$ISSUE_NUMBER - $ISSUE_TITLE
- **Branch**: $BRANCH_NAME
- **Tier**: Medium (3-6 complexity score)

## Your Instructions

1. **Read the plan file**: `$PLAN_FOLDER/plan.md`
   - This contains the implementation approach and task list
   - Follow the tasks in order

2. **Explore the codebase** as needed:
   - Read files referenced in the plan
   - Understand existing patterns before making changes

3. **Implement each task** in sequence:
   - Complete one task fully before starting the next
   - Follow existing code patterns and conventions
   - Add appropriate error handling

4. **Run tests** after completing all tasks:
   - Execute: `$TEST_CMD`
   - Fix any test failures before reporting back

5. **Report back** with:
   - Summary of changes made
   - List of files created/modified
   - Test results (pass/fail with details)
   - Any issues encountered

$CONTEXT_HINTS

## Rules
- Follow existing code patterns in the repository
- Add tests for new functionality
- Do NOT create commits (orchestrator handles this)
- Do NOT create PRs (orchestrator handles this)
- Do NOT modify files outside the scope of the plan

## Begin
Start by reading `$PLAN_FOLDER/plan.md` to understand the full implementation plan.
```

#### 6B.3 Process Sub-Agent Response

After the sub-agent completes, parse its response:

```
Parse the sub-agent response for:
1. TEST_STATUS: Did tests pass? (yes/no)
2. CHANGES_SUMMARY: What was implemented
3. FILES_CHANGED: List of files created/modified
4. ISSUES_ENCOUNTERED: Any problems or blockers

IF TEST_STATUS = "yes":
  → Proceed to Step 7 (Validation)

IF TEST_STATUS = "no":
  → Proceed to Error Handling (Step 9)
```

---

### 6C: Complex Tier - Task-by-Task Sub-Agents with Context Continuity

For complex issues (7+ complexity), the orchestrator tracks state using **context continuity files** and spawns separate sub-agents for each task with progressive disclosure.

#### 6C.1 Initialize Context Continuity Files

Before executing any tasks, create state tracking files:

```bash
echo "📝 Initializing context continuity files..."

# Create execution-state.json if it doesn't exist
if [ ! -f "$PLAN_FOLDER/execution-state.json" ]; then
  cat > "$PLAN_FOLDER/execution-state.json" << EOF
{
  "issue": {
    "number": $ISSUE_NUMBER,
    "title": "$ISSUE_TITLE",
    "branch": "$BRANCH_NAME"
  },
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "updated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "tasks": []
}
EOF
  echo "  Created execution-state.json"
else
  echo "  execution-state.json exists (resuming)"
fi

# Create journal.md if it doesn't exist
if [ ! -f "$PLAN_FOLDER/journal.md" ]; then
  cat > "$PLAN_FOLDER/journal.md" << EOF
# Implementation Journal

**Issue**: #$ISSUE_NUMBER - $ISSUE_TITLE
**Branch**: $BRANCH_NAME
**Started**: $(date -u +%Y-%m-%dT%H:%M:%SZ)

---

EOF
  echo "  Created journal.md"
else
  echo "  journal.md exists (resuming)"
fi
```

#### 6C.2 Parse tasks.md for Current State

```bash
echo "📋 Parsing tasks.md for current state..."

# Check if any tasks are blocked from a previous run
if grep -q "Status: blocked" "$PLAN_FOLDER/tasks.md" 2>/dev/null; then
  echo "ERROR: A task is blocked from a previous run."
  echo "Review the blocked task in $PLAN_FOLDER/tasks.md before continuing."
  gh issue edit "$ISSUE_NUMBER" --add-label "needs review"
  exit 1
fi

# Count task states
PENDING_COUNT=$(grep -c "Status: pending" "$PLAN_FOLDER/tasks.md" 2>/dev/null || echo "0")
COMPLETED_COUNT=$(grep -c "Status: completed" "$PLAN_FOLDER/tasks.md" 2>/dev/null || echo "0")
TOTAL_TASKS=$((PENDING_COUNT + COMPLETED_COUNT))

# If no status markers, count checkbox tasks
if [ "$TOTAL_TASKS" -eq 0 ]; then
  TOTAL_TASKS=$(grep -cE "^- \[ \]" "$PLAN_FOLDER/tasks.md" 2>/dev/null || echo "0")
  PENDING_COUNT=$TOTAL_TASKS
fi

echo "  Total tasks: $TOTAL_TASKS"
echo "  Completed: $COMPLETED_COUNT"
echo "  Pending: $PENDING_COUNT"
```

#### 6C.3 Resume Support

```bash
# Check execution-state.json for completed tasks (resume support)
if [ -f "$PLAN_FOLDER/execution-state.json" ]; then
  COMPLETED_TASKS=$(cat "$PLAN_FOLDER/execution-state.json" | jq -r '.tasks[] | select(.status == "completed") | .id' 2>/dev/null || echo "")
  if [ -n "$COMPLETED_TASKS" ]; then
    echo "📌 Resuming execution - completed tasks: $COMPLETED_TASKS"
  fi
fi
```

#### 6C.4 Task Execution Loop

```
WHILE there are tasks with "Status: pending" (or unchecked checkboxes):

  ## Step A: Find Next Task

  Locate the first task in tasks.md that is pending/unchecked.
  Extract:
  - TASK_NUMBER: The task number (e.g., "3")
  - TASK_DESCRIPTION: The task description text
  - TASK_FILES: Any files mentioned in the task
  - TASK_REQUIREMENTS: Any requirement references (e.g., "Requirements: 1.1, 1.2")

  ## Step B: Check if Resuming

  IF TASK_NUMBER is in COMPLETED_TASKS (from execution-state.json):
    Skip this task, continue to next

  ## Step C: Update Task Status to In Progress

  Edit tasks.md to update the task:
  ```
  - [ ] $TASK_NUMBER. $TASK_DESCRIPTION
    - Status: in_progress
    - Started: $(date -Iseconds)
    - Completed:
    - Notes:
  ```

  ## Step D: Spawn Task Sub-Agent

  Use the Task tool with the prompt from Section 6C.5 below.

  ## Step E: Process Sub-Agent Response

  Parse the sub-agent response:
  - TEST_PASSED: boolean
  - SUMMARY: implementation summary
  - FILES_CHANGED: list
  - BLOCKERS: any issues

  ## Step F: Update State Based on Result

  IF TEST_PASSED:
    Edit tasks.md:
    ```
    - [x] $TASK_NUMBER. $TASK_DESCRIPTION
      - Status: completed
      - Started: $STARTED_TIME
      - Completed: $(date -Iseconds)
      - Notes: $SUMMARY
    ```

    Verify sub-agent updated execution-state.json and journal.md

    CONTINUE to next pending task

  IF NOT TEST_PASSED or BLOCKERS exist:
    Edit tasks.md:
    ```
    - [ ] $TASK_NUMBER. $TASK_DESCRIPTION
      - Status: blocked
      - Started: $STARTED_TIME
      - Completed:
      - Notes: BLOCKED - $BLOCKERS
    ```

    # Label issue for human review
    gh issue edit "$ISSUE_NUMBER" --add-label "needs review"

    # Add comment explaining the block
    gh issue comment "$ISSUE_NUMBER" --body "## ⚠️ Task Blocked

    **Task $TASK_NUMBER**: $TASK_DESCRIPTION

    **Issue**: $BLOCKERS

    **Branch**: $BRANCH_NAME
    **Progress**: $COMPLETED_COUNT/$TOTAL_TASKS tasks completed

    Human review required to resolve blocker."

    # Commit WIP state
    git add .
    git commit -m "WIP: #$ISSUE_NUMBER - Task $TASK_NUMBER blocked, needs review"
    git push origin "$BRANCH_NAME"

    EXIT with failure report

END WHILE

# All tasks completed
echo "✅ All $TOTAL_TASKS tasks completed successfully"
```

#### 6C.5 Sub-Agent Prompt Template (with Self-Orientation)

Each sub-agent receives this prompt:

```markdown
# Implement Task $TASK_NUMBER

You are implementing ONE task in a multi-task GitHub issue. Other sub-agents have completed prior tasks and their work exists on this branch.

## Your Assignment

**Task $TASK_NUMBER**: $TASK_DESCRIPTION

## Context

- **Issue**: #$ISSUE_NUMBER - $ISSUE_TITLE
- **Branch**: $BRANCH_NAME
- **Plan Folder**: $PLAN_FOLDER

---

## STEP 1: Self-Orientation (DO THIS FIRST)

Before writing any code, understand what's already been done:

### 1.1 Read Execution State

```bash
cat $PLAN_FOLDER/execution-state.json
```

Look for:
- Which tasks are `completed` vs `pending`
- `files_created` by prior tasks (you may need these)
- `exports` from prior tasks (classes/functions to use)
- `patterns` established (conventions to follow)

### 1.2 Check Files on This Branch

```bash
git diff origin/main --name-only
```

These files were created/modified by prior tasks.

### 1.3 Read the Implementation Journal

```bash
cat $PLAN_FOLDER/journal.md
```

Contains key decisions and guidance from prior tasks.

### 1.4 Review Key Files from Prior Tasks

Based on what you learned, read files you'll need to integrate with.

---

## STEP 2: Implement Your Task

Now implement: **$TASK_DESCRIPTION**

### Guidelines

1. **Follow established patterns** - Use same conventions as prior tasks
2. **Use prior exports** - Don't recreate existing code
3. **Maintain consistency** - Error handling, naming, file organization
4. **Write tests** - Follow the test structure from prior tasks

### References (if needed)

Only read these if the task description is insufficient:

- **Architecture & Design**: `$PLAN_FOLDER/design.md`
  → Read this if your task involves creating new components, understanding how parts interact, or making architectural decisions

- **Requirements & Acceptance Criteria**: `$PLAN_FOLDER/requirements.md`
  → Read this if your task involves user-facing behavior, specific acceptance criteria, or edge cases

**Important**: State which document you're reading and why before reading it.

$CONTEXT_HINTS

---

## STEP 3: Verify Your Work

```bash
# Run tests
$TEST_CMD

# Run lint (if available)
$LINT_CMD
```

---

## STEP 4: Update State (REQUIRED)

**You MUST complete both updates before finishing.**

### 4.1 Update execution-state.json

Edit `$PLAN_FOLDER/execution-state.json` to update your task entry:

```json
{
  "id": "$TASK_NUMBER",
  "description": "$TASK_DESCRIPTION",
  "status": "completed",
  "started_at": "<when you started>",
  "completed_at": "<now>",
  "files_created": ["list", "of", "new", "files"],
  "files_modified": ["list", "of", "changed", "files"],
  "exports": {
    "classes": ["ClassName"],
    "functions": ["functionName"],
    "types": ["TypeName"]
  },
  "patterns": ["any new conventions established"],
  "notes": "brief summary of what was done",
  "test_results": {
    "passed": 10,
    "failed": 0
  }
}
```

Also update the root `updated_at` timestamp.

### 4.2 Append to journal.md

Add an entry to `$PLAN_FOLDER/journal.md`:

```markdown
---

## Task $TASK_NUMBER: $TASK_DESCRIPTION

**Status**: ✅ Completed
**Time**: [start time] → [end time]

### What I Did
[2-3 sentence summary of the implementation]

### Files Created
- `path/to/file.ts` - Purpose of file

### Files Modified
- `path/to/existing.ts` - What was changed

### Key Decisions
1. **Decision**: Why this approach was chosen

### Patterns Established
- [Any conventions future tasks should follow]

### Exports for Other Tasks
```typescript
// Key signatures other tasks might need
export function functionName(): ReturnType
export class ClassName { ... }
```

### What Next Task Should Know
[Critical information for the next sub-agent]
```

---

## Rules

- ✅ Implement ONLY your assigned task
- ✅ Follow patterns from prior tasks
- ✅ Use exports from prior tasks
- ✅ Update execution-state.json (REQUIRED)
- ✅ Append to journal.md (REQUIRED)
- ❌ Do NOT commit (orchestrator handles git)
- ❌ Do NOT modify other tasks' implementations
- ❌ Do NOT create PRs

## Begin

Start with STEP 1: Read execution-state.json to understand what prior tasks have done.
```

#### 6C.6 Post-Task Integration Check

After all tasks complete, verify they integrate properly:

```bash
echo "🔗 Running integration check after all tasks..."

# Run full test suite
if [ -n "$TEST_CMD" ]; then
  echo "Running: $TEST_CMD"
  if ! eval "$TEST_CMD"; then
    echo "ERROR: Integration tests failed after all tasks completed"
    # Attempt to fix integration issues before failing
    INTEGRATION_FAILED=true
  fi
fi
```

**Proceed to Step 7 (Validation).**

---

## Step 7: Comprehensive Validation Phase

**Run AFTER all implementation completes (any tier).**

### 7.1 Run Type Checking

```bash
if [ -n "$TYPE_CHECK_CMD" ]; then
  echo "🔍 Running type check: $TYPE_CHECK_CMD"
  if ! eval "$TYPE_CHECK_CMD"; then
    echo "⚠️ Type check failed, attempting fixes..."
    TYPE_CHECK_PASSED=false
  else
    echo "✅ Type check passed"
    TYPE_CHECK_PASSED=true
  fi
else
  TYPE_CHECK_PASSED=true
fi
```

### 7.2 Run Linting

```bash
if [ -n "$LINT_CMD" ]; then
  echo "🔎 Running linter: $LINT_CMD"
  if ! eval "$LINT_CMD"; then
    echo "⚠️ Linting failed, attempting fixes..."
    LINT_PASSED=false
  else
    echo "✅ Linting passed"
    LINT_PASSED=true
  fi
else
  LINT_PASSED=true
fi
```

### 7.3 Run Format Check

```bash
if [ -n "$FORMAT_CMD" ]; then
  echo "🎨 Running format check: $FORMAT_CMD"
  if ! eval "$FORMAT_CMD"; then
    echo "⚠️ Format check failed, attempting fixes..."
    FORMAT_PASSED=false
  else
    echo "✅ Format check passed"
    FORMAT_PASSED=true
  fi
else
  FORMAT_PASSED=true
fi
```

### 7.4 Run Tests

```bash
if [ -n "$TEST_CMD" ]; then
  echo "🧪 Running tests: $TEST_CMD"
  if ! eval "$TEST_CMD"; then
    echo "⚠️ Tests failed"
    TESTS_PASSED=false
  else
    echo "✅ All tests passed"
    TESTS_PASSED=true
  fi
else
  echo "⚠️ No test command detected, skipping tests"
  TESTS_PASSED=true
fi
```

### 7.5 Run Build

```bash
if [ -n "$BUILD_CMD" ]; then
  echo "🏗️ Running build: $BUILD_CMD"
  if ! eval "$BUILD_CMD"; then
    echo "⚠️ Build failed"
    BUILD_PASSED=false
  else
    echo "✅ Build successful"
    BUILD_PASSED=true
  fi
else
  BUILD_PASSED=true
fi
```

### 7.6 Handle Validation Failures

```
IF any validation failed (TYPE_CHECK, LINT, FORMAT, TESTS, or BUILD):

  ATTEMPT_COUNT = 0
  MAX_ATTEMPTS = 3

  WHILE ATTEMPT_COUNT < MAX_ATTEMPTS AND any validation failing:

    ATTEMPT_COUNT += 1
    echo "🔧 Fix attempt $ATTEMPT_COUNT of $MAX_ATTEMPTS"

    IF TYPE_CHECK_PASSED = false:
      Analyze type errors and fix them
      Re-run type check

    IF LINT_PASSED = false:
      Run auto-fix if available (e.g., eslint --fix, ruff --fix)
      Re-run lint check

    IF FORMAT_PASSED = false:
      Run auto-format (e.g., prettier --write, ruff format)
      Re-run format check

    IF TESTS_PASSED = false:
      Analyze test failures
      Fix the failing tests or the code they test
      Re-run tests

    IF BUILD_PASSED = false:
      Analyze build errors
      Fix build issues
      Re-run build

  END WHILE

  IF still failing after MAX_ATTEMPTS:
    → Proceed to Error Handling (Step 10)
```

---

## Step 8: Commit and Push

**Only reached if all validations pass.**

### 8.1 Stage All Changes

```bash
git add .
echo "📦 Staged changes:"
git status --short
```

### 8.2 Check for Changes

```bash
if [ -z "$(git status --porcelain)" ]; then
  echo "⚠️ No changes to commit"
  echo "The implementation may have been completed in a previous run."
  # Check if PR already exists
  EXISTING_PR=$(gh pr list --head "$BRANCH_NAME" --json url --jq '.[0].url' 2>/dev/null)
  if [ -n "$EXISTING_PR" ]; then
    echo "✅ PR already exists: $EXISTING_PR"
    exit 0
  fi
fi
```

### 8.3 Determine Commit Type

```bash
# Default to feat, adjust based on issue labels or content
COMMIT_TYPE="feat"

if echo "$LABELS" | grep -qi "bug"; then
  COMMIT_TYPE="fix"
elif echo "$LABELS" | grep -qi "refactor"; then
  COMMIT_TYPE="refactor"
elif echo "$LABELS" | grep -qi "docs"; then
  COMMIT_TYPE="docs"
elif echo "$LABELS" | grep -qi "test"; then
  COMMIT_TYPE="test"
elif echo "$LABELS" | grep -qi "chore"; then
  COMMIT_TYPE="chore"
fi

echo "📝 Commit type: $COMMIT_TYPE"
```

### 8.4 Generate Commit Message

```bash
# Get stats for commit message
FILES_CHANGED=$(git diff --cached --numstat | wc -l)
INSERTIONS=$(git diff --cached --stat | tail -1 | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
DELETIONS=$(git diff --cached --stat | tail -1 | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")
```

### 8.5 Create Commit

```bash
git commit -m "$COMMIT_TYPE: $ISSUE_TITLE (#$ISSUE_NUMBER)

Implemented $TIER-tier issue.

Plan: $PLAN_FOLDER
Files changed: $FILES_CHANGED (+$INSERTIONS/-$DELETIONS)

Validations passed:
- Type check: ${TYPE_CHECK_CMD:-skipped}
- Linting: ${LINT_CMD:-skipped}
- Tests: ${TEST_CMD:-skipped}
- Build: ${BUILD_CMD:-skipped}

🤖 Generated with Claude Agent"

echo "✅ Changes committed"
```

### 8.6 Push Branch

```bash
git push -u origin "$BRANCH_NAME"
echo "✅ Pushed branch: $BRANCH_NAME"
```

---

## Step 9: Create Pull Request (FINAL DELIVERABLE)

**This is the most critical step - DO NOT SKIP.**

### 9.1 Gather PR Information

```bash
# Get detailed change information
FILES_CREATED=$(git diff origin/main --name-only --diff-filter=A | head -20)
FILES_MODIFIED=$(git diff origin/main --name-only --diff-filter=M | head -20)
FILES_DELETED=$(git diff origin/main --name-only --diff-filter=D | head -20)

TOTAL_FILES=$(git diff origin/main --name-only | wc -l)
```

### 9.2 Generate PR Body

```bash
PR_BODY="## Summary

Closes #$ISSUE_NUMBER

$(echo "$ISSUE_BODY" | head -c 500)

## Implementation

**Tier**: $TIER
**Plan**: \`$PLAN_FOLDER\`

### Changes ($TOTAL_FILES files)

**Created:**
$(if [ -n "$FILES_CREATED" ]; then echo "$FILES_CREATED" | sed 's/^/- \`/' | sed 's/$/\`/'; else echo "- None"; fi)

**Modified:**
$(if [ -n "$FILES_MODIFIED" ]; then echo "$FILES_MODIFIED" | sed 's/^/- \`/' | sed 's/$/\`/'; else echo "- None"; fi)

**Deleted:**
$(if [ -n "$FILES_DELETED" ]; then echo "$FILES_DELETED" | sed 's/^/- \`/' | sed 's/$/\`/'; else echo "- None"; fi)

## Validation

All checks passed:
$([ -n "$TYPE_CHECK_CMD" ] && echo "- ✅ Type checking (\`$TYPE_CHECK_CMD\`)" || echo "- ⏭️ Type checking (skipped)")
$([ -n "$LINT_CMD" ] && echo "- ✅ Linting (\`$LINT_CMD\`)" || echo "- ⏭️ Linting (skipped)")
$([ -n "$FORMAT_CMD" ] && echo "- ✅ Formatting (\`$FORMAT_CMD\`)" || echo "- ⏭️ Formatting (skipped)")
$([ -n "$TEST_CMD" ] && echo "- ✅ Tests (\`$TEST_CMD\`)" || echo "- ⏭️ Tests (skipped)")
$([ -n "$BUILD_CMD" ] && echo "- ✅ Build (\`$BUILD_CMD\`)" || echo "- ⏭️ Build (skipped)")

---

🤖 Generated with Claude Agent"
```

### 9.3 Create PR

```bash
PR_URL=$(gh pr create \
  --title "$COMMIT_TYPE: $ISSUE_TITLE" \
  --body "$PR_BODY" \
  --base main \
  --head "$BRANCH_NAME" \
  2>&1)

if [ $? -ne 0 ]; then
  echo "ERROR: Failed to create PR"
  echo "$PR_URL"
  exit 1
fi

echo "✅ Pull request created: $PR_URL"
```

### 9.4 Update GitHub Issue

```bash
# Add comment linking to PR
gh issue comment "$ISSUE_NUMBER" --body "Implementation complete! PR: $PR_URL"

# Update labels
gh issue edit "$ISSUE_NUMBER" --remove-label "plan ready" 2>/dev/null || true
```

---

## Step 10: Final Report

```markdown
## ✅ Execution Complete

### Summary
| Field | Value |
|-------|-------|
| **Issue** | #$ISSUE_NUMBER - $ISSUE_TITLE |
| **Tier** | $TIER |
| **Branch** | `$BRANCH_NAME` |
| **PR** | $PR_URL |

### Implementation Stats
- Files created: $(echo "$FILES_CREATED" | grep -c . || echo "0")
- Files modified: $(echo "$FILES_MODIFIED" | grep -c . || echo "0")
- Files deleted: $(echo "$FILES_DELETED" | grep -c . || echo "0")
- Plan folder: `$PLAN_FOLDER`

### Validation Results
- ✅ Type checking: ${TYPE_CHECK_PASSED:-skipped}
- ✅ Linting: ${LINT_PASSED:-skipped}
- ✅ Formatting: ${FORMAT_PASSED:-skipped}
- ✅ Tests: ${TESTS_PASSED:-skipped}
- ✅ Build: ${BUILD_PASSED:-skipped}

### Next Steps
1. Review PR at: $PR_URL
2. Address any review comments
3. Merge after approval
4. Issue #$ISSUE_NUMBER will auto-close on merge

---
🤖 Execution completed successfully
```

---

## Error Handling

### Unrecoverable Test/Validation Failures

When validation fails after maximum fix attempts:

```bash
echo "❌ Execution failed: Could not resolve validation errors after 3 attempts"

# Label the issue for human review
gh issue edit "$ISSUE_NUMBER" --add-label "needs review"

# Create detailed failure comment
gh issue comment "$ISSUE_NUMBER" --body "## ❌ Automated Execution Failed

**Tier**: $TIER
**Branch**: \`$BRANCH_NAME\`

### Failure Details

**Validation Results:**
- Type check: $([ "$TYPE_CHECK_PASSED" = true ] && echo "✅ Passed" || echo "❌ Failed")
- Linting: $([ "$LINT_PASSED" = true ] && echo "✅ Passed" || echo "❌ Failed")
- Formatting: $([ "$FORMAT_PASSED" = true ] && echo "✅ Passed" || echo "❌ Failed")
- Tests: $([ "$TESTS_PASSED" = true ] && echo "✅ Passed" || echo "❌ Failed")
- Build: $([ "$BUILD_PASSED" = true ] && echo "✅ Passed" || echo "❌ Failed")

### Error Output
\`\`\`
<relevant error output>
\`\`\`

### Work Completed
$(if [ "$TIER" = "complex" ]; then echo "See tasks.md and execution-state.json for completed/blocked tasks."; fi)

### Files Changed
$(git diff --name-only | head -20 | sed 's/^/- /')

### Next Steps
Human review required to resolve failures.

---
🤖 Agent execution stopped due to unresolved failures"

# Commit WIP state if there are changes
if [ -n "$(git status --porcelain)" ]; then
  git add .
  git commit -m "WIP: #$ISSUE_NUMBER - needs review (validation failures)"
  git push origin "$BRANCH_NAME"
  echo "📦 Work-in-progress committed and pushed for review"
fi

exit 1
```

### Infrastructure Errors

```bash
# Network, GitHub API, or other infrastructure failures

echo "❌ Infrastructure error encountered"

gh issue edit "$ISSUE_NUMBER" --add-label "needs review"
gh issue comment "$ISSUE_NUMBER" --body "## ⚠️ Infrastructure Error

Execution failed due to infrastructure issues (network, API, etc.).

**Branch**: \`$BRANCH_NAME\`
**Error**: <error details>

Manual intervention required."

exit 1
```

### Error Handling Summary

| Situation | Action |
|-----------|--------|
| Sub-agent fails | Retry up to 3 times, then pause for human |
| Tests fail at checkpoint | Pause, ask how to proceed |
| State not updated | Fallback to git diff, log warning |
| Branch conflicts | Pause, ask human to resolve |
| Validation fails after retries | Label `needs review`, commit WIP, stop |

---

## Workflow Rules Summary

| Rule | Description |
|------|-------------|
| **No human approval** | Execute autonomously; plan was already approved |
| **Stop only on failure** | Label `needs review` on unrecoverable failures |
| **Commit WIP on failure** | Always preserve work done before stopping |
| **Context isolation** | Orchestrator passes paths, sub-agents read contents |
| **Progressive disclosure** | Complex tier sub-agents read design/requirements only if needed |
| **State tracking** | Update tasks.md, execution-state.json, and journal.md |
| **Resume support** | Execution can resume from last completed task |
| **PR is mandatory** | Never report success without creating a PR |

---

## Context Management Strategy

### Orchestrator Context Budget (~15K tokens)
- Issue metadata
- Plan folder structure
- File path references (not contents)
- Validation commands
- State tracking logic
- Git/GitHub operations

### Sub-Agent Context Budget (~50-80K tokens)
- Full plan documents (as needed)
- Source file contents (as needed)
- Test files
- Implementation space
- Context continuity files (execution-state.json, journal.md)

### Context Continuity Files

For complex tier issues, these files enable sub-agents to understand prior work:

| File | Purpose | Updated By |
|------|---------|-----------|
| `execution-state.json` | Machine-readable task state, exports, patterns | Each sub-agent |
| `journal.md` | Human-readable decisions and handoff notes | Each sub-agent |
| `tasks.md` | Task list with status markers | Orchestrator |

### Why This Works
- Each sub-agent gets a fresh context window
- Orchestrator doesn't bloat with file contents
- Complex issues are chunked into task-sized work
- Progressive disclosure prevents over-loading sub-agents
- Context continuity files bridge knowledge between sub-agents
- Resume support allows interrupted executions to continue
