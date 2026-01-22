---
name: prioritize
description: Analyze planned issues and recommend the next one to implement based on PR history, dependencies, and strategic value.
allowed-tools:
  - Bash(gh:*)
  - Bash(git:*)
  - Bash(ls:*)
  - Bash(find:*)
  - Bash(jq:*)
  - Read
  - Grep
  - Glob
---

# Prioritize Next Issue

Recommend which planned issue to implement next.

## Step 1: Gather Context (run in parallel)

```bash
# Recent merged PRs
gh pr list --state merged --limit 10 --json number,title,mergedAt

# Recent commits
git log main --oneline -15

# Planned issues (medium/complex with planning docs)
gh issue list --label "plan ready" --json number,title,labels,body

# Simple issues (bugs/quick fixes - no planning docs needed)
gh issue list --label "plan: simple" --json number,title,labels,body

# Plan folders
ls -1 .claude/plans/ | grep "^issue-"
```

## Step 2: For Each Planned Issue

Read the issue body and check for dependencies:

```bash
gh issue view <NUMBER> --json number,title,body,labels
```

Look for dependency patterns in the body:
- "depends on", "blocked by", "after", "requires", "needs", "prerequisite"
- References to other issues (#N)

If dependencies found, check if they're closed:
```bash
gh issue view <DEP_NUMBER> --json state --jq '.state'
```

## Step 3: Check for Conflicts

```bash
# Existing PRs for this issue
gh pr list --state open --json number,title,headRefName

# Existing branches
git branch -r | grep -i "issue/"
```

## Step 4: Prioritize

**Priority order:**
1. **Bugs first** - Bug fixes before enhancements
2. **Unblocked** - All dependencies resolved (or none)
3. **Contextual** - Related to recent PR work
4. **Foundational** - Unlocks other blocked issues
5. **Quick wins** - Simple tier before complex

**Deprioritize:**
- Issues with open dependencies
- Issues with open PRs already
- Complex issues when simpler options exist

## Step 5: Output

```markdown
## Prioritization Results

### Recent Context
[1-2 sentences on recent work]

### Issues

| Issue | Type | Tier | Dependencies | Status |
|-------|------|------|--------------|--------|
| #N - Title | bug | simple | None | Ready |
| #N - Title | enhancement | medium | None | Ready |
| #N - Title | enhancement | complex | #X | Blocked |

### Recommendation

**Next: #N - [Title]**

Why:
1. [Reason]
2. [Reason]

Plan: `.claude/plans/issue-N-slug/`

### Alternatives
- #N - [why this could be next]

### Blocked
- #N - waiting on #X
```
