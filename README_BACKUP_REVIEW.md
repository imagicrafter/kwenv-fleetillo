# Backup Repo Review - Changes to Consider

**Date**: 2026-01-23
**Source**: fleetillo-backup repo (now deleted)
**Status**: Changes documented for future review

---

## Summary

This document captures improvements from the fleetillo-backup repository that were not applied to the main repo. Review and apply these changes as needed.

---

## 1. Documentation Updates

### A. `.claude/commands/prioritize.md`

**Change**: Improved output format with condensed ASCII table for terminal display

**Current Version**: Uses verbose markdown format with multiple sections
**Backup Version**: Uses compact ASCII table with emoji indicators

**Diff**:
```diff
-```markdown
-## Prioritization Results
+Provide a condensed ASCII table optimized for terminal display.

-### Recent Context
-[1-2 sentences on recent work]
-
-### Issues
-
-| Issue | Type | Tier | Dependencies | Status |
-|-------|------|------|--------------|--------|
-| #N - Title | bug | simple | None | Ready |
-| #N - Title | enhancement | medium | None | Ready |
-| #N - Title | enhancement | complex | #X | Blocked |
-
-### Recommendation
-
-**Next: #N - [Title]**
-
-Why:
-1. [Reason]
-2. [Reason]
-
-Plan: `.claude/plans/issue-N-slug/`
-
-### Alternatives
-- #N - [why this could be next]
-
-### Blocked
-- #N - waiting on #X
+```
+## 📊 Issue Prioritization (Condensed View)
+
+**Recent Context:** [1-2 sentences on recent work]
+
+READY TO START
+═══════════════════════════════════════════════════════════════════════════
+Rank  Issue  Title                                    Type   Tier    Score
+───────────────────────────────────────────────────────────────────────────
+⭐ 1  #N     [Title truncated to ~40 chars]           bug    simple  0/14
+  2   #N     [Title truncated to ~40 chars]           enh    medium  4/14
+  3   #N     [Title truncated to ~40 chars]           enh    complex 8/14
+
+BLOCKED
+═══════════════════════════════════════════════════════════════════════════
+      #N     [Title truncated to ~40 chars]           enh    complex 9/14   → needs #X
+      #N     [Title truncated to ~40 chars]           enh    medium  5/14   → needs #X
+
+**Legend:**
+- ⭐ = Recommended next
+- enh = enhancement, bug = bug fix, audit = security audit
+- Score = Complexity points (0-14 scale)
+
+**⭐ RECOMMENDATION: Issue #N - [Full Title]**
+[1-2 sentence rationale for top pick]
 ```
```

**Benefit**: Better terminal readability, more compact output

**Action**: Edit `.claude/commands/prioritize.md` Step 5 section

---

### B. `.claude/skills/plan-check/SKILL.md`

**Change**: Added critical "Merge to Main" step after planning completion

**Locations to Update**:

1. **Around line 156** - Add new step 5:
```diff
-4. **Finalize**
-   - Add `plan ready` label: `gh issue edit [NUMBER] --add-label "plan ready"`
-   - Post summary comment to the issue with plan highlights
+    - Add `plan ready` label: `gh issue edit [NUMBER] --add-label "plan ready"`
+    - Post summary comment to the issue with plan highlights
+
+5. **Merge to Main (CRITICAL)**
+    - If you created a feature branch or worktree:
+      - Commit all changes: `git commit -am "docs: plan for issue #[N]"`
+      - Checkout main: `git checkout main`
+      - Merge branch: `git merge [branch-name]`
+      - Push to origin: `git push origin main`
```

2. **Around line 319** - Update finalization steps:
```diff
 1. Add `plan ready` label: `gh issue edit [NUMBER] --add-label "plan ready"`
 2. Post summary comment to the issue
 3. Announce: "Planning complete for issue #[N]. All documents approved and 'plan ready' label added."
-4. Move to next complex issue (if any)
+4. **Merge to Main**:
+   - `git add .`
+   - `git commit -m "docs: complete planning for issue #[N]"`
+   - `git checkout main`
+   - `git merge [current-branch]`
+   - `git push origin main`
+5. Move to next complex issue (if any)
```

**Benefit**: Prevents orphaned planning branches, ensures plans are properly merged

**Action**: Edit `.claude/skills/plan-check/SKILL.md` at the two locations above

---

## 2. Settings Configuration - PreToolUse Hooks

### `.claude/settings.local.json`

**Change**: Add PreToolUse hooks for damage control and workflow enforcement

**Current State**: Has PostToolUse hooks only
**Backup State**: Has both PreToolUse and PostToolUse hooks

**Add to settings.local.json** after line 55 (after the permissions.allow array):

```json
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "~/.bun/bin/bun run ~/.claude/hooks/damage-control/bash-tool-damage-control.ts",
            "timeout": 5
          },
          {
            "type": "command",
            "command": "~/.claude/hooks/workflow-enforcement/enforce-open-issue.sh",
            "timeout": 5
          }
        ]
      },
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "~/.bun/bin/bun run ~/.claude/hooks/damage-control/edit-tool-damage-control.ts",
            "timeout": 5
          }
        ]
      },
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "~/.bun/bin/bun run ~/.claude/hooks/damage-control/write-tool-damage-control.ts",
            "timeout": 5
          }
        ]
      }
    ],
```

**Prerequisites**:
- Hooks exist in `~/.claude/hooks/damage-control/`
- Hooks exist in `~/.claude/hooks/workflow-enforcement/`
- Both verified as present on system

**Benefit**:
- Proactive damage control before tool execution
- Workflow enforcement for open issues
- Catches issues before they happen vs after

**Action**: Edit `.claude/settings.local.json` to add PreToolUse section

---

## 3. Settings Configuration - Bun Permission

### `.claude/settings.local.json`

**Change**: Add bun runtime permission to allowed commands

**Add to permissions.allow array** (after line 51):

```json
      "Skill(spawn-cmd)",
      "Bash(~/.bun/bin/bun run:*)"
```

**Benefit**: Allows Claude to run bun commands for damage-control hooks and other bun-based tooling

**Action**: Edit `.claude/settings.local.json` permissions section

---

## Files Not Requiring Migration

### Structural Differences (Keep Main Repo Structure)
- `.agent/` directory uses symlinks in main repo (cleaner approach)
- Backup had actual files/directories (no functional benefit)

### Deleted Plan Files (Already Archived)
Both repos deleted these (likely archived):
- issue-14-clients-to-customers/plan.md
- issue-16-location-forms-metadata/plan.md
- issue-21-refactor-frontend-to-remove-electron-dependency/
- issue-27-consolidate-public/plan.md
- issue-41-tags-ui/plan.md (backup only)
- issue-63-enhance-claude-workflow/plan.md (backup only)

### Security Items (Already Resolved)
- ✅ bundle.env already in .gitignore (main repo)
- ✅ bundle.env never tracked in main repo git history
- ✅ Secrets rotated per user confirmation

---

## Backup Repo Commit History (For Reference)

Last unique commit in backup:
- `b0907e2` - Remove bundle.env from tracking

Both repos share common history after that point.

---

## Next Steps

1. Review this document when ready to apply improvements
2. Apply changes selectively based on current workflow needs
3. Test PreToolUse hooks before committing (they run before every tool use)
4. Consider if condensed output format fits your terminal workflow

---

**Backup Repository**: Deleted on 2026-01-23
**Location**: Was at `/Users/justinmartin/github/fleetillo-backup`
