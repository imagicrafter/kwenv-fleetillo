---
description: Quick reference for GitHub issue management (see context-gathering.md for full workflow)
---
# GitHub Issue Quick Reference

For the complete workflow, see **`.agent/workflows/context-gathering.md`**.

## Common Commands

```bash
# List open issues
gh issue list --state open --json number,title,labels

# View issue details
gh issue view [NUMBER]

# Create new issue
gh issue create --title "Title" --body "Description"

# Create issue branch
git checkout -b issue/[NUMBER]-[short-description]

# Log progress
gh issue comment [NUMBER] --body "Progress update..."

# Close issue
gh issue close [NUMBER] --comment "Completed. See CHANGELOG.md"
```

## Branch Naming
```
issue/[NUMBER]-[short-kebab-description]
```
Examples: `issue/42-add-driver-api`, `issue/15-fix-booking-bug`

## Commit Messages
```
#[NUMBER]: [description]
```
Examples: `#42: Add driver status endpoint`, `#15: Fix null check in booking service`

## Plan Location
All implementation plans: `.claude/plans/`
Archived plans: `.claude/plans/archive/YYYY-MM-DD/`
