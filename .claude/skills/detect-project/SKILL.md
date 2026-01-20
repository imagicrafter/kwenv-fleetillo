---
name: detect-project
description: Detect project type, test framework, build tools, and validation commands. Use this skill when you need to understand how to build, test, or validate a project without hardcoding assumptions about the tech stack.
allowed-tools:
  - Bash(cat:*)
  - Bash(head:*)
  - Bash(grep:*)
  - Bash(jq:*)
  - Bash(ls:*)
  - Bash(test:*)
  - Read
  - Glob
---

# Detect Project Configuration

Analyze the current project to determine tech stack, test framework, and validation commands.

## Overview

This skill examines project configuration files to build a complete picture of how to validate the project. It returns structured information that other skills/commands can use.

## Detection Process

### Step 1: Identify Project Type

Check for configuration files in this order:
````bash
# Node.js / JavaScript / TypeScript
[ -f "package.json" ] && PROJECT_TYPE="node"

# Python
[ -f "pyproject.toml" ] && PROJECT_TYPE="python-modern"
[ -f "setup.py" ] && PROJECT_TYPE="python-legacy"
[ -f "requirements.txt" ] && [ -z "$PROJECT_TYPE" ] && PROJECT_TYPE="python-minimal"

# Go
[ -f "go.mod" ] && PROJECT_TYPE="go"

# Rust
[ -f "Cargo.toml" ] && PROJECT_TYPE="rust"

# Ruby
[ -f "Gemfile" ] && PROJECT_TYPE="ruby"

# Monorepo detection
[ -f "pnpm-workspace.yaml" ] || [ -f "lerna.json" ] || [ -d "packages" ] && IS_MONOREPO=true
````

### Step 2: Detect Test Framework

#### Node.js Projects
````bash
if [ "$PROJECT_TYPE" = "node" ]; then
  # Check package.json for test dependencies
  TEST_DEPS=$(cat package.json | jq -r '.devDependencies // {} | keys[]' 2>/dev/null)
  
  # Detect test runner
  if echo "$TEST_DEPS" | grep -q "vitest"; then
    TEST_FRAMEWORK="vitest"
    TEST_CMD="npx vitest run"
  elif echo "$TEST_DEPS" | grep -q "jest"; then
    TEST_FRAMEWORK="jest"
    TEST_CMD="npx jest"
  elif echo "$TEST_DEPS" | grep -q "mocha"; then
    TEST_FRAMEWORK="mocha"
    TEST_CMD="npx mocha"
  elif cat package.json | jq -e '.scripts.test' > /dev/null 2>&1; then
    TEST_FRAMEWORK="npm-script"
    TEST_CMD="npm test"
  else
    TEST_FRAMEWORK="none"
    TEST_CMD=""
  fi
  
  # Detect type checker
  if echo "$TEST_DEPS" | grep -q "typescript"; then
    TYPE_CHECK_CMD="npx tsc --noEmit"
  else
    TYPE_CHECK_CMD=""
  fi
  
  # Detect linter
  if echo "$TEST_DEPS" | grep -q "eslint"; then
    LINT_CMD="npx eslint ."
  elif echo "$TEST_DEPS" | grep -q "biome"; then
    LINT_CMD="npx biome check ."
  else
    LINT_CMD=""
  fi
  
  # Detect formatter
  if echo "$TEST_DEPS" | grep -q "prettier"; then
    FORMAT_CMD="npx prettier --check ."
  elif echo "$TEST_DEPS" | grep -q "biome"; then
    FORMAT_CMD="npx biome format ."
  else
    FORMAT_CMD=""
  fi
  
  # Detect build command
  if cat package.json | jq -e '.scripts.build' > /dev/null 2>&1; then
    BUILD_CMD="npm run build"
  else
    BUILD_CMD=""
  fi
fi
````

#### Python Projects
````bash
if [[ "$PROJECT_TYPE" == python* ]]; then
  # Check for test framework
  if [ -f "pyproject.toml" ]; then
    if grep -q "pytest" pyproject.toml; then
      TEST_FRAMEWORK="pytest"
      TEST_CMD="pytest"
    fi
    
    # Check for ruff
    if grep -q "ruff" pyproject.toml; then
      LINT_CMD="ruff check ."
      FORMAT_CMD="ruff format --check ."
    fi
    
    # Check for mypy
    if grep -q "mypy" pyproject.toml; then
      TYPE_CHECK_CMD="mypy ."
    fi
  fi
  
  # Fallback detection
  if [ -z "$TEST_FRAMEWORK" ]; then
    [ -f "pytest.ini" ] || [ -d "tests" ] && TEST_FRAMEWORK="pytest" && TEST_CMD="pytest"
  fi
  
  # Check for setup.py test command
  if [ -f "setup.py" ] && grep -q "test_suite" setup.py; then
    TEST_CMD="python setup.py test"
  fi
fi
````

#### Go Projects
````bash
if [ "$PROJECT_TYPE" = "go" ]; then
  TEST_FRAMEWORK="go-test"
  TEST_CMD="go test ./..."
  BUILD_CMD="go build ./..."
  LINT_CMD="golangci-lint run"  # if installed
fi
````

#### Rust Projects
````bash
if [ "$PROJECT_TYPE" = "rust" ]; then
  TEST_FRAMEWORK="cargo"
  TEST_CMD="cargo test"
  BUILD_CMD="cargo build"
  LINT_CMD="cargo clippy"
  FORMAT_CMD="cargo fmt --check"
fi
````

### Step 3: Check for CI Configuration

CI config often has the most accurate validation commands:
````bash
# GitHub Actions
if [ -d ".github/workflows" ]; then
  CI_TYPE="github-actions"
  # Extract test commands from workflow files
  CI_TEST_CMDS=$(grep -rh "run:" .github/workflows/*.yml 2>/dev/null | grep -E "(test|check|lint)" | head -5)
fi

# GitLab CI
if [ -f ".gitlab-ci.yml" ]; then
  CI_TYPE="gitlab"
fi

# CircleCI
if [ -f ".circleci/config.yml" ]; then
  CI_TYPE="circleci"
fi
````

### Step 4: Check for Project-Specific Config

Look for project-specific override file:
````bash
if [ -f ".claude/project-config.yaml" ]; then
  # This file can override detected commands
  # Format:
  # validation:
  #   test: "npm test"
  #   lint: "npm run lint"
  #   type-check: "npm run type-check"
  #   build: "npm run build"
  #   format: "npm run format:check"
  
  OVERRIDE_CONFIG=$(cat .claude/project-config.yaml)
fi
````

## Output Format

Return a structured summary that execute.md can use:
````markdown
## Project Detection Results

**Project Type**: $PROJECT_TYPE
**Monorepo**: $IS_MONOREPO
**CI Platform**: $CI_TYPE

### Validation Commands

| Check | Command | Detected From |
|-------|---------|---------------|
| Test | `$TEST_CMD` | $TEST_FRAMEWORK |
| Type Check | `$TYPE_CHECK_CMD` | package.json |
| Lint | `$LINT_CMD` | eslint config |
| Format | `$FORMAT_CMD` | prettier |
| Build | `$BUILD_CMD` | package.json |

### Recommended Validation Sequence
```bash
# 1. Type checking (fastest feedback)
$TYPE_CHECK_CMD

# 2. Linting
$LINT_CMD

# 3. Format check
$FORMAT_CMD

# 4. Tests
$TEST_CMD

# 5. Build (slowest, run last)
$BUILD_CMD
```

### Notes
- $NOTES (any special considerations detected)
````

## Usage in execute.md

The execute.md orchestrator can invoke this skill before validation:
````markdown
Before running validations, detect project configuration:

1. Read .claude/skills/detect-project/SKILL.md
2. Execute detection process
3. Use detected commands for validation phase

If detection fails or returns empty commands:
- Fall back to checking for common commands (npm test, pytest, etc.)
- Log warning that project type could not be detected
````

## Extensibility

To add support for a new project type:

1. Add detection logic in Step 1
2. Add test/lint/build detection in Step 2
3. Test with a sample project of that type

## Common Patterns

### Monorepo Handling
````bash
if [ "$IS_MONOREPO" = true ]; then
  # Run tests only for affected packages
  # This requires knowing which package changed
  
  # For pnpm workspaces
  if [ -f "pnpm-workspace.yaml" ]; then
    TEST_CMD="pnpm -r test"
    BUILD_CMD="pnpm -r build"
  fi
  
  # For npm workspaces
  if cat package.json | jq -e '.workspaces' > /dev/null 2>&1; then
    TEST_CMD="npm test --workspaces"
  fi
fi
````

### No Tests Configured

If no test command is detected:
````markdown
**Warning**: No test framework detected.

Options:
1. Add tests before implementing changes
2. Proceed with manual verification only
3. Configure test command in `.claude/project-config.yaml`

Recommended: Add `"test": "echo 'No tests configured'"` to package.json scripts to make this explicit.
````