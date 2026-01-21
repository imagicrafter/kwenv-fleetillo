---
name: plan-cleanup
description: Archive plan folders for closed issues and clean up duplicates.
allowed-tools:
  - Bash(gh:*)
  - Bash(git:*)
  - Bash(mv:*)
  - Bash(rm:*)
  - Bash(mkdir:*)
  - Bash(ls:*)
  - Bash(find:*)
  - Bash(rmdir:*)
  - Read
  - Glob
---

# Plan Cleanup Command

Archive plan folders for closed issues and clean up duplicates.

## Step 1: Scan for Stale Plans

```bash
echo "## Scanning plan folders..."
echo ""

for dir in .claude/plans/issue-*/; do
  [ -d "$dir" ] || continue

  issue_num=$(basename "$dir" | grep -oE '[0-9]+' | head -1)

  if [ -n "$issue_num" ]; then
    state=$(gh issue view "$issue_num" --json state --jq '.state' 2>/dev/null || echo "NOT_FOUND")
    echo "Issue #$issue_num: $state - $dir"
  fi
done
```

## Step 2: Identify Actions Needed

Categorize each plan folder:

| State | Action |
|-------|--------|
| CLOSED | Archive to `.claude/plans/archive/completed/` |
| NOT_FOUND | Archive to `.claude/plans/archive/orphaned/` |
| OPEN | Keep in place |
| Duplicate | Keep newest, archive older |

## Step 3: Archive Closed Issue Plans

For each closed issue:

```bash
# Create archive directory
mkdir -p .claude/plans/archive/completed

# Move the plan folder
mv ".claude/plans/issue-[N]-[slug]" ".claude/plans/archive/completed/"

echo "Archived: issue-[N]-[slug] (issue #[N] is closed)"
```

## Step 4: Handle Duplicates

If multiple folders exist for the same issue number:
1. Compare modification times
2. Keep the most recently modified
3. Archive the older one to `.claude/plans/archive/duplicates/`

```bash
# Find duplicates (multiple folders for same issue number)
# Example: issue-21-remove-electron and issue-21-refactor-frontend...

mkdir -p .claude/plans/archive/duplicates

# Archive the older duplicate
mv ".claude/plans/[older-duplicate]" ".claude/plans/archive/duplicates/"
```

## Step 5: Handle Orphaned Plans

If issue doesn't exist (NOT_FOUND):

```bash
mkdir -p .claude/plans/archive/orphaned
mv ".claude/plans/issue-[N]-[slug]" ".claude/plans/archive/orphaned/"
```

## Step 6: Report

```markdown
## Plan Cleanup Complete

### Archived (Closed Issues)
- `issue-5-dispatch-button/` → `archive/completed/`
- `issue-14-clients-to-customers/` → `archive/completed/`

### Archived (Duplicates)
- `issue-21-remove-electron/` → `archive/duplicates/` (kept issue-21-refactor-frontend...)

### Archived (Orphaned)
- (none)

### Remaining Active Plans
| Issue | Folder |
|-------|--------|
| #10 | `issue-10-github-issues-support/` |
| #21 | `issue-21-refactor-frontend-to-remove-electron-dependency/` |
| ... | ... |
```

## Dry Run Option

If user says "dry run" or "preview", only report what would be done without making changes.
