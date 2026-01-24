#!/usr/bin/env bash

# Install Git Hooks
# Installs pre-commit and pre-push hooks for secret detection

set -eo pipefail

HOOKS_DIR=".git/hooks"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCANNER_SCRIPT="$SCRIPT_DIR/secret-scanner.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔧 Installing git hooks..."

# Verify we're in a git repository
if [ ! -d ".git" ]; then
  echo -e "${RED}ERROR: Not in a git repository${NC}"
  exit 1
fi

# Verify scanner script exists
if [ ! -f "$SCANNER_SCRIPT" ]; then
  echo -e "${RED}ERROR: Scanner script not found: $SCANNER_SCRIPT${NC}"
  exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p "$HOOKS_DIR"

# ==============================================================================
# PRE-COMMIT HOOK
# ==============================================================================

PRE_COMMIT_HOOK="$HOOKS_DIR/pre-commit"

# Check if pre-commit hook already exists
if [ -f "$PRE_COMMIT_HOOK" ]; then
  echo -e "${YELLOW}⚠️  Existing pre-commit hook found${NC}"

  # Backup existing hook
  BACKUP_FILE="$PRE_COMMIT_HOOK.backup.$(date +%Y%m%d_%H%M%S)"
  cp "$PRE_COMMIT_HOOK" "$BACKUP_FILE"
  echo "  Backed up to: $BACKUP_FILE"

  # Check if our secret scanner is already in the hook
  if grep -q "secret-scanner.sh" "$PRE_COMMIT_HOOK"; then
    echo -e "${GREEN}✅ Secret scanner already installed in pre-commit hook${NC}"
  else
    echo -e "${YELLOW}  Adding secret scanner to existing hook${NC}"

    # Append our scanner to the existing hook
    cat >> "$PRE_COMMIT_HOOK" << 'HOOK_EOF'

# Secret Scanner (added by scripts/install-hooks.sh)
SCANNER_SCRIPT="$(git rev-parse --show-toplevel)/scripts/secret-scanner.sh"

if [ -f "$SCANNER_SCRIPT" ]; then
  # Get staged files
  STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

  if [ -n "$STAGED_FILES" ]; then
    if ! bash "$SCANNER_SCRIPT" $STAGED_FILES; then
      echo ""
      echo "❌ Commit blocked due to secret detection"
      exit 1
    fi
  fi
fi
HOOK_EOF
    echo -e "${GREEN}✅ Secret scanner added to pre-commit hook${NC}"
  fi
else
  # Create new pre-commit hook
  cat > "$PRE_COMMIT_HOOK" << 'HOOK_EOF'
#!/usr/bin/env bash

# Pre-commit Hook
# Prevents commits to main branch and scans for secrets

# Prevent direct commits to main
BRANCH=$(git symbolic-ref HEAD | sed -e 's,.*/\(.*\),\1,')

if [ "$BRANCH" = "main" ]; then
  echo "❌ Direct commits to main branch are not allowed"
  echo "Create a feature branch instead:"
  echo "  git checkout -b feature/your-feature-name"
  exit 1
fi

# Secret Scanner
SCANNER_SCRIPT="$(git rev-parse --show-toplevel)/scripts/secret-scanner.sh"

if [ -f "$SCANNER_SCRIPT" ]; then
  # Get staged files
  STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

  if [ -n "$STAGED_FILES" ]; then
    if ! bash "$SCANNER_SCRIPT" $STAGED_FILES; then
      echo ""
      echo "❌ Commit blocked due to secret detection"
      exit 1
    fi
  fi
else
  echo "⚠️  Warning: Secret scanner not found at $SCANNER_SCRIPT"
fi

exit 0
HOOK_EOF

  chmod +x "$PRE_COMMIT_HOOK"
  echo -e "${GREEN}✅ Created pre-commit hook${NC}"
fi

# ==============================================================================
# PRE-PUSH HOOK
# ==============================================================================

PRE_PUSH_HOOK="$HOOKS_DIR/pre-push"

# Check if pre-push hook already exists
if [ -f "$PRE_PUSH_HOOK" ]; then
  echo -e "${YELLOW}⚠️  Existing pre-push hook found${NC}"

  # Backup existing hook
  BACKUP_FILE="$PRE_PUSH_HOOK.backup.$(date +%Y%m%d_%H%M%S)"
  cp "$PRE_PUSH_HOOK" "$BACKUP_FILE"
  echo "  Backed up to: $BACKUP_FILE"

  # Check if our secret scanner is already in the hook
  if grep -q "secret-scanner.sh" "$PRE_PUSH_HOOK"; then
    echo -e "${GREEN}✅ Secret scanner already installed in pre-push hook${NC}"
  else
    echo -e "${YELLOW}  Adding secret scanner to existing hook${NC}"

    # Append our scanner to the existing hook
    cat >> "$PRE_PUSH_HOOK" << 'HOOK_EOF'

# Secret Scanner (added by scripts/install-hooks.sh)
SCANNER_SCRIPT="$(git rev-parse --show-toplevel)/scripts/secret-scanner.sh"

if [ -f "$SCANNER_SCRIPT" ]; then
  # Read pre-push parameters
  while read local_ref local_sha remote_ref remote_sha; do
    if [ "$local_sha" != "0000000000000000000000000000000000000000" ]; then
      # Get files changed in commits being pushed
      FILES_CHANGED=$(git diff --name-only "$remote_sha" "$local_sha" 2>/dev/null || git diff --name-only "$local_sha")

      if [ -n "$FILES_CHANGED" ]; then
        if ! bash "$SCANNER_SCRIPT" $FILES_CHANGED; then
          echo ""
          echo "❌ Push blocked due to secret detection"
          exit 1
        fi
      fi
    fi
  done
fi
HOOK_EOF
    echo -e "${GREEN}✅ Secret scanner added to pre-push hook${NC}"
  fi
else
  # Create new pre-push hook
  cat > "$PRE_PUSH_HOOK" << 'HOOK_EOF'
#!/usr/bin/env bash

# Pre-push Hook
# Final safety check for secrets before push

SCANNER_SCRIPT="$(git rev-parse --show-toplevel)/scripts/secret-scanner.sh"

if [ -f "$SCANNER_SCRIPT" ]; then
  # Read pre-push parameters
  while read local_ref local_sha remote_ref remote_sha; do
    if [ "$local_sha" != "0000000000000000000000000000000000000000" ]; then
      # Get files changed in commits being pushed
      FILES_CHANGED=$(git diff --name-only "$remote_sha" "$local_sha" 2>/dev/null || git diff --name-only "$local_sha")

      if [ -n "$FILES_CHANGED" ]; then
        if ! bash "$SCANNER_SCRIPT" $FILES_CHANGED; then
          echo ""
          echo "❌ Push blocked due to secret detection"
          exit 1
        fi
      fi
    fi
  done
else
  echo "⚠️  Warning: Secret scanner not found at $SCANNER_SCRIPT"
fi

exit 0
HOOK_EOF

  chmod +x "$PRE_PUSH_HOOK"
  echo -e "${GREEN}✅ Created pre-push hook${NC}"
fi

# ==============================================================================
# SUMMARY
# ==============================================================================

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "                    HOOKS INSTALLED"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "✅ Pre-commit hook: $PRE_COMMIT_HOOK"
echo "✅ Pre-push hook: $PRE_PUSH_HOOK"
echo ""
echo "These hooks will:"
echo "  • Block commits with hardcoded secrets"
echo "  • Scan staged files before commit"
echo "  • Scan changed files before push"
echo ""
echo "To bypass (NOT recommended):"
echo "  git commit --no-verify"
echo ""
echo "To manually check for secrets:"
echo "  npm run check-secrets"
echo ""
echo "═══════════════════════════════════════════════════════════"
