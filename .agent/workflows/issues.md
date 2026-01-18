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

3. **Work Cycle**
   - **Start**: Comment on the issue: "Starting work..."
   - **Plan**: Update `task.md` with the issue details.
   - **Execute**: Perform the necessary code changes.
   - **Verify**: Run tests.

4. **Close**
   - Once verified, close the issue: `gh issue close <ISSUE_NUMBER>`
