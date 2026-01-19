---
name: validate-plan
description: Check planning documents against templates and quality standards. Use this skill after generating plan documents to verify quality, before starting implementation to ensure the plan is complete, when reviewing existing plans for gaps, or when an orchestrator needs to verify plan quality before proceeding. Returns pass/warn/fail status without modifying files.
allowed-tools:
  - Bash(ls:*)
  - Bash(git branch:*)
  - Read
  - Glob
  - Grep
---

# Validate Plan

Check planning documents against templates and quality standards. Read-only.

## Process

1. **Locate plans**: Find plan directory for issue
2. **Determine type**: Medium (plan.md) or Complex (three docs)
3. **Check sections**: Verify required content using checklists below
4. **Report results**: Pass/Warn/Fail with details

## Locating Plans

By issue number:
```bash
ls .claude/plans/issue-[N]-*/
```

By current branch:
```bash
git branch --show-current  # issue/N-description
```

## Medium Tier Checklist (plan.md)

- [ ] Summary (2-3 sentences)
- [ ] Requirements (bullet list)
- [ ] Approach (technical description)
- [ ] Key Decisions (numbered, with rationale)
- [ ] Files to Modify (table)
- [ ] Files to Create (if applicable)
- [ ] Database Changes (section)
- [ ] Tasks (checklist)
- [ ] Testing Strategy
- [ ] Risks (at least one)

Quality checks:
- [ ] Tasks are specific and actionable
- [ ] Files identified exist (for modifications)
- [ ] Approach references codebase patterns

## Complex Tier Checklist

### requirements.md
- [ ] Introduction (2-3 paragraphs)
- [ ] Glossary (if domain terms used)
- [ ] At least 2 requirements
- [ ] Each has user story
- [ ] Each has acceptance criteria
- [ ] WHEN/THEN/SHALL format

### design.md
- [ ] Overview with key decisions
- [ ] Architecture diagram (Mermaid)
- [ ] Request flow (if API)
- [ ] Component interfaces
- [ ] Data models
- [ ] API contracts (if applicable)
- [ ] Error handling
- [ ] Testing strategy

### tasks.md
- [ ] Overview section
- [ ] Hierarchical numbering (1, 1.1, 1.2)
- [ ] All tasks have checkboxes
- [ ] Checkpoints after milestones
- [ ] Requirement references (_Requirements: X.X_)
- [ ] Final checkpoint with testing

### Cross-document
- [ ] All requirements have tasks
- [ ] Design aligns with requirements
- [ ] Tasks reference correct requirement numbers

## Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| Error | Missing required content | Must fix |
| Warning | Quality concern | Should fix |
| Info | Suggestion | Optional |

## Validation Report

```
## Plan Validation: Issue #[N]

**Plan Type:** [Medium | Complex]
**Directory:** `.claude/plans/issue-[N]-[slug]/`

### Document Checklist

#### [document]
- [x] [Section present]
- [ ] [Section missing] - **Issue:** [problem]

### Quality Issues

| Severity | Issue | Location | Suggestion |
|----------|-------|----------|------------|
| Error | Missing section | plan.md | Add Testing Strategy |
| Warning | Vague task | tasks.md:15 | Be more specific |

### Summary

**Status:** [PASS | WARN | FAIL]
- Errors: [N]
- Warnings: [N]
- Info: [N]

[Guidance based on status]
```

## Output Format

```json
{
  "issue": 5,
  "plan_type": "medium",
  "plan_directory": ".claude/plans/issue-5-dispatch/",
  "status": "pass|warn|fail",
  "errors": [],
  "warnings": [{"section": "tasks", "message": "Vague description"}],
  "info": [],
  "ready_for_implementation": true
}
```
