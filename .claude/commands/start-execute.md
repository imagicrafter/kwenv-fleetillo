---
name: start-execute
description: Combined workflow - sets up environment and executes implementation for a GitHub issue in one command. Calls start-issue skill to create branch and load context, then calls execute skill to implement.
argument-hint: <issue-number>
allowed-tools:
  - Skill
  - Bash(gh:*)
  - Read
  - Grep
  - Glob
---

# Start and Execute Issue

Combined workflow that sets up the working environment and executes implementation for a GitHub issue in a single command.

## Overview

This command orchestrates two skills in sequence:
1. **start-issue** - Creates feature branch, validates plan readiness, loads context
2. **execute** - Implements the issue according to its complexity tier

## Prerequisites

Issue must have one of:
- `ready` label - Simple tier, can proceed directly
- `plan ready` label - Planning complete, ready for implementation

If the issue lacks these labels, run the appropriate workflow first:
- No labels → Use `/issue-triage` first
- `plan: medium` or `plan: complex` without `plan ready` → Use planning workflow first

## Process

### Step 1: Argument Validation

Parse the issue number from the argument.

```bash
ISSUE_NUMBER="$1"

if [ -z "$ISSUE_NUMBER" ]; then
  echo "ERROR: Issue number required"
  echo "Usage: /start-execute <issue-number>"
  exit 1
fi

if ! [[ "$ISSUE_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "ERROR: Issue number must be numeric"
  echo "Got: $ISSUE_NUMBER"
  exit 1
fi

echo "🎫 Issue: #$ISSUE_NUMBER"
```

---

### Step 2: Verify Issue Status

**CRITICAL: Check if issue is open before proceeding.**

```bash
echo "🔍 Verifying issue status..."

# Check if issue is open
ISSUE_STATE=$(gh issue view "$ISSUE_NUMBER" --json state --jq '.state')

if [ "$ISSUE_STATE" = "CLOSED" ]; then
  echo "❌ ERROR: Issue #$ISSUE_NUMBER is already closed"
  echo ""

  # Check if there's a merged PR
  MERGED_PR=$(gh pr list --search "issue #$ISSUE_NUMBER" --state merged --json number,title,mergedAt --jq '.[0]')

  if [ -n "$MERGED_PR" ]; then
    PR_NUMBER=$(echo "$MERGED_PR" | jq -r '.number')
    PR_TITLE=$(echo "$MERGED_PR" | jq -r '.title')
    MERGED_AT=$(echo "$MERGED_PR" | jq -r '.mergedAt')

    echo "This issue was already implemented and merged:"
    echo "  PR #$PR_NUMBER: $PR_TITLE"
    echo "  Merged: $MERGED_AT"
  fi

  echo ""
  echo "Use 'gh issue list --state open' to see open issues"
  exit 1
fi

echo "✅ Issue is open"

# Check labels
LABELS=$(gh issue view "$ISSUE_NUMBER" --json labels --jq '.labels[].name')

if [ -z "$LABELS" ]; then
  echo "❌ ERROR: Issue #$ISSUE_NUMBER has no labels"
  echo ""
  echo "This issue has not been triaged yet."
  echo "Run: /issue-triage $ISSUE_NUMBER"
  exit 1
fi

HAS_READY=$(echo "$LABELS" | grep -c "^ready$" || true)
HAS_PLAN_READY=$(echo "$LABELS" | grep -c "^plan ready$" || true)

if [ "$HAS_READY" -eq 0 ] && [ "$HAS_PLAN_READY" -eq 0 ]; then
  echo "❌ ERROR: Issue #$ISSUE_NUMBER is not ready for implementation"
  echo ""
  echo "Current labels:"
  echo "$LABELS" | sed 's/^/  - /'
  echo ""
  echo "Issue needs either:"
  echo "  - 'ready' label (simple tier)"
  echo "  - 'plan ready' label (medium/complex tier)"
  echo ""

  # Check if planning is needed
  NEEDS_PLAN=$(echo "$LABELS" | grep -c "plan: medium\|plan: complex" || true)
  if [ "$NEEDS_PLAN" -gt 0 ]; then
    echo "This issue requires planning. Run the planning workflow first."
  else
    echo "Run: /issue-triage $ISSUE_NUMBER"
  fi
  exit 1
fi

echo "✅ Issue is ready for implementation"
```

---

### Step 3: Execute start-issue Skill

Use the Skill tool to invoke start-issue, which will:
- Create feature branch (`issue/N-slug`)
- Validate plan folder exists (if `plan ready` label present)
- Load plan documents and context
- Report ready state

**Invoke the skill:**

```
Use Skill tool with:
  skill: "start-issue"
  args: "$ISSUE_NUMBER"
```

**Expected output from start-issue:**
- Branch created: `issue/N-slug`
- Plan folder validated (if applicable)
- Context loaded (plan documents, affected files)
- Starting point identified
- Ready report displayed

**Checkpoint:**

```bash
# Verify branch was created
CURRENT_BRANCH=$(git branch --show-current)

if [[ ! "$CURRENT_BRANCH" =~ ^issue/$ISSUE_NUMBER- ]]; then
  echo "❌ ERROR: Branch creation failed"
  echo "Expected branch: issue/$ISSUE_NUMBER-*"
  echo "Current branch: $CURRENT_BRANCH"
  exit 1
fi

echo "✅ Environment setup complete"
echo "📍 Branch: $CURRENT_BRANCH"
```

---

### Step 4: Execute Implementation

Use the Skill tool to invoke execute, which will:
- Detect complexity tier (simple/medium/complex)
- Spawn appropriate sub-agents based on tier
- Implement the issue following the plan
- Run comprehensive validation (tests, lint, type check, build)
- Create commit and push to remote
- Create pull request

**Invoke the skill:**

```
Use Skill tool with:
  skill: "execute"
  args: "$ISSUE_NUMBER"
```

**Expected output from execute:**
- Implementation complete
- All validations passed
- Commit created with proper attribution
- PR created and linked to issue
- PR URL displayed

---

### Step 5: Final Report

Display a summary of the completed workflow.

```bash
echo ""
echo "════════════════════════════════════════════════════════"
echo "                  WORKFLOW COMPLETE"
echo "════════════════════════════════════════════════════════"
echo ""
echo "✅ Issue #$ISSUE_NUMBER implemented successfully"
echo ""
echo "📍 Branch: $CURRENT_BRANCH"
echo "🔗 PR: [URL from execute output]"
echo ""
echo "Next steps:"
echo "  1. Review the PR"
echo "  2. Wait for CI checks to pass"
echo "  3. Request review from team member"
echo "  4. Merge when approved"
echo ""
echo "════════════════════════════════════════════════════════"
```

---

## Error Handling

| Condition | Action |
|-----------|--------|
| No issue number provided | Display usage and exit |
| Issue number not numeric | Display error and exit |
| **Issue is closed** | **Display error with merged PR info if available, exit** |
| Issue not triaged | Direct user to run `/issue-triage` |
| Issue needs planning | Direct user to planning workflow |
| Issue lacks ready/plan ready label | Display current labels and requirements |
| start-issue fails | Display error, stop workflow |
| Branch creation fails | Display error, stop workflow |
| execute fails | Error already handled by execute skill |
| Dirty working directory | start-issue will handle this |

---

## Usage Examples

**Simple tier issue:**
```bash
/start-execute 42
```

**Medium tier issue (with plan):**
```bash
/start-execute 15
```

**Complex tier issue (with plan):**
```bash
/start-execute 3
```

---

## Success Criteria

The command succeeds when:
- [ ] Issue number validated as numeric
- [ ] Issue verified as open (not closed)
- [ ] Issue has `ready` or `plan ready` label
- [ ] start-issue skill completes successfully
- [ ] Feature branch created with correct naming
- [ ] Plan documents loaded (if applicable)
- [ ] execute skill completes successfully
- [ ] Implementation passes all validations
- [ ] Commit created and pushed
- [ ] Pull request created and linked
- [ ] Final report displayed with PR URL

---

## Notes

**Why combine these commands?**
- Reduces manual steps for developers
- Ensures correct sequence (setup → implement)
- Provides single entry point for issue implementation
- Maintains separation of concerns (skills remain independent)

**When not to use this command:**
- If you want to set up the environment but implement manually → Use `/start-issue` alone
- If the branch already exists and you just want to execute → Use `/execute` alone
- If you want more control over the process → Run skills separately

**Skill invocation pattern:**
This command uses the Skill tool to invoke other skills, maintaining the skill-based architecture while providing a convenient combined workflow.
