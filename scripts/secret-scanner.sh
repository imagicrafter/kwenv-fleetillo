#!/usr/bin/env bash

# Secret Scanner - Detects hardcoded secrets in files
# Used by pre-commit/pre-push hooks and npm check-secrets command

set -eo pipefail

# Secret patterns to detect
# Each pattern is in format: "pattern|name|remediation"
declare -a SECRET_PATTERNS=(
  # API Keys
  "AIza[0-9A-Za-z_-]{35}|Google Maps API key|Use environment variable GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_BROWSER_KEY"
  "sk-[a-zA-Z0-9]{48}|OpenAI API key|Use environment variable OPENAI_API_KEY"
  "dop_v1_[a-f0-9]{64}|DigitalOcean token|Use environment variable DIGITALOCEAN_TOKEN"

  # Generic patterns (with word boundaries to avoid false positives)
  "\b(api_key|apikey)[\s:=][\"']?[^\s\"\'\n]{10,}|Generic API key|Use environment variables or SECRET type in app spec"
  "\b(password|passwd|pwd)[\s:=][\"']?[^\s\"\'\n]{6,}|Password|Use environment variables, never hardcode passwords"
  "\b(secret|token)[\s:=][\"']?[^\s\"\'\n]{10,}|Secret/Token|Use environment variables or SECRET type in app spec"
  "\b(bearer|authorization)[\s:=][\"']?[^\s\"\'\n]{10,}|Bearer token|Use environment variables for authentication tokens"

  # JWT tokens
  "eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.?[A-Za-z0-9_-]*|JWT token|Never commit JWTs - use environment variables"

  # Supabase secrets
  "sb_secret_[A-Za-z0-9_-]{27,}|Supabase secret|Use environment variable for Supabase keys"
)

# Allowlist - files/patterns to skip
declare -a ALLOWLIST=(
  ".env.example"
  "deploy/SECRETS.md"
  "deploy/SUPABASE_KEY_ROTATION.md"
  "deploy/GOOGLE_MAPS_API_RESTRICTION.md"
  ".claude/rules/security.md"
  "scripts/secret-scanner.sh"
  "scripts/secret-patterns.ts"
  ".gitleaks.toml"
  "test/"
  "tests/"
  "__tests__/"
  ".test."
  ".spec."
  "README"
  "CONTRIBUTING"
)

# Check if a file is allowlisted
is_allowlisted() {
  local file="$1"

  for pattern in "${ALLOWLIST[@]}"; do
    if [[ "$file" == *"$pattern"* ]]; then
      return 0  # Is allowlisted
    fi
  done

  return 1  # Not allowlisted
}

# Check if a value looks like a placeholder
is_placeholder() {
  local value="$1"

  # Common placeholder patterns
  if [[ "$value" =~ (xxxxx|your-|placeholder|example|<|>|TODO|FIXME|dummy|test-|fake-) ]]; then
    return 0  # Is placeholder
  fi

  return 1  # Not a placeholder
}

# Log secret detection event
log_detection() {
  local repo="$1"
  local file="$2"
  local line_num="$3"
  local pattern_name="$4"
  local timestamp="$5"

  local log_file="$HOME/.claude/logs/secret-detections.log"
  mkdir -p "$(dirname "$log_file")"

  # Write structured log entry
  echo "[$timestamp] REPO=$repo FILE=$file LINE=$line_num PATTERN=\"$pattern_name\"" >> "$log_file"
}

# Send desktop notification (macOS)
send_notification() {
  local repo="$1"
  local file="$2"
  local pattern_name="$3"

  # Only send if running on macOS
  if [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e "display notification \"$file\" with title \"🔒 Secret Detected in $repo\" subtitle \"Pattern: $pattern_name\""
  fi
}

# Scan a single file for secrets
scan_file() {
  local file="$1"
  local found_secrets=0

  # Skip if allowlisted
  if is_allowlisted "$file"; then
    return 0
  fi

  # Skip if file doesn't exist or is not readable
  if [ ! -f "$file" ] || [ ! -r "$file" ]; then
    return 0
  fi

  # Skip binary files
  if file "$file" | grep -q "executable\|binary"; then
    return 0
  fi

  # Scan with each pattern
  for pattern_entry in "${SECRET_PATTERNS[@]}"; do
    IFS='|' read -r pattern name remediation <<< "$pattern_entry"

    # Search for pattern in file
    while IFS=: read -r line_num line_content; do
      # Extract the matched value
      matched_value=$(echo "$line_content" | grep -oE "$pattern" | head -1)

      # Skip if it looks like a placeholder
      if is_placeholder "$matched_value"; then
        continue
      fi

      # Secret detected!
      found_secrets=1

      # Get repository name and timestamp
      REPO_NAME=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown-repo")
      TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

      # Log detection event
      log_detection "$REPO_NAME" "$file" "$line_num" "$name" "$TIMESTAMP"

      # Send desktop notification
      send_notification "$REPO_NAME" "$file" "$name"

      # Display error
      echo ""
      echo "❌ SECRET DETECTED - Commit blocked!"
      echo ""
      echo "File: $file"
      echo "Line: $line_num"
      echo "Pattern: $name"
      echo ""

      # Show context (2 lines before and after)
      local start_line=$((line_num - 2))
      [[ $start_line -lt 1 ]] && start_line=1
      local end_line=$((line_num + 2))

      sed -n "${start_line},${end_line}p" "$file" | nl -v "$start_line" -w 6 -s ":  "

      echo ""
      echo "✋ NEVER commit secrets to git!"
      echo ""
      echo "Fix:"
      echo "  $remediation"
      echo ""
      echo "See deploy/SECRETS.md for full documentation."
      echo ""
      echo "To bypass this check (NOT recommended): git commit --no-verify"
      echo ""

    done < <(grep -nE "$pattern" "$file" 2>/dev/null || true)
  done

  return $found_secrets
}

# Display usage
usage() {
  echo "Usage: $0 <file1> <file2> ..."
  echo ""
  echo "Scans files for hardcoded secrets."
  echo "Exit code 0: No secrets found"
  echo "Exit code 1: Secrets detected"
}

# Main
main() {
  if [ $# -eq 0 ]; then
    usage
    exit 1
  fi

  local exit_code=0

  for file in "$@"; do
    if ! scan_file "$file"; then
      exit_code=1
    fi
  done

  if [ $exit_code -eq 0 ]; then
    echo "✅ No secrets detected"
  fi

  exit $exit_code
}

# Run if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  main "$@"
fi
