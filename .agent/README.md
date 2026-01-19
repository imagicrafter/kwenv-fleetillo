# Agent Configuration

This directory contains configuration and instructions for AI agents working on this codebase. It is designed to be tool-agnostic and works with Claude Code, Google Antigravity (Gemini), Cursor, and other AI development tools.

## Directory Structure

```
.agent/
├── README.md                    # This file - overview and quick start
├── skills/                      # Agent skills (autonomous capabilities)
│   ├── analyze-issue/           # Read-only issue analysis
│   ├── generate-plan/           # Create planning documents
│   ├── issue-check/             # Orchestrator: triage all issues
│   ├── plan-check/              # Orchestrator: generate all plans
│   ├── start-issue/             # Set up for implementation
│   ├── triage-issue/            # Score and label single issue
│   └── validate-plan/           # Check plan quality
└── workflows/                   # Human reference documentation
    ├── issue-triage.md          # Issue analysis workflow docs
    └── ...                      # Other workflow references
```

## Issue Lifecycle

```
New Issue
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  TRIAGE (/issue-check or /triage-issue)                             │
│  Score complexity (0-14 pts) → Apply tier label                     │
└─────────────────────────────────────────────────────────────────────┘
    │                    │                    │
    ▼                    ▼                    ▼
plan: simple         plan: medium         plan: complex
+ plan ready         (3-6 pts)            (7+ pts)
(0-2 pts)                │                    │
    │                    ▼                    ▼
    │         ┌──────────────────┐  ┌─────────────────────────────────┐
    │         │  /generate-plan  │  │  /plan-check (staged approval)  │
    │         │  Single agent    │  │  Human approves each stage:     │
    │         │  creates plan.md │  │  1. requirements.md → approve   │
    │         └──────────────────┘  │  2. design.md → approve         │
    │                    │          │  3. tasks.md → approve          │
    │                    │          └─────────────────────────────────┘
    │                    ▼                    │
    │              + plan ready              ▼
    │                    │            + plan ready
    │                    │                    │
    ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  IMPLEMENTATION (/start-issue)                                      │
│  Create branch → Code → Test → PR → Merge                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Complex Issue Staged Approval

For complex issues (`plan: complex`), the `/plan-check` orchestrator guides the human through staged document approval:

| Stage | Document | Description |
|-------|----------|-------------|
| 1 | `requirements.md` | User stories and acceptance criteria |
| 2 | `design.md` | Architecture, interfaces, data models (based on approved requirements) |
| 3 | `tasks.md` | Implementation checklist (based on approved design) |

The orchestrator waits for human approval after each stage before proceeding. Feedback can be incorporated and documents regenerated until approved.

#### Resume Capability

The `/plan-check` skill automatically detects and resumes partially completed planning sessions:

| Existing Documents | Resume From |
|-------------------|-------------|
| None | Stage 1: Requirements |
| `requirements.md` only | Stage 2: Design |
| `requirements.md` + `design.md` | Stage 3: Tasks |
| All three documents | Stage 4: Add label |

When resuming, the orchestrator offers to review existing documents before continuing to the next stage.

## Labels

| Label | Score | Meaning | Planning Required |
|-------|-------|---------|-------------------|
| `plan: simple` | 0-2 | Simple change | None |
| `plan: medium` | 3-6 | Moderate complexity | `plan.md` |
| `plan: complex` | 7+ | High complexity | `requirements.md`, `design.md`, `tasks.md` |
| `plan ready` | - | Planning complete | Ready to implement |

An issue ready for implementation has: `plan: simple` + `plan ready` OR `plan: [medium|complex]` + `plan ready`

## Skills

Skills are autonomous capabilities that agents can invoke. Each skill is a directory containing a `SKILL.md` file with YAML frontmatter (name, description) and markdown instructions.

### Orchestrators

| Skill | Purpose | Human Invocation |
|-------|---------|------------------|
| `issue-check` | Triage all untriaged issues in parallel | `/issue-check` |
| `plan-check` | Generate plans for all issues needing them | `/plan-check` |

### Single-Issue Skills

| Skill | Purpose | Human Invocation |
|-------|---------|------------------|
| `analyze-issue` | Read-only complexity analysis | `/analyze-issue 5` |
| `triage-issue` | Score and apply tier label | `/triage-issue 5` |
| `generate-plan` | Create planning documents | `/generate-plan 5` |
| `validate-plan` | Check plan against templates | `/validate-plan 5` |
| `start-issue` | Set up branch and context | `/start-issue 5` |

## Complexity Scoring

Each issue is scored on 7 factors (0-2 points each):

| Factor | 0 pts | 1 pt | 2 pts |
|--------|-------|------|-------|
| Files affected | 1-2 | 3-5 | 6+ |
| Architecture | None | Minor decisions | Major decisions |
| Database | None | Add column | New tables |
| API changes | None | Modify existing | New endpoints |
| External integration | None | Use existing | New service |
| Security | None | Validation | Auth/data protection |
| Requirements clarity | Clear | Some flexibility | Vague/evolving |

**Total → Tier:** 0-2 = Simple, 3-6 = Medium, 7+ = Complex

## Conventions

### Branch Naming
```
issue/[NUMBER]-[short-kebab-description]
```
Examples: `issue/42-add-driver-api`, `issue/5-dispatch-job`

### Plan Location
```
.claude/plans/issue-[NUMBER]-[slug]/
├── plan.md                    # Medium tier
└── (or)
├── requirements.md            # Complex tier
├── design.md
└── tasks.md
```

### Commit Messages
```
#[NUMBER]: [description]
```

## Tool-Specific Notes

### Claude Code CLI
- Skills in `.claude/skills/` with SKILL.md format
- Use `/skill-name` to invoke any skill
- Plans auto-archive via PostToolUse hooks
- See `.claude/README.md` for full setup

### Google Antigravity (Gemini)
- Skills synced to `.agent/skills/`
- Use Manager Surface to spawn agents
- Reference SKILL.md for instructions

### Cursor / Other AI Tools
- Follow SKILL.md instructions manually
- Use `gh` CLI for GitHub operations
- Reference workflows/ for documentation

## Querying Issues

```bash
# All issues ready to implement
gh issue list --label "plan ready"

# Simple issues (ready immediately)
gh issue list --label "plan: simple"

# Issues needing plans
gh issue list --label "plan: medium" | grep -v "plan ready"
gh issue list --label "plan: complex" | grep -v "plan ready"
```

## Related Documentation

- `.claude/README.md` - Claude Code specific configuration
- `.claude/plans/templates/` - Plan document templates
- `docs/yokeflow/` - Project architecture
