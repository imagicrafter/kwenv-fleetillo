---
description: Unified workflow for GitHub issues - from selection to implementation planning
---
# Issue Workflow: Context to Implementation

This workflow covers the complete process from selecting a GitHub issue to having an approved implementation plan. It works across all AI tools (Claude Code CLI, Cursor, Gemini CLI, etc.).

---

## Phase 1: Issue Selection & Setup

### 1.1 Check Current State
```bash
git status && git branch
```
Ensure you're on the correct branch. If starting fresh, you should be on `main`.

### 1.2 Sync with Remote
```bash
git pull origin main
```

### 1.3 List Open Issues
```bash
gh issue list --state open --json number,title,labels
```

### 1.4 Select or Create Issue
- If an existing issue matches the task, note its number
- If not, create one:
  ```bash
  gh issue create --title "Task Title" --body "Description"
  ```

### 1.5 Read Issue Details
```bash
gh issue view [ISSUE_NUMBER]
```
Understand the full scope. **If the issue lacks sufficient detail, ask the user clarifying questions before proceeding.**

### 1.6 Create Issue Branch
```bash
git checkout -b issue/[ISSUE_NUMBER]-[short-kebab-description]
```
**CRITICAL**: Never commit directly to `main` for issue work.

### 1.7 Log Start of Work
```bash
gh issue comment [ISSUE_NUMBER] --body "Starting work on this issue. Branch: issue/[ISSUE_NUMBER]-[description]"
```

---

## Phase 2: Context Gathering

### 2.1 Load Project Context
Read these files to understand the project:
- `README.md` - Project overview
- `package.json` - Dependencies and scripts
- `.cursorrules` - Agent rules and workflows
- `.claude/commands/prime.md` - Project-specific context (if exists)

### 2.2 Review Recent Changes
```bash
git log --oneline -10
```
Understand recent work to avoid conflicts.

### 2.3 Identify Relevant Code
Search for files related to the issue keywords:
- Use grep/search for terms mentioned in the issue
- Locate existing patterns you should follow
- Identify files that will need modification

---

## Phase 3: Implementation Planning

### 3.1 For Simple Issues
If the issue is straightforward (single file, obvious change):
- Skip formal planning
- Proceed directly to implementation

### 3.2 For Complex Issues
Create an implementation plan before coding.

**Claude Code CLI**: Use plan mode (Claude will automatically explore and create a plan in `.claude/plans/`)

**Other AI Tools (Cursor, Gemini, etc.)**: Create the plan manually:

```bash
# Create plan file linked to issue
cat > .claude/plans/issue-[NUMBER]-plan.md << 'EOF'
# Implementation Plan: Issue #[NUMBER] - [Title]

## Overview
[Brief description of what needs to be done]

## Files to Modify
- [ ] `path/to/file1.ts` - [what changes]
- [ ] `path/to/file2.ts` - [what changes]

## Implementation Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Testing Strategy
- [ ] [Test 1]
- [ ] [Test 2]

## Risks & Considerations
- [Any potential issues to watch for]
EOF
```

### 3.3 Post Plan to Issue
```bash
gh issue comment [ISSUE_NUMBER] --body-file .claude/plans/issue-[NUMBER]-plan.md
```

### 3.4 Review Plan (Optional)
If you have external review tools:
```bash
# Gemini CLI review
cat .claude/plans/issue-[NUMBER]-plan.md | gemini "Review this implementation plan for issues and improvements"

# Post review to issue
gh issue comment [ISSUE_NUMBER] --body "## Plan Review\n\n[review output]"
```

---

## Phase 4: Execution

### 4.1 Implement Changes
Follow the plan step by step. After each significant change:
```bash
git add -A && git commit -m "#[ISSUE_NUMBER]: [description of change]"
```

### 4.2 Run Tests
```bash
npm test
npm run build
```

### 4.3 Log Progress (for long tasks)
```bash
gh issue comment [ISSUE_NUMBER] --body "Progress update: [what's done, what's remaining]"
```

---

## Phase 5: Completion

### 5.1 Final Verification
- All tests pass
- Build succeeds
- Changes match the plan/issue requirements

### 5.2 Update Changelog
```bash
git log main..HEAD --oneline
```
Add entry to `CHANGELOG.md`:
```markdown
## [YYYY-MM-DD] - Issue #N: Short Description

### Added/Changed/Fixed
- [commit summaries]
```

### 5.3 Merge to Main
```bash
git checkout main
git merge issue/[ISSUE_NUMBER]-[description]
git push origin main
```

### 5.4 Close Issue
```bash
gh issue close [ISSUE_NUMBER] --comment "Completed. Merged into main. See CHANGELOG.md for details."
```

### 5.5 Cleanup
```bash
git branch -d issue/[ISSUE_NUMBER]-[description]
```

---

## Quick Reference

| Phase | Key Actions |
|-------|-------------|
| **Setup** | `gh issue list` → `gh issue view N` → `git checkout -b issue/N-desc` |
| **Context** | Read README, search codebase, review git log |
| **Planning** | Create plan in `.claude/plans/`, post to issue |
| **Execute** | Implement, commit with `#N:`, test |
| **Complete** | Update CHANGELOG, merge, close issue |

---

## Tool-Specific Notes

### Claude Code CLI (Terminal/VSCode)
- Plan mode automatically explores codebase and writes to `.claude/plans/`
- PostToolUse hooks auto-archive plans and post to GitHub issues
- Use "clear context" option after planning for complex implementations

### Google Antigravity
- Use **Editor View** for hands-on coding with AI assistance
- Use **Manager Surface** to spawn agents for background tasks
- Agents produce **Artifacts** (plans, screenshots) - save plans to `.claude/plans/issue-N-plan.md`
- Works with Gemini 3 Pro, Claude Sonnet 4.5, or GPT-OSS
- Use `gh issue comment` to post plans/updates to GitHub

### Cursor / Other AI Tools
- Manually create plans in `.claude/plans/issue-N-plan.md`
- Use `gh issue comment` to post plans/updates
- Reference archived plans: `grep -r "keyword" .claude/plans/archive/`

### Cross-Tool Consistency
- All plans stored in `.claude/plans/` (shared location)
- All progress logged via `gh issue comment`
- Branch naming: `issue/N-description`
- Commit prefix: `#N: message`
