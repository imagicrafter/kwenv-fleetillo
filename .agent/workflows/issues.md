---
description: Workflow for managing GitHub issues
---

# GitHub Issue Workflow

Use this workflow to effectively manage tasks via GitHub.

## 1. List Issues
// turbo
```bash
gh issue list --json number,title,labels
```
See current open tasks.

## 2. Select or Create Issue
- If an issue matches the user's request, select it.
- If not, create one:
  ```bash
  gh issue create --title "Task Title" --body "Description"
  ```

## 3. Start Working
- Create a branch for the issue:
  ```bash
  git checkout -b issue/[number]-[short-kebab-cased-description]
  ```
- Comment on the issue that you are starting work:
  ```bash
  gh issue comment [number] --body "Starting work on this issue. Branch: issue/[number]-..."
  ```
- Mark the issue as in-progress in `task.md`.

## 4. Execute & Verify
- Perform the necessary code changes.
- Run tests and verification steps.

## 5. Update Changelog
Before merging, generate a changelog entry from the branch commits:
// turbo
```bash
git log main..HEAD --oneline
```
Use this output to update `CHANGELOG.md` with a new entry:
```markdown
## [YYYY-MM-DD] - Issue #N: Short Description

### Added
- [commit summary 1]

### Changed
- [commit summary 2]

### Fixed
- [commit summary 3]
```

## 6. Merge & Close
- Switch to main and merge:
  ```bash
  git checkout main
  git merge issue/[number]-...
  git push origin main
  ```
- Close the issue:
  ```bash
  gh issue close [number] --comment "Completed. Merged into main. See CHANGELOG.md for details."
  ```
- Delete the local branch:
  // turbo
  ```bash
  git branch -d issue/[number]-...
  ```
- Mark the issue as completed in `task.md`.
