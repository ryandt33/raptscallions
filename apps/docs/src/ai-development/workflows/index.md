---
title: Development Workflows
description: Prescriptive and deliberative workflow styles for AI-assisted development
source_synced_at: 2026-01-16
---

# Development Workflows

RaptScallions has evolved through different workflow styles for AI-assisted development.

## Workflow Styles

| Style | Era | Description | Status |
|-------|-----|-------------|--------|
| [Deliberative](/ai-development/workflows/deliberative) | E06+ | Flexible reasoning, agent-driven decisions | **Current** |
| [Prescriptive](/ai-development/workflows/prescriptive) | E01-E05 | Fixed sequences, less agent autonomy | Archived |

## Quick Comparison

| Aspect | Prescriptive | Deliberative |
|--------|--------------|--------------|
| **Analyst output** | Detailed specs with code | Multiple approaches, no code |
| **Architect role** | Validates specs | Selects approach, writes spec |
| **Developer autonomy** | Implements exactly as specified | Autonomy within constraints |
| **Workflow variants** | Single implicit flow | 5 categories with variants |
| **Commands** | Flat structure | Organized by agent |

## Which Workflow Am I Using?

Check the task's frontmatter:

```yaml
agentic_style: "deliberative"  # Current workflow
agentic_style: "prescriptive"  # Historical workflow
```

Most tasks from E06 onwards use the deliberative workflow.

## Workflow Documentation

### Current: Deliberative Workflow

The [Deliberative Workflow](/ai-development/workflows/deliberative) is characterized by:

- **Analyst explores, doesn't prescribe** — Multiple approaches with trade-offs
- **Architect decides and constrains** — Selects approach, defines boundaries
- **Developer has autonomy** — Implements within constraints
- **Human checkpoints** — Approval between each command

**Workflow categories:** development, schema, infrastructure, documentation, bugfix

### Historical: Prescriptive Workflow

The [Prescriptive Workflow](/ai-development/workflows/prescriptive) was used for E01-E05:

- **Analyst wrote detailed specs** — Including implementation code
- **Developer implemented as specified** — Less autonomy
- **Single workflow** — No category variants

This documentation exists for historical reference when working with older tasks.

## Related Sections

- [Current Agents](/ai-development/agents/current/) — Agents used in deliberative workflow
- [Slash Commands](/ai-development/commands/) — Commands that drive workflows
- [Deprecated Agents](/ai-development/agents/deprecated/) — Agents from prescriptive era
