#!/bin/bash
# Archive Plan Hook (GitHub Issue Integration)
# Copies plan files to a dated archive folder and posts to GitHub issue
# Triggered by PostToolUse on Write operations

set -e

# Read JSON input from stdin
input=$(cat)

# Extract file path and other details
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')
session_id=$(echo "$input" | jq -r '.session_id // "unknown"')

# Exit if no file path
if [[ -z "$file_path" ]]; then
    exit 0
fi

# Only process files in .claude/plans/ (but not in archive/)
if [[ "$file_path" != *".claude/plans/"* ]] || [[ "$file_path" == *"/archive/"* ]] || [[ "$file_path" == *"/reviews/"* ]]; then
    exit 0
fi

# Get the plan filename
plan_filename=$(basename "$file_path")

# Detect issue number from current git branch
# Expected format: issue/123-description
current_branch=$(git -C "$CLAUDE_PROJECT_DIR" branch --show-current 2>/dev/null || echo "")
issue_number=""

if [[ "$current_branch" =~ ^issue/([0-9]+) ]]; then
    issue_number="${BASH_REMATCH[1]}"
fi

# Create dated archive folder with session ID and optional issue number
date_folder=$(date +%Y-%m-%d)
timestamp=$(date +%H%M%S)

if [[ -n "$issue_number" ]]; then
    archive_dir="$CLAUDE_PROJECT_DIR/.claude/plans/archive/$date_folder/issue-$issue_number-$timestamp-${session_id:0:8}"
else
    archive_dir="$CLAUDE_PROJECT_DIR/.claude/plans/archive/$date_folder/$timestamp-${session_id:0:8}"
fi

mkdir -p "$archive_dir"

# Copy the plan file to archive
cp "$file_path" "$archive_dir/$plan_filename"

# Post plan to GitHub issue if issue number detected
if [[ -n "$issue_number" ]]; then
    plan_content=$(cat "$file_path")

    # Truncate if too long for GitHub comment (max ~65k chars)
    if [[ ${#plan_content} -gt 60000 ]]; then
        plan_content="${plan_content:0:60000}...\n\n[Plan truncated - see full plan in archive]"
    fi

    # Create comment with plan
    comment_body="## Implementation Plan

<details>
<summary>Click to expand plan</summary>

$plan_content

</details>

---
*Plan archived to: \`$archive_dir/$plan_filename\`*
*Session: ${session_id:0:8}*"

    # Post to GitHub issue (suppress errors if gh not available or issue doesn't exist)
    echo "$comment_body" | gh issue comment "$issue_number" --body-file - 2>/dev/null || true

    echo "{\"continue\": true, \"systemMessage\": \"Plan archived and posted to issue #$issue_number\"}"
else
    echo "{\"continue\": true, \"systemMessage\": \"Plan archived to $archive_dir/$plan_filename (no issue branch detected)\"}"
fi
