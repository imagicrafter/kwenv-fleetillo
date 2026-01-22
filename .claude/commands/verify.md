---
name: verify
description: Run comprehensive verification on current codebase state. Produces a formatted verification report.
argument-hint: [quick|full|pre-commit|pre-pr]
---

# Verification Command

Run comprehensive verification on the current codebase state.

## Usage

```
/verify              # Full verification (default)
/verify quick        # Only build + types
/verify pre-commit   # Checks relevant for commits
/verify pre-pr       # Full checks plus security scan
```

## Instructions

### Step 1: Detect Project Configuration

First, use the **detect-project** skill to determine the correct commands:

```bash
# Detection will set these variables:
# PROJECT_TYPE, TEST_CMD, TYPE_CHECK_CMD, LINT_CMD, FORMAT_CMD, BUILD_CMD
```

Read `.claude/skills/detect-project/SKILL.md` and follow its instructions to detect:
- Build command (e.g., `npm run build`)
- Type check command (e.g., `npx tsc --noEmit`)
- Lint command (e.g., `npx eslint .`)
- Test command (e.g., `npm test`)

### Step 2: Execute Verification Phases

Execute in this exact order:

#### Phase 1: Build Check
```bash
# Run detected build command
$BUILD_CMD 2>&1 | tail -20
```
- If it fails, report errors and **STOP**

#### Phase 2: Type Check
```bash
# Run detected type check command
$TYPE_CHECK_CMD 2>&1 | head -30
```
- Report all errors with file:line

#### Phase 3: Lint Check
```bash
# Run detected lint command
$LINT_CMD 2>&1 | head -30
```
- Report warnings and errors

#### Phase 4: Format Check
```bash
# Run detected format command
$FORMAT_CMD 2>&1 | head -20
```
- Report formatting issues

#### Phase 5: Test Suite
```bash
# Run detected test command with coverage
$TEST_CMD 2>&1 | tail -50
```
- Report pass/fail count
- Report coverage percentage if available

#### Phase 6: Console.log Audit
```bash
# Search for console.log in source files
grep -rn "console\.log" --include="*.ts" --include="*.tsx" --include="*.js" src/ 2>/dev/null | head -20
```
- Report locations (exclude test files)

#### Phase 7: Security Scan (pre-pr mode only)
```bash
# Check for hardcoded secrets
grep -rn "sk-" --include="*.ts" --include="*.js" . 2>/dev/null | grep -v node_modules | head -10
grep -rn "api_key.*=" --include="*.ts" --include="*.js" . 2>/dev/null | grep -v node_modules | head -10
```
- Report any potential secrets

#### Phase 8: Git Status
```bash
git status --short
git diff --stat HEAD~1 2>/dev/null || git diff --stat
```
- Show uncommitted changes
- Show files modified

### Step 3: Generate Verification Report

Produce a formatted verification report:

```
═══════════════════════════════════════════════════════════════
                    VERIFICATION REPORT
═══════════════════════════════════════════════════════════════

Status:     [✅ PASS | ❌ FAIL]
Mode:       [quick | full | pre-commit | pre-pr]
Timestamp:  [ISO timestamp]

───────────────────────────────────────────────────────────────
                         RESULTS
───────────────────────────────────────────────────────────────

Build:      [✅ OK | ❌ FAIL]
Types:      [✅ OK | ⚠️ X errors]
Lint:       [✅ OK | ⚠️ X issues]
Format:     [✅ OK | ⚠️ X issues]
Tests:      [✅ X/Y passed | ❌ X failed] (Z% coverage)
Console:    [✅ Clean | ⚠️ X console.logs found]
Secrets:    [✅ None | 🚨 X potential secrets]

───────────────────────────────────────────────────────────────
                       GIT STATUS
───────────────────────────────────────────────────────────────

Files changed: X
Insertions:   +Y
Deletions:    -Z

───────────────────────────────────────────────────────────────

Ready for PR: [✅ YES | ❌ NO - fix issues below]

Issues to Fix:
1. [Issue description with file:line]
2. [Issue description with file:line]

═══════════════════════════════════════════════════════════════
```

### Step 4: Save Report (Optional)

If in a plan folder context, save the report:

```bash
# If PLAN_FOLDER is set
echo "$REPORT" > "$PLAN_FOLDER/verification-report.md"
```

## Mode Definitions

| Mode | Phases Run |
|------|------------|
| `quick` | Build, Types only |
| `full` | Build, Types, Lint, Format, Tests, Console audit |
| `pre-commit` | Build, Types, Lint, Console audit |
| `pre-pr` | All phases including Security scan |

## Integration with Execute Workflow

This command is invoked by `/execute` in Step 7 (Validation Phase).
The verification report is included in the PR body.

## Related

- `.claude/skills/detect-project/SKILL.md` - Command detection
- `.claude/skills/verification-loop/SKILL.md` - Detailed verification phases
- `.claude/commands/execute.md` - Uses this in Step 7
