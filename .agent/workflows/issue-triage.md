---
description: Workflow for triaging GitHub issues - determining complexity tier and required planning level
---
# Issue Triage Workflow

This workflow describes how to analyze GitHub issues and determine their complexity tier, which dictates the level of planning required before implementation.

## Overview

Issue triage evaluates each new GitHub issue to:

1. Determine complexity tier (Simple, Medium, Complex)
2. Apply the appropriate label
3. Define the planning requirements

This ensures proportional planning - simple issues proceed quickly while complex issues get thorough design.

## Complexity Tiers

| Tier | Label | Score | Planning Required |
|------|-------|-------|-------------------|
| **Simple** | `ready` | 0-2 | None - proceed to implementation |
| **Medium** | `plan: medium` | 3-6 | Single `plan.md` document |
| **Complex** | `plan: complex` | 7+ | Full docs: `requirements.md`, `design.md`, `tasks.md` |

After planning completes: `plan ready`

## Triage Process

### Automated Triage (Recommended)

Use the `/issue-check` command in Claude Code:

```
/issue-check
```

This orchestrator will:
1. List all open GitHub issues
2. Filter out already-triaged issues
3. Spawn sub-agents to analyze each issue in parallel
4. Score complexity and apply appropriate labels
5. Post analysis comments to each issue

### Manual Triage

#### Step 1: Read the Issue

```bash
gh issue view [NUMBER]
```

Understand:
- What is being requested?
- What problem does this solve?
- How specific are the requirements?

#### Step 2: Search the Codebase

```bash
# Search for related code
grep -r "keyword" src/

# Find potentially affected files
find . -name "*.ts" | xargs grep -l "related_term"
```

Determine:
- How many files would be affected?
- Are there existing patterns to follow?
- What's the blast radius of this change?

#### Step 3: Score Complexity Factors

| Factor | 0 pts | 1 pt | 2 pts |
|--------|-------|------|-------|
| **Files affected** | 1-2 | 3-5 | 6+ |
| **Architecture** | None needed | Minor choices | Major decisions |
| **Database** | None | Add column | New tables |
| **API changes** | None | Modify existing | New endpoints |
| **External integration** | None | Use existing | New service |
| **Security** | None | Validation | Auth/data protection |
| **Requirements clarity** | Clear | Some flexibility | Vague/evolving |

**Total Score → Tier:**
- **0-2:** Simple → `ready`
- **3-6:** Medium → `plan: medium`
- **7+:** Complex → `plan: complex`

#### Step 4: Apply the Label

```bash
# Simple
gh issue edit [NUMBER] --add-label "ready"

# Medium
gh issue edit [NUMBER] --add-label "plan: medium"

# Complex
gh issue edit [NUMBER] --add-label "plan: complex"
```

#### Step 5: Post Analysis Comment

```bash
gh issue comment [NUMBER] --body "## Issue Triage

**Complexity:** [Simple | Medium | Complex]
**Score:** [X] points
**Label applied:** \`[label]\`

### Assessment

| Factor | Score | Notes |
|--------|-------|-------|
| Files affected | X | [explanation] |
| Architecture | X | [explanation] |
| Database | X | [explanation] |
| API changes | X | [explanation] |
| External integration | X | [explanation] |
| Security | X | [explanation] |
| Requirements clarity | X | [explanation] |
| **Total** | **X** | |

### Affected Areas
- [area 1]
- [area 2]

### Next Steps
[What should happen based on tier]

---
*Triage completed by [human/agent]*"
```

## Examples

### Example 1: Simple (`ready`)

**Issue:** "Fix alignment of submit button on mobile"

| Factor | Score |
|--------|-------|
| Files | 0 (1 CSS file) |
| Architecture | 0 |
| Database | 0 |
| API | 0 |
| Integration | 0 |
| Security | 0 |
| Clarity | 0 |
| **Total** | **0** |

**Decision:** `ready` - Can implement directly

---

### Example 2: Medium (`plan: medium`)

**Issue:** "Add driver phone number to dispatch notification"

| Factor | Score |
|--------|-------|
| Files | 1 (template, service, type) |
| Architecture | 0 (follows pattern) |
| Database | 1 (add column) |
| API | 1 (modify response) |
| Integration | 0 |
| Security | 0 |
| Clarity | 0 |
| **Total** | **3** |

**Decision:** `plan: medium` - Create `plan.md`

---

### Example 3: Complex (`plan: complex`)

**Issue:** "Add vehicle geofencing to constrain routes"

| Factor | Score |
|--------|-------|
| Files | 2 (new service, UI, types, migrations) |
| Architecture | 2 (geofence storage, algorithm) |
| Database | 2 (new tables) |
| API | 2 (new CRUD endpoints) |
| Integration | 1 (map API) |
| Security | 0 |
| Clarity | 2 (vague requirements) |
| **Total** | **11** |

**Decision:** `plan: complex` - Create `requirements.md`, `design.md`, `tasks.md`

## After Triage

### Simple (`ready`)

```
git checkout -b issue/[N]-[description]
# Implement directly
git commit -m "#[N]: [description]"
# Create PR and merge
```

### Medium (`plan: medium`)

```
git checkout -b issue/[N]-[description]
mkdir -p .claude/plans/issue-[N]-[description]
# Create plan.md following template
# Hooks auto-archive and review
gh issue edit [N] --remove-label "plan: medium" --add-label "plan ready"
# Then implement
```

### Complex (`plan: complex`)

```
git checkout -b issue/[N]-[description]
mkdir -p .claude/plans/issue-[N]-[description]
# Create requirements.md, design.md, tasks.md following templates
# Hooks auto-archive and review
gh issue edit [N] --remove-label "plan: complex" --add-label "plan ready"
# Then implement following tasks.md
```

## Plan Folder Structure

```
.claude/plans/
├── issue-5-dispatch-job/
│   └── plan.md                    # Medium complexity
├── issue-3-vehicle-geofencing/
│   ├── requirements.md            # Complex
│   ├── design.md
│   └── tasks.md
└── templates/
    ├── plan-medium.md
    ├── requirements.md
    ├── design.md
    └── tasks.md
```

## Sub-Agent Instructions

When spawning sub-agents for triage:

```
.agent/prompts/issue-analyzer.md
.claude/prompts/issue-analyzer.md
```

For plan generation:

```
.agent/prompts/plan-generator.md
.claude/prompts/plan-generator.md
```

## Related Workflows

- `context-gathering.md` - Full issue lifecycle
- `issues.md` - Quick reference for GitHub commands
