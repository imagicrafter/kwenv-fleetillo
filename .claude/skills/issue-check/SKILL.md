---
name: issue-check
description: Orchestrator skill that triages all open GitHub issues that lack triage labels. Use this skill when the issue backlog needs review, when running automated issue triage across a repository, when a Digital Ocean function initiates issue processing, or when you need to find and triage all untriaged issues. Spawns sub-agents in parallel to analyze issues efficiently.
allowed-tools:
  - Bash(gh:*)
  - Read
  - Glob
  - Grep
  - Task
---

# Issue Check Orchestrator

Triage all open GitHub issues that haven't been analyzed yet.

## Overview

This orchestrator:
1. Lists all open issues
2. Filters to untriaged issues
3. Spawns sub-agents to triage each in parallel
4. Reports summary results

## Triage Labels

An issue is considered triaged if it has ANY of:
- `ready` - Simple, no plan needed
- `plan: medium` - Needs plan.md
- `plan: complex` - Needs full docs
- `plan ready` - Planning complete

Issues without these labels need triage.

## Process

### Step 1: List Open Issues

```bash
gh issue list --state open --json number,title,body,labels --limit 100
```

### Step 2: Filter Untriaged

Check each issue's labels. Collect issues that lack triage labels.

### Step 3: Report Summary

Before spawning sub-agents:

```
## Issue Triage Summary

**Total open issues:** [N]
**Already triaged:** [N]
**Need triage:** [N]

### Issues to analyze:
- #[N]: [title]
- #[N]: [title]
```

If no issues need triage, report that and stop.

### Step 4: Spawn Sub-Agents

For each untriaged issue, spawn a sub-agent using the Task tool:

```
Analyze GitHub issue #[NUMBER] to determine its complexity tier.

Use the triage-issue skill instructions.

Issue details:
- Number: [NUMBER]
- Title: [TITLE]
- Body: [BODY]

Tasks:
1. Read full issue with `gh issue view [NUMBER]`
2. Search codebase to understand scope
3. Score complexity (7 factors, 0-2 pts each)
4. Apply label: ready (0-2), plan: medium (3-6), plan: complex (7+)
5. Post assessment comment

DO NOT modify code, create branches, or write plans.
```

**Run sub-agents in parallel** when multiple issues need triage.

### Step 5: Final Report

After all sub-agents complete:

```
## Triage Complete

| Issue | Title | Tier | Score | Rationale |
|-------|-------|------|-------|-----------|
| #N | ... | Simple | 1 | Single file fix |
| #N | ... | Medium | 4 | 3 files, API changes |
| #N | ... | Complex | 9 | New service, DB |

**Next steps:**
- `ready` issues: Implement directly
- `plan: medium` issues: Create plan.md
- `plan: complex` issues: Create requirements.md, design.md, tasks.md
```

## Output Format

```json
{
  "total_open": 10,
  "already_triaged": 6,
  "triaged_now": 4,
  "results": [
    {"issue": 5, "tier": "medium", "score": 4, "label": "plan: medium"},
    {"issue": 6, "tier": "simple", "score": 1, "label": "ready"}
  ],
  "status": "complete"
}
```

## Complexity Scoring Reference

| Factor | 0 pts | 1 pt | 2 pts |
|--------|-------|------|-------|
| Files affected | 1-2 | 3-5 | 6+ |
| Architecture | None | Minor | Major |
| Database | None | Column | Tables |
| API changes | None | Modify | New |
| External integration | None | Existing | New |
| Security | None | Validation | Auth |
| Requirements clarity | Clear | Flexible | Vague |

**Scoring:**
- 0-2: Simple → `ready`
- 3-6: Medium → `plan: medium`
- 7+: Complex → `plan: complex`

## Multi-Repository Support

When called from a Digital Ocean function with repository context:

1. Receive repository list from orchestrator
2. For each repository:
   - Clone or navigate to repo
   - Run issue check process
   - Report results
3. Aggregate results across repos

The orchestrator handles repository iteration; this skill handles per-repo triage.
