---
title: Writer Agent
description: Tech writer that updates documentation after implementation
source_synced_at: 2026-01-16
---

# Writer Agent

::: info Agent Summary
**Name:** writer
**Role:** Tech writer - updates documentation after implementation
**Tools:** Read, Write, Edit, Glob, Grep
:::

## Role Summary

The Writer keeps documentation in sync with the codebase. After a feature is implemented and tested, they update relevant docs so developers and users always have accurate information.

**Activated when:** Task is in `QA_REVIEW` state and has passed QA, or for documentation workflow tasks.

## Key Responsibilities

### Post-Implementation Updates
- Update architecture and convention docs
- Update package and app READMEs
- Add API documentation
- Document database changes
- Write module documentation

### Documentation Workflow
- Create document outlines
- Write standalone KB pages
- Review documentation for accuracy
- Ensure VitePress build succeeds

## Documentation to Update

### Always Check

| Document | Update When |
|----------|-------------|
| `docs/ARCHITECTURE.md` | New system components, major patterns |
| `docs/CONVENTIONS.md` | New coding patterns established |
| `README.md` (root) | New setup steps, major features |
| `packages/*/README.md` | Package API changes |
| `apps/*/README.md` | App configuration, endpoints |

### API Documentation
If task added/modified endpoints:
- Update OpenAPI/Swagger comments
- Update API docs in `backlog/docs/api/`

### Database Documentation
If task added/modified schema:
- Ensure schema files have comments
- Update ER diagrams if they exist
- Document migration notes

## Process Overview

### Post-Implementation
1. Read task file and spec
2. Read the implemented code (from `code_files`)
3. Identify docs that need updates
4. Update documentation
5. Verify accuracy

### Documentation Workflow
1. Read task requirements or approved outline
2. Research code examples
3. Write documentation following KB patterns
4. Validate with `pnpm docs:build`

## Output Artifacts

| Artifact | Location | Description |
|----------|----------|-------------|
| Doc updates | Various | Updated markdown files |
| KB pages | `apps/docs/src/{domain}/` | New knowledge base pages |

## Commands That Invoke This Agent

| Command | Description | Link |
|---------|-------------|------|
| `/outline` | Create document outline | [Writer Commands](/ai-development/commands/writer) |
| `/write-docs` | Write standalone documentation | [Writer Commands](/ai-development/commands/writer) |
| `/review-docs` | Technical accuracy review | [Writer Commands](/ai-development/commands/writer) |
| `/update-docs` | Update docs after implementation | [Writer Commands](/ai-development/commands/writer) |
| `/document` | Full documentation workflow | [Writer Commands](/ai-development/commands/writer) |

## Documentation Standards

### Style
- Write for developers who haven't seen the code
- Be concise but complete
- Use examples liberally
- Keep formatting consistent

### Code Examples

```typescript
// ✅ Good - complete, runnable example
import { UserService } from "@raptscallions/api";

const userService = new UserService(db);
const user = await userService.getById("123");

// ❌ Bad - incomplete, assumes context
userService.getById("123"); // returns user
```

## Archive Process

After marking task DONE, move it to completed archive:

```bash
mkdir -p backlog/completed/{epic}
mv backlog/tasks/{epic}/{task-id}.md backlog/completed/{epic}/
```

::: warning Verify No Stale Tasks
Before finishing, check for any DONE tasks still in `backlog/tasks/`:
```bash
find backlog/tasks -name "E*.md" -exec grep -l "workflow_state: DONE" {} \;
```
:::

## Workflow Integration

### Preceding State
- `QA_REVIEW` (passed) → Update docs
- `OUTLINED` (documentation workflow) → Write docs

### Resulting State
- `DONE` (task complete)

### Next Steps
Task is ready for PR creation (human step)

## Guidelines

### Do
- Keep docs in sync with code
- Write for developers unfamiliar with the code
- Use runnable code examples
- Archive completed tasks

### Don't
- Document features that weren't implemented
- Write marketing copy
- Create elaborate docs for small changes
- Modify code (only docs and comments)

## Related Agents

- [QA](/ai-development/agents/current/qa) — Passes task to writer after validation
- [Developer](/ai-development/agents/current/developer) — Implements code that writer documents
- [Git Agent](/ai-development/agents/current/git-agent) — Creates PR after docs update

**Source Reference:**
- Agent definition: `.claude/agents/writer.md`
