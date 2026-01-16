---
description: Write and review KB documentation
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Document

Write and review knowledge base documentation for a documentation task.

## Usage

```
/document E06-T010
```

## When to Use

Use this command for KB documentation tasks (typically E06-T005 through E06-T010). This workflow is optimized for documentation tasks and skips the standard TDD workflow (analyze → tests → implement → QA).

**Do NOT use this for:**

- Code implementation tasks (use standard workflow)
- Code documentation updates (use `/update-docs`)
- API reference generation (different process)

## Two-Phase Process

### Phase 1: Write Documentation

1. Load the writer agent: `@writer`
2. Read the task at `backlog/tasks/{epic}/{task-id}.md`
3. **REQUIRED: Read KB design documentation before writing:**
   - `apps/docs/src/contributing/kb-page-design.md` - Page structure, frontmatter, code blocks, containers
   - `apps/docs/src/contributing/design-system.md` - Colors, typography, theme system, brand guidelines
   - `apps/docs/src/contributing/index.md` - Overview of contributing guidelines
4. Research the topic from existing code and specs
5. Draft KB documentation pages following the patterns in the design docs
6. Ensure proper:
   - Frontmatter (title, related_code, implements_task, last_verified)
   - Heading hierarchy
   - Code examples from real files
   - Cross-references and links
   - Design system consistency
7. Update task:
   - Set `workflow_state` to `DOC_REVIEW`
   - Set `status` to `in-progress`
   - Add entry to History table
   - Add "Documentation Written" section with summary

### Phase 2: Review Documentation

1. Load the reviewer agent: `@reviewer`
2. Read the task at `backlog/tasks/{epic}/{task-id}.md`
3. **REQUIRED: Read KB design documentation for review criteria:**
   - `apps/docs/src/contributing/kb-page-design.md` - Verify page structure compliance
   - `apps/docs/src/contributing/design-system.md` - Verify design system adherence
   - `apps/docs/src/contributing/documentation.md` - General documentation guidelines
4. Read all documentation files created in Phase 1
5. Verify:
   - **Accuracy**: Code examples match actual implementation
   - **Completeness**: All acceptance criteria covered
   - **Clarity**: Documentation is clear and helpful
   - **Pattern adherence**: Follows KB page design patterns
   - **Links**: All cross-references and links work
   - **Design system**: Consistent with design system
6. Create review file at `backlog/docs/reviews/{epic}/{task-id}-doc-review.md`
7. Update task based on verdict:
   - **APPROVED**: Set `workflow_state` to `DONE`, `status` to `done`, set `completed_at`
   - **CHANGES_REQUESTED**: Set `workflow_state` to `DRAFT`, add feedback to Reviews section

## Review Format

The documentation review should follow this format:

```markdown
# Documentation Review: {TASK-ID}

**Reviewer:** reviewer
**Date:** {DATE}
**Verdict:** APPROVED | CHANGES_REQUESTED

## Summary

[2-3 sentence overall assessment]

## Files Reviewed

- `path/to/doc.md` - [brief note on content quality]

## Review Criteria

### ✅ Accuracy

- [ ] Code examples match actual implementation
- [ ] File paths are correct
- [ ] Task references are accurate
- [ ] Technical details are correct

### ✅ Completeness

- [ ] All acceptance criteria covered
- [ ] Required sections present
- [ ] Cross-references included
- [ ] Related docs linked

### ✅ Clarity

- [ ] Documentation is clear and helpful
- [ ] Examples are illustrative
- [ ] Explanations are sufficient
- [ ] No ambiguous statements

### ✅ Pattern Adherence

- [ ] Frontmatter is complete and correct
- [ ] Heading hierarchy is proper (H1 → H2 → H3)
- [ ] Code blocks have language tags
- [ ] Custom containers used appropriately
- [ ] Links use correct markdown syntax

### ✅ Design System

- [ ] Consistent with established design system
- [ ] Theme elements referenced correctly
- [ ] Typography guidance followed

## Issues

### 🔴 Must Fix (Blocking)

[Issues that must be addressed]

1. **File: `path/to/doc.md`**
   Issue: [Description]
   Suggestion: [How to fix]

### 🟡 Should Fix (Non-blocking)

[Issues that should be fixed but won't block]

### 💡 Suggestions (Optional)

[Nice-to-haves, improvements, future enhancements]

## Verdict Reasoning

[Why you approved or requested changes]
```

## Revision Loop

If the review verdict is `CHANGES_REQUESTED`:

1. Task returns to `DRAFT` state with feedback
2. Writer agent is called again to address feedback
3. Writer reads:
   - Existing review file for specific feedback
   - `apps/docs/src/contributing/kb-page-design.md` - Re-verify page patterns
   - `apps/docs/src/contributing/design-system.md` - Re-verify design compliance
4. Writer fixes identified issues per design doc requirements
5. Process repeats until `APPROVED`

## After Approval

When review verdict is `APPROVED`:

1. Task is marked `DONE` and moved to `backlog/completed/{epic}/`
2. Ready for inclusion in VitePress site
3. No PR creation needed (docs live in apps/docs/src/)

## Arguments

- `$ARGUMENTS` - The task ID (e.g., E06-T010)

## Example Workflow

```bash
# Run documentation workflow
claude -p "/document E06-T010"

# Writer phase:
# - Reads task at backlog/tasks/{epic}/{task-id}.md
# - MUST read design docs in apps/docs/src/contributing/:
#   - kb-page-design.md (page structure, frontmatter, code blocks)
#   - design-system.md (colors, typography, theme)
# - Researches implemented code
# - Writes KB pages following design doc patterns
# - Updates task to DOC_REVIEW

# Reviewer phase:
# - Reads design docs to verify compliance
# - Reads documentation pages
# - Verifies accuracy, completeness, and design system adherence
# - Creates review file
# - Either approves (DONE) or requests changes (back to DRAFT)

# If changes requested, writer is called again automatically
# Loop continues until approved
```

## Key Differences from Standard Workflow

| Standard Workflow | Documentation Workflow           |
| ----------------- | -------------------------------- |
| Analyst → Spec    | (skip - task is the spec)        |
| UX Review         | (skip - KB patterns established) |
| Plan Review       | (skip - no implementation plan)  |
| Write Tests       | (skip - no code to test)         |
| Implement         | Writer researches and writes     |
| UI Review         | (skip - KB design system set)    |
| Code Review       | Reviewer checks docs             |
| QA                | (skip - review covers this)      |
| Integration Test  | (skip - no code to test)         |
| Update Docs       | (N/A - this IS the docs)         |
| Commit & PR       | (skip - docs in main repo)       |

## Notes

- Documentation tasks should have `labels: [docs]` to identify them
- Writer and reviewer work together in a tight loop
- No GitHub PR needed - docs are version controlled with code
- VitePress hot reload shows changes immediately
- Focus on accuracy and helpfulness over perfection
