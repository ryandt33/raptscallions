---
title: AI-Assisted Development
description: How RaptScallions uses AI agents throughout the development workflow
---

# AI-Assisted Development

RaptScallions uses a heavily agentic development process where AI agents collaborate with humans throughout the development lifecycle — from requirements analysis through code review and QA.

## Architecture Overview

| Agent Type | Role | Invoked By |
|------------|------|------------|
| Analyst | Requirements analysis, approach exploration | `/analyze` command |
| Architect | Approach selection, spec creation | `/review-plan` command |
| Developer | TDD implementation (tests first, then code) | `/write-tests`, `/implement` commands |
| Designer | UX review of specs and implementations | `/review-ux`, `/review-ui` commands |
| QA | Validation against acceptance criteria | `/qa` command |
| Reviewer | Code review | `/review-code` command |

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
| `.claude/settings.json` | Agent configuration |

## Sections

- [Concepts](/ai-development/concepts/) — Core ideas: agent architecture, workflow states, task lifecycle
- [Patterns](/ai-development/patterns/) — Reusable approaches: TDD workflow, multi-agent handoff
- [Decisions](/ai-development/decisions/) — Architecture decision records for agentic development
- [Agents](/ai-development/agents/) — Agent documentation (current and deprecated)
- [Commands](/ai-development/commands/) — Slash command reference
- [Workflows](/ai-development/workflows/) — Prescriptive vs deliberative workflow styles
- [Troubleshooting](/ai-development/troubleshooting/) — Common issues and solutions

## Implementation Tasks

| Task | Description | Status |
|------|-------------|--------|
| [E06-T013](/backlog/tasks/E06/E06-T013.md) | KB framework structure | In Progress |
| [E06-T014](/backlog/tasks/E06/E06-T014.md) | Current agents and commands | Pending |
| [E06-T015](/backlog/tasks/E06/E06-T015.md) | Historical prescriptive workflow | Pending |
| [E06-T016](/backlog/tasks/E06/E06-T016.md) | Current deliberative workflow | Pending |

## Related Domains

- [Contributing](/contributing/) — How to contribute to the project
- [Testing](/testing/) — Testing patterns used in TDD workflow
