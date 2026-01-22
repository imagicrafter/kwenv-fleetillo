---
name: merge-pr
description: Merge an approved PR to main, delete the branch, and clean up the worktree
argument-hint: [pr-number-or-branch]
allowed-tools:
  - Bash(gh:*)
  - Bash(git:*)
  - Bash(rm:*)
  - Bash(cd:*)
  - Bash(pwd:*)
  - Bash(basename:*)
  - Bash(dirname:*)
  - Bash(realpath:*)
  - Bash(test:*)
  - Bash([*)
  - Read
---

# Merge PR

Merge an approved PR to main, delete the branch, and clean up the worktree.

## Usage

```
/merge-pr [pr-number-or-branch]
```

If no argument provided, detects from current branch or worktree.

## Process

### Step 1: Detect PR

```bash
ARG="$1"

# If no argument, try to detect from current context
if [ -z "$ARG" ]; then
  CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
  
  if [[ "$CURRENT_BRANCH" =~ ^issue/([0-9]+) ]]; then
    # Try to find PR for this branch
    PR_NUMBER=$(gh pr list --head "$CURRENT_BRANCH" --json number --jq '.[0].number' 2>/dev/null)
    
    if [ -z "$PR_NUMBER" ]; then
      echo "ERROR: No PR found for branch $CURRENT_BRANCH"
      exit 1
    fi
  else
    echo "ERROR: No PR number provided and not on an issue branch"
    echo "Usage: /merge-pr [pr-number-or-branch]"
    exit 1
  fi
elif [[ "$ARG" =~ ^[0-9]+$ ]]; then
  PR_NUMBER="$ARG"
else
  # Assume it's a branch name, find the PR
  PR_NUMBER=$(gh pr list --head "$ARG" --json number --jq '.[0].number' 2>/dev/null)
  
  if [ -z "$PR_NUMBER" ]; then
    echo "ERROR: No PR found for branch $ARG"
    exit 1
  fi
fi

echo "🔍 PR #$PR_NUMBER"
```

### Step 2: Verify PR Status

```bash
PR_JSON=$(gh pr view "$PR_NUMBER" --json state,mergeable,headRefName,title,url)

PR_STATE=$(echo "$PR_JSON" | jq -r '.state')
PR_MERGEABLE=$(echo "$PR_JSON" | jq -r '.mergeable')
PR_BRANCH=$(echo "$PR_JSON" | jq -r '.headRefName')
PR_TITLE=$(echo "$PR_JSON" | jq -r '.title')
PR_URL=$(echo "$PR_JSON" | jq -r '.url')

echo "📋 Title: $PR_TITLE"
echo "🌿 Branch: $PR_BRANCH"
echo "📊 State: $PR_STATE"
echo "✅ Mergeable: $PR_MERGEABLE"

if [ "$PR_STATE" != "OPEN" ]; then
  echo ""
  echo "ERROR: PR is not open (state: $PR_STATE)"
  exit 1
fi

if [ "$PR_MERGEABLE" != "MERGEABLE" ]; then
  echo ""
  echo "ERROR: PR is not mergeable (status: $PR_MERGEABLE)"
  echo "Resolve conflicts or failing checks first."
  exit 1
fi

echo ""
echo "✅ PR is ready to merge"
```

### Step 3: Find Worktree (if exists)

```bash
# Find worktree for this branch
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
REPO_NAME=$(basename "$REPO_ROOT")

# Check for worktree with various naming patterns
WORKTREE_PATH=""

for pattern in "${REPO_NAME}-${PR_BRANCH}" "${REPO_NAME}-issue-"*; do
  potential_path="$(dirname "$REPO_ROOT")/$pattern"
  if [ -d "$potential_path" ]; then
    wt_branch=$(git -C "$potential_path" branch --show-current 2>/dev/null)
    if [ "$wt_branch" = "$PR_BRANCH" ]; then
      WORKTREE_PATH="$potential_path"
      break
    fi
  fi
done

# Also check git worktree list
if [ -z "$WORKTREE_PATH" ]; then
  WORKTREE_PATH=$(git worktree list | grep "$PR_BRANCH" | awk '{print $1}')
fi

if [ -n "$WORKTREE_PATH" ]; then
  echo "📁 Found worktree: $WORKTREE_PATH"
else
  echo "📁 No worktree found for branch"
fi
```

### Step 4: Merge the PR

```bash
echo ""
echo "🔀 Merging PR #$PR_NUMBER..."

gh pr merge "$PR_NUMBER" --merge --delete-branch

if [ $? -eq 0 ]; then
  echo "✅ PR merged and branch deleted on remote"
else
  echo "ERROR: Failed to merge PR"
  exit 1
fi
```

### Step 5: Clean Up Local Branch

```bash
# Switch to main if we're on the branch being deleted
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)

if [ "$CURRENT_BRANCH" = "$PR_BRANCH" ]; then
  echo "📍 Currently on $PR_BRANCH, switching to main..."
  git checkout main
  git pull origin main
fi

# Delete local branch if it exists
if git show-ref --verify --quiet "refs/heads/$PR_BRANCH"; then
  echo "🗑️  Deleting local branch: $PR_BRANCH"
  git branch -D "$PR_BRANCH"
fi
```

### Step 6: Clean Up Worktree

```bash
if [ -n "$WORKTREE_PATH" ] && [ -d "$WORKTREE_PATH" ]; then
  echo "🗑️  Removing worktree: $WORKTREE_PATH"
  
  # Remove the worktree
  git worktree remove "$WORKTREE_PATH" --force 2>/dev/null
  
  # If that fails, manually remove and prune
  if [ -d "$WORKTREE_PATH" ]; then
    rm -rf "$WORKTREE_PATH"
    git worktree prune
  fi
  
  echo "✅ Worktree removed"
fi

# Prune any stale worktree references
git worktree prune
```

### Step 7: Summary

```bash
echo ""
echo "═══════════════════════════════════════════"
echo "           MERGE COMPLETE"
echo "═══════════════════════════════════════════"
echo ""
echo "PR:        #$PR_NUMBER - $PR_TITLE"
echo "Branch:    $PR_BRANCH (deleted)"
echo "Worktree:  ${WORKTREE_PATH:-none} (removed)"
echo ""
echo "Main branch is up to date."
echo "═══════════════════════════════════════════"
```

## Notes

- Uses `--merge` strategy (creates merge commit). Change to `--squash` or `--rebase` if preferred.
- The `--delete-branch` flag deletes the remote branch after merge.
- Worktree cleanup is automatic if one exists for the branch.
- Safe to run from any directory - will find the worktree automatically.
