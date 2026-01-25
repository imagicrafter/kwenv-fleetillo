# Claude Code Configuration

This directory contains configuration for Claude Code CLI and other AI agents (via symlinks in `.agent/`).

---

## New Repository Setup Checklist

When setting up a new repository to use this workflow, complete these steps:

### GitHub Repository Settings

```bash
# Enable auto-delete branches after PR merge
gh api repos/OWNER/REPO -X PATCH -f delete_branch_on_merge=true

# Verify the setting
gh api repos/OWNER/REPO --jq '.delete_branch_on_merge'
# Should return: true
```

### Command Inheritance

**Commands are inherited from global config (`~/.claude/commands/`).**

Do NOT copy commands into project `.claude/commands/` unless they are project-specific overrides. This ensures:
- Single source of truth for standard workflows
- Automatic updates when global config improves
- No stale/divergent command copies

| Location | Purpose |
|----------|---------|
| `~/.claude/commands/` | Global commands (authoritative) |
| `.claude/commands/` | Project-specific overrides only |

**Current project-specific commands:**
- `prime.md` - Fleetillo context loading
- `test-data-policy.md` - Test data handling rules

All other commands (execute, verify, plan-check, etc.) inherit from global.

### Settings Architecture

**Settings are managed globally** via `~/.claude/settings.local.json`. Projects do NOT have their own `settings.local.json`.

The global settings use `$CLAUDE_PROJECT_DIR` to reference project-specific hooks:
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit",
      "hooks": [{
        "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/quality-feedback/auto-format.sh"
      }]
    }]
  }
}
```

This ensures:
- Single source of truth for hook configuration
- Project hooks are still executed (via `$CLAUDE_PROJECT_DIR`)
- No settings drift between projects
- Hooks that don't exist in a project are silently skipped

### Hybrid Rules Architecture

Rules follow a **global defaults + project overrides** pattern:

| Location | Purpose | Auto-Syncs To |
|----------|---------|---------------|
| `~/.claude/rules/` | Global defaults (all repos) | `~/.windsurf/global_rules.md` |
| `.claude/rules/` | Project customizations | `.windsurf/rules/` |

**How it works:**
1. Global rules provide baseline guidelines (security, coding-style, testing)
2. Projects can override/customize by editing `.claude/rules/*.md`
3. PostToolUse hooks auto-sync changes to Windsurf format
4. Both Claude Code and Windsurf/Antigravity get consistent rules

### Windsurf/Antigravity Support

This project supports both Claude Code and Windsurf:

| Feature | Claude Code | Windsurf |
|---------|-------------|----------|
| Project Rules | `.claude/rules/` | `.windsurf/rules/` (auto-synced) |
| Global Commands | `~/.claude/commands/` | `~/.gemini/antigravity/global_workflows/` |
| Slash Commands | `/execute`, `/verify`, etc. | Same commands work |

**Rules sync** automatically when you edit `.claude/rules/*.md` files. Manual sync:

```bash
~/.claude/scripts/sync-rules-to-windsurf.sh .claude/rules .windsurf/rules
```

**Commands sync** globally (not per-project). Manual sync:

```bash
~/.claude/scripts/sync-commands-to-windsurf.sh
```

### Required Files

| File | Purpose | Source |
|------|---------|--------|
| `.claude/rules/*` | Project rules (can override global) | Created by `/repo-setup` |
| `.claude/hooks/*` | Project-specific hook scripts | Created by `/repo-setup` |
| `.claude/commands/*.md` | Project-specific commands only | Manual (if needed) |
| `.windsurf/rules/*` | Windsurf rules (auto-synced) | Auto-generated |
| `.githooks/pre-commit` | Block direct commits to main | See below |
| `.env` | Environment variables (gitignored) | Project-specific |

**Note:** Do NOT create `.claude/settings.local.json` in projects. Settings override (not merge), so a project settings file would disable all global hooks.

### Pre-commit Hook (Block Direct Main Commits)

Create `.githooks/pre-commit`:

```bash
#!/bin/bash
branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" = "main" ]; then
  echo "🚨 ERROR: Direct commits to 'main' branch are not allowed!"
  echo ""
  echo "Please create an issue branch first:"
  echo "  git checkout -b issue/[NUMBER]-[description]"
  echo ""
  echo "Then commit your changes to that branch."
  exit 1
fi
exit 0
```

Enable the hook:
```bash
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
```

### Environment Files

For projects with sub-packages, ensure `.env` files exist in:
- Root directory
- `dispatch-service/` (if applicable)
- `web-launcher/` (if applicable)

These are gitignored and must be copied manually when setting up worktrees.

### Labels

Create these labels in GitHub:

| Label | Color | Description |
|-------|-------|-------------|
| `plan: simple` | `#0E8A16` | Simple - no plan needed, ready to implement |
| `plan: medium` | `#FBCA04` | Medium (3-6 pts) - needs plan.md document |
| `plan: complex` | `#D93F0B` | Complex (7+ pts) - needs requirements.md, design.md, tasks.md |
| `plan ready` | `#0052CC` | Planning complete - ready for implementation |
| `needs review` | `#D93F0B` | Requires human review |

---

## Directory Structure

```
.claude/
├── README.md                    # This file
├── agents/                      # Specialized AI agents
│   ├── planner.md               # Implementation planning with risk assessment
│   ├── architect.md             # System design decisions
│   ├── code-reviewer.md         # Code quality review
│   └── security-reviewer.md     # Security analysis (OWASP Top 10)
├── rules/                       # Always-follow guidelines
│   ├── agents.md                # When to delegate to sub-agents
│   ├── coding-style.md          # Immutability, file organization
│   ├── security.md              # No hardcoded secrets
│   └── testing.md               # 80% coverage, TDD workflow
├── skills/                      # Agent Skills (autonomous + manual invocation)
│   ├── analyze-issue/           # Read-only issue analysis
│   ├── continuous-learning/     # Auto-extract patterns from sessions
│   ├── detect-project/          # Detect test/build/lint commands
│   ├── execution-state/         # Context continuity for sub-agents
│   ├── generate-plan/           # Create planning documents
│   ├── issue-check/             # Orchestrator: triage all issues
│   ├── plan-check/              # Orchestrator: generate all plans
│   │   └── scripts/             # Helper scripts
│   │       └── open_preview.sh  # Open markdown in VS Code preview
│   ├── start-issue/             # Set up for implementation
│   ├── task-state/              # Manage task status in tasks.md
│   ├── plan-cleanup/            # Archive plans for closed issues
│   ├── triage-issue/            # Score and label single issue
│   ├── validate-plan/           # Check plan quality
│   └── verification-loop/       # Comprehensive quality verification
├── commands/                    # Slash commands (user-invoked only)
│   ├── execute.md               # /execute - Implement planned issues
│   ├── learn.md                 # /learn - Extract patterns from session
│   ├── merge-pr.md              # /merge-pr - Merge PR, delete branch, clean worktree
│   ├── plan-cleanup.md          # /plan-cleanup - Archive closed plans
│   ├── prioritize.md            # /prioritize - Recommend next issue
│   ├── prime.md                 # /prime - Load project context
│   ├── verify.md                # /verify - Run verification checks
│   └── ...                      # Other workflow commands
├── hooks/                       # Hook scripts
│   ├── memory-persistence/      # Session context persistence
│   │   ├── session-start.sh     # Load previous session context
│   │   ├── session-end.sh       # Save session state
│   │   └── pre-compact.sh       # Preserve state before compaction
│   └── quality-feedback/        # Development feedback hooks
│       ├── auto-format.sh       # Run Prettier after edits
│       ├── type-check.sh        # Run tsc after TS edits
│       ├── console-log-warning.sh # Warn about console.log
│       └── pr-created-logger.sh # Log PR URL after creation
└── plans/                       # Implementation plans
    ├── archive/                 # Archived plans (gitignored)
    │   ├── completed/           # Plans for closed issues
    │   └── duplicates/          # Duplicate plan folders
    └── issue-N-slug/            # Active plan folders

.agent/                          # Symlinks for other AI tools
├── README.md    -> ../.claude/README.md
├── skills/      -> ../.claude/skills
└── workflows/   -> ../.claude/commands

.windsurf/                       # Windsurf/Antigravity rules (auto-synced)
└── rules/                       # Synced from .claude/rules/
    ├── security.md              # With Windsurf frontmatter
    ├── coding-style.md
    ├── testing.md
    └── agents.md
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

**Auto-Cleanup (Step 0):** Before starting, `/execute` automatically archives plan folders for any closed issues. This ensures plans from previously merged PRs are cleaned up without manual intervention.

### Worktree Isolation

The execute command uses **git worktrees** for parallel agent execution. Each execution runs in an isolated directory, allowing multiple agents to work on different issues simultaneously.

```
Main Repo (stays on main)              Worktrees (isolated branches)
─────────────────────────              ────────────────────────────
/github/fleetillo/                     /github/fleetillo-issue-12-feature/
  branch: main                           branch: issue/12-feature
  (clean reference)                      (agent 1 working here)

                                       /github/fleetillo-issue-15-schema/
                                         branch: issue/15-schema
                                         (agent 2 working here)
```

**Worktree Setup (automated by execute.md Step 3.2-3.3):**
1. Creates worktree at `../repo-name-issue-N-slug/`
2. Copies `.env` files from main repo (root + sub-packages)
3. Runs `npm install` if `node_modules` doesn't exist
4. Builds sub-packages (e.g., `dispatch-service`) if `dist/` doesn't exist

**Worktree Cleanup (manual after PR merge):**
```bash
# List worktrees
git worktree list

# Remove a worktree
git worktree remove ../fleetillo-issue-12-feature

# Force remove if uncommitted changes
git worktree remove --force ../fleetillo-issue-12-feature

# Prune stale references
git worktree prune
```

**Why Worktrees?**
- No branch switching in main repo
- Parallel execution without conflicts
- Each agent has isolated environment
- Main repo stays on `main` as clean reference

### Execute Workflow Diagram

```
                              /execute [N]
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │  Create Worktree + Setup    │
                    │  (Step 3.2 + 3.3)           │
                    │  - git worktree add         │
                    │  - copy .env files          │
                    │  - npm install              │
                    │  - build sub-packages       │
                    └──────────────┬──────────────┘
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
| **verify** | Run comprehensive quality verification | `/verify [mode]` |
| **learn** | Extract reusable patterns from session | `/learn` |
| **prioritize** | Recommend next issue to work on | `/prioritize` |
| **plan-cleanup** | Archive plans for closed issues | `/plan-cleanup` |
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

### /prioritize

Analyzes all planned issues and recommends the next one to implement based on:
- Recent PR history (what areas have been worked on)
- Issue dependencies (blocked vs ready)
- Strategic value (foundation work that unlocks other issues)

```bash
/prioritize
```

**Output includes:**
- Summary of recent context
- Table of planned issues with status
- Dependency graph
- Recommended next issue with rationale
- Alternative options

### /plan-cleanup

Archives plan folders for closed issues and cleans up duplicates. Run manually or let `/execute` handle it automatically (Step 0).

```bash
/plan-cleanup
```

**Actions:**
- Archives closed issue plans to `.claude/plans/archive/completed/`
- Archives duplicate folders to `.claude/plans/archive/duplicates/`
- Archives orphaned plans to `.claude/plans/archive/orphaned/`

**Note:** `/execute` runs this automatically before starting, so manual invocation is rarely needed.

### /prime

Loads project context and structure into the conversation.

```bash
/prime
```

### /verify

Runs comprehensive quality verification on the codebase.

```bash
/verify              # Full verification (default)
/verify quick        # Only build + types
/verify pre-commit   # Checks relevant for commits
/verify pre-pr       # Full checks plus security scan
```

**Checks performed:**
- Build verification
- Type checking (TypeScript)
- Linting (ESLint)
- Format checking (Prettier)
- Test suite with coverage
- Console.log audit
- Security scan (pre-pr mode)

**Output:** Formatted verification report saved to plan folder.

### /learn

Extracts reusable patterns from the current session.

```bash
/learn
```

**What to extract:**
- Error resolution patterns
- Debugging techniques
- Library workarounds
- Project-specific conventions

**Output:** Creates skill file in `~/.claude/skills/learned/[pattern-name].md`

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

### Document Review in Preview Mode

When documents are staged for human review, they are automatically opened in VS Code preview mode using the helper script at `.claude/skills/plan-check/scripts/open_preview.sh`.

**Preview shortcuts:**
- **VS Code:** `Cmd+Shift+V` (Mac) / `Ctrl+Shift+V` (Windows/Linux)
- **Side-by-side:** `Cmd+K V` (Mac) / `Ctrl+K V` (Windows/Linux)

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

### Session Lifecycle Hooks

| Hook | Script | Purpose |
|------|--------|---------|
| **SessionStart** | `memory-persistence/session-start.sh` | Load context, auto-archive closed issue plans |
| **Stop** | `memory-persistence/session-end.sh` | Save session context |
| **Stop** | `continuous-learning/evaluate-session.sh` | Extract learned patterns |
| **PreCompact** | `memory-persistence/pre-compact.sh` | Preserve state before compaction |

#### SessionStart Auto-Cleanup

When a new Claude session starts, the SessionStart hook automatically:

**Plan Archiving:**
1. Checks `.claude/plans/issue-*/` folders
2. Queries GitHub to see if each issue is closed
3. Archives closed issue plans to `.claude/plans/archive/completed/`
4. Reports: `[SessionStart] Archived N closed issue plan(s)`

**Stale Branch Cleanup:**
1. Lists local branches matching `issue/*`
2. Skips branches with active worktrees
3. Checks if PR for each branch was merged
4. Deletes local branches with merged PRs
5. Reports: `[SessionStart] Cleaned up N stale branch(es)`

This ensures plan folders and local branches are cleaned up without manual intervention.

### PostToolUse Hooks

| Matcher | Script | Purpose |
|---------|--------|---------|
| **Write** | `archive-plan.sh` | Archive plans to dated folder |
| **Write** | `review-plan.sh` | Send to external reviewers |
| **Write** | `open-plan-preview.sh` | Open in VS Code preview |
| **Edit** | `quality-feedback/auto-format.sh` | Run Prettier on JS/TS files |
| **Edit** | `quality-feedback/type-check.sh` | Run tsc on TS files |
| **Edit** | `quality-feedback/console-log-warning.sh` | Warn about console.log |
| **Bash** | `quality-feedback/pr-created-logger.sh` | Log PR URL after creation |

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

## Agents

Specialized agents in `.claude/agents/` provide focused expertise for specific tasks.

| Agent | Purpose | When Used |
|-------|---------|-----------|
| **planner** | Implementation planning with risk assessment | Plan generation (medium/complex tiers) |
| **architect** | System design and scalability decisions | Complex architectural changes |
| **code-reviewer** | Code quality and security review | Pre-PR review (medium/complex tiers) |
| **security-reviewer** | OWASP Top 10 vulnerability detection | Security-sensitive changes |

### planner

Produces comprehensive plans including:
- Risk assessment (technical debt, complexity, dependencies)
- Phased implementation approach
- Clear success criteria
- Affected component estimation

Used by `/plan-check` for medium tier issues.

### code-reviewer

Reviews changes for:
- Code quality and readability
- Potential bugs or edge cases
- Security concerns
- Performance implications
- Test coverage adequacy

Returns structured review with APPROVE / REQUEST_CHANGES / COMMENT verdict.

Used by `/execute` Step 8.7 for medium/complex tiers.

---

## Rules

Always-follow guidelines in `.claude/rules/` ensure consistency across all sessions.

| Rule | Key Requirements |
|------|------------------|
| **agents.md** | Use planner for complex features, code-reviewer after writing code |
| **coding-style.md** | Always immutable, many small files over few large files |
| **security.md** | No hardcoded secrets, validate all inputs, parameterized queries |
| **testing.md** | 80% coverage minimum, TDD workflow mandatory |

Rules are automatically loaded and apply to all agent sessions.

---

## Memory Persistence

Session context is preserved across sessions using hooks in `.claude/hooks/memory-persistence/`.

### How It Works

| Hook | Trigger | Action |
|------|---------|--------|
| **SessionStart** | New session starts | Notifies of recent sessions and learned skills |
| **Stop** | Session ends | Creates/updates session file with context template |
| **PreCompact** | Before compaction | Logs compaction event, preserves critical state |

### Session Files

Stored in `~/.claude/sessions/`:

```markdown
# Session: 2026-01-22
**Started:** 12:00
**Last Updated:** 12:45

## Current State
### Completed
- [x] Task 1
### In Progress
- [ ] Task 2
### Notes for Next Session
- Key decision made about X
```

---

## Continuous Learning

The continuous-learning skill automatically extracts reusable patterns from sessions.

### Automatic Extraction (Stop Hook)

When a session ends with 10+ messages, the system evaluates for extractable patterns:
- Error resolution patterns
- Debugging techniques
- Workarounds for library quirks
- Project-specific conventions

### Manual Extraction (/learn)

Run `/learn` at any point to extract patterns mid-session:

```bash
/learn
```

### Learned Skills

Patterns are saved to `~/.claude/skills/learned/`:

```markdown
# [Pattern Name]

**Extracted:** 2026-01-22
**Context:** When handling Supabase real-time subscriptions

## Problem
[What problem this solves]

## Solution
[The pattern/technique/workaround]

## When to Use
[Trigger conditions]
```

---

## Quality Feedback Hooks

PostToolUse hooks in `.claude/hooks/quality-feedback/` provide immediate feedback during development.

| Hook | Trigger | Action |
|------|---------|--------|
| **auto-format.sh** | Edit on .ts/.tsx/.js/.jsx | Runs Prettier to format file |
| **type-check.sh** | Edit on .ts/.tsx | Runs `tsc --noEmit` and reports errors |
| **console-log-warning.sh** | Edit on .ts/.tsx/.js/.jsx | Warns if console.log statements found |
| **pr-created-logger.sh** | Bash with `gh pr create` | Logs PR URL and review command |

### Example Output

```
[Hook] WARNING: console.log found in src/services/route.ts
  42: console.log('debug:', data);
[Hook] Remove console.log before committing
```

---

## Verification

The `/verify` command runs comprehensive quality checks.

### Usage

```bash
/verify              # Full verification (default)
/verify quick        # Only build + types
/verify pre-commit   # Checks for commits
/verify pre-pr       # Full + security scan
```

### Verification Report

```
═══════════════════════════════════════════════════════════════
                    VERIFICATION REPORT
═══════════════════════════════════════════════════════════════
Status:     ✅ PASS
Build:      ✅ OK
Types:      ✅ OK
Lint:       ✅ OK
Tests:      ✅ 45/45 passed (87% coverage)
Console:    ✅ Clean
Ready for PR: YES
═══════════════════════════════════════════════════════════════
```

Reports are saved to plan folders and included in PR bodies.

---

## Related

- `.agent/` - Symlinks for other AI tools (Gemini, Cursor, etc.)
- `docs/` - Project documentation
