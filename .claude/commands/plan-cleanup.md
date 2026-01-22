---
name: plan-cleanup
description: Archive plan folders for closed issues and clean up duplicates
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

Archive plan folders for closed GitHub issues and clean up the `.claude/plans` directory.

## Usage

```
/plan-cleanup
```

## Process

Execute the following steps autonomously:

### Step 1: Setup

```bash
echo "Setting up archive directories..."
mkdir -p .claude/plans/archive/completed
mkdir -p .claude/plans/archive/duplicates
```

### Step 2: Archive Closed Issue Plans

```bash
echo ""
echo "Scanning for closed issue plans to archive..."
echo "============================================="

ARCHIVED_COUNT=0

for dir in .claude/plans/issue-*/; do
  [ -d "$dir" ] || continue

  issue_num=$(basename "$dir" | grep -oE '[0-9]+' | head -1)

  if [ -n "$issue_num" ]; then
    state=$(gh issue view "$issue_num" --json state --jq '.state' 2>/dev/null || echo "UNKNOWN")

    if [ "$state" = "CLOSED" ]; then
      folder_name=$(basename "$dir")

      if [ -d ".claude/plans/archive/completed/$folder_name" ]; then
        echo "  DUPLICATE: $folder_name (removing active copy)"
        rm -rf "$dir"
      else
        echo "  ARCHIVING: $folder_name (issue #$issue_num is closed)"
        mv "$dir" .claude/plans/archive/completed/
        ARCHIVED_COUNT=$((ARCHIVED_COUNT + 1))
      fi
    fi
  fi
done

echo ""
echo "Archived $ARCHIVED_COUNT plan folder(s)"
```

### Step 3: Report Status

```bash
echo ""
echo "Current Plan Folder Status"
echo "=========================="

ACTIVE_COUNT=$(find .claude/plans -maxdepth 1 -type d -name "issue-*" 2>/dev/null | wc -l | tr -d ' ')
ARCHIVED_COUNT=$(find .claude/plans/archive/completed -maxdepth 1 -type d -name "issue-*" 2>/dev/null | wc -l | tr -d ' ')

echo "Active plans:   $ACTIVE_COUNT"
echo "Archived plans: $ARCHIVED_COUNT"

echo ""
echo "Active Plan Folders:"
for dir in .claude/plans/issue-*/; do
  [ -d "$dir" ] || continue
  issue_num=$(basename "$dir" | grep -oE '[0-9]+' | head -1)
  if [ -n "$issue_num" ]; then
    state=$(gh issue view "$issue_num" --json state --jq '.state' 2>/dev/null || echo "?")
    echo "  #$issue_num ($state): $(basename "$dir")"
  fi
done
```

### Step 4: Check Stale Worktrees

```bash
echo ""
echo "Worktree Status"
echo "==============="

git worktree list 2>/dev/null | while read -r line; do
  worktree_path=$(echo "$line" | awk '{print $1}')
  worktree_name=$(basename "$worktree_path")

  if [[ "$worktree_name" =~ -issue-([0-9]+) ]]; then
    issue_num="${BASH_REMATCH[1]}"
    state=$(gh issue view "$issue_num" --json state --jq '.state' 2>/dev/null || echo "?")

    if [ "$state" = "CLOSED" ]; then
      echo "  STALE: $worktree_name (issue #$issue_num closed)"
      echo "         Remove: git worktree remove \"$worktree_path\""
    fi
  fi
done

echo ""
echo "Cleanup complete"
```
