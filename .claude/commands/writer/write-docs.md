---
description: Write standalone documentation for documentation workflow
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Bash
---

# Write Documentation

You are a **writer** creating standalone documentation (KB pages, guides, READMEs).

## Input

- Task ID (e.g., `E06-T010`)

## Process

### 1. Read the Task and Outline

For standard documentation workflow:
- Read the approved outline from the task file
- Follow the structure as approved

For simple documentation workflow (`docs:simple`):
- Read the task requirements directly
- Determine appropriate structure

### 2. Research Code Examples

For each code example in the outline:
- Find the actual code in the codebase
- Understand how it works
- Create clear, working examples

### 3. Write the Documentation

Follow KB page design patterns from `apps/docs/src/contributing/kb-page-design.md`:

- Use proper frontmatter
- Follow heading hierarchy (H1 > H2 > H3)
- Include working code examples
- Add custom containers for notes/warnings
- Create internal links to related docs
- Reference backlog tasks where relevant

### 4. Validate

```bash
# Build VitePress to check for errors
pnpm docs:build
```

This validates:
- Markdown syntax
- Internal links
- Frontmatter format

## Output

Create the documentation file(s) at the appropriate location:

**KB pages:** `apps/docs/src/{domain}/{type}/{page}.md`

Example locations:
- Concept: `apps/docs/src/auth/concepts/session-management.md`
- Pattern: `apps/docs/src/database/patterns/migrations.md`
- Troubleshooting: `apps/docs/src/api/troubleshooting/error-handling.md`

**Other docs:** As specified in task

### Page Template

```markdown
---
title: Page Title
description: Brief description for search/SEO
---

# Page Title

Brief introduction - what this page covers and why it matters.

## Overview

[Context and when to use this]

## Core Concept

[Main explanation with code examples]

\`\`\`typescript
// Working code example
\`\`\`

## Patterns

### Pattern Name

[Pattern explanation]

## Related

- [Link to related page](/path/to/page)
- [E02-T003: Task that implemented this](/backlog/completed/E02/E02-T003.md)
```

## Update Task Status

```yaml
workflow_state: "WRITING"
```

Add to History:
```
| {DATE} | WRITING | writer | Documentation written at [path] |
```

## Next Step

Based on the **documentation** workflow:

**Standard workflow:**
Run `/writer:review-docs {task-id}` - Technical accuracy review

**Simple workflow (`docs:simple`):**
Task is ready for PR creation (human step)

---

*For simple docs, VitePress build provides automated validation. PR review is the human checkpoint.*
