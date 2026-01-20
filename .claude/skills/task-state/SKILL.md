---
name: task-state
description: Parse and update task state in tasks.md for complex tier issue execution. Use this skill when the orchestrator needs to track progress through a multi-task implementation, find the next pending task, or update task status after sub-agent completion.
allowed-tools:
  - Bash(cat:*)
  - Bash(grep:*)
  - Bash(sed:*)
  - Bash(awk:*)
  - Bash(date:*)
  - Bash(head:*)
  - Bash(tail:*)
  - Bash(wc:*)
  - Bash(echo:*)
  - Read
  - Write
  - Edit
---

# Task State Management

Manage task state in `tasks.md` for complex tier issue execution.

## Overview

This skill provides the orchestrator with tools to:
- Parse tasks.md to understand current state
- Find the next pending task
- Update task status after sub-agent completion
- Track progress and generate summaries

## tasks.md Format Specification

### Required Structure

```markdown
# Tasks: Issue #[N] - [Title]

## Overview
[Brief description of the implementation]

## Task List

- [ ] 1. First task description
  - Status: pending
  - Started:
  - Completed:
  - Notes:
  - Files: `file1.ts`, `file2.ts`
  - Requirements: 1.1, 1.2

- [ ] 2. Second task description
  - Status: pending
  - Started:
  - Completed:
  - Notes:

- [ ] 3. Checkpoint - Verify integration
  - Status: pending
  - Started:
  - Completed:
  - Notes:

## Notes
[Any additional implementation notes]
```

### Task Status Values

| Status | Meaning | Checkbox |
|--------|---------|----------|
| `pending` | Not yet started | `- [ ]` |
| `in_progress` | Currently being worked on | `- [ ]` |
| `completed` | Successfully finished | `- [x]` |
| `blocked` | Failed, needs human review | `- [ ]` |

### Field Descriptions

| Field | Required | Description |
|-------|----------|-------------|
| `Status` | Yes | Current task state |
| `Started` | Yes | ISO timestamp when work began (empty if pending) |
| `Completed` | Yes | ISO timestamp when completed (empty if not done) |
| `Notes` | Yes | Summary of work done or blocker details |
| `Files` | No | Files to focus on for this task |
| `Requirements` | No | Requirement IDs from requirements.md |

---

## Operations

### 1. Parse All Tasks

Extract all tasks with their current state.

```bash
TASKS_FILE="$1"  # Path to tasks.md

# Verify file exists
if [ ! -f "$TASKS_FILE" ]; then
  echo "ERROR: tasks.md not found at $TASKS_FILE"
  exit 1
fi

# Extract task count
TOTAL_TASKS=$(grep -cE "^- \[[ x]\] [0-9]+\." "$TASKS_FILE" || echo "0")

# Count by status
PENDING=$(grep -c "Status: pending" "$TASKS_FILE" 2>/dev/null || echo "0")
IN_PROGRESS=$(grep -c "Status: in_progress" "$TASKS_FILE" 2>/dev/null || echo "0")
COMPLETED=$(grep -c "Status: completed" "$TASKS_FILE" 2>/dev/null || echo "0")
BLOCKED=$(grep -c "Status: blocked" "$TASKS_FILE" 2>/dev/null || echo "0")

echo "## Task Summary"
echo "- Total: $TOTAL_TASKS"
echo "- Pending: $PENDING"
echo "- In Progress: $IN_PROGRESS"
echo "- Completed: $COMPLETED"
echo "- Blocked: $BLOCKED"
```

**Output Format:**

```markdown
## Task Summary
- Total: 8
- Pending: 5
- In Progress: 1
- Completed: 2
- Blocked: 0
```

---

### 2. Get Next Pending Task

Find the first task with `Status: pending` and return its details.

```bash
TASKS_FILE="$1"

# Check for blocked tasks first (should not continue if any are blocked)
if grep -q "Status: blocked" "$TASKS_FILE"; then
  echo "ERROR: Blocked task exists. Cannot continue until resolved."
  BLOCKED_TASK=$(grep -B5 "Status: blocked" "$TASKS_FILE" | grep -E "^- \[" | head -1)
  echo "Blocked: $BLOCKED_TASK"
  exit 1
fi

# Check for in_progress tasks (resume if found)
if grep -q "Status: in_progress" "$TASKS_FILE"; then
  echo "WARNING: Task already in progress. Resuming..."
  IN_PROGRESS_LINE=$(grep -n "Status: in_progress" "$TASKS_FILE" | head -1 | cut -d: -f1)
else
  # Find first pending task
  PENDING_LINE=$(grep -n "Status: pending" "$TASKS_FILE" | head -1 | cut -d: -f1)
  
  if [ -z "$PENDING_LINE" ]; then
    echo "ALL_COMPLETE: No pending tasks remaining"
    exit 0
  fi
fi

TARGET_LINE=${IN_PROGRESS_LINE:-$PENDING_LINE}

# Extract task block (from task header to next task or section)
# Find the task header line (search backwards for "- [ ]" or "- [x]")
TASK_START=$(head -n "$TARGET_LINE" "$TASKS_FILE" | grep -n "^- \[" | tail -1 | cut -d: -f1)

# Find next task or section (search forward)
NEXT_TASK=$(tail -n +"$((TARGET_LINE + 1))" "$TASKS_FILE" | grep -n "^- \[" | head -1 | cut -d: -f1)

if [ -n "$NEXT_TASK" ]; then
  TASK_END=$((TARGET_LINE + NEXT_TASK - 1))
else
  # No next task, read to end of Task List section or file
  TASK_END=$(wc -l < "$TASKS_FILE")
fi

# Extract task block
TASK_BLOCK=$(sed -n "${TASK_START},${TASK_END}p" "$TASKS_FILE")

# Parse task details
TASK_NUMBER=$(echo "$TASK_BLOCK" | head -1 | grep -oE "^- \[[ x]\] [0-9]+" | grep -oE "[0-9]+")
TASK_DESCRIPTION=$(echo "$TASK_BLOCK" | head -1 | sed 's/^- \[[ x]\] [0-9]*\. //')
TASK_STATUS=$(echo "$TASK_BLOCK" | grep "Status:" | sed 's/.*Status: //' | tr -d ' ')
TASK_FILES=$(echo "$TASK_BLOCK" | grep "Files:" | sed 's/.*Files: //')
TASK_REQUIREMENTS=$(echo "$TASK_BLOCK" | grep "Requirements:" | sed 's/.*Requirements: //')

echo "## Next Task"
echo "- Number: $TASK_NUMBER"
echo "- Description: $TASK_DESCRIPTION"
echo "- Status: $TASK_STATUS"
echo "- Line: $TASK_START"
echo "- Files: ${TASK_FILES:-none specified}"
echo "- Requirements: ${TASK_REQUIREMENTS:-none specified}"
```

**Output Format:**

```markdown
## Next Task
- Number: 3
- Description: Implement geofence boundary detection
- Status: pending
- Line: 24
- Files: `src/services/geofence.ts`, `src/types/location.ts`
- Requirements: 2.1, 2.2
```

---

### 3. Start Task (Set In Progress)

Update a task's status to `in_progress` and set the start timestamp.

```bash
TASKS_FILE="$1"
TASK_NUMBER="$2"

TIMESTAMP=$(date -Iseconds)

# Find the task line
TASK_LINE=$(grep -n "^- \[[ x]\] ${TASK_NUMBER}\." "$TASKS_FILE" | head -1 | cut -d: -f1)

if [ -z "$TASK_LINE" ]; then
  echo "ERROR: Task $TASK_NUMBER not found"
  exit 1
fi

# Find the Status line for this task (within next 10 lines)
STATUS_LINE=$(tail -n +"$TASK_LINE" "$TASKS_FILE" | head -10 | grep -n "Status:" | head -1 | cut -d: -f1)
STATUS_LINE=$((TASK_LINE + STATUS_LINE - 1))

# Find the Started line
STARTED_LINE=$(tail -n +"$TASK_LINE" "$TASKS_FILE" | head -10 | grep -n "Started:" | head -1 | cut -d: -f1)
STARTED_LINE=$((TASK_LINE + STARTED_LINE - 1))

# Update Status to in_progress
sed -i "${STATUS_LINE}s/Status: .*/Status: in_progress/" "$TASKS_FILE"

# Update Started timestamp
sed -i "${STARTED_LINE}s/Started:.*/Started: ${TIMESTAMP}/" "$TASKS_FILE"

echo "✅ Task $TASK_NUMBER started at $TIMESTAMP"
```

**Verification:**

```bash
# Verify the update
grep -A5 "^- \[[ x]\] ${TASK_NUMBER}\." "$TASKS_FILE"
```

---

### 4. Complete Task (Success)

Update a task's status to `completed`, set checkbox, timestamp, and notes.

```bash
TASKS_FILE="$1"
TASK_NUMBER="$2"
NOTES="$3"  # Summary from sub-agent

TIMESTAMP=$(date -Iseconds)

# Find the task line
TASK_LINE=$(grep -n "^- \[ \] ${TASK_NUMBER}\." "$TASKS_FILE" | head -1 | cut -d: -f1)

if [ -z "$TASK_LINE" ]; then
  # Check if already completed
  if grep -q "^- \[x\] ${TASK_NUMBER}\." "$TASKS_FILE"; then
    echo "WARNING: Task $TASK_NUMBER already completed"
    exit 0
  fi
  echo "ERROR: Task $TASK_NUMBER not found"
  exit 1
fi

# Update checkbox to checked
sed -i "${TASK_LINE}s/^- \[ \]/- [x]/" "$TASKS_FILE"

# Find and update Status
STATUS_LINE=$(tail -n +"$TASK_LINE" "$TASKS_FILE" | head -10 | grep -n "Status:" | head -1 | cut -d: -f1)
STATUS_LINE=$((TASK_LINE + STATUS_LINE - 1))
sed -i "${STATUS_LINE}s/Status: .*/Status: completed/" "$TASKS_FILE"

# Find and update Completed timestamp
COMPLETED_LINE=$(tail -n +"$TASK_LINE" "$TASKS_FILE" | head -10 | grep -n "Completed:" | head -1 | cut -d: -f1)
COMPLETED_LINE=$((TASK_LINE + COMPLETED_LINE - 1))
sed -i "${COMPLETED_LINE}s/Completed:.*/Completed: ${TIMESTAMP}/" "$TASKS_FILE"

# Find and update Notes (escape special characters in notes)
NOTES_LINE=$(tail -n +"$TASK_LINE" "$TASKS_FILE" | head -10 | grep -n "Notes:" | head -1 | cut -d: -f1)
NOTES_LINE=$((TASK_LINE + NOTES_LINE - 1))
# Escape forward slashes and ampersands for sed
ESCAPED_NOTES=$(echo "$NOTES" | sed 's/[\/&]/\\&/g' | tr '\n' ' ' | head -c 200)
sed -i "${NOTES_LINE}s/Notes:.*/Notes: ${ESCAPED_NOTES}/" "$TASKS_FILE"

echo "✅ Task $TASK_NUMBER completed at $TIMESTAMP"
```

---

### 5. Block Task (Failure)

Update a task's status to `blocked` with error details.

```bash
TASKS_FILE="$1"
TASK_NUMBER="$2"
BLOCKER_REASON="$3"  # Error details from sub-agent

TIMESTAMP=$(date -Iseconds)

# Find the task line
TASK_LINE=$(grep -n "^- \[ \] ${TASK_NUMBER}\." "$TASKS_FILE" | head -1 | cut -d: -f1)

if [ -z "$TASK_LINE" ]; then
  echo "ERROR: Task $TASK_NUMBER not found"
  exit 1
fi

# Update Status to blocked
STATUS_LINE=$(tail -n +"$TASK_LINE" "$TASKS_FILE" | head -10 | grep -n "Status:" | head -1 | cut -d: -f1)
STATUS_LINE=$((TASK_LINE + STATUS_LINE - 1))
sed -i "${STATUS_LINE}s/Status: .*/Status: blocked/" "$TASKS_FILE"

# Update Notes with blocker reason
NOTES_LINE=$(tail -n +"$TASK_LINE" "$TASKS_FILE" | head -10 | grep -n "Notes:" | head -1 | cut -d: -f1)
NOTES_LINE=$((TASK_LINE + NOTES_LINE - 1))
ESCAPED_REASON=$(echo "BLOCKED: $BLOCKER_REASON" | sed 's/[\/&]/\\&/g' | tr '\n' ' ' | head -c 300)
sed -i "${NOTES_LINE}s/Notes:.*/Notes: ${ESCAPED_REASON}/" "$TASKS_FILE"

echo "❌ Task $TASK_NUMBER blocked: $BLOCKER_REASON"
```

---

### 6. Get Progress Summary

Generate a progress report for the issue comment or final report.

```bash
TASKS_FILE="$1"

# Count tasks by status
TOTAL=$(grep -cE "^- \[[ x]\] [0-9]+\." "$TASKS_FILE" || echo "0")
COMPLETED=$(grep -c "Status: completed" "$TASKS_FILE" 2>/dev/null || echo "0")
BLOCKED=$(grep -c "Status: blocked" "$TASKS_FILE" 2>/dev/null || echo "0")
IN_PROGRESS=$(grep -c "Status: in_progress" "$TASKS_FILE" 2>/dev/null || echo "0")
PENDING=$((TOTAL - COMPLETED - BLOCKED - IN_PROGRESS))

# Calculate percentage
if [ "$TOTAL" -gt 0 ]; then
  PERCENT=$((COMPLETED * 100 / TOTAL))
else
  PERCENT=0
fi

# Generate progress bar (20 chars wide)
FILLED=$((PERCENT / 5))
EMPTY=$((20 - FILLED))
PROGRESS_BAR=$(printf '█%.0s' $(seq 1 $FILLED 2>/dev/null) || echo "")$(printf '░%.0s' $(seq 1 $EMPTY 2>/dev/null) || echo "")

# List completed tasks
COMPLETED_LIST=$(grep -B1 "Status: completed" "$TASKS_FILE" | grep "^- \[x\]" | sed 's/^- \[x\] /✅ /')

# List blocked tasks (if any)
BLOCKED_LIST=$(grep -B1 "Status: blocked" "$TASKS_FILE" | grep "^- \[ \]" | sed 's/^- \[ \] /❌ /')

cat << EOF
## Progress Report

**Status**: $COMPLETED/$TOTAL tasks completed ($PERCENT%)

\`[$PROGRESS_BAR]\` $PERCENT%

### Completed Tasks
${COMPLETED_LIST:-No tasks completed yet}

$(if [ -n "$BLOCKED_LIST" ]; then echo "### Blocked Tasks"; echo "$BLOCKED_LIST"; fi)

### Remaining
- In Progress: $IN_PROGRESS
- Pending: $PENDING
EOF
```

**Output Format:**

```markdown
## Progress Report

**Status**: 3/8 tasks completed (37%)

`[███████░░░░░░░░░░░░░]` 37%

### Completed Tasks
✅ 1. Set up database schema
✅ 2. Create repository layer
✅ 3. Checkpoint - Verify database connection

### Remaining
- In Progress: 1
- Pending: 4
```

---

### 7. Check If All Complete

Quick check if all tasks are done.

```bash
TASKS_FILE="$1"

PENDING=$(grep -c "Status: pending" "$TASKS_FILE" 2>/dev/null || echo "0")
IN_PROGRESS=$(grep -c "Status: in_progress" "$TASKS_FILE" 2>/dev/null || echo "0")
BLOCKED=$(grep -c "Status: blocked" "$TASKS_FILE" 2>/dev/null || echo "0")

if [ "$BLOCKED" -gt 0 ]; then
  echo "BLOCKED"
  exit 1
elif [ "$PENDING" -gt 0 ] || [ "$IN_PROGRESS" -gt 0 ]; then
  echo "IN_PROGRESS"
  exit 0
else
  echo "ALL_COMPLETE"
  exit 0
fi
```

---

## Usage in execute.md

### Complex Tier Task Loop

```markdown
## Complex Tier Execution

Use the task-state skill to manage the task loop:

### Initialize
```bash
# Parse current state
source .claude/skills/task-state/SKILL.md  # Conceptually
TASKS_FILE="$PLAN_FOLDER/tasks.md"
```

### Task Loop
```
WHILE true:

  # 1. Get next task (Operation 2)
  NEXT_TASK_RESULT=$(get_next_pending_task "$TASKS_FILE")
  
  IF result is "ALL_COMPLETE":
    BREAK  # All tasks done
  
  IF result is "ERROR" (blocked):
    Handle blocked state
    EXIT
  
  # 2. Parse task details from result
  TASK_NUMBER=...
  TASK_DESCRIPTION=...
  TASK_FILES=...
  
  # 3. Start the task (Operation 3)
  start_task "$TASKS_FILE" "$TASK_NUMBER"
  
  # 4. Spawn sub-agent with Task tool
  SUB_AGENT_RESULT=$(spawn_sub_agent ...)
  
  # 5. Parse sub-agent response
  IF tests passed:
    complete_task "$TASKS_FILE" "$TASK_NUMBER" "$SUMMARY"
  ELSE:
    block_task "$TASKS_FILE" "$TASK_NUMBER" "$ERROR"
    Label issue 'needs review'
    EXIT

END WHILE
```
```

---

## Validation

### Validate tasks.md Format

Before starting execution, validate the tasks.md format:

```bash
TASKS_FILE="$1"
ERRORS=""

# Check file exists
[ ! -f "$TASKS_FILE" ] && ERRORS="$ERRORS\n- File not found"

# Check for task list section
grep -q "## Task List" "$TASKS_FILE" || ERRORS="$ERRORS\n- Missing '## Task List' section"

# Check for at least one task
TASK_COUNT=$(grep -cE "^- \[[ x]\] [0-9]+\." "$TASKS_FILE" || echo "0")
[ "$TASK_COUNT" -eq 0 ] && ERRORS="$ERRORS\n- No tasks found"

# Check each task has required fields
TASKS_WITHOUT_STATUS=$(grep -cE "^- \[[ x]\] [0-9]+\." "$TASKS_FILE")
STATUS_COUNT=$(grep -c "Status:" "$TASKS_FILE" || echo "0")
[ "$TASKS_WITHOUT_STATUS" -ne "$STATUS_COUNT" ] && ERRORS="$ERRORS\n- Some tasks missing Status field"

# Check for Started field
STARTED_COUNT=$(grep -c "Started:" "$TASKS_FILE" || echo "0")
[ "$TASKS_WITHOUT_STATUS" -ne "$STARTED_COUNT" ] && ERRORS="$ERRORS\n- Some tasks missing Started field"

# Check for Completed field
COMPLETED_COUNT=$(grep -c "Completed:" "$TASKS_FILE" || echo "0")
[ "$TASKS_WITHOUT_STATUS" -ne "$COMPLETED_COUNT" ] && ERRORS="$ERRORS\n- Some tasks missing Completed field"

# Check for Notes field
NOTES_COUNT=$(grep -c "Notes:" "$TASKS_FILE" || echo "0")
[ "$TASKS_WITHOUT_STATUS" -ne "$NOTES_COUNT" ] && ERRORS="$ERRORS\n- Some tasks missing Notes field"

if [ -n "$ERRORS" ]; then
  echo "❌ Validation failed:"
  echo -e "$ERRORS"
  exit 1
else
  echo "✅ tasks.md format is valid"
  echo "   Found $TASK_COUNT tasks"
fi
```

---

## Error Recovery

### Resume After Interruption

If execution was interrupted with a task `in_progress`:

```bash
TASKS_FILE="$1"

# Check for in_progress task
IN_PROGRESS_TASK=$(grep -B5 "Status: in_progress" "$TASKS_FILE" | grep "^- \[ \]" | head -1)

if [ -n "$IN_PROGRESS_TASK" ]; then
  TASK_NUMBER=$(echo "$IN_PROGRESS_TASK" | grep -oE "^- \[ \] [0-9]+" | grep -oE "[0-9]+")
  
  echo "⚠️ Found interrupted task: $TASK_NUMBER"
  echo "Options:"
  echo "  1. Resume - Continue with this task"
  echo "  2. Reset - Set back to pending and start fresh"
  
  # For automated execution, default to resume
  echo "Resuming task $TASK_NUMBER..."
fi
```

### Reset Blocked Task

If a human has resolved the blocker and wants to retry:

```bash
TASKS_FILE="$1"
TASK_NUMBER="$2"

# Find the task
TASK_LINE=$(grep -n "^- \[ \] ${TASK_NUMBER}\." "$TASKS_FILE" | head -1 | cut -d: -f1)

if [ -z "$TASK_LINE" ]; then
  echo "ERROR: Task $TASK_NUMBER not found"
  exit 1
fi

# Reset Status to pending
STATUS_LINE=$(tail -n +"$TASK_LINE" "$TASKS_FILE" | head -10 | grep -n "Status:" | head -1 | cut -d: -f1)
STATUS_LINE=$((TASK_LINE + STATUS_LINE - 1))
sed -i "${STATUS_LINE}s/Status: .*/Status: pending/" "$TASKS_FILE"

# Clear Started
STARTED_LINE=$(tail -n +"$TASK_LINE" "$TASKS_FILE" | head -10 | grep -n "Started:" | head -1 | cut -d: -f1)
STARTED_LINE=$((TASK_LINE + STARTED_LINE - 1))
sed -i "${STARTED_LINE}s/Started:.*/Started:/" "$TASKS_FILE"

# Clear Notes (keep any human-added context)
# Note: We prepend rather than replace to preserve human notes
NOTES_LINE=$(tail -n +"$TASK_LINE" "$TASKS_FILE" | head -10 | grep -n "Notes:" | head -1 | cut -d: -f1)
NOTES_LINE=$((TASK_LINE + NOTES_LINE - 1))
CURRENT_NOTES=$(sed -n "${NOTES_LINE}p" "$TASKS_FILE" | sed 's/.*Notes: //')
sed -i "${NOTES_LINE}s/Notes:.*/Notes: [RETRY] ${CURRENT_NOTES}/" "$TASKS_FILE"

echo "✅ Task $TASK_NUMBER reset to pending"
```

---

## Example tasks.md

A complete example showing various states:

```markdown
# Tasks: Issue #3 - Vehicle Geofencing

## Overview
Implement geofencing capability for vehicle tracking with real-time boundary alerts.

## Task List

- [x] 1. Create database schema for geofences
  - Status: completed
  - Started: 2026-01-19T10:30:00Z
  - Completed: 2026-01-19T10:45:00Z
  - Notes: Created geofences and geofence_events tables with PostGIS support
  - Files: `prisma/schema.prisma`, `prisma/migrations/`
  - Requirements: 1.1

- [x] 2. Implement GeofenceRepository
  - Status: completed
  - Started: 2026-01-19T10:46:00Z
  - Completed: 2026-01-19T11:15:00Z
  - Notes: CRUD operations with spatial queries. 8 tests added.
  - Files: `src/repositories/geofence.repository.ts`
  - Requirements: 1.2, 1.3

- [x] 3. Checkpoint - Database layer complete
  - Status: completed
  - Started: 2026-01-19T11:16:00Z
  - Completed: 2026-01-19T11:20:00Z
  - Notes: All repository tests passing, migrations verified

- [ ] 4. Implement boundary detection algorithm
  - Status: in_progress
  - Started: 2026-01-19T11:21:00Z
  - Completed:
  - Notes:
  - Files: `src/services/geofence.service.ts`, `src/utils/geometry.ts`
  - Requirements: 2.1, 2.2

- [ ] 5. Create geofence event handlers
  - Status: pending
  - Started:
  - Completed:
  - Notes:
  - Files: `src/handlers/geofence.handler.ts`
  - Requirements: 2.3

- [ ] 6. Implement real-time alerts
  - Status: pending
  - Started:
  - Completed:
  - Notes:
  - Files: `src/services/alert.service.ts`
  - Requirements: 3.1, 3.2

- [ ] 7. Checkpoint - Core logic complete
  - Status: pending
  - Started:
  - Completed:
  - Notes:

- [ ] 8. Add API endpoints
  - Status: pending
  - Started:
  - Completed:
  - Notes:
  - Files: `src/routes/geofence.routes.ts`
  - Requirements: 4.1, 4.2

## Notes
- Using PostGIS for spatial operations
- WebSocket for real-time alerts
- See design.md for architecture decisions
```