#!/bin/bash
# SessionStart Hook - Load previous context on new session
#
# Runs when a new Claude session starts. Checks for recent session
# files and notifies Claude of available context to load.
#
# Hook config (in ~/.claude/settings.json):
# {
#   "hooks": {
#     "SessionStart": [{
#       "matcher": "*",
#       "hooks": [{
#         "type": "command",
#         "command": "~/.claude/hooks/memory-persistence/session-start.sh"
#       }]
#     }]
#   }
# }

SESSIONS_DIR="${HOME}/.claude/sessions"
LEARNED_DIR="${HOME}/.claude/skills/learned"

# Check for recent session files (last 7 days)
recent_sessions=$(find "$SESSIONS_DIR" -name "*.tmp" -mtime -7 2>/dev/null | wc -l | tr -d ' ')

if [ "$recent_sessions" -gt 0 ]; then
  latest=$(ls -t "$SESSIONS_DIR"/*.tmp 2>/dev/null | head -1)
  echo "[SessionStart] Found $recent_sessions recent session(s)" >&2
  echo "[SessionStart] Latest: $latest" >&2
fi

# Check for learned skills
learned_count=$(find "$LEARNED_DIR" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

if [ "$learned_count" -gt 0 ]; then
  echo "[SessionStart] $learned_count learned skill(s) available in $LEARNED_DIR" >&2
fi

# Auto-archive plans for closed issues (lightweight check)
PLANS_DIR=".claude/plans"
ARCHIVE_DIR="$PLANS_DIR/archive/completed"

if [ -d "$PLANS_DIR" ]; then
  archived_count=0

  for dir in "$PLANS_DIR"/issue-*/; do
    [ -d "$dir" ] || continue

    issue_num=$(basename "$dir" | grep -oE '[0-9]+' | head -1)

    if [ -n "$issue_num" ]; then
      # Quick check if issue is closed
      state=$(gh issue view "$issue_num" --json state --jq '.state' 2>/dev/null || echo "")

      if [ "$state" = "CLOSED" ]; then
        mkdir -p "$ARCHIVE_DIR"
        folder_name=$(basename "$dir")

        if [ ! -d "$ARCHIVE_DIR/$folder_name" ]; then
          mv "$dir" "$ARCHIVE_DIR/"
          archived_count=$((archived_count + 1))
        else
          # Duplicate - remove active copy
          rm -rf "$dir"
        fi
      fi
    fi
  done

  if [ "$archived_count" -gt 0 ]; then
    echo "[SessionStart] Archived $archived_count closed issue plan(s)" >&2
  fi
fi

# Auto-cleanup stale local branches (PRs that have been merged)
branches_deleted=0

for branch in $(git branch --list 'issue/*' 2>/dev/null | tr -d ' *'); do
  # Skip if branch is currently checked out (in a worktree)
  if git worktree list 2>/dev/null | grep -q "\[$branch\]"; then
    continue
  fi

  # Check if PR for this branch was merged
  pr_state=$(gh pr list --head "$branch" --state merged --json state --jq '.[0].state' 2>/dev/null || echo "")

  if [ "$pr_state" = "MERGED" ]; then
    git branch -D "$branch" 2>/dev/null
    branches_deleted=$((branches_deleted + 1))
  fi
done

if [ "$branches_deleted" -gt 0 ]; then
  echo "[SessionStart] Cleaned up $branches_deleted stale branch(es)" >&2
fi
