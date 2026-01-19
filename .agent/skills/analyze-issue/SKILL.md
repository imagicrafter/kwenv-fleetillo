---
name: analyze-issue
description: Perform read-only analysis of a GitHub issue to understand its scope, complexity, and affected areas without modifying labels or posting comments. Use this skill when you need to understand an issue before deciding how to proceed, when exploring whether to work on an issue, when you want to assess complexity without making changes, or when gathering context about issue requirements and impact.
allowed-tools:
  - Bash(gh:*)
  - Read
  - Glob
  - Grep
---

# Analyze Issue

Read-only analysis of a GitHub issue. Does NOT modify labels or post comments.

## When to Use

- Understanding an issue before deciding next steps
- Exploring potential impact of a change
- Gathering context without side effects
- Assessing if issue is ready to work on

## Process

1. **Fetch issue**: `gh issue view [NUMBER] --json number,title,body,labels,comments,state`
2. **Check status**: Report current labels and state
3. **Search codebase**: Identify affected files
4. **Assess complexity**: Score factors (informational only)
5. **Report findings**: Return comprehensive analysis

## Complexity Factors

| Factor | 0 pts | 1 pt | 2 pts |
|--------|-------|------|-------|
| Files affected | 1-2 | 3-5 | 6+ |
| Architecture | None | Minor | Major |
| Database | None | Column | Tables |
| API changes | None | Modify | New |
| External integration | None | Existing | New |
| Security | None | Validation | Auth |
| Requirements clarity | Clear | Flexible | Vague |

## Analysis Report Format

```
## Issue Analysis: #[NUMBER]

**Title:** [title]
**State:** [open/closed]
**Current Labels:** [labels or "none"]

### Summary
[What this issue is asking for]

### Complexity Assessment

| Factor | Score | Notes |
|--------|-------|-------|
| Files affected | X | [files] |
| Architecture | X | [decisions] |
| Database | X | [changes] |
| API changes | X | [endpoints] |
| External integration | X | [services] |
| Security | X | [considerations] |
| Requirements clarity | X | [clarity] |
| **Total** | **X** | |

### Recommended Tier: [Simple | Medium | Complex]

### Affected Areas
- `path/file1.ts` - [what changes]
- `path/file2.ts` - [what changes]

### Dependencies
- [What this depends on]
- [What depends on this]

### Open Questions
- [Ambiguity or unclear requirement]

### Suggested Approach
[High-level approach]
```

## Output Format

```json
{
  "issue": 5,
  "title": "Issue title",
  "state": "open",
  "current_labels": ["bug"],
  "recommended_tier": "medium",
  "score": 4,
  "affected_files": ["file1.ts", "file2.ts"],
  "has_triage_label": false,
  "needs_triage": true,
  "open_questions": ["What format should output use?"]
}
```

## Key Difference from triage-issue

| analyze-issue | triage-issue |
|--------------|--------------|
| Read-only | Modifies labels |
| No GitHub comments | Posts assessment |
| Informational | Takes action |
| Exploration | Decisioning |
