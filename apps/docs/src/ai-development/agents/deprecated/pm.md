---
title: PM (Archived)
description: Historical PM agent for task breakdown
source_synced_at: 2026-01-16
---

# PM (Archived)

::: warning Archived
This agent definition was archived on 2026-01-16. See `.claude/agents/pm.md` for the current version.
:::

## Role

The archived PM agent took high-level product goals, features, or phases and broke them down into well-structured epics and tasks. The agent thought like an experienced PM who understood both user needs and technical reality.

## Key Differences from Current

| Aspect | Archived | Current |
|--------|----------|---------|
| **Workflow assignment** | Single implicit workflow | Assigns workflow category and variant labels |
| **Task format** | Basic frontmatter | Extended frontmatter with `workflow`, `agentic_style` fields |
| **Workflow variants** | Not applicable | Sets labels like `infra:simple`, `docs:simple`, `bugfix:hotfix` |

## What Remained Similar

The core PM responsibilities remained largely unchanged:

- Breaking down goals into epics (1-2 weeks each)
- Breaking epics into tasks (2-8 hours each)
- Defining dependencies between tasks
- Task sizing guidelines (good size vs too big/small)
- Priority definitions (critical, high, medium, low)
- Epic review after completion

## Minor Changes

The current PM agent adds:

1. **Workflow category selection** — Assigns development, schema, infrastructure, documentation, or bugfix
2. **Variant labels** — Sets `infra:simple`, `docs:simple`, etc. for simplified workflows
3. **First command guidance** — Documents which command starts each workflow

## Source Reference

- Archived: `.claude/archive/1_16/agents/pm.md`
- Current: `.claude/agents/pm.md`
