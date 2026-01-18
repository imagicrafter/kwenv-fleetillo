#!/bin/bash
# Review Plan Hook (GitHub Issue Integration)
# Sends plan files to external AI tools for review and posts results to GitHub issue
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

# Only process files in .claude/plans/ (but not in archive/ or reviews/)
if [[ "$file_path" != *".claude/plans/"* ]] || [[ "$file_path" == *"/archive/"* ]] || [[ "$file_path" == *"/reviews/"* ]]; then
    exit 0
fi

# Detect issue number from current git branch
current_branch=$(git -C "$CLAUDE_PROJECT_DIR" branch --show-current 2>/dev/null || echo "")
issue_number=""

if [[ "$current_branch" =~ ^issue/([0-9]+) ]]; then
    issue_number="${BASH_REMATCH[1]}"
fi

# Get the plan filename
plan_filename=$(basename "$file_path")
plan_basename="${plan_filename%.*}"

# Create reviews folder with same date structure as archive
date_folder=$(date +%Y-%m-%d)
timestamp=$(date +%H%M%S)

if [[ -n "$issue_number" ]]; then
    reviews_dir="$CLAUDE_PROJECT_DIR/.claude/plans/reviews/$date_folder/issue-$issue_number-$timestamp-${session_id:0:8}"
else
    reviews_dir="$CLAUDE_PROJECT_DIR/.claude/plans/reviews/$date_folder/$timestamp-${session_id:0:8}"
fi

mkdir -p "$reviews_dir"

# Review prompt template
review_prompt="You are a senior software architect reviewing an implementation plan for a GitHub issue.

Analyze this plan and provide:
1. **Strengths**: What's good about this plan?
2. **Concerns**: What potential issues, risks, or gaps do you see?
3. **Suggestions**: How could this plan be improved?
4. **Verdict**: One of:
   - APPROVE: Plan is solid and ready for implementation
   - WARN: Plan has issues but can proceed with caution
   - BLOCK: Plan has critical issues that must be addressed

Be concise but thorough. Focus on architectural soundness, potential bugs, security concerns, and maintainability.

--- PLAN TO REVIEW ---
$(cat "$file_path")
--- END PLAN ---"

all_feedback=""
verdict="APPROVE"
reviewers_used=""

# Try Gemini CLI if available
if command -v gemini &> /dev/null; then
    echo "Reviewing with Gemini CLI..." >&2
    gemini_review=$(echo "$review_prompt" | gemini --non-interactive 2>/dev/null || echo "")

    if [[ -n "$gemini_review" ]]; then
        echo "$gemini_review" > "$reviews_dir/gemini-review.md"
        all_feedback="$all_feedback

### Gemini CLI Review

$gemini_review"
        reviewers_used="$reviewers_used Gemini"

        # Check verdict
        if echo "$gemini_review" | grep -qi "BLOCK"; then
            verdict="BLOCK"
        elif echo "$gemini_review" | grep -qi "WARN" && [[ "$verdict" != "BLOCK" ]]; then
            verdict="WARN"
        fi
    fi
fi

# Try Codex CLI if available
if command -v codex &> /dev/null; then
    echo "Reviewing with Codex CLI..." >&2
    codex_review=$(echo "$review_prompt" | codex --approval-mode full-auto 2>/dev/null || echo "")

    if [[ -n "$codex_review" ]]; then
        echo "$codex_review" > "$reviews_dir/codex-review.md"
        all_feedback="$all_feedback

### Codex CLI Review

$codex_review"
        reviewers_used="$reviewers_used Codex"

        # Check verdict
        if echo "$codex_review" | grep -qi "BLOCK"; then
            verdict="BLOCK"
        elif echo "$codex_review" | grep -qi "WARN" && [[ "$verdict" != "BLOCK" ]]; then
            verdict="WARN"
        fi
    fi
fi

# If no external tools available, skip review
if [[ -z "$reviewers_used" ]]; then
    echo '{"continue": true, "systemMessage": "No external review tools available (gemini, codex). Plan saved without external review."}'
    exit 0
fi

# Post reviews to GitHub issue if issue number detected
if [[ -n "$issue_number" ]] && [[ -n "$all_feedback" ]]; then
    # Determine emoji based on verdict
    case "$verdict" in
        "APPROVE") verdict_emoji="✅" ;;
        "WARN") verdict_emoji="⚠️" ;;
        "BLOCK") verdict_emoji="🛑" ;;
    esac

    comment_body="## $verdict_emoji External Plan Review

**Verdict: $verdict**
**Reviewers:$reviewers_used**

<details>
<summary>Click to expand reviews</summary>

$all_feedback

</details>

---
*Reviews archived to: \`$reviews_dir/\`*
*Session: ${session_id:0:8}*"

    # Post to GitHub issue
    echo "$comment_body" | gh issue comment "$issue_number" --body-file - 2>/dev/null || true
fi

# Construct response based on verdict
if [[ "$verdict" == "BLOCK" ]]; then
    # Exit with code 2 to show stderr to Claude and block
    echo "BLOCKED: External reviewers found critical issues in the plan." >&2
    echo -e "$all_feedback" >&2
    exit 2
elif [[ "$verdict" == "WARN" ]]; then
    if [[ -n "$issue_number" ]]; then
        echo "{\"continue\": true, \"systemMessage\": \"External review flagged issues (WARN). Reviews posted to issue #$issue_number and saved to $reviews_dir\"}"
    else
        echo "{\"continue\": true, \"systemMessage\": \"External review flagged issues (WARN). Reviews saved to $reviews_dir\"}"
    fi
else
    if [[ -n "$issue_number" ]]; then
        echo "{\"continue\": true, \"systemMessage\": \"Plan approved by external reviewers. Reviews posted to issue #$issue_number\"}"
    else
        echo "{\"continue\": true, \"systemMessage\": \"Plan approved by external reviewers. Reviews saved to $reviews_dir\"}"
    fi
fi
