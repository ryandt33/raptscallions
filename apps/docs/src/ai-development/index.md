---
title: AI-Assisted Development
description: How RaptScallions uses AI agents throughout the development workflow
source_synced_at: 2026-01-16
---

# AI-Assisted Development

RaptScallions uses a heavily agentic development process where AI agents collaborate with humans throughout the development lifecycle — from requirements analysis through code review and QA.

## Architecture Overview

| Agent Type | Role | Invoked By |
|------------|------|------------|
| [Analyst](/ai-development/agents/current/analyst) | Requirements analysis, approach exploration | `/analyze` command |
| [Architect](/ai-development/agents/current/architect) | Approach selection, spec creation | `/review-plan` command |
| [Developer](/ai-development/agents/current/developer) | TDD implementation (tests first, then code) | `/write-tests`, `/implement` commands |
| [Designer](/ai-development/agents/current/designer) | UX review of specs and implementations | `/review-ux`, `/review-ui` commands |
| [QA](/ai-development/agents/current/qa) | Validation against acceptance criteria | `/qa` command |
| [Reviewer](/ai-development/agents/current/reviewer) | Code review | `/review-code` command |

## Workflow

```
Task Created → Analyze → Review Plan → Write Tests → Implement → Review → QA → Done
     ↓            ↓           ↓            ↓            ↓         ↓      ↓
   human      analyst    architect    developer    developer  reviewer  qa
```

## Quick Start

```bash
# Analyze a task and propose approaches
/analyze E01-T001

# Review analysis and create implementation spec
/review-plan E01-T001

# Write tests based on spec (TDD red phase)
/write-tests E01-T001

# Implement code to pass tests (TDD green phase)
/implement E01-T001
```

## Key Files

| Path | Purpose |
|------|---------|
| `.claude/agents/` | Agent definitions and responsibilities |
| `.claude/commands/` | Slash command implementations |
| `.claude/workflows/` | Workflow definitions |
| `.claude/settings.json` | Agent configuration |

## Sections

- [Concepts](/ai-development/concepts/) — Core ideas: agent architecture, workflow states, task lifecycle
- [Patterns](/ai-development/patterns/) — Reusable approaches: TDD workflow, multi-agent handoff
- [Decisions](/ai-development/decisions/) — Architecture decision records for agentic development
- [Agents](/ai-development/agents/) — Agent documentation ([current](/ai-development/agents/current/) and [deprecated](/ai-development/agents/deprecated/))
- [Commands](/ai-development/commands/) — Slash command reference
- [Workflows](/ai-development/workflows/) — [Deliberative](/ai-development/workflows/deliberative) (current) vs [prescriptive](/ai-development/workflows/prescriptive) (historical)
- [Troubleshooting](/ai-development/troubleshooting/) — Common issues and solutions

## Related Domains

- [Contributing](/contributing/) — How to contribute to the project
- [Testing](/testing/) — Testing patterns used in TDD workflow
