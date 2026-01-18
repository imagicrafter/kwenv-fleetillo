---
description: Workflow for managing GitHub issues
---

# GitHub Issue Workflow

Use this workflow to effectively manage tasks via GitHub.

1. **List Issues**
   Run `gh issue list --json number,title,labels` to see current open tasks.

2. **Select or Create**
   - If an issue matches the user's request, select it.
   - If not, create one: `gh issue create --title "Task Title" --body "Description"`

3. **Start Working**
   - Pick an issue to work on.
   - Create a branch for the issue:
     ```bash
     git checkout -b issue/[number]-[short-kebab-cased-description]
     ```
   - Comment on the issue that you are starting work:
     ```bash
     gh issue comment [number] --body "Starting work on this issue. Branch: issue/[number]-..."
     ```
   - Mark the issue as in-progress in `task.md`.he necessary code changes.
   - **Verify**: Run tests.

4. **Close**
   - Once verified, close the issue: `gh issue close <ISSUE_NUMBER>`
