---
name: execution-state
description: Manage execution state for multi-task issue implementation. Provides context continuity across sub-agents by maintaining a structured state file and implementation journal. Sub-agents read state to self-orient and update state upon completion.
allowed-tools:
  - Bash(cat:*)
  - Bash(jq:*)
  - Bash(date:*)
  - Bash(git diff:*)
  - Read
  - Write
  - Edit
---

# Execution State Management

Maintain context continuity across sub-agents in complex tier workflows.

## Overview

This skill manages two files that enable sub-agents to understand prior work:

| File | Purpose | Format |
|------|---------|--------|
| `execution-state.json` | Authoritative task state | Structured JSON |
| `journal.md` | Rich context, decisions, rationale | Markdown narrative |

This approach enables agents to self-orient by querying state rather than receiving pre-built summaries.

---

## File Locations

All files live in the plan directory:

```
.claude/plans/issue-[N]-[slug]/
├── requirements.md      # From planning
├── design.md            # From planning
├── tasks.md             # From planning
├── execution-state.json # Created by execute.md before first task
└── journal.md           # Created by execute.md, appended by sub-agents
```

---

## Operations

### Operation: Initialize State

**When**: Before spawning the first sub-agent

**Input**: Issue number, plan directory path

**Process**:

1. Parse `tasks.md` to extract task list
2. Create `execution-state.json` with all tasks in `pending` status
3. Create `journal.md` with issue header

```bash
# Example: Initialize for issue 42
ISSUE_NUMBER=42
ISSUE_TITLE="Add vehicle geofencing"
BRANCH_NAME="issue/42-geofencing"
PLAN_DIR=".claude/plans/issue-42-geofencing"

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
    // Populated from tasks.md parsing
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

### Parse tasks.md to Populate Tasks Array

```bash
# Parse tasks from tasks.md and populate execution-state.json
TASK_INDEX=0
TASKS_JSON="["

while IFS= read -r line; do
  # Extract task number and description from checkbox format
  # Matches: "- [ ] 1. Description" or "- [ ] 1.1 Description"
  if [[ "$line" =~ ^-\ \[\ \]\ ([0-9]+\.?[0-9]*)\.?\ (.+)$ ]]; then
    TASK_NUM="${BASH_REMATCH[1]}"
    TASK_DESC="${BASH_REMATCH[2]}"

    # Add comma separator after first item
    if [ $TASK_INDEX -gt 0 ]; then
      TASKS_JSON="$TASKS_JSON,"
    fi

    TASKS_JSON="$TASKS_JSON
  {
    \"id\": \"$TASK_NUM\",
    \"description\": \"$TASK_DESC\",
    \"status\": \"pending\",
    \"started_at\": null,
    \"completed_at\": null,
    \"files_created\": [],
    \"files_modified\": [],
    \"exports\": [],
    \"patterns\": [],
    \"notes\": \"\",
    \"test_results\": null
  }"
    TASK_INDEX=$((TASK_INDEX + 1))
  fi
done < "$PLAN_DIR/tasks.md"

TASKS_JSON="$TASKS_JSON
]"

# Update execution-state.json with parsed tasks
TMP_FILE=$(mktemp)
jq --argjson tasks "$TASKS_JSON" '.tasks = $tasks' "$PLAN_DIR/execution-state.json" > "$TMP_FILE"
mv "$TMP_FILE" "$PLAN_DIR/execution-state.json"

echo "Populated $TASK_INDEX tasks from tasks.md"
```

---

### Operation: Read State (Sub-Agent Self-Orientation)

**When**: Each sub-agent starts, before implementing

**Process**:

```bash
# 1. Read execution state
cat $PLAN_DIR/execution-state.json

# 2. Filter to completed tasks
cat $PLAN_DIR/execution-state.json | jq '.tasks[] | select(.status == "completed")'

# 3. Get exports from completed tasks (what's available to use)
cat $PLAN_DIR/execution-state.json | jq -r '.tasks[] | select(.status == "completed") | .exports[]'

# 4. Get patterns established (conventions to follow)
cat $PLAN_DIR/execution-state.json | jq -r '.tasks[] | select(.status == "completed") | .patterns[]'

# 5. Check git changes on branch
git diff origin/main --name-only

# 6. Read journal for context and key decisions
cat $PLAN_DIR/journal.md
```

**Self-Orientation Checklist**:

1. Which tasks are completed? What did they produce?
2. What files were created/modified?
3. What exports (classes, functions, types) are available?
4. What patterns should I follow?
5. What key decisions were made?
6. What should I know before starting my task?

---

### Operation: Update State (Sub-Agent Completion)

**When**: Sub-agent completes its assigned task

**Process**:

The sub-agent is responsible for updating BOTH files:

#### 1. Update execution-state.json

```bash
TASK_ID="3"
PLAN_DIR=".claude/plans/issue-42-geofencing"

# Update the task entry
TMP_FILE=$(mktemp)
jq "(.tasks[] | select(.id == \"$TASK_ID\")) |= . + {
  \"status\": \"completed\",
  \"completed_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"files_created\": [\"src/services/geofence.service.ts\"],
  \"files_modified\": [\"src/types/index.ts\"],
  \"exports\": [\"GeofenceService\", \"checkBoundary()\"],
  \"patterns\": [\"Services are singleton instances\"],
  \"notes\": \"Implemented boundary detection using ray casting algorithm\",
  \"test_results\": {\"passed\": 5, \"failed\": 0, \"skipped\": 0}
}" "$PLAN_DIR/execution-state.json" > "$TMP_FILE"
mv "$TMP_FILE" "$PLAN_DIR/execution-state.json"

# Update the root updated_at timestamp
TMP_FILE=$(mktemp)
jq ".updated_at = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" "$PLAN_DIR/execution-state.json" > "$TMP_FILE"
mv "$TMP_FILE" "$PLAN_DIR/execution-state.json"
```

#### 2. Append to journal.md

```bash
cat >> "$PLAN_DIR/journal.md" << 'EOF'

---

## Task 3: Implement boundary detection algorithm

**Status**: ✅ Completed
**Time**: 2026-01-20T11:00:00Z → 2026-01-20T11:45:00Z

### What I Did
Implemented the geofence boundary detection service using the ray casting algorithm for point-in-polygon checks.

### Files Created
- `src/services/geofence.service.ts` - Main service with boundary detection logic

### Files Modified
- `src/types/index.ts` - Added GeofenceResult type

### Key Decisions
1. **Ray casting over winding number**: Simpler implementation, sufficient for convex polygons
2. **Singleton service pattern**: Consistent with other services in codebase

### Patterns Established
- Services export a singleton instance
- All async methods return typed Result objects

### Exports for Other Tasks
```typescript
export class GeofenceService {
  checkBoundary(point: Point, geofenceId: string): Promise<GeofenceResult>
  findContainingGeofences(point: Point): Promise<Geofence[]>
}
export const geofenceService = new GeofenceService();
```

### What Next Task Should Know
- Import `geofenceService` from `src/services/geofence.service`
- The service expects the database to be seeded with geofences first
- Use `GeofenceResult.isInside` to check containment

EOF
```

---

### Operation: Verify State Updated

**When**: After sub-agent completes, before spawning next

**Process**:

```bash
TASK_ID="3"
PLAN_DIR=".claude/plans/issue-42-geofencing"

# Check if task status was updated
TASK_STATUS=$(cat "$PLAN_DIR/execution-state.json" | jq -r ".tasks[] | select(.id == \"$TASK_ID\") | .status")

if [ "$TASK_STATUS" != "completed" ] && [ "$TASK_STATUS" != "failed" ]; then
  echo "WARNING: Sub-agent did not update execution-state.json"
  echo "  Expected status 'completed' or 'failed', got: '$TASK_STATUS'"

  # Fallback: Update based on test results if tests passed
  if [ "$TEST_PASSED" = true ]; then
    TMP_FILE=$(mktemp)
    jq "(.tasks[] | select(.id == \"$TASK_ID\")) |= . + {
      \"status\": \"completed\",
      \"completed_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
      \"notes\": \"(auto-updated by orchestrator)\"
    }" "$PLAN_DIR/execution-state.json" > "$TMP_FILE"
    mv "$TMP_FILE" "$PLAN_DIR/execution-state.json"
    echo "  → Orchestrator updated execution-state.json as fallback"
  fi
else
  echo "✅ execution-state.json updated by sub-agent (status: $TASK_STATUS)"
fi

# Check if journal was updated
JOURNAL_HAS_TASK=$(grep -c "## Task $TASK_ID:" "$PLAN_DIR/journal.md" 2>/dev/null || echo "0")

if [ "$JOURNAL_HAS_TASK" -eq 0 ]; then
  echo "WARNING: Sub-agent did not update journal.md"
  # Append minimal fallback entry
  cat >> "$PLAN_DIR/journal.md" << EOF

---

## Task $TASK_ID: $TASK_DESCRIPTION

**Status**: $([ "$TEST_PASSED" = true ] && echo "✅ Completed" || echo "❌ Failed")
**Time**: $STARTED_TIME → $(date -u +%Y-%m-%dT%H:%M:%SZ)

### What I Did
$SUMMARY

*(Entry auto-generated by orchestrator - sub-agent did not update journal)*

EOF
  echo "  → Orchestrator appended fallback entry to journal.md"
else
  echo "✅ journal.md updated by sub-agent"
fi
```

---

### Operation: Get Next Pending Task

**When**: Orchestrator needs to find the next task to spawn

```bash
PLAN_DIR=".claude/plans/issue-42-geofencing"

# Get first pending task
NEXT_TASK=$(cat "$PLAN_DIR/execution-state.json" | jq -r '.tasks[] | select(.status == "pending") | {id, description} | @json' | head -1)

if [ -z "$NEXT_TASK" ]; then
  # Check if any are in_progress (resume scenario)
  IN_PROGRESS=$(cat "$PLAN_DIR/execution-state.json" | jq -r '.tasks[] | select(.status == "in_progress") | {id, description} | @json' | head -1)

  if [ -n "$IN_PROGRESS" ]; then
    echo "RESUME: Found in_progress task"
    echo "$IN_PROGRESS"
  else
    echo "ALL_COMPLETE: No pending tasks"
  fi
else
  echo "NEXT_TASK: $NEXT_TASK"
fi
```

---

### Operation: Mark Task In Progress

**When**: Before spawning a sub-agent for a task

```bash
TASK_ID="3"
PLAN_DIR=".claude/plans/issue-42-geofencing"

TMP_FILE=$(mktemp)
jq "(.tasks[] | select(.id == \"$TASK_ID\")) |= . + {
  \"status\": \"in_progress\",
  \"started_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
}" "$PLAN_DIR/execution-state.json" > "$TMP_FILE"
mv "$TMP_FILE" "$PLAN_DIR/execution-state.json"

echo "Task $TASK_ID marked as in_progress"
```

---

### Operation: Get Progress Summary

**When**: Generating status reports or GitHub comments

```bash
PLAN_DIR=".claude/plans/issue-42-geofencing"

# Count by status
TOTAL=$(cat "$PLAN_DIR/execution-state.json" | jq '.tasks | length')
COMPLETED=$(cat "$PLAN_DIR/execution-state.json" | jq '[.tasks[] | select(.status == "completed")] | length')
IN_PROGRESS=$(cat "$PLAN_DIR/execution-state.json" | jq '[.tasks[] | select(.status == "in_progress")] | length')
PENDING=$(cat "$PLAN_DIR/execution-state.json" | jq '[.tasks[] | select(.status == "pending")] | length')
FAILED=$(cat "$PLAN_DIR/execution-state.json" | jq '[.tasks[] | select(.status == "failed")] | length')

# Calculate percentage
PERCENT=$((COMPLETED * 100 / TOTAL))

# Generate progress bar
FILLED=$((PERCENT / 5))
EMPTY=$((20 - FILLED))

echo "## Progress: $COMPLETED/$TOTAL ($PERCENT%)"
echo ""
printf '['
printf '█%.0s' $(seq 1 $FILLED 2>/dev/null)
printf '░%.0s' $(seq 1 $EMPTY 2>/dev/null)
printf '] %d%%\n' $PERCENT
echo ""
echo "- Completed: $COMPLETED"
echo "- In Progress: $IN_PROGRESS"
echo "- Pending: $PENDING"
echo "- Failed: $FAILED"
```

---

## Schema: execution-state.json

```json
{
  "issue": {
    "number": 42,
    "title": "Add vehicle geofencing feature",
    "branch": "issue/42-geofencing"
  },
  "created_at": "2026-01-20T10:00:00Z",
  "updated_at": "2026-01-20T11:30:00Z",
  "tasks": [
    {
      "id": "1",
      "description": "Create database schema for geofences",
      "status": "completed",
      "started_at": "2026-01-20T10:05:00Z",
      "completed_at": "2026-01-20T10:25:00Z",
      "files_created": [
        "prisma/schema.prisma",
        "prisma/migrations/20260120_add_geofence/migration.sql"
      ],
      "files_modified": [],
      "exports": [
        "Prisma model: Geofence",
        "Prisma model: GeofenceEvent"
      ],
      "patterns": [
        "Using PostGIS geometry(Polygon, 4326) for boundaries",
        "Soft deletes via deletedAt timestamp"
      ],
      "notes": "Added spatial index for performance.",
      "test_results": {
        "passed": 3,
        "failed": 0,
        "skipped": 0
      }
    },
    {
      "id": "2",
      "description": "Implement GeofenceRepository",
      "status": "pending",
      "started_at": null,
      "completed_at": null,
      "files_created": [],
      "files_modified": [],
      "exports": [],
      "patterns": [],
      "notes": "",
      "test_results": null
    }
  ]
}
```

### Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Task identifier (matches tasks.md numbering) |
| `description` | string | Task description from tasks.md |
| `status` | enum | `pending`, `in_progress`, `completed`, `failed` |
| `started_at` | string\|null | ISO timestamp when work began |
| `completed_at` | string\|null | ISO timestamp when completed |
| `files_created` | string[] | New files created by this task |
| `files_modified` | string[] | Existing files modified by this task |
| `exports` | string[] | Key classes, functions, types other tasks may need |
| `patterns` | string[] | Conventions established that future tasks should follow |
| `notes` | string | Brief summary of implementation decisions |
| `test_results` | object\|null | `{passed, failed, skipped}` counts, null if not yet run |

---

## Schema: journal.md

```markdown
# Implementation Journal

**Issue**: #42 - Add vehicle geofencing feature
**Branch**: issue/42-geofencing
**Started**: 2026-01-20T10:00:00Z

---

## Task 1: Create database schema for geofences

**Status**: ✅ Completed
**Time**: 2026-01-20T10:05:00Z → 2026-01-20T10:25:00Z

### What I Did
Created the Prisma schema for geofences with PostGIS support.

### Files Created
- `prisma/schema.prisma` - Added Geofence and GeofenceEvent models

### Key Decisions
1. **PostGIS over simple lat/lng**: Enables efficient spatial queries

### Patterns Established
- All models include `createdAt`, `updatedAt` timestamps

### Exports for Other Tasks
- Prisma model: `Geofence`, `GeofenceEvent`

### What Next Task Should Know
- Import types from `@prisma/client`
- Spatial queries require raw SQL

---

## Task 2: Implement GeofenceRepository

**Status**: 🔄 In Progress
**Started**: 2026-01-20T10:30:00Z

(Entry will be completed by sub-agent)

---
```

### Journal Entry Template

Each sub-agent should append an entry following this template:

```markdown
---

## Task [N]: [Description]

**Status**: [✅ Completed | ❌ Failed]
**Time**: [start] → [end]

### What I Did
[2-3 sentence summary of implementation]

### Files Created
- `path/to/file.ts` - Purpose

### Files Modified
- `path/to/existing.ts` - What was changed

### Key Decisions
1. **[Decision]**: [Rationale]

### Patterns Established
- [Conventions future tasks should follow]

### Exports for Other Tasks
```typescript
// Key signatures
export function name(): Type
export class Name { ... }
```

### What Next Task Should Know
[Critical handoff information]
```

---

## Integration with execute.md

The execute.md command uses this skill as follows:

| Step | Operation | Who Performs |
|------|-----------|--------------|
| Before first sub-agent | Initialize State | Orchestrator |
| Before each sub-agent | Mark Task In Progress | Orchestrator |
| Sub-agent start | Read State (Self-Orient) | Sub-agent |
| Sub-agent end | Update State | Sub-agent |
| After each sub-agent | Verify State Updated | Orchestrator |
| After all tasks | Get Progress Summary | Orchestrator |

---

## Error Handling

### Sub-Agent Fails to Update State

If state file wasn't updated after sub-agent:

1. Check git diff for files changed
2. Update state based on actual changes
3. Log warning for review
4. Continue execution (don't block on missing state update)

### Sub-Agent Task Fails

Sub-agent sets `status: "failed"` with explanation in `notes`.

Orchestrator options:
- **Retry**: Spawn new sub-agent for same task
- **Skip**: Mark task as failed, continue to next
- **Halt**: Stop execution, label issue `needs review`

### Invalid JSON in execution-state.json

```bash
# Validate JSON before use
if ! jq empty "$PLAN_DIR/execution-state.json" 2>/dev/null; then
  echo "ERROR: Invalid JSON in execution-state.json"
  # Attempt recovery from git history
  git show HEAD:"$PLAN_DIR/execution-state.json" > "$PLAN_DIR/execution-state.json.bak"
fi
```

---

## Benefits

| Aspect | Benefit |
|--------|---------|
| **Self-orientation** | Sub-agent explores context as needed, not pre-loaded |
| **No orchestrator parsing** | Sub-agent updates state directly |
| **Structured + Narrative** | JSON for machines, journal for humans |
| **Debuggable** | State file shows exactly what happened |
| **Resumable** | Can continue from any point after interruption |
| **File-based** | No database required, works offline |

---

## Usage Example

### Orchestrator: Initialize and Run First Task

```bash
# 1. Initialize state
PLAN_DIR=".claude/plans/issue-42-geofencing"
# ... run initialization operations ...

# 2. Get first task
NEXT=$(cat "$PLAN_DIR/execution-state.json" | jq -r '.tasks[0] | {id, description}')

# 3. Mark as in_progress
# ... run mark in_progress operation ...

# 4. Spawn sub-agent with task
# Task tool call with prompt referencing PLAN_DIR
```

### Sub-Agent: Self-Orient and Complete

```bash
# 1. Read state to understand context
cat $PLAN_DIR/execution-state.json | jq '.tasks[] | select(.status == "completed")'

# 2. Read journal for detailed context
cat $PLAN_DIR/journal.md

# 3. Check what files exist on branch
git diff origin/main --name-only

# 4. Implement the task
# ... do the work ...

# 5. Update execution-state.json
# ... run update state operation ...

# 6. Append to journal.md
# ... run append journal operation ...
```
