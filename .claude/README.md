# Claude Code Configuration

This directory contains configuration specific to Claude Code CLI. For tool-agnostic agent documentation, see `.agent/README.md`.

## Directory Structure

```
.claude/
├── README.md                    # This file
├── settings.local.json          # Local settings and permissions
├── skills/                      # Agent Skills (autonomous + manual invocation)
│   ├── analyze-issue/           # Read-only issue analysis
│   ├── generate-plan/           # Create planning documents
│   ├── issue-check/             # Orchestrator: triage all issues
│   ├── plan-check/              # Orchestrator: generate all plans
│   ├── start-issue/             # Set up for implementation
│   ├── triage-issue/            # Score and label single issue
│   └── validate-plan/           # Check plan quality
├── commands/                    # Slash commands (user-invoked only)
│   └── prime.md                 # /prime - Load project context
├── hooks/                       # PostToolUse automation hooks
│   ├── archive-plan.sh          # Auto-archive plans to dated folders
│   └── review-plan.sh           # Send plans to external AI reviewers
└── plans/                       # Implementation plans
    ├── archive/                 # Archived plans (auto-populated)
    ├── templates/               # Plan document templates
    └── reviews/                 # External review results
```

## Skills

Skills are autonomous capabilities that agents can invoke based on context OR humans can invoke via `/skill-name`.

### Orchestrators

| Skill | Purpose | Invocation |
|-------|---------|------------|
| `issue-check` | Triage all untriaged issues in parallel | `/issue-check` |
| `plan-check` | Generate plans for all issues needing them | `/plan-check` |

### Single-Issue Skills

| Skill | Purpose | Invocation |
|-------|---------|------------|
| `analyze-issue` | Read-only complexity analysis | `/analyze-issue 5` |
| `triage-issue` | Score and apply tier label | `/triage-issue 5` |
| `generate-plan` | Create planning documents | `/generate-plan 5` |
| `validate-plan` | Check plan against templates | `/validate-plan 5` |
| `start-issue` | Set up branch and context | `/start-issue 5` |

### Skill Structure

Each skill is a directory with a `SKILL.md` file:

```yaml
---
name: skill-name
description: When to use this skill (agents read this to decide autonomously)
---

# Skill Title

Instructions for executing the skill...
```

## Commands

Simple user-invoked commands (not autonomous):

| Command | Purpose |
|---------|---------|
| `/prime` | Load project context into conversation |

## Labels

| Label | Score | Planning Required |
|-------|-------|-------------------|
| `plan: simple` | 0-2 pts | None (+ `plan ready` immediately) |
| `plan: medium` | 3-6 pts | `plan.md` |
| `plan: complex` | 7+ pts | `requirements.md`, `design.md`, `tasks.md` |
| `plan ready` | - | Implementation can begin |

## Issue Lifecycle

```
New Issue → /issue-check or /triage-issue
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
plan: simple    plan: medium    plan: complex
+ plan ready         │               │
    │                ▼               ▼
    │         /generate-plan    /plan-check (staged)
    │         (single agent)         │
    │                │               ├─→ requirements.md → Human approval
    │                │               ├─→ design.md → Human approval
    │                │               └─→ tasks.md → Human approval
    │                ▼               ▼
    │          + plan ready    + plan ready
    │                │               │
    └───────────────┬┴───────────────┘
                    ▼
              /start-issue
                    │
                    ▼
              Implementation
```

### Complex Issue Workflow

For complex issues, the `/plan-check` orchestrator guides the human through staged approval:

1. **Requirements** → Generate requirements.md → Wait for human approval
2. **Design** → Generate design.md (using approved requirements) → Wait for human approval
3. **Tasks** → Generate tasks.md (using approved design) → Wait for human approval
4. **Complete** → Add `plan ready` label

#### Resume Capability

The orchestrator automatically detects and resumes partially completed planning:

| Existing Documents | Resume From |
|-------------------|-------------|
| None | Stage 1 |
| `requirements.md` | Stage 2 |
| `requirements.md` + `design.md` | Stage 3 |
| All three | Stage 4 (just add label) |

When resuming, you'll be offered the option to review existing documents before continuing.

## Hooks

PostToolUse hooks trigger when plans are written:

### archive-plan.sh
- Copies plans to `.claude/plans/archive/YYYY-MM-DD/`
- Posts plan to GitHub issue (if on `issue/N-*` branch)

### review-plan.sh
- Sends to external AI reviewers (Gemini, Codex if available)
- Saves reviews to `.claude/plans/reviews/`
- Returns verdict: APPROVE, WARN, or BLOCK

## Plans Directory

```
.claude/plans/
├── issue-5-dispatch-job/        # Active plan
│   └── plan.md                  # Medium tier
├── issue-3-geofencing/          # Active plan
│   ├── requirements.md          # Complex tier
│   ├── design.md
│   └── tasks.md
├── templates/                   # Document templates
├── archive/                     # Auto-archived
└── reviews/                     # External reviews
```

## Querying Issues

```bash
# Ready to implement
gh issue list --label "plan ready"

# Need planning
gh issue list --label "plan: medium" --json number,title,labels | \
  jq '.[] | select(.labels | map(.name) | contains(["plan ready"]) | not)'

gh issue list --label "plan: complex" --json number,title,labels | \
  jq '.[] | select(.labels | map(.name) | contains(["plan ready"]) | not)'
```

## Branch Naming

Hooks detect issue number from branch name:

```
issue/[NUMBER]-[description]
```

Examples: `issue/5-dispatch-job`, `issue/42-auth`

## Related

- `.agent/README.md` - Tool-agnostic configuration
- `.agent/skills/` - Synced skills for Gemini/other tools
- `docs/yokeflow/` - Project architecture
