---
name: start-issue
description: Set up the working environment to begin implementing a GitHub issue. Use this skill when ready to start implementation on an issue, when you need to create a feature branch and load context, or when an orchestrator assigns an issue for implementation. Creates the branch, loads plan documents if they exist, and identifies the starting point for work.
allowed-tools:
  - Bash(gh:*)
  - Bash(git checkout:*)
  - Bash(git branch:*)
  - Bash(ls:*)
  - Read
  - Glob
  - Grep
---

# Start Issue

Set up working environment for issue implementation.

## Prerequisites

Issue should have one of:
- `ready` - Simple, proceed directly
- `plan ready` - Planning complete

If `plan: medium` or `plan: complex`: Use generate-plan skill first.
If no labels: Use triage-issue skill first.

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

## Branch Naming

```
issue/[NUMBER]-[slug]

Examples:
- issue/5-dispatch-job-modal
- issue/3-vehicle-geofencing
- issue/6-fix-icon-alignment
```

Slug: kebab-case from issue title (3-4 words).

## Loading Plan Context

For issues with `plan ready` label:

```bash
ls .claude/plans/issue-[N]-*/
```

Read all plan documents and summarize:
- Key requirements
- Technical approach
- Task list

## Ready Report Format

```
## Ready to Implement: #[NUMBER]

**Issue:** [title]
**Branch:** `issue/[N]-[slug]`
**Complexity:** [Simple | Medium | Complex]

### Context Loaded
- [x] Issue details
- [x] Plan documents (if applicable)
- [x] Affected files identified

### Plan Summary (if applicable)
[Key points from plan]

### Tasks
- [ ] [First task]
- [ ] [Second task]
- [ ] [Third task]

### Starting Point
Begin with: `[file path]`
First action: [what to do]

### Commands Reference
- Build: `npm run build`
- Test: `npm test`
- Dev: `npm run dev`

Ready to implement!
```

## Output Format

```json
{
  "issue": 5,
  "title": "Issue title",
  "branch": "issue/5-dispatch-job",
  "tier": "medium",
  "plan_directory": ".claude/plans/issue-5-dispatch-job/",
  "tasks": ["Add modal markup", "Create API endpoints"],
  "starting_file": "src/routes/dispatch.ts",
  "status": "ready"
}
```

## Error Handling

| Condition | Action |
|-----------|--------|
| Not triaged | Use triage-issue first |
| Needs plan | Use generate-plan first |
| Plan ready but folder missing | FAIL - Never create plan when 'plan ready' exists. Restore from archive/git or remove label |
| Plan folder exists but documents missing | FAIL - Plan corruption detected. Restore from git or regenerate |
| Branch exists | Ask: use existing or create new |
| Dirty working directory | Suggest `git stash` |
