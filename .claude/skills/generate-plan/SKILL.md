---
name: generate-plan
description: Generate a plan.md document for a medium-complexity GitHub issue. Use this skill when an issue has the label 'plan: medium' and needs planning documentation before implementation. For complex issues (plan: complex), use the plan-check orchestrator instead which handles staged approval.
allowed-tools:
  - Bash(gh:*)
  - Bash(mkdir:*)
  - Bash(find:*)
  - Bash(grep:*)
  - Read
  - Glob
  - Grep
  - Write
  - Edit
---

# Generate Plan (Medium Tier)

Create a single `plan.md` document for medium-complexity issues.

## Prerequisites

- Issue must have `plan: medium` label
- If issue has `plan: simple`: No plan needed, already has `plan ready`
- If issue has `plan: complex`: Use `/plan-check` orchestrator for staged approval workflow

## Process

1. **Fetch issue**: `gh issue view [NUMBER] --json number,title,body,labels`
2. **Verify tier**: Confirm `plan: medium` label exists
3. **Create directory**: `mkdir -p .claude/plans/issue-[N]-[slug]`
4. **Codebase discovery**: Identify all code directories and entry points (see below)
5. **Impact analysis**: Trace all references to affected entities (see below)
6. **Generate plan.md**: Using template below
7. **Add label**: `gh issue edit [N] --add-label "plan ready"`
8. **Post summary**: Comment on issue

---

## Pre-Planning: Codebase Discovery

Before writing the plan, understand the full project structure:

### 1. Identify All Code Directories

```bash
# Find all directories containing executable code
find . -name "*.ts" -o -name "*.js" -o -name "*.html" | xargs dirname | sort -u | grep -v node_modules | grep -v dist
```

### 2. Identify Entry Points

Document all ways code gets executed:
- Server processes
- CLI tools
- Desktop apps (Electron, Tauri, etc.)
- Build outputs
- Shared/common modules

### 3. Identify Integration Boundaries

How do components communicate?
- REST APIs
- RPC/IPC mechanisms
- Shared modules/imports
- Database connections
- Environment configuration

---

## Pre-Planning: Impact Analysis

For any change, trace its full impact before planning:

### 1. Direct References

Files that import or directly use the affected entity:

```bash
# Example: Find all imports of a module
grep -r "from.*['\"].*affected-module" --include="*.ts" --include="*.js" .
```

### 2. Runtime References

References that exist at runtime but not compile-time:

- **String literals**: Table names, API paths, config keys
- **Dynamic requires**: `require()` with variables
- **Query builders**: ORM/database query strings
- **Template variables**: Values injected into HTML/JS templates
- **RPC/IPC channels**: Named communication channels
- **Environment variables**: Config that affects behavior

```bash
# Example: Find string references to an entity
grep -r "entityName" --include="*.ts" --include="*.js" --include="*.html" .
```

### 3. Consumer Layers

Verify all layers that may depend on the entity:

| Layer | Examples |
|-------|----------|
| Database | Table/column definitions, migrations |
| Backend services | Service functions, business logic |
| API contracts | Controllers, route handlers |
| Frontend/UI | HTML forms, JavaScript, display templates |
| Configuration | Environment files, settings |
| Build/deployment | Scripts, Docker files |

---

## Plan Template

Create `.claude/plans/issue-[N]-[slug]/plan.md`:

```markdown
# Plan: Issue #[N] - [Title]

## Summary
[2-3 sentences describing the change]

## Requirements
- [Requirement 1]
- [Requirement 2]

## Codebase Discovery

### Code Directories
| Directory | Contains | Affected |
|-----------|----------|----------|
| `[dir1]/` | [Description] | Yes/No |
| `[dir2]/` | [Description] | Yes/No |
| `[dir3]/` | [Description] | Yes/No |

*(List all directories found during codebase discovery)*

### Entry Points
- [Entry point 1]
- [Entry point 2]

## Impact Analysis

### Direct References
[List files that directly import/use affected entities]

### Runtime References
[List string literals, config keys, template variables, etc.]

### Affected Layers
| Layer | Impact |
|-------|--------|
| Database | [Description or "None"] |
| Backend | [Description or "None"] |
| API | [Description or "None"] |
| Frontend | [Description or "None"] |
| Config | [Description or "None"] |

## Approach
[Technical approach - 2-3 paragraphs]

### Key Decisions
1. **[Decision]**: [Rationale]

## Implementation

### Files to Modify
| File | Changes |
|------|---------|
| `path/file.ts` | [What changes] |

### Files to Create
| File | Purpose |
|------|---------|
| `path/new.ts` | [Purpose] |

### Database Changes
[SQL or "None required"]

## Boundary Crossing Checklist

For each architectural boundary the change crosses, verify both sides:

- [ ] **Database ↔ Backend**: Queries match schema, types match rows
- [ ] **Backend ↔ API**: Controllers expose correct contracts
- [ ] **API ↔ Frontend**: UI sends/receives expected data shapes
- [ ] **Process ↔ Process**: IPC/RPC channels use correct names and payloads
- [ ] **Code ↔ Config**: Environment variables and settings are consistent

## Tasks
- [ ] [Task 1]
- [ ] [Task 2]
- [ ] Write tests

## Verification Strategy

### Static Verification
[Build/lint checks that confirm correctness]

### Runtime Verification
[User flows that exercise the changed code]

### Search Verification
[Grep patterns that should return zero results after implementation]

```bash
# Example: Verify no old references remain
grep -r "old_pattern" --include="*.ts" --include="*.js" .
```

## Risks
- [Risk and mitigation]
```

---

## Label Update

```bash
gh issue edit [N] --add-label "plan ready"
```

## Post Summary Comment

```bash
gh issue comment [N] --body "## Planning Complete

**Tier:** Medium
**Plan location:** \`.claude/plans/issue-[N]-[slug]/plan.md\`

### Summary
[Brief summary of planned approach]

### Affected Areas
- [Area 1]
- [Area 2]

---
*Plan generated by Claude*"
```

## Output Format

```json
{
  "issue": 5,
  "tier": "medium",
  "plan_directory": ".claude/plans/issue-5-slug/",
  "documents_created": ["plan.md"],
  "directories_analyzed": ["[directories found during discovery]"],
  "status": "success"
}
```
