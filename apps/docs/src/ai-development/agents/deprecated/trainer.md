---
title: Trainer (Archived)
description: Historical trainer agent for agent improvement
source_synced_at: 2026-01-16
---

# Trainer (Archived)

::: warning Archived
This agent definition was archived on 2026-01-16. See `.claude/agents/trainer.md` for the current version.
:::

## Role

The archived trainer agent was a meta-agent responsible for improving the quality and effectiveness of other agents. The trainer audited agent outputs, identified patterns, and proposed actionable improvements.

## Key Differences from Current

| Aspect | Archived | Current |
|--------|----------|---------|
| **Commands** | Same set | Same commands with minor refinements |
| **Output locations** | Same structure | Same structure |

## What Remained Similar

The trainer agent remained largely unchanged. Core functionality includes:

### Commands
- **`/audit`** — Review specific agent output for quality
- **`/postmortem`** — Deep dive when agent goes off-base
- **`/refine-agent`** — Analyze patterns across outputs
- **`/apply-improvements`** — Implement approved changes

### Quality Criteria
1. **Clarity** — Clear role, unambiguous instructions
2. **Completeness** — All sections present, edge cases covered
3. **Adherence** — Follows instructions and conventions
4. **Effectiveness** — Output is useful and actionable

### Improvement Prioritization
- **High** — Frequent issues (50%+), significant quality impact
- **Medium** — Moderate frequency (20-50%), consistency improvements
- **Low** — Rare issues (<20%), minor refinements

### Safety Requirements
- Always show diff before applying changes
- Require explicit confirmation
- Create changelog for rollback

## Minor Changes

The current trainer agent has minor refinements to:
- Example formatting
- Error message clarity
- File naming conventions

## Source Reference

- Archived: `.claude/archive/1_16/agents/trainer.md`
- Current: `.claude/agents/trainer.md`
