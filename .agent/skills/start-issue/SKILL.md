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
3. **Check branch**: `git branch --list "issue/[N]-*"`
4. **Create branch**: `git checkout -b issue/[N]-[slug]`
5. **Load context**: Read plan documents if they exist
6. **Identify start**: Determine first file and action
7. **Report ready**: Summary of setup

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
| Branch exists | Ask: use existing or create new |
| Dirty working directory | Suggest `git stash` |
