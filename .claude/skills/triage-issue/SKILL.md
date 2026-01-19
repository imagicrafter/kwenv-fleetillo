---
name: triage-issue
description: Analyze a GitHub issue to determine its complexity tier and apply the appropriate labels. Use this skill when encountering an issue that lacks triage labels (plan: simple, plan: medium, plan: complex), when an orchestrator requests issue triage, or when determining the complexity of work before starting implementation. This skill scores issues against 7 complexity factors and applies labels automatically.
allowed-tools:
  - Bash(gh:*)
  - Read
  - Glob
  - Grep
---

# Triage Issue

Analyze a GitHub issue, score its complexity, apply the appropriate labels, and post an assessment comment.

## Complexity Scoring

Score each factor 0-2 points:

| Factor | 0 pts | 1 pt | 2 pts |
|--------|-------|------|-------|
| Files affected | 1-2 | 3-5 | 6+ |
| Architecture | None needed | Minor choices | Major decisions |
| Database | None | Add column | New tables |
| API changes | None | Modify existing | New endpoints |
| External integration | None | Use existing | New service |
| Security | None | Validation | Auth/data protection |
| Requirements clarity | Clear | Some flexibility | Vague/evolving |

## Tier Determination

| Score | Tier | Labels | Next Step |
|-------|------|--------|-----------|
| 0-2 | Simple | `plan: simple` + `plan ready` | Implement directly |
| 3-6 | Medium | `plan: medium` | Create plan.md, then add `plan ready` |
| 7+ | Complex | `plan: complex` | Create full docs, then add `plan ready` |

## Process

1. **Fetch issue**: `gh issue view [NUMBER] --json number,title,body,labels`
2. **Check if triaged**: Skip if has `plan: simple`, `plan: medium`, `plan: complex`, or `plan ready`
3. **Search codebase**: Identify affected files and scope
4. **Score complexity**: Evaluate each factor
5. **Apply labels**:
   - Simple: `gh issue edit [NUMBER] --add-label "plan: simple" --add-label "plan ready"`
   - Medium: `gh issue edit [NUMBER] --add-label "plan: medium"`
   - Complex: `gh issue edit [NUMBER] --add-label "plan: complex"`
6. **Post comment**: Assessment table with scoring rationale

## Comment Template

```
gh issue comment [NUMBER] --body "## Issue Triage

**Complexity:** [Simple | Medium | Complex]
**Score:** [X] points
**Label applied:** \`[label]\`

### Assessment

| Factor | Score | Notes |
|--------|-------|-------|
| Files affected | X | [files identified] |
| Architecture | X | [decisions needed] |
| Database | X | [schema changes] |
| API changes | X | [endpoints affected] |
| External integration | X | [services involved] |
| Security | X | [considerations] |
| Requirements clarity | X | [how clear] |
| **Total** | **X** | |

### Affected Areas
- [area 1]
- [area 2]

### Next Steps
[Based on tier]

---
*Automated triage*"
```

## Output Format

Return structured JSON for orchestrator consumption:

```json
{
  "issue": 5,
  "title": "Issue title",
  "tier": "simple|medium|complex",
  "score": 4,
  "label": "plan: medium",
  "affected_files": ["file1.ts", "file2.ts"],
  "next_action": "implement|create_plan|create_full_docs"
}
```
