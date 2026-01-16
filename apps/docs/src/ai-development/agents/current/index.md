---
title: Current Agents
description: Active agents in the RaptScallions deliberative workflow
source_synced_at: 2026-01-16
---

# Current Agents

::: tip Source of Truth
This is the **authoritative reference** for agents used in the current deliberative workflow. These agents drive all new task execution (E06+).
:::

AI agents are specialized assistants that handle specific phases of the development workflow. Each agent has a defined role, tools, and output format.

## Agent Registry

| Agent | Role | Commands | Tools |
|-------|------|----------|-------|
| [Analyst](/ai-development/agents/current/analyst) | Requirements analysis, approach exploration | `/analyze`, `/analyze-schema` | Read, Write, Glob, Grep |
| [Architect](/ai-development/agents/current/architect) | Approach selection, spec creation | `/review-plan` | Read, Write, Glob, Grep |
| [Designer](/ai-development/agents/current/designer) | UX/UI review, accessibility | `/review-ux`, `/review-ui`, `/align-design` | Read, Glob, Grep |
| [Developer](/ai-development/agents/current/developer) | TDD implementation (tests first, then code) | `/write-tests`, `/implement`, `/investigate` | Read, Write, Edit, Bash, Glob, Grep |
| [Git Agent](/ai-development/agents/current/git-agent) | Git operations, PR creation | `/commit-and-pr` | Read, Bash, Grep, Glob, Edit |
| [PM](/ai-development/agents/current/pm) | Task breakdown, epic review | `/plan`, `/replan-task`, `/roadmap`, `/epic-review`, `/next-task`, `/task-status` | Read, Write, Glob, Grep |
| [QA](/ai-development/agents/current/qa) | Validation against requirements | `/qa`, `/verify-fix`, `/integration-test` | Read, Glob, Grep, Bash |
| [Reviewer](/ai-development/agents/current/reviewer) | Code review, migration review | `/review-code`, `/review-migration` | Read, Glob, Grep, Bash |
| [Trainer](/ai-development/agents/current/trainer) | Agent improvement, quality audits | `/audit`, `/postmortem`, `/refine-agent`, `/apply-improvements`, `/write-improvement` | Read, Glob, Grep, Write, Edit |
| [Writer](/ai-development/agents/current/writer) | Documentation updates | `/outline`, `/write-docs`, `/review-docs`, `/update-docs`, `/document` | Read, Write, Edit, Glob, Grep |

## Agent Lifecycle

### Invocation

Agents are invoked via slash commands. Each command maps to a specific agent:

```bash
/analyze E01-T001    # Invokes analyst agent
/review-plan E01-T001  # Invokes architect agent
/implement E01-T001   # Invokes developer agent
```

### Handoffs

Agents hand off to each other based on workflow state. Each agent's output includes a "Next Step" recommendation:

```
Analyst → Architect → Developer → Reviewer → QA → Writer
```

### Fresh-Eyes Principle

Some agents intentionally have **no context** from previous agents to provide unbiased review:

- **Reviewer** — Sees only the code and spec, not implementation discussions
- **QA** — Tests against requirements, not implementation details

This mirrors real-world code review where reviewers haven't watched the code being written.

## Quick Reference

### Which Agent for Which Task?

| Task Type | Start With | Key Agents |
|-----------|------------|------------|
| New feature | `/analyze` | Analyst → Architect → Developer |
| Bug fix | `/investigate` | Developer → Reviewer → QA |
| Documentation | `/outline` | Writer |
| Schema change | `/analyze-schema` | Analyst → Architect → Developer |
| Code quality | `/audit` | Trainer |

### Common Agent Combinations

**Development workflow:**
```
Analyst → Architect → Developer → Reviewer → QA → Writer
```

**Bugfix workflow:**
```
Developer (investigate) → Developer (tests) → Developer (implement) → Reviewer → QA
```

**Documentation workflow:**
```
Writer (outline) → Writer (write) → Writer (review)
```

## Agent Definition Files

Agent definitions live in `.claude/agents/`:

```
.claude/agents/
├── analyst.md
├── architect.md
├── designer.md
├── developer.md
├── git-agent.md
├── pm.md
├── qa.md
├── reviewer.md
├── trainer.md
└── writer.md
```

Each file contains:
- **Frontmatter** — Name, description, allowed tools
- **Role description** — What the agent does
- **Process** — Step-by-step workflow
- **Output format** — Expected artifacts
- **Guidelines** — Dos and don'ts

## Related Pages

- [Slash Commands](/ai-development/commands/) — Commands that invoke agents
- [Deliberative Workflow](/ai-development/workflows/deliberative) — How agents work together
- [Deprecated Agents](/ai-development/agents/deprecated/) — Historical agent definitions (E01-E05)

**Source Reference:**
- Agent definitions: `.claude/agents/*.md`
