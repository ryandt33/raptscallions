---
title: Archived Commands
description: Historical slash commands from the prescriptive workflow era
source_synced_at: 2026-01-16
---

# Archived Commands

::: warning Archived / Historical
This documents the command structure from the **prescriptive workflow era**. Commands have been reorganized in the current deliberative workflow.

For current commands, see individual category pages.
:::

## What Changed

The command structure evolved significantly:

| Aspect | Archived (Prescriptive) | Current (Deliberative) |
|--------|------------------------|------------------------|
| **Directory structure** | Flat (`commands/*.md`) | Organized by agent (`commands/{agent}/*.md`) |
| **Workflow variants** | Single implicit flow | Multiple workflow categories with variants |
| **Command count** | Fewer commands | Additional specialized commands |

## Structural Comparison

### Archived Structure (Flat)

```
.claude/commands/
├── README.md
├── analyze.md
├── implement.md
├── review-plan.md
├── review-code.md
├── review-ux.md
├── review-ui.md
├── write-tests.md
├── qa.md
├── update-docs.md
├── commit-and-pr.md
├── plan.md
├── replan-task.md
├── roadmap.md
├── epic-review.md
├── next-task.md
├── task-status.md
├── align-design.md
├── document.md
├── write-improvement.md
├── integration-test.md
├── investigate-failure.md
├── audit.md
├── postmortem.md
├── refine-agent.md
└── apply-improvements.md
```

### Current Structure (By Agent)

```
.claude/commands/
├── README.md
├── analyst/
│   ├── analyze.md
│   └── analyze-schema.md      (NEW)
├── architect/
│   └── review-plan.md
├── developer/
│   ├── implement.md
│   ├── investigate.md         (NEW)
│   └── write-tests.md
├── designer/
│   ├── align-design.md
│   ├── review-ui.md
│   └── review-ux.md
├── pm/
│   ├── epic-review.md
│   ├── next-task.md
│   ├── plan.md
│   ├── replan-task.md
│   ├── roadmap.md
│   └── task-status.md
├── qa/
│   ├── integration-test.md
│   ├── qa.md
│   └── verify-fix.md          (NEW)
├── reviewer/
│   ├── review-code.md
│   └── review-migration.md    (NEW)
├── trainer/
│   ├── apply-improvements.md
│   ├── audit.md
│   ├── postmortem.md
│   ├── refine-agent.md
│   └── write-improvement.md
├── utility/
│   ├── commit-and-pr.md
│   ├── investigate-failure.md
│   └── skip-github.md         (NEW)
└── writer/
    ├── document.md
    ├── outline.md             (NEW)
    ├── review-docs.md         (NEW)
    ├── update-docs.md
    └── write-docs.md          (NEW)
```

## New Commands in Current Workflow

Commands that were added in the deliberative workflow:

| Command | Agent | Purpose |
|---------|-------|---------|
| `/analyze-schema` | analyst | Schema analysis with tech debt focus |
| `/investigate` | developer | Bug root cause diagnosis |
| `/verify-fix` | qa | Bug fix verification |
| `/review-migration` | reviewer | Migration safety review |
| `/outline` | writer | Document structure planning |
| `/write-docs` | writer | Standalone documentation creation |
| `/review-docs` | writer | Technical accuracy review |
| `/skip-github` | utility | Skip GitHub automation for manual workflow |

## Why Commands Were Reorganized

The flat structure had limitations:

1. **Hard to discover** — No obvious grouping by function
2. **Unclear ownership** — Which agent handles which command?
3. **No workflow context** — Commands existed without workflow guidance
4. **Missing specialization** — Same command for all task types

The organized structure provides:

1. **Agent ownership** — Clear which agent executes each command
2. **Discoverability** — Related commands grouped together
3. **Workflow integration** — Commands map to workflow phases
4. **Specialization** — Different commands for different task types (e.g., `/analyze` vs `/analyze-schema`)

## Archived Command Reference

The archived commands README documented the single implicit workflow:

```
Task State Flow (Prescriptive):
DRAFT → /analyze → ANALYZED
  → /review-ux → UX_REVIEW
  → /review-plan → APPROVED
  → /write-tests → TESTS_READY
  → /implement → IMPLEMENTED
  → /review-ui → UI_REVIEW
  → /review-code → CODE_REVIEW
  → /qa → QA_REVIEW
  → /integration-test → DOCS_UPDATE
  → /update-docs → PR_READY
  → /commit-and-pr → DONE
```

The current workflow system has multiple paths based on task category:

- **Development** — Full TDD flow with optional UX/UI reviews
- **Schema** — Schema-focused with migration review
- **Infrastructure** — Simple or standard based on complexity
- **Documentation** — Outline → write → review flow
- **Bugfix** — Investigation → fix → verify flow

## Source Reference

Archived commands are stored at:

```
.claude/archive/1_16/commands/
├── README.md     ← Command index and workflow documentation
└── *.md          ← Individual command files
```

## Related Pages

- [Prescriptive Workflow](/ai-development/workflows/prescriptive) — Historical workflow overview
- [Deprecated Agents](/ai-development/agents/deprecated/) — Historical agent definitions
- [Current Commands Index](/ai-development/commands/) — Active commands (E06-T014b)
