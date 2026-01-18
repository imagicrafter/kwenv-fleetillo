---
description: Workflow to gather context before working on a GitHub issue
---
# Issue Context Gathering Workflow

This workflow ensures you have full context before implementing any changes for a GitHub issue. Run these steps at the start of each new session.

## 1. Check Current Branch & Status
// turbo
```bash
git status && git branch
```
Ensure you are on the correct branch. If starting fresh, you should be on `main`.

## 2. Sync with Remote
// turbo
```bash
git pull origin main
```
Ensures you have the latest code.

## 3. List Open Issues
// turbo
```bash
gh issue list --state open
```
Identify the issues that need work.

## 4. Read Target Issue Details
```bash
gh issue view [ISSUE_NUMBER]
```
Understand the full scope and requirements of the issue you will work on.

## 5. Create Issue Branch
```bash
git checkout -b issue/[ISSUE_NUMBER]-[short-description]
```
**CRITICAL**: Never commit directly to `main` for issue work.

## 6. Comment on Issue to Log Progress
```bash
gh issue comment [ISSUE_NUMBER] --body "Starting work on this issue. Branch: issue/[ISSUE_NUMBER]-..."
```

## 7. Load Project Context Files
Use `view_file` on these key context files:
- `.yokeflow/context/*.md` (if exists) - Project-specific context.
- `README.md` - Project overview.
- `package.json` - Dependencies and scripts.
- `.cursorrules` (if exists) - Agent-specific rules.

## 8. Identify Relevant Code Areas
Use `grep_search` or `find_by_name` to locate files related to the issue keywords.

**Example:**
- If the issue mentions "booking", search for `booking` in the codebase.
- If the issue mentions a UI page like "dashboard", find `dashboard.html` or similar.

## 9. Review Codebase Structure
Use `list_dir` on key directories to understand the layout:
- `src/services/` - Backend logic.
- `src/types/` - Type definitions.
- `web-launcher/public/` - Frontend UI files.

## 10. Review Recent Changes (Optional)
// turbo
```bash
git log --oneline -10
```
Understand recent commits to avoid conflicts or redundant work.

---

## After Context Gathering

Once context is gathered:
1.  Update `task.md` with the issue and mark it `[/]` (in progress).
2.  Create an `implementation_plan.md` if the issue is complex.
3.  Proceed to EXECUTION.
