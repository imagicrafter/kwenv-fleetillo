---
description: Approve a staged review document and copy it back to its source location
---

# Review Approve Workflow

Approve a document that has been staged for review in the artifacts folder.

## Steps

1. **Find the review document**
   - Look in the current conversation's artifacts folder: `<appDataDir>/brain/<conversation-id>/`
   - Review files are named: `issue-[N]-[stage]_review.md`

2. **Read the frontmatter** to get the source path:
   ```yaml
   ---
   source: .claude/plans/issue-[N]-[slug]/[stage].md
   stage: requirements|design|tasks
   issue: [N]
   status: pending_review
   staged_at: [ISO timestamp]
   ---
   ```

3. **On approval:**
   - Read the full artifact file content
   - Extract content AFTER the frontmatter (skip lines 1-7)
   - Write the clean content back to the `source` path
   - Delete the artifact review file
   - Continue to the next planning stage

4. **On rejection with feedback:**
   - Update the artifact file with feedback
   - Keep it in the artifacts folder for revision
   - Notify the agent to revise

## Usage

When the user wants to approve a pending review:
```
approve
```
or
```
/review-approve
```

The agent will:
1. Read the review artifact file
2. Extract the source path from frontmatter
3. Copy content (without frontmatter) back to source
4. Delete the artifact file
5. Continue with the next planning stage

## File Naming Convention

Artifact review files follow this pattern:
- `issue-[N]-requirements_review.md` - Requirements document for issue N
- `issue-[N]-design_review.md` - Design document for issue N
- `issue-[N]-tasks_review.md` - Tasks document for issue N

## Example Flow

```
1. Agent generates requirements.md in .claude/plans/issue-19-database-upsert/
2. Agent copies to artifacts: <session>/issue-19-requirements_review.md
3. File opens in user's editor with review/comment capability
4. User reviews, adds comments if needed
5. User says "approve"
6. Agent copies content back to .claude/plans/issue-19-database-upsert/requirements.md
7. Agent deletes the artifact review file
8. Agent proceeds to generate design.md
```
