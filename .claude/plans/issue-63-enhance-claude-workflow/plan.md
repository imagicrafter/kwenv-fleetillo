# Implementation Plan: Enhance Claude Code Workflow

## Issue #63

**Branch**: `issue/63-enhance-claude-workflow`
**Source**: [everything-claude-code](https://github.com/affaan-m/everything-claude-code)

## Overview

Integrate quality tools from everything-claude-code to enhance our issue management workflow without replacing the existing orchestration system.

## Design Principle

**Keep**: Our GitHub issue orchestration, tiered planning, worktree isolation, autonomous execution
**Add**: Quality verification, memory persistence, specialized agents, development hooks

---

## Phase 1: Core Quality

### Step 1.1: Add Specialized Agents

Create `.claude/agents/` directory with specialized agents.

**Files to create**:
- `.claude/agents/planner.md` - Planning specialist
- `.claude/agents/architect.md` - System design decisions
- `.claude/agents/code-reviewer.md` - Quality review
- `.claude/agents/security-reviewer.md` - Security analysis

**Source**: Copy from `/Users/justinmartin/github/everything-claude-code/agents/`

**Modifications needed**: None - use as-is

---

### Step 1.2: Add Verification Loop Skill

Create verification system for comprehensive quality checks.

**Files to create**:
- `.claude/skills/verification-loop/SKILL.md` - Verification phases and reporting
- `.claude/commands/verify.md` - `/verify` command

**Source**: Copy from everything-claude-code
- `skills/verification-loop/SKILL.md`
- `commands/verify.md`

**Modifications needed**:
- Update file paths to match our project structure
- Integrate with our `detect-project` skill for command detection

---

### Step 1.3: Enhance execute.md Validation

Update execute.md Step 7 to use verification loop and produce reports.

**File to modify**: `.claude/commands/execute.md`

**Changes**:
1. Import verification-loop skill concepts
2. Generate verification report after validation
3. Save report to plan folder: `$PLAN_FOLDER/verification-report.md`
4. Include report summary in PR body

---

## Phase 2: Session Intelligence

### Step 2.1: Add Memory Persistence Hooks

Enable context persistence across sessions.

**Files to create**:
- `.claude/hooks/memory-persistence/session-start.sh`
- `.claude/hooks/memory-persistence/session-end.sh`
- `.claude/hooks/memory-persistence/pre-compact.sh`

**Directories to create**:
- `~/.claude/sessions/` (user-level, for session files)

**Settings changes**: Add to `.claude/settings.local.json`:
- SessionStart hook
- Stop hook
- PreCompact hook

**Source**: Copy from everything-claude-code `hooks/memory-persistence/`

---

### Step 2.2: Add Continuous Learning Skill

Auto-extract patterns from completed sessions.

**Files to create**:
- `.claude/skills/continuous-learning/SKILL.md`
- `.claude/skills/continuous-learning/config.json`
- `.claude/skills/continuous-learning/evaluate-session.sh`
- `.claude/commands/learn.md` - Manual `/learn` command

**Directories to create**:
- `~/.claude/skills/learned/` (user-level, for extracted patterns)

**Source**: Copy from everything-claude-code `skills/continuous-learning/`

---

## Phase 3: Development Feedback

### Step 3.1: Add Enhanced PostToolUse Hooks

Immediate feedback during development.

**New hooks to add** (merge into settings.local.json):
1. Auto-format after Edit (Prettier for JS/TS)
2. TypeScript check after Edit
3. console.log warning after Edit
4. PR creation logger after Bash

**Source**: Extract relevant hooks from `everything-claude-code/hooks/hooks.json`

**Note**: Be selective - only add hooks that don't conflict with existing workflow

---

### Step 3.2: Add Rules Directory

Always-follow guidelines for consistency.

**Files to create**:
- `.claude/rules/agents.md` - When to delegate
- `.claude/rules/security.md` - No hardcoded secrets
- `.claude/rules/coding-style.md` - Code conventions
- `.claude/rules/testing.md` - Test requirements

**Source**: Copy from everything-claude-code `rules/`

**Modifications needed**: Review and adapt to our project conventions

---

## Phase 4: Integration

### Step 4.1: Update plan-check to Use Planner Agent

Improve plan quality by delegating to specialized agent.

**File to modify**: `.claude/skills/plan-check/SKILL.md` (or generate-plan)

**Changes**:
1. For medium tier: Spawn planner agent instead of direct generation
2. Planner agent produces plan.md with risk assessment
3. Keep existing structure (still outputs to plan folder)

---

### Step 4.2: Add Optional Code Review to Execute

Pre-PR quality gate using code-reviewer agent.

**File to modify**: `.claude/commands/execute.md`

**Changes**:
1. Add optional Step 8.5 between commit and PR creation
2. Spawn code-reviewer agent on changed files
3. Include review summary in PR body
4. Make this configurable (can skip for simple tier)

---

## Phase 5: Documentation

### Step 5.1: Update README.md

Document all new components in `.claude/README.md`

**Sections to add**:
- Agents inventory
- Memory persistence explanation
- Continuous learning explanation
- New hooks documentation
- Rules reference

---

## Testing Checklist

- [ ] `/execute` still works for simple tier issues
- [ ] `/execute` still works for medium tier issues
- [ ] `/verify` produces verification report
- [ ] Session context saved on exit
- [ ] Session context loaded on start
- [ ] Planner agent invoked for plan generation
- [ ] PostToolUse hooks fire (format, type-check)
- [ ] Rules loaded by Claude Code

---

## File Summary

### New Directories
```
.claude/
├── agents/                      # NEW
├── rules/                       # NEW
├── hooks/memory-persistence/    # NEW
└── skills/
    ├── verification-loop/       # NEW
    └── continuous-learning/     # NEW
```

### New Files (Count: ~20)
- 4 agent files
- 4 rule files
- 3 memory persistence scripts
- 4 continuous learning files
- 2 verification files
- 2 commands

### Modified Files (Count: 3)
- `.claude/settings.local.json` (hooks)
- `.claude/commands/execute.md` (verification, code review)
- `.claude/README.md` (documentation)

---

## Rollback Plan

If issues occur, revert by:
1. `git checkout main -- .claude/commands/execute.md`
2. Remove new directories: `agents/`, `rules/`, hooks additions, new skills
3. Revert settings.local.json hook changes

All new additions are additive - core workflow files remain unchanged except execute.md.
