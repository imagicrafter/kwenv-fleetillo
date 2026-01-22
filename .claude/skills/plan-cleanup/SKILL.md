---
name: plan-cleanup
description: Archive plan folders for closed issues and clean up duplicates. Use this skill to maintain a clean .claude/plans directory by moving completed issue plans to the archive.
allowed-tools:
  - Bash(gh:*)
  - Bash(mkdir:*)
  - Bash(mv:*)
  - Bash(rm:*)
  - Bash(ls:*)
  - Bash(test:*)
  - Bash([*)
  - Bash(for *)
  - Bash(find:*)
  - Bash(basename:*)
  - Read
  - Glob
---

# Plan Cleanup

Archive plan folders for closed GitHub issues and clean up duplicates.

## How to Run

```
/plan-cleanup
```

## What It Does

1. **Archives completed plans** - Moves plan folders for CLOSED issues to `.claude/plans/archive/completed/`
2. **Removes duplicates** - If a plan exists in both active and archive, removes the active copy
3. **Reports summary** - Shows what was archived and current plan folder status

## Process

### Step 1: Create Archive Directories

```bash
echo "Setting up archive directories..."
mkdir -p .claude/plans/archive/completed
mkdir -p .claude/plans/archive/duplicates
echo "Archive directories ready"
```

### Step 2: Archive Closed Issue Plans

```bash
echo ""
echo "Scanning for closed issue plans to archive..."
echo "============================================="

ARCHIVED_COUNT=0

for dir in .claude/plans/issue-*/; do
  [ -d "$dir" ] || continue

  # Extract issue number from folder name
  issue_num=$(basename "$dir" | grep -oE '[0-9]+' | head -1)

  if [ -n "$issue_num" ]; then
    # Check issue state via GitHub CLI
    state=$(gh issue view "$issue_num" --json state --jq '.state' 2>/dev/null || echo "UNKNOWN")

    if [ "$state" = "CLOSED" ]; then
      folder_name=$(basename "$dir")

      # Check if already in archive (duplicate)
      if [ -d ".claude/plans/archive/completed/$folder_name" ]; then
        echo "  DUPLICATE: $folder_name (already archived, removing active copy)"
        rm -rf "$dir"
      else
        echo "  ARCHIVING: $folder_name (issue #$issue_num is closed)"
        mv "$dir" .claude/plans/archive/completed/
        ARCHIVED_COUNT=$((ARCHIVED_COUNT + 1))
      fi
    fi
  fi
done

if [ "$ARCHIVED_COUNT" -eq 0 ]; then
  echo "  No plans needed archiving"
else
  echo ""
  echo "Archived $ARCHIVED_COUNT plan folder(s)"
fi
```

### Step 3: Report Current Status

```bash
echo ""
echo "Current Plan Folder Status"
echo "=========================="

# Count active plans
ACTIVE_COUNT=$(find .claude/plans -maxdepth 1 -type d -name "issue-*" 2>/dev/null | wc -l | tr -d ' ')
ARCHIVED_COUNT=$(find .claude/plans/archive/completed -maxdepth 1 -type d -name "issue-*" 2>/dev/null | wc -l | tr -d ' ')

echo "Active plans:   $ACTIVE_COUNT"
echo "Archived plans: $ARCHIVED_COUNT"

echo ""
echo "Active Plan Folders:"
echo "--------------------"
for dir in .claude/plans/issue-*/; do
  [ -d "$dir" ] || continue
  issue_num=$(basename "$dir" | grep -oE '[0-9]+' | head -1)
  if [ -n "$issue_num" ]; then
    state=$(gh issue view "$issue_num" --json state --jq '.state' 2>/dev/null || echo "UNKNOWN")
    title=$(gh issue view "$issue_num" --json title --jq '.title' 2>/dev/null | head -c 50 || echo "")
    echo "  #$issue_num ($state): $(basename "$dir")"
    [ -n "$title" ] && echo "         $title"
  fi
done
```

### Step 4: Cleanup Stale Worktrees (Optional)

Report any worktrees that may be stale (issue closed but worktree exists):

```bash
echo ""
echo "Worktree Status"
echo "==============="

# List worktrees and check if their issues are closed
git worktree list 2>/dev/null | while read -r line; do
  worktree_path=$(echo "$line" | awk '{print $1}')
  worktree_name=$(basename "$worktree_path")

  # Check if it's an issue worktree
  if [[ "$worktree_name" =~ issue-([0-9]+) ]]; then
    issue_num="${BASH_REMATCH[1]}"
    state=$(gh issue view "$issue_num" --json state --jq '.state' 2>/dev/null || echo "UNKNOWN")

    if [ "$state" = "CLOSED" ]; then
      echo "  STALE: $worktree_name (issue #$issue_num is closed)"
      echo "         Remove with: git worktree remove $worktree_path"
    else
      echo "  ACTIVE: $worktree_name (issue #$issue_num is $state)"
    fi
  fi
done

echo ""
echo "Cleanup complete"
```

## Output Format

```
Setting up archive directories...
Archive directories ready

Scanning for closed issue plans to archive...
=============================================
  ARCHIVING: issue-14-clients-to-customers (issue #14 is closed)
  ARCHIVING: issue-41-tags-ui (issue #41 is closed)

Archived 2 plan folder(s)

Current Plan Folder Status
==========================
Active plans:   12
Archived plans: 5

Active Plan Folders:
--------------------
  #10 (OPEN): issue-10-github-issues-support
         GitHub Issues Support
  #13 (OPEN): issue-13-log-monitoring
         Log Monitoring
  ...

Worktree Status
===============
  STALE: fleetillo-issue-14-clients (issue #14 is closed)
         Remove with: git worktree remove /path/to/worktree
  ACTIVE: fleetillo-issue-63-enhance (issue #63 is OPEN)

Cleanup complete
```

## When to Use

- After merging PRs to clean up completed work
- Before starting new issue work to maintain organization
- Periodically to keep the plans directory manageable
- When you notice plan folders accumulating

## Notes

- Plans are archived, not deleted, so you can reference them later
- The archive location is `.claude/plans/archive/completed/`
- Worktree cleanup is reported but not automatically executed (manual step)
