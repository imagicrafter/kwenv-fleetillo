# Execute Issue Implementation

Execute the implementation of a GitHub issue by coordinating sub-agents for each task.

## Usage

```
/execute [issue-number]
```

## Overview

This command orchestrates the implementation of issues that have completed planning (`plan ready` label). It handles three tiers differently:

| Tier | Approach |
|------|----------|
| Simple | Execute directly (no sub-agents) |
| Medium | Single sub-agent with full plan context |
| Complex | Multiple sub-agents with context continuity |

## Prerequisites

- Issue must have `plan ready` label
- Branch must exist (`issue/[N]-[slug]`)
- Plan documents must be complete

---

## Process

### Step 1: Validate Issue Ready

```bash
# Get issue details
gh issue view $ISSUE_NUMBER --json number,title,labels,body

# Verify plan ready label
LABELS=$(gh issue view $ISSUE_NUMBER --json labels -q '.labels[].name')
if ! echo "$LABELS" | grep -q "plan ready"; then
  echo "Error: Issue #$ISSUE_NUMBER does not have 'plan ready' label"
  echo "Run /plan-check first to generate planning documents"
  exit 1
fi

# Determine tier
TIER="simple"
echo "$LABELS" | grep -q "plan: medium" && TIER="medium"
echo "$LABELS" | grep -q "plan: complex" && TIER="complex"
```

### Step 2: Setup Environment

```bash
# Determine plan directory
PLAN_DIR=".claude/plans/issue-$ISSUE_NUMBER-*"
PLAN_DIR=$(ls -d $PLAN_DIR 2>/dev/null | head -1)

if [ -z "$PLAN_DIR" ]; then
  # Try .agent location
  PLAN_DIR=".agent/plans/issue-$ISSUE_NUMBER-*"
  PLAN_DIR=$(ls -d $PLAN_DIR 2>/dev/null | head -1)
fi

# Verify branch exists and checkout
BRANCH="issue/$ISSUE_NUMBER-*"
git checkout $(git branch --list "$BRANCH" | head -1 | tr -d ' ')

# Get issue metadata
ISSUE_TITLE=$(gh issue view $ISSUE_NUMBER --json title -q '.title')
BRANCH_NAME=$(git branch --show-current)
```

### Step 3: Detect Project Type

Use the detect-project skill to identify:
- Project language/framework
- Test command
- Build command
- Lint command

```bash
# Read project detection results
PROJECT_TYPE=$(cat .claude/project-config.json 2>/dev/null || echo '{}')

# Extract commands (with defaults)
TEST_CMD=$(echo "$PROJECT_TYPE" | jq -r '.test_command // "npm test"')
BUILD_CMD=$(echo "$PROJECT_TYPE" | jq -r '.build_command // "npm run build"')
LINT_CMD=$(echo "$PROJECT_TYPE" | jq -r '.lint_command // "npm run lint"')
```

---

## Tier: Simple

For simple issues, execute directly without sub-agents:

1. Read plan (if exists) or issue body
2. Implement the change
3. Run tests
4. Commit with message `#[N]: [description]`
5. Report completion

---

## Tier: Medium

For medium issues, spawn a single sub-agent:

```markdown
Implement GitHub issue #$ISSUE_NUMBER.

## Context
- Issue: #$ISSUE_NUMBER - $ISSUE_TITLE
- Branch: $BRANCH_NAME
- Plan: $PLAN_DIR/plan.md

## Instructions
1. Read the plan document thoroughly
2. Implement all tasks in the plan
3. Run tests: $TEST_CMD
4. Ensure all tests pass

## Rules
- Follow existing code patterns
- Write tests for new functionality
- Do NOT commit (orchestrator handles git)

## On Completion
Report:
- Summary of changes
- Files created/modified
- Test results
```

---

## Tier: Complex

For complex issues, use the context continuity pattern with multiple sub-agents.

### Step 3a: Initialize Execution State

Before the first sub-agent, create the execution state:

```bash
# Parse tasks from tasks.md
TASKS=$(cat "$PLAN_DIR/tasks.md" | grep -E "^- \[ \]" | head -20)

# Create execution-state.json
cat > "$PLAN_DIR/execution-state.json" << EOF
{
  "issue": {
    "number": $ISSUE_NUMBER,
    "title": "$ISSUE_TITLE",
    "branch": "$BRANCH_NAME"
  },
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "updated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "tasks": [
    $(parse_tasks_to_json "$PLAN_DIR/tasks.md")
  ]
}
EOF

# Create journal.md
cat > "$PLAN_DIR/journal.md" << EOF
# Implementation Journal

**Issue**: #$ISSUE_NUMBER - $ISSUE_TITLE  
**Branch**: $BRANCH_NAME  
**Started**: $(date -u +%Y-%m-%dT%H:%M:%SZ)

---

EOF
```

### Step 3b: Execute Tasks Sequentially

For each task (excluding checkpoints):

```bash
TASK_COUNT=$(cat "$PLAN_DIR/execution-state.json" | jq '.tasks | length')

for i in $(seq 0 $((TASK_COUNT - 1))); do
  TASK=$(cat "$PLAN_DIR/execution-state.json" | jq ".tasks[$i]")
  TASK_ID=$(echo "$TASK" | jq -r '.id')
  TASK_DESC=$(echo "$TASK" | jq -r '.description')
  TASK_STATUS=$(echo "$TASK" | jq -r '.status')
  
  # Skip completed tasks (for resume support)
  if [ "$TASK_STATUS" = "completed" ]; then
    echo "Task $TASK_ID already completed, skipping..."
    continue
  fi
  
  # Skip checkpoint tasks (handled differently)
  if echo "$TASK_DESC" | grep -qi "checkpoint"; then
    echo "Running checkpoint verification..."
    run_checkpoint_verification "$TASK_DESC"
    continue
  fi
  
  # Spawn sub-agent for this task
  spawn_task_subagent "$TASK_ID" "$TASK_DESC"
  
  # Verify state was updated
  verify_state_updated "$TASK_ID"
  
  # Commit after each task
  git add -A
  git commit -m "#$ISSUE_NUMBER: Complete task $TASK_ID - $TASK_DESC"
done
```

### Step 3c: Sub-Agent Prompt Template

Each sub-agent receives this prompt:

```markdown
# Implement Task $TASK_ID

You are implementing ONE task in a multi-task GitHub issue. Other sub-agents have completed prior tasks and their work exists on this branch.

## Your Assignment

**Task $TASK_ID**: $TASK_DESCRIPTION

## Context

- **Issue**: #$ISSUE_NUMBER - $ISSUE_TITLE
- **Branch**: $BRANCH_NAME
- **Plan Folder**: $PLAN_DIR

---

## STEP 1: Self-Orientation (DO THIS FIRST)

Before writing any code, understand what's already been done:

### 1.1 Read Execution State

```bash
cat $PLAN_DIR/execution-state.json
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
cat $PLAN_DIR/journal.md
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

- Architecture: `$PLAN_DIR/design.md`
- Requirements: `$PLAN_DIR/requirements.md`

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

### 4.1 Update execution-state.json

Edit `$PLAN_DIR/execution-state.json` to update your task:

- `status`: "completed"
- `completed_at`: current timestamp
- `files_created`: list new files
- `files_modified`: list changed files
- `exports`: key classes/functions
- `patterns`: new conventions
- `notes`: brief summary
- `test_results`: pass/fail counts

### 4.2 Append to journal.md

Add entry to `$PLAN_DIR/journal.md`:

```markdown
---

## Task $TASK_ID: $TASK_DESCRIPTION

**Status**: ✅ Completed  
**Time**: [start] → [end]

### What I Did
[2-3 sentence summary]

### Files Created
- `path/file.ts` - Purpose

### Key Decisions
1. **Decision**: Rationale

### Patterns Established
- [Conventions for future tasks]

### Exports for Other Tasks
[Key signatures]

### What Next Task Should Know
[Critical handoff info]
```

---

## Rules

- ✅ Implement ONLY your assigned task
- ✅ Follow patterns from prior tasks
- ✅ Use exports from prior tasks
- ✅ Update execution-state.json
- ✅ Append to journal.md
- ❌ Do NOT commit
- ❌ Do NOT modify other tasks' implementations
```

---

## Step 4: Handle Checkpoints

When encountering a checkpoint task:

```bash
run_checkpoint_verification() {
  local checkpoint_desc="$1"
  
  echo "=== CHECKPOINT: $checkpoint_desc ==="
  
  # Run tests
  echo "Running tests..."
  $TEST_CMD
  TEST_RESULT=$?
  
  # Run build
  echo "Running build..."
  $BUILD_CMD
  BUILD_RESULT=$?
  
  if [ $TEST_RESULT -ne 0 ] || [ $BUILD_RESULT -ne 0 ]; then
    echo "CHECKPOINT FAILED"
    echo "Tests: $([ $TEST_RESULT -eq 0 ] && echo 'PASS' || echo 'FAIL')"
    echo "Build: $([ $BUILD_RESULT -eq 0 ] && echo 'PASS' || echo 'FAIL')"
    
    # Ask user how to proceed
    echo "Options:"
    echo "1. Fix issues and retry"
    echo "2. Skip checkpoint and continue"
    echo "3. Abort execution"
    return 1
  fi
  
  echo "CHECKPOINT PASSED ✓"
  
  # Commit checkpoint
  git add -A
  git commit -m "#$ISSUE_NUMBER: Checkpoint - $checkpoint_desc"
}
```

---

## Step 5: Final Verification

After all tasks complete:

```bash
# Final test run
$TEST_CMD

# Final build
$BUILD_CMD

# Create summary
echo "## Execution Complete: Issue #$ISSUE_NUMBER"
echo ""
echo "**Branch**: $BRANCH_NAME"
echo "**Tasks Completed**: $TASK_COUNT"
echo "**Commits**: $(git log origin/main..HEAD --oneline | wc -l)"
echo ""
echo "### Files Changed"
git diff origin/main --stat
echo ""
echo "### Ready for PR"
echo "Run: gh pr create --title '#$ISSUE_NUMBER: $ISSUE_TITLE'"
```

---

## Resume Support

The command supports resuming interrupted executions:

1. Check `execution-state.json` for task statuses
2. Skip tasks with `status: "completed"`
3. Resume from first `pending` task

```bash
# Find resume point
RESUME_TASK=$(cat "$PLAN_DIR/execution-state.json" | \
  jq -r '.tasks[] | select(.status == "pending") | .id' | head -1)

if [ -n "$RESUME_TASK" ]; then
  echo "Resuming from Task $RESUME_TASK"
fi
```

---

## Error Handling

| Situation | Action |
|-----------|--------|
| Sub-agent fails | Retry up to 3 times, then pause for human |
| Tests fail at checkpoint | Pause, ask how to proceed |
| State not updated | Fallback to git diff, log warning |
| Branch conflicts | Pause, ask human to resolve |

---

## Output Format

```json
{
  "issue": 42,
  "tier": "complex",
  "branch": "issue/42-geofencing",
  "tasks_total": 8,
  "tasks_completed": 8,
  "commits": 10,
  "test_status": "pass",
  "build_status": "pass",
  "ready_for_pr": true,
  "execution_time_minutes": 45
}
```

---

## Post-Execution

After successful execution:

1. Update issue with implementation comment
2. Suggest PR creation
3. Archive execution state

```bash
# Post completion comment
gh issue comment $ISSUE_NUMBER --body "## Implementation Complete

**Branch**: \`$BRANCH_NAME\`
**Tasks**: $TASK_COUNT completed
**Status**: Ready for PR

### Summary
$(cat $PLAN_DIR/journal.md | tail -50)

---
*Implemented by Claude*"

# Suggest PR
echo ""
echo "Create PR with:"
echo "  gh pr create --title '#$ISSUE_NUMBER: $ISSUE_TITLE' --body-file $PLAN_DIR/journal.md"
```