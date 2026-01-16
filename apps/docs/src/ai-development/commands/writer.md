---
title: Writer Commands
description: Commands for documentation creation and updates
source_synced_at: 2026-01-16
---

# Writer Commands

Commands that invoke the [Writer Agent](/ai-development/agents/current/writer) for documentation.

## Overview

Writer commands handle documentation throughout the workflow: creating outlines, writing standalone docs, reviewing accuracy, and updating docs after implementation.

## Commands

| Command | Description | Used In Workflows |
|---------|-------------|-------------------|
| `/outline` | Create document outline for approval | documentation (standard) |
| `/write-docs` | Write standalone documentation | documentation |
| `/review-docs` | Technical accuracy review | documentation (standard) |
| `/update-docs` | Update docs after implementation | development, schema, infrastructure |
| `/document` | Full documentation workflow | documentation |

---

## `/outline`

Create a document outline for human approval.

### Purpose

Plan documentation structure before writing:
- Define target audience
- Outline sections and headings
- Identify code examples needed
- Plan cross-references

### Invocation

```bash
/outline E06-T010
```

### Input

- Task ID for a documentation task
- Task must be in `DRAFT` state

### Process

1. Read task requirements
2. Research the topic in codebase
3. Identify structure and flow
4. Create outline in task file

### Output

Outline added to task file:

```markdown
## Document Outline

### Target Audience
[Who is this for?]

### Document Structure
1. **Introduction**
   - What this covers
   - Prerequisites

2. **Core Concept**
   - Key point 1
   - Code example: [describe]

3. **Patterns**
   - Pattern A with example

### Code Examples Needed
1. [Basic usage - file: X]
2. [Advanced pattern - file: Y]
```

### Task Updates

Sets `workflow_state: OUTLINED`

### Next Step

**Human checkpoint:** Review and approve outline structure

Then: Run `/write-docs {task-id}` (writer)

### Source Reference

`.claude/commands/writer/outline.md`

---

## `/write-docs`

Write standalone documentation (KB pages, guides).

### Purpose

Create complete documentation following the approved outline or task requirements.

### Invocation

```bash
/write-docs E06-T010
```

### Input

- Task ID
- For standard workflow: approved outline in task file
- For simple workflow: task requirements directly

### Process

1. Read task and approved outline
2. Research code examples in codebase
3. Write documentation following KB patterns
4. Validate with `pnpm docs:build`

### Output

Documentation files at specified locations:
- KB pages: `apps/docs/src/{domain}/{type}/{page}.md`

### Page Format

```markdown
---
title: Page Title
description: Brief description
---

# Page Title

Brief introduction.

## Overview
[Context and when to use]

## Core Concept
[Main explanation with code examples]

## Related
- [Link to related page](/path)
```

### Next Step

**Standard workflow:**
Run `/review-docs {task-id}` (writer)

**Simple workflow (`docs:simple`):**
Task is ready for PR

### Source Reference

`.claude/commands/writer/write-docs.md`

---

## `/review-docs`

Technical accuracy review of documentation.

### Purpose

Verify documentation accuracy:
- Code examples work
- Information is current
- Links are valid
- Formatting is consistent

### Invocation

```bash
/review-docs E06-T010
```

### Process

1. Read written documentation
2. Verify code examples against codebase
3. Check links
4. Validate with `pnpm docs:build`
5. Report issues or approve

### Next Step

**If APPROVED:**
Task is ready for PR

**If CHANGES_NEEDED:**
Run `/write-docs {task-id}` (writer)

### Source Reference

`.claude/commands/writer/review-docs.md`

---

## `/update-docs`

Update documentation after implementation.

### Purpose

Keep docs in sync with code after a feature is implemented:
- Update ARCHITECTURE.md if needed
- Update CONVENTIONS.md if new patterns
- Update package/app READMEs
- Add API documentation

### Invocation

```bash
/update-docs E01-T001
```

### Input

- Task ID
- Task must be in `QA_REVIEW` state and passed

### Process

1. Read task file and spec
2. Read implemented code
3. Identify docs needing updates
4. Update documentation
5. Verify accuracy

### Documents to Check

| Document | Update When |
|----------|-------------|
| `docs/ARCHITECTURE.md` | New components, major patterns |
| `docs/CONVENTIONS.md` | New coding patterns |
| `README.md` | New setup steps, features |
| `packages/*/README.md` | Package API changes |
| `apps/*/README.md` | App configuration |

### Task Updates

- Sets `workflow_state: DONE`
- Sets `status: done`
- Sets `completed_at`
- Moves task to `backlog/completed/{epic}/`

### Next Step

Task is ready for PR creation (human step)

### Source Reference

`.claude/commands/writer/update-docs.md`

---

## `/document`

Full documentation workflow in one command.

### Purpose

Combines outline + write + review for simple documentation tasks.

### Invocation

```bash
/document E06-T010
```

### Source Reference

`.claude/commands/writer/document.md`

---

## Related Commands

- [QA Commands](/ai-development/commands/qa) — Passes task to writer after validation
- [Utility Commands](/ai-development/commands/utility) — Creates PR after docs
