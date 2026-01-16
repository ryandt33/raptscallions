---
title: Deprecated Agents
description: Historical agent definitions from the prescriptive workflow era
source_synced_at: 2026-01-16
---

# Deprecated Agents

::: warning Archived / Historical
These agent definitions are from the **prescriptive workflow era** and are no longer used for new tasks. This documentation exists to help understand tasks with `agentic_style: "prescriptive"` markers.

For current agent definitions, see [Current Agents](/ai-development/agents/current/).
:::

## What Changed

The project evolved from a **prescriptive** to a **deliberative** workflow style. The key changes affecting agents:

| Aspect | Archived (Prescriptive) | Current (Deliberative) |
|--------|------------------------|------------------------|
| **Analyst** | Wrote detailed specs with implementation code | Proposes multiple approaches without code |
| **Architect** | Validated existing specs | Selects approach AND writes implementation spec |
| **Developer** | Implemented specs exactly as written | Has autonomy within architectural constraints |
| **Workflow categories** | Single implicit flow | Formal categories (development, schema, infrastructure, documentation, bugfix) |

## Agent Registry

| Agent | Archived Role | Change Level |
|-------|--------------|--------------|
| [Analyst](/ai-development/agents/deprecated/analyst) | Wrote implementation specs with code | **Major** |
| [Architect](/ai-development/agents/deprecated/architect) | Validated specs | **Major** |
| [Developer](/ai-development/agents/deprecated/developer) | Implemented specs exactly | **Moderate** |
| [PM](/ai-development/agents/deprecated/pm) | Broke down goals into tasks | Minor |
| [Designer](/ai-development/agents/deprecated/designer) | UX/UI review | Minor |
| [QA](/ai-development/agents/deprecated/qa) | QA validation | Minor |
| [Reviewer](/ai-development/agents/deprecated/reviewer) | Code review | Minor |
| [Writer](/ai-development/agents/deprecated/writer) | Documentation updates | Minor |
| [Trainer](/ai-development/agents/deprecated/trainer) | Agent improvement | Minor |
| [Git Agent](/ai-development/agents/deprecated/git-agent) | Git operations | Minor |

::: info Current Agents
Current agent documentation will be added in E06-T014b.
:::

## When You'll See These

### Tasks with `agentic_style: "prescriptive"`

Some tasks in the backlog may have this marker:

```yaml
agentic_style: "prescriptive"
```

This indicates the task was designed for the prescriptive workflow, where:

- Specs contain implementation code that was intended to be followed exactly
- Less developer discretion was expected
- The analyst made more implementation decisions

### Older Specs with Implementation Code

When reviewing specs from earlier tasks, you may find detailed TypeScript implementations. In the prescriptive era, this was intentional — developers were expected to implement this code as-is.

### Reference for Understanding Decisions

The archived agent definitions help explain why certain older specs are structured the way they are and provide context for the evolution of our workflow approach.

## Source Location

Archived agent definitions are stored at:

```
.claude/archive/1_16/agents/
├── analyst.md
├── architect.md
├── developer.md
├── designer.md
├── pm.md
├── qa.md
├── reviewer.md
├── trainer.md
├── writer.md
└── git-agent.md
```

## Related Pages

- [Current Agents](/ai-development/agents/current/) — Active agent definitions (E06-T014b, coming soon)
- [Prescriptive Workflow](/ai-development/workflows/prescriptive) — Historical workflow overview
- [Archived Commands](/ai-development/commands/archived) — Commands from prescriptive era
