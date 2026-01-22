#!/bin/bash
# Log PR URL after gh pr create
# PostToolUse hook for Bash with 'gh pr create'

input=$(cat)
output=$(echo "$input" | jq -r '.tool_output.stdout // .tool_output.output // ""')
pr_url=$(echo "$output" | grep -oE 'https://github.com/[^/]+/[^/]+/pull/[0-9]+' | head -1)

if [ -n "$pr_url" ]; then
  echo "[Hook] PR created: $pr_url" >&2
  repo=$(echo "$pr_url" | sed -E 's|https://github.com/([^/]+/[^/]+)/pull/[0-9]+|\1|')
  pr_num=$(echo "$pr_url" | sed -E 's|.*/pull/([0-9]+)|\1|')
  echo "[Hook] To review: gh pr view $pr_num --repo $repo" >&2
fi

echo "$input"
