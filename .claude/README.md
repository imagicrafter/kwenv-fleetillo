# Claude Code Configuration

This directory contains configuration specific to Claude Code CLI. For tool-agnostic agent documentation, see `.agent/README.md`.

## Directory Structure

```
.claude/
├── README.md                    # This file
├── settings.local.json          # Local settings and permissions
├── skills/                      # Agent Skills (autonomous + manual invocation)
│   ├── analyze-issue/           # Read-only issue analysis
│   ├── detect-project/          # Detect test/build/lint commands
│   ├── execution-state/         # Context continuity for sub-agents
│   ├── generate-plan/           # Create planning documents
│   ├── issue-check/             # Orchestrator: triage all issues
│   ├── plan-check/              # Orchestrator: generate all plans
│   ├── start-issue/             # Set up for implementation
│   ├── task-state/              # Manage task status in tasks.md
│   ├── triage-issue/            # Score and label single issue
│   └── validate-plan/           # Check plan quality
├── commands/                    # Slash commands (user-invoked only)
│   ├── execute.md               # /execute - Implement planned issues
│   └── prime.md                 # /prime - Load project context
├── hooks/                       # PostToolUse automation hooks
│   ├── archive-plan.sh          # Auto-archive plans to dated folders
│   └── review-plan.sh           # Send plans to external AI reviewers
└── plans/                       # Implementation plans
    ├── archive/                 # Archived plans (auto-populated)
    ├── templates/               # Plan document templates
    └── reviews/                 # External review results
```

---

## The Execute Workflow

The `/execute` command is the primary implementation orchestrator. It takes a planned issue and implements it autonomously, using skills for project detection and state management.

### Execute Command Overview

```
/execute [issue-number-or-plan-folder]
```

Implements a GitHub issue based on its complexity tier:

| Tier | Complexity | Execution Model |
|------|------------|-----------------|
| **Simple** | 0-2 pts | Orchestrator implements directly |
| **Medium** | 3-6 pts | Single sub-agent with full plan |
| **Complex** | 7+ pts | Multiple sub-agents with context continuity |

### Execute Workflow Diagram

```
                              /execute [N]
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
               ┌────────┐    ┌────────┐    ┌────────────┐
               │ Simple │    │ Medium │    │  Complex   │
               └────┬───┘    └────┬───┘    └─────┬──────┘
                    │             │              │
                    │             │              │
                    ▼             │              ▼
              Orchestrator        │      ┌──────────────────┐
              implements          │      │ Initialize State │
              directly            │      │  (execution-state│
                    │             │      │   + journal.md)  │
                    │             │      └────────┬─────────┘
                    │             │               │
                    │             ▼               ▼
                    │      ┌────────────┐  ┌─────────────────┐
                    │      │ Sub-agent  │  │  For each task: │
                    │      │ with full  │  │                 │
                    │      │ plan.md    │  │  ┌───────────┐  │
                    │      └─────┬──────┘  │  │Sub-agent  │  │
                    │            │         │  │self-orients│  │
                    │            │         │  │& implements│  │
                    │            │         │  └─────┬─────┘  │
                    │            │         │        │        │
                    │            │         │  ┌─────▼─────┐  │
                    │            │         │  │Update state│  │
                    │            │         │  │& journal   │  │
                    │            │         │  └─────┬─────┘  │
                    │            │         │        │        │
                    │            │         │  Verify updates │
                    │            │         │  Next task ─────┤
                    │            │         └─────────────────┘
                    │            │               │
                    ▼            ▼               ▼
              ┌─────────────────────────────────────────┐
              │            detect-project               │
              │   (test, lint, type-check, build cmds)  │
              └──────────────────┬──────────────────────┘
                                 │
                                 ▼
              ┌─────────────────────────────────────────┐
              │          Validation Phase               │
              │  Type Check → Lint → Format → Test →    │
              │  Build (up to 3 fix attempts)           │
              └──────────────────┬──────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
              ✅ All Pass               ❌ Failures
                    │                         │
                    ▼                         ▼
              Commit & Push            Label: needs review
                    │                   Commit WIP
                    ▼                   Post comment
              Create PR                      │
                    │                        ▼
                    ▼                   Human review
              🎉 Done                   required
```

### Skills Used by Execute

| Skill | When Used | Purpose |
|-------|-----------|---------|
| **detect-project** | Before validation | Detect test/build/lint commands for the project |
| **execution-state** | Complex tier only | Manage `execution-state.json` and `journal.md` for context continuity |
| **task-state** | Complex tier only | Parse and update task status in `tasks.md` |

---

## Skills Inventory

Skills are autonomous capabilities that agents can invoke based on context OR humans can invoke via `/skill-name`.

### Execution Skills (Used by /execute)

| Skill | Purpose | Files Managed |
|-------|---------|---------------|
| **detect-project** | Auto-detect project type, test framework, build tools, and validation commands | Reads `package.json`, `pyproject.toml`, etc. |
| **execution-state** | Maintain context continuity across sub-agents in complex tier | `execution-state.json`, `journal.md` |
| **task-state** | Parse and update task status for complex tier execution | `tasks.md` |

#### detect-project

Analyzes project configuration files to determine:
- Project type (Node.js, Python, Go, Rust, etc.)
- Test command (`npm test`, `pytest`, `go test ./...`)
- Type check command (`npx tsc --noEmit`, `mypy .`)
- Lint command (`npx eslint .`, `ruff check .`)
- Format command (`npx prettier --check .`)
- Build command (`npm run build`, `go build ./...`)

```bash
# Invocation
/detect-project
```

#### execution-state

Manages two files for complex tier context continuity:

| File | Format | Purpose |
|------|--------|---------|
| `execution-state.json` | JSON | Authoritative task state, exports, patterns |
| `journal.md` | Markdown | Rich narrative context and decisions |

Sub-agents self-orient by reading these files, then update them after completing work.

```bash
# Invocation (typically called by execute.md)
# Operations: initialize, read, update, verify
```

#### task-state

Manages task status in `tasks.md`:
- Parse all tasks and count by status
- Find next pending task
- Start task (set in_progress)
- Complete task (set completed)
- Block task (set blocked with reason)
- Generate progress summary

```bash
# Invocation (typically called by execute.md)
# Operations: parse, get-next, start, complete, block, summary
```

---

### Orchestrator Skills

Orchestrators manage workflows that span multiple issues or stages.

| Skill | Purpose | Invocation |
|-------|---------|------------|
| **issue-check** | Triage all untriaged issues in parallel | `/issue-check` |
| **plan-check** | Generate plans for all issues needing them | `/plan-check` |

#### issue-check

Finds all open issues without triage labels and spawns sub-agents in parallel to analyze and label them.

```bash
/issue-check
# Finds issues missing: plan: simple, plan: medium, plan: complex
# Spawns triage-issue sub-agents in parallel
```

#### plan-check

Generates planning documents for triaged issues:
- **Medium tier**: Spawns sub-agents in parallel to create `plan.md`
- **Complex tier**: Interactive staged workflow with human approval gates

```bash
/plan-check
# Medium: parallel plan generation
# Complex: requirements.md → design.md → tasks.md (staged approval)
```

---

### Single-Issue Skills

Skills that operate on a single issue.

| Skill | Purpose | Invocation |
|-------|---------|------------|
| **analyze-issue** | Read-only complexity analysis | `/analyze-issue 5` |
| **triage-issue** | Score and apply tier label | `/triage-issue 5` |
| **generate-plan** | Create planning documents | `/generate-plan 5` |
| **validate-plan** | Check plan against templates | `/validate-plan 5` |
| **start-issue** | Set up branch and context | `/start-issue 5` |

#### analyze-issue

Performs read-only analysis of a GitHub issue:
- Scope and complexity assessment
- Affected files and areas
- Dependencies and risks

Does NOT modify labels or post comments.

```bash
/analyze-issue 42
```

#### triage-issue

Scores an issue against 7 complexity factors and applies the appropriate tier label:
- `plan: simple` (0-2 pts)
- `plan: medium` (3-6 pts)
- `plan: complex` (7+ pts)

```bash
/triage-issue 42
```

#### generate-plan

Creates `plan.md` for medium-tier issues containing:
- Summary and requirements
- Technical approach and key decisions
- Files to modify/create
- Task list
- Testing strategy

```bash
/generate-plan 42
```

#### validate-plan

Checks planning documents against templates and quality standards:
- Verifies required sections exist
- Checks for completeness
- Returns pass/warn/fail status

Does NOT modify files.

```bash
/validate-plan 42
```

#### start-issue

Sets up the working environment for implementation:
- Creates feature branch (`issue/N-slug`)
- Loads plan documents into context
- Identifies starting point for work

```bash
/start-issue 42
```

---

## Commands

Commands are user-invoked actions (slash commands).

| Command | Purpose | Invocation |
|---------|---------|------------|
| **execute** | Implement a planned GitHub issue | `/execute 42` |
| **prime** | Load project context into conversation | `/prime` |

### /execute

The primary implementation command. Takes an issue that has been triaged and planned, then implements it autonomously.

```bash
/execute 42                           # By issue number
/execute .claude/plans/issue-42-slug  # By plan folder path
```

**Prerequisites**:
- Issue has tier label (`plan: simple`, `plan: medium`, `plan: complex`)
- Plan documents complete for tier
- GitHub CLI authenticated

**Outputs**:
- Implemented code on feature branch
- All validations passing
- Pull request created
- Issue updated with PR link

### /prime

Loads project context and structure into the conversation.

```bash
/prime
```

---

## Complete Issue Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TRIAGE PHASE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  New Issue ──────► /issue-check or /triage-issue                    │
│                              │                                      │
│          ┌───────────────────┼───────────────────┐                  │
│          ▼                   ▼                   ▼                  │
│    plan: simple        plan: medium        plan: complex            │
│    + plan ready              │                   │                  │
│                              │                   │                  │
├─────────────────────────────────────────────────────────────────────┤
│                        PLANNING PHASE                               │
├─────────────────────────────────────────────────────────────────────┤
│                              │                   │                  │
│                              ▼                   ▼                  │
│                       /generate-plan      /plan-check               │
│                       (single agent)      (staged approval)         │
│                              │                   │                  │
│                              │         ┌────────┼────────┐          │
│                              │         ▼        ▼        ▼          │
│                              │    requirements design  tasks        │
│                              │         .md      .md     .md         │
│                              │         │        │        │          │
│                              │         └───►────┴────►───┘          │
│                              │                   │                  │
│                              ▼                   ▼                  │
│                         + plan ready        + plan ready            │
│                              │                   │                  │
├─────────────────────────────────────────────────────────────────────┤
│                       EXECUTION PHASE                               │
├─────────────────────────────────────────────────────────────────────┤
│                              │                   │                  │
│          ┌───────────────────┴───────────────────┘                  │
│          ▼                                                          │
│    /start-issue (optional - sets up branch)                         │
│          │                                                          │
│          ▼                                                          │
│      /execute                                                       │
│          │                                                          │
│          ├──► detect-project (all tiers)                            │
│          ├──► execution-state (complex tier)                        │
│          ├──► task-state (complex tier)                             │
│          │                                                          │
│          ▼                                                          │
│    Implementation + Validation                                      │
│          │                                                          │
│          ▼                                                          │
│    Create PR ──────► Merge ──────► Issue auto-closes                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Complex Issue Planning Workflow

For complex issues, the `/plan-check` orchestrator guides through staged approval:

1. **Requirements** → Generate requirements.md → Wait for human approval
2. **Design** → Generate design.md (using approved requirements) → Wait for human approval
3. **Tasks** → Generate tasks.md (using approved design) → Wait for human approval
4. **Complete** → Add `plan ready` label

### Resume Capability

The orchestrator automatically detects and resumes partially completed planning:

| Existing Documents | Resume From |
|-------------------|-------------|
| None | Stage 1: Requirements |
| `requirements.md` | Stage 2: Design |
| `requirements.md` + `design.md` | Stage 3: Tasks |
| All three | Stage 4: Complete |

---

## Complex Issue Execution Workflow

For complex issues, `/execute` uses context continuity:

### Files Created

```
.claude/plans/issue-[N]-[slug]/
├── requirements.md      # From planning
├── design.md            # From planning
├── tasks.md             # From planning
├── execution-state.json # Created by execute before first task
└── journal.md           # Created by execute, appended by sub-agents
```

### Sub-Agent Self-Orientation

Each sub-agent in complex tier:

1. **Reads** `execution-state.json` to see completed tasks, exports, patterns
2. **Reads** `journal.md` for context and key decisions
3. **Checks** `git diff origin/main --name-only` for files on branch
4. **Implements** assigned task
5. **Updates** `execution-state.json` with results
6. **Appends** to `journal.md` with summary

### Context Continuity Benefits

| Aspect | Benefit |
|--------|---------|
| Self-orientation | Sub-agent explores context as needed |
| No orchestrator bloat | Orchestrator passes paths, not contents |
| Structured + Narrative | JSON for machines, journal for humans |
| Resumable | Can continue from any point after interruption |
| Debuggable | State files show exactly what happened |

---

## Labels

| Label | Score | Planning Required |
|-------|-------|-------------------|
| `plan: simple` | 0-2 pts | None (+ `plan ready` immediately) |
| `plan: medium` | 3-6 pts | `plan.md` |
| `plan: complex` | 7+ pts | `requirements.md`, `design.md`, `tasks.md` |
| `plan ready` | - | Implementation can begin |
| `needs review` | - | Human intervention required |

---

## Hooks

PostToolUse hooks trigger when plans are written:

### archive-plan.sh
- Copies plans to `.claude/plans/archive/YYYY-MM-DD/`
- Posts plan to GitHub issue (if on `issue/N-*` branch)

### review-plan.sh
- Sends to external AI reviewers (Gemini, Codex if available)
- Saves reviews to `.claude/plans/reviews/`
- Returns verdict: APPROVE, WARN, or BLOCK

---

## Plans Directory

```
.claude/plans/
├── issue-5-dispatch-job/        # Active plan (medium tier)
│   └── plan.md
├── issue-42-geofencing/         # Active plan (complex tier)
│   ├── requirements.md
│   ├── design.md
│   ├── tasks.md
│   ├── execution-state.json     # Created during execution
│   └── journal.md               # Created during execution
├── templates/                   # Document templates
├── archive/                     # Auto-archived
└── reviews/                     # External reviews
```

---

## Querying Issues

```bash
# Ready to implement
gh issue list --label "plan ready"

# Need planning (medium)
gh issue list --label "plan: medium" --json number,title,labels | \
  jq '.[] | select(.labels | map(.name) | contains(["plan ready"]) | not)'

# Need planning (complex)
gh issue list --label "plan: complex" --json number,title,labels | \
  jq '.[] | select(.labels | map(.name) | contains(["plan ready"]) | not)'

# Need human review
gh issue list --label "needs review"
```

---

## Branch Naming

Hooks and execute detect issue number from branch name:

```
issue/[NUMBER]-[description]
```

Examples: `issue/5-dispatch-job`, `issue/42-geofencing`

---

## Related

- `.agent/README.md` - Tool-agnostic configuration
- `.agent/skills/` - Synced skills for Gemini/other tools
- `docs/yokeflow/` - Project architecture
