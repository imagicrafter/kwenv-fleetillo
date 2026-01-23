# Plan Integrity Workflow Fixes - Review Document

**Created:** 2026-01-23
**Issue:** #62 workflow malfunction - unapproved plan replacement
**Status:** PENDING REVIEW

---

## Overview

This document contains all proposed fixes to prevent unauthorized plan replacement. Each fix is numbered and can be approved/rejected individually.

**Review this document, then tell me which fixes to implement.**

---

## Fix #1: Add Pre-Flight Plan Integrity Audit Script

**Create new file:** `.claude/scripts/audit-plan-integrity.sh`

**Purpose:** Validates plan integrity before execution starts

**What it checks:**
- Issue is OPEN
- Has tier label
- If `plan ready` exists, plan folder exists
- Plan documents match tier requirements
- Plan path matches GitHub comment
- Plan not modified since approval

**When it runs:** Before Step 1 in `/execute` command

**Exit behavior:**
- Exit 0 if all checks pass (allow execution)
- Exit 1 if any check fails (block execution)

<details>
<summary>View full script (115 lines)</summary>

```bash
#!/bin/bash

# Usage: ./scripts/audit-plan-integrity.sh [ISSUE_NUMBER]

ISSUE_NUM="$1"

if [ -z "$ISSUE_NUM" ]; then
  echo "Usage: $0 <issue-number>"
  exit 1
fi

echo "═══════════════════════════════════════════════════════"
echo "          PLAN INTEGRITY AUDIT - Issue #$ISSUE_NUM"
echo "═══════════════════════════════════════════════════════"
echo ""

FAILED=false

# Check 1: Issue exists and is open
echo "📋 Check 1: Issue Status"
STATE=$(gh issue view "$ISSUE_NUM" --json state --jq '.state' 2>/dev/null)
if [ "$STATE" != "OPEN" ]; then
  echo "   ❌ FAIL: Issue is not OPEN (state: $STATE)"
  FAILED=true
else
  echo "   ✅ PASS: Issue is OPEN"
fi
echo ""

# Check 2: Labels
echo "🏷️  Check 2: Labels"
LABELS=$(gh issue view "$ISSUE_NUM" --json labels --jq '.labels[].name' 2>/dev/null)
HAS_TIER=$(echo "$LABELS" | grep -E "plan: (simple|medium|complex)")
HAS_PLAN_READY=$(echo "$LABELS" | grep "plan ready")

if [ -z "$HAS_TIER" ]; then
  echo "   ❌ FAIL: No tier label found"
  FAILED=true
else
  TIER=$(echo "$HAS_TIER" | cut -d' ' -f2)
  echo "   ✅ PASS: Tier = $TIER"
fi

if [ -n "$HAS_PLAN_READY" ]; then
  echo "   ℹ️  INFO: 'plan ready' label exists - plan required"
  PLAN_REQUIRED=true
else
  echo "   ℹ️  INFO: No 'plan ready' label"
  PLAN_REQUIRED=false
fi
echo ""

# Check 3: Plan folder exists
echo "📁 Check 3: Plan Folder"
PLAN_FOLDER=$(find .claude/plans -maxdepth 1 -type d -name "issue-${ISSUE_NUM}-*" 2>/dev/null | head -1)

if [ "$PLAN_REQUIRED" = true ]; then
  if [ -z "$PLAN_FOLDER" ]; then
    echo "   ❌ FAIL: 'plan ready' label exists but no plan folder found"
    FAILED=true

    # Check archive
    ARCHIVED=$(find .claude/plans/archive -name "issue-${ISSUE_NUM}-*" -type d 2>/dev/null | head -1)
    if [ -n "$ARCHIVED" ]; then
      echo "   ⚠️  WARNING: Found in archive: $ARCHIVED"
    fi
  else
    echo "   ✅ PASS: Plan folder exists at $PLAN_FOLDER"
  fi
else
  if [ -n "$PLAN_FOLDER" ]; then
    echo "   ℹ️  INFO: Plan folder exists (but not marked ready)"
  else
    echo "   ℹ️  INFO: No plan folder (not required)"
  fi
fi
echo ""

# Check 4: Plan documents match tier
if [ -n "$PLAN_FOLDER" ] && [ "$TIER" != "simple" ]; then
  echo "📄 Check 4: Plan Documents"

  case "$TIER" in
    medium)
      if [ -f "$PLAN_FOLDER/plan.md" ]; then
        echo "   ✅ PASS: plan.md exists"
      else
        echo "   ❌ FAIL: plan.md missing"
        FAILED=true
      fi
      ;;
    complex)
      DOCS_OK=true
      [ ! -f "$PLAN_FOLDER/requirements.md" ] && echo "   ❌ FAIL: requirements.md missing" && DOCS_OK=false && FAILED=true
      [ ! -f "$PLAN_FOLDER/design.md" ] && echo "   ❌ FAIL: design.md missing" && DOCS_OK=false && FAILED=true
      [ ! -f "$PLAN_FOLDER/tasks.md" ] && echo "   ❌ FAIL: tasks.md missing" && DOCS_OK=false && FAILED=true

      if [ "$DOCS_OK" = true ]; then
        echo "   ✅ PASS: All complex tier documents exist"
      fi
      ;;
  esac
  echo ""
fi

# Check 5: Plan path matches GitHub comments
if [ "$PLAN_REQUIRED" = true ] && [ -n "$PLAN_FOLDER" ]; then
  echo "🔗 Check 5: Plan Path Matches GitHub Comments"

  APPROVED_PATH=$(gh issue view "$ISSUE_NUM" --json comments --jq '.comments[] | select(.body | contains("Planning Complete")) | .body' 2>/dev/null | grep -o '`.claude/plans/issue-[^`]*`' | tr -d '`' | head -1)

  if [ -n "$APPROVED_PATH" ]; then
    # Normalize paths
    CURRENT_NORM=$(echo "$PLAN_FOLDER" | sed 's:/*$::')
    APPROVED_NORM=$(echo "$APPROVED_PATH" | sed 's:/*$::')

    if [ "$CURRENT_NORM" = "$APPROVED_NORM" ]; then
      echo "   ✅ PASS: Path matches GitHub comment"
    else
      echo "   ❌ FAIL: Path mismatch"
      echo "      Current:  $PLAN_FOLDER"
      echo "      Approved: $APPROVED_PATH"
      FAILED=true
    fi
  else
    echo "   ⚠️  WARNING: No 'Planning Complete' comment found"
  fi
  echo ""
fi

# Check 6: Plan not modified since approval
if [ "$PLAN_REQUIRED" = true ] && [ -n "$PLAN_FOLDER" ]; then
  echo "🕒 Check 6: Plan Immutability"

  LABEL_APPLIED=$(gh issue view "$ISSUE_NUM" --json comments --jq '.comments[] | select(.body | contains("Planning Complete")) | .createdAt' 2>/dev/null | head -1)

  if [ -n "$LABEL_APPLIED" ] && [ -f "$PLAN_FOLDER/plan.md" ]; then
    PLAN_MODIFIED=$(git log -1 --format=%aI -- "$PLAN_FOLDER/plan.md" 2>/dev/null)

    if [ -n "$PLAN_MODIFIED" ]; then
      if [[ "$PLAN_MODIFIED" > "$LABEL_APPLIED" ]]; then
        echo "   ❌ FAIL: Plan modified AFTER approval"
        echo "      Approved:  $LABEL_APPLIED"
        echo "      Modified:  $PLAN_MODIFIED"
        FAILED=true
      else
        echo "   ✅ PASS: Plan has not been modified since approval"
      fi
    fi
  else
    echo "   ℹ️  INFO: Cannot verify modification timestamp"
  fi
  echo ""
fi

# Final verdict
echo "═══════════════════════════════════════════════════════"
if [ "$FAILED" = true ]; then
  echo "                 ❌ AUDIT FAILED"
  echo "═══════════════════════════════════════════════════════"
  echo ""
  echo "Execution blocked. Resolve failures before proceeding."
  exit 1
else
  echo "                 ✅ AUDIT PASSED"
  echo "═══════════════════════════════════════════════════════"
  echo ""
  echo "Plan integrity verified. Safe to execute."
  exit 0
fi
```

</details>

**Approval:** [ ] Approve  [ ] Reject  [ ] Modify

---

## Fix #2: Execute Command - Add Auto-Cleanup Safety Check

**File to modify:** `.claude/commands/execute.md`

**Location:** Step 0 (lines 112-139)

**What it does:** Prevents auto-cleanup from archiving the plan we're about to execute

**Current behavior:** Auto-cleanup runs BEFORE execution starts, might archive the plan we need

**New behavior:** Skip archiving the issue we're currently executing

<details>
<summary>View change (add 10 lines after line 118)</summary>

```markdown
## Step 0: Auto-Cleanup Stale Plans

Before starting execution, archive any plan folders for issues that have been closed.

```bash
echo "🧹 Checking for stale plans to archive..."

mkdir -p .claude/plans/archive/completed

# SAFETY: Store the issue we're executing to prevent archiving it
EXECUTING_ISSUE="$1"  # The argument passed to /execute

for dir in .claude/plans/issue-*/; do
  [ -d "$dir" ] || continue

  issue_num=$(basename "$dir" | grep -oE '[0-9]+' | head -1)

  # CRITICAL: Skip the issue we're currently executing
  if [ "$issue_num" = "$EXECUTING_ISSUE" ]; then
    echo "  ⏭️  Skipping $(basename "$dir") - currently executing this issue"
    continue
  fi

  if [ -n "$issue_num" ]; then
    state=$(gh issue view "$issue_num" --json state --jq '.state' 2>/dev/null || echo "UNKNOWN")

    if [ "$state" = "CLOSED" ]; then
      echo "  Archiving $(basename "$dir") (issue #$issue_num is closed)"
      mv "$dir" .claude/plans/archive/completed/
    fi
  fi
done

echo "✅ Stale plan cleanup complete"
```
```

</details>

**Why this matters:** Without this, if auto-cleanup runs at the wrong time, it can archive the plan before execution starts, leaving execute with no plan.

**Approval:** [ ] Approve  [ ] Reject  [ ] Modify

---

## Fix #3: Execute Command - Call Audit Script Before Step 1

**File to modify:** `.claude/commands/execute.md`

**Location:** New Step 0.5 (between Step 0 and Step 1)

**What it does:** Runs the integrity audit script before execution proceeds

**Dependencies:** Requires Fix #1 (audit script) to be implemented first

<details>
<summary>View change (add new section after Step 0)</summary>

```markdown
---

## Step 0.5: Run Plan Integrity Audit

**Run AFTER auto-cleanup, BEFORE argument parsing.**

```bash
echo "🔍 Running plan integrity audit..."

# Determine issue number from argument
if [[ "$1" =~ ^[0-9]+$ ]]; then
  AUDIT_ISSUE="$1"
elif [[ "$1" =~ issue-([0-9]+)- ]]; then
  AUDIT_ISSUE="${BASH_REMATCH[1]}"
else
  echo "⚠️  Cannot determine issue number for audit, skipping pre-flight check"
  AUDIT_ISSUE=""
fi

if [ -n "$AUDIT_ISSUE" ] && [ -f ".claude/scripts/audit-plan-integrity.sh" ]; then
  bash .claude/scripts/audit-plan-integrity.sh "$AUDIT_ISSUE"

  if [ $? -ne 0 ]; then
    echo "❌ Plan integrity audit failed"
    echo "Execution cannot proceed until issues are resolved."
    echo ""
    echo "See audit output above for details."
    exit 1
  fi

  echo "✅ Plan integrity audit passed"
else
  if [ -z "$AUDIT_ISSUE" ]; then
    echo "⚠️  WARNING: Could not determine issue number, skipping audit"
  else
    echo "⚠️  WARNING: Audit script not found at .claude/scripts/audit-plan-integrity.sh"
    echo "   Skipping plan integrity check (not recommended)"
  fi
fi
```

---
```

</details>

**Why this matters:** This is the MAIN prevention - catches all integrity violations before execution starts.

**Approval:** [ ] Approve  [ ] Reject  [ ] Modify

---

## Fix #4: Start-Issue Skill - Add Immutability Guard

**File to modify:** `.claude/skills/start-issue/SKILL.md`

**Location:** Process section, after "Fetch issue" step (around line 31)

**What it does:** Prevents creating new plans when `plan ready` label exists

**Current behavior:** Skill creates plans without checking if one was already approved

**New behavior:** FAIL with clear error if `plan ready` exists but plan folder missing

<details>
<summary>View change (insert after step 2)</summary>

```markdown
## Process

1. **Fetch issue**: `gh issue view [NUMBER] --json number,title,body,labels`

2. **Verify ready**: Check for `ready` or `plan ready` label

3. **CRITICAL: Validate Plan Ready State**

   ```bash
   LABELS=$(gh issue view "$ISSUE_NUM" --json labels --jq '.labels[].name')

   # If 'plan ready' label exists, plan folder MUST exist
   if echo "$LABELS" | grep -q "plan ready"; then
     echo "🔒 Issue has 'plan ready' label - validating approved plan exists..."

     PLAN_FOLDER=$(find .claude/plans -maxdepth 1 -type d -name "issue-${ISSUE_NUM}-*" 2>/dev/null | head -1)

     if [ -z "$PLAN_FOLDER" ]; then
       echo "❌ CRITICAL ERROR: Issue #$ISSUE_NUM has 'plan ready' label but plan folder not found"
       echo ""
       echo "Expected: .claude/plans/issue-${ISSUE_NUM}-*"
       echo ""
       echo "═══════════════════════════════════════════════════════"
       echo "                PLAN IMMUTABILITY VIOLATION"
       echo "═══════════════════════════════════════════════════════"
       echo ""
       echo "This indicates one of the following:"
       echo ""
       echo "  1. Plan was archived (check .claude/plans/archive/)"
       echo "  2. Plan was deleted from working directory"
       echo "  3. Label was added manually without creating plan"
       echo "  4. Git checkout issue - plan not pulled from remote"
       echo ""
       echo "CRITICAL RULE:"
       echo "  This skill will NEVER create a new plan when 'plan ready' exists."
       echo "  Plans are IMMUTABLE after approval."
       echo ""
       echo "To resolve:"
       echo ""
       echo "  Option A - Restore from archive:"
       echo "    find .claude/plans/archive -name 'issue-${ISSUE_NUM}-*'"
       echo "    mv [ARCHIVED_PATH] .claude/plans/"
       echo ""
       echo "  Option B - Restore from git:"
       echo "    git log --all --oneline -- '.claude/plans/issue-${ISSUE_NUM}-*'"
       echo "    git checkout [COMMIT] -- .claude/plans/issue-${ISSUE_NUM}-*/"
       echo ""
       echo "  Option C - Remove label if plan invalid:"
       echo "    gh issue edit ${ISSUE_NUM} --remove-label 'plan ready'"
       echo "    # Then regenerate plan with planning workflow"
       echo ""
       echo "Diagnostic commands:"
       echo "  gh issue view ${ISSUE_NUM} --json comments | grep 'Planning Complete'"
       echo "  git log --all -- '.claude/plans/issue-${ISSUE_NUM}-*'"
       echo ""
       echo "═══════════════════════════════════════════════════════"
       exit 1
     fi

     # Verify plan documents exist for tier
     TIER=$(echo "$LABELS" | grep -oE 'plan: (simple|medium|complex)' | cut -d' ' -f2)

     if [ "$TIER" = "medium" ] && [ ! -f "$PLAN_FOLDER/plan.md" ]; then
       echo "❌ ERROR: Medium tier plan folder exists but plan.md is missing"
       echo "   Folder: $PLAN_FOLDER"
       echo "   This indicates plan corruption or incomplete planning."
       exit 1
     fi

     if [ "$TIER" = "complex" ]; then
       MISSING=""
       [ ! -f "$PLAN_FOLDER/requirements.md" ] && MISSING="$MISSING requirements.md"
       [ ! -f "$PLAN_FOLDER/design.md" ] && MISSING="$MISSING design.md"
       [ ! -f "$PLAN_FOLDER/tasks.md" ] && MISSING="$MISSING tasks.md"

       if [ -n "$MISSING" ]; then
         echo "❌ ERROR: Complex tier plan incomplete"
         echo "   Folder: $PLAN_FOLDER"
         echo "   Missing:$MISSING"
         exit 1
       fi
     fi

     echo "✅ Plan folder validated: $PLAN_FOLDER"
   fi
   ```

4. **Check branch**: `git branch --list "issue/[N]-*"`
5. **Create branch**: `git checkout -b issue/[N]-[slug]`
6. **Load context**: Read plan documents if they exist
7. **Identify start**: Determine first file and action
8. **Report ready**: Summary of setup
```

</details>

**Why this matters:** This is the CRITICAL blocker - prevents the exact scenario that happened with issue #62.

**Approval:** [ ] Approve  [ ] Reject  [ ] Modify

---

## Fix #5: Add Plan Integrity Documentation

**Create new file:** `.claude/docs/plan-integrity.md`

**Purpose:** Document plan immutability rules and recovery procedures

**Contents:**
- Core principles
- Workflow states
- Immutability rules
- Violations and remediation
- Recovery procedures
- Testing checklist

**Size:** ~200 lines

**Approval:** [ ] Approve  [ ] Reject  [ ] Modify

(Full content available in investigation report if you want to review before approving)

---

## Fix #6: Create Orphaned Label Detector

**Create new file:** `.claude/scripts/detect-orphaned-plan-labels.sh`

**Purpose:** Scan all open issues for `plan ready` labels without plan folders

**When to run:**
- Manually: `./scripts/detect-orphaned-plan-labels.sh`
- Automatically: Weekly via GitHub Actions (optional)

<details>
<summary>View script (30 lines)</summary>

```bash
#!/bin/bash

echo "Scanning for orphaned 'plan ready' labels..."
echo ""

ORPHANS=()

# Get all open issues with 'plan ready' label
ISSUES=$(gh issue list --label "plan ready" --state open --json number --jq '.[].number')

for issue in $ISSUES; do
  # Check if plan folder exists
  PLAN_FOLDER=$(find .claude/plans -maxdepth 1 -type d -name "issue-${issue}-*" 2>/dev/null | head -1)

  if [ -z "$PLAN_FOLDER" ]; then
    ORPHANS+=("$issue")
    echo "⚠️  Issue #$issue: 'plan ready' label but no plan folder"

    # Check if archived
    ARCHIVED=$(find .claude/plans/archive -name "issue-${issue}-*" -type d 2>/dev/null | head -1)
    if [ -n "$ARCHIVED" ]; then
      echo "   📦 Found in archive: $ARCHIVED"
    fi

    echo ""
  fi
done

if [ ${#ORPHANS[@]} -eq 0 ]; then
  echo "✅ No orphaned 'plan ready' labels found"
else
  echo "⚠️  Found ${#ORPHANS[@]} orphaned label(s)"
  echo ""
  echo "To fix, either:"
  echo "  1. Restore plans from archive"
  echo "  2. Remove 'plan ready' labels: gh issue edit [NUM] --remove-label 'plan ready'"
fi
```

</details>

**Approval:** [ ] Approve  [ ] Reject  [ ] Modify

---

## Summary of Changes

| Fix # | Type | File(s) | Lines | Priority |
|-------|------|---------|-------|----------|
| 1 | Create | `.claude/scripts/audit-plan-integrity.sh` | 180 | CRITICAL |
| 2 | Modify | `.claude/commands/execute.md` | +10 | HIGH |
| 3 | Modify | `.claude/commands/execute.md` | +25 | CRITICAL |
| 4 | Modify | `.claude/skills/start-issue/SKILL.md` | +85 | CRITICAL |
| 5 | Create | `.claude/docs/plan-integrity.md` | 200 | MEDIUM |
| 6 | Create | `.claude/scripts/detect-orphaned-plan-labels.sh` | 30 | LOW |

**Total new files:** 3
**Total modified files:** 2
**Total lines added:** ~530

---

## Testing Plan

After implementing approved fixes:

1. **Test orphaned label detection:**
   - Add `plan ready` to issue without plan
   - Run audit script - should FAIL
   - Run execute - should BLOCK

2. **Test archived plan recovery:**
   - Archive a plan folder
   - Run execute - should detect and suggest restoration

3. **Test auto-cleanup safety:**
   - Run execute while auto-cleanup is scheduled
   - Verify plan being executed is NOT archived

4. **Test start-issue guard:**
   - Add `plan ready` to issue
   - Run start-issue - should VALIDATE, not CREATE

---

## Approval Decision

**Please review each fix and indicate your decision:**

- Fix #1 (Audit Script): ____________________
- Fix #2 (Auto-cleanup safety): ____________________
- Fix #3 (Call audit): ____________________
- Fix #4 (Start-issue guard): ____________________
- Fix #5 (Documentation): ____________________
- Fix #6 (Orphan detector): ____________________

**Options:**
- "Approve" - Implement as-is
- "Reject" - Do not implement
- "Modify: [your changes]" - Implement with modifications

**Or approve all at once:** "Approve all" / "Approve all except #X"

---

**Once you've reviewed, tell me which fixes to implement and I'll apply them immediately.**
