#!/bin/bash
# TypeScript check after Edit on .ts/.tsx files
# PostToolUse hook for Edit on .(ts|tsx) files

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // ""')

if [ -n "$file_path" ] && [ -f "$file_path" ]; then
  dir=$(dirname "$file_path")
  project_root="$dir"

  # Find project root (where package.json is)
  while [ "$project_root" != "/" ] && [ ! -f "$project_root/package.json" ]; do
    project_root=$(dirname "$project_root")
  done

  if [ -f "$project_root/tsconfig.json" ]; then
    cd "$project_root" && npx tsc --noEmit --pretty false 2>&1 | grep -E "error TS" | head -5 >&2 || true
  fi
fi

echo "$input"
