---
title: Slash Commands
description: Reference for slash commands that invoke AI agents in the deliberative workflow
source_synced_at: 2026-01-16
---

# Slash Commands

::: tip Source of Truth
This is the **authoritative reference** for slash commands used in the current deliberative workflow. These commands invoke agents to execute task phases.
:::

Slash commands are the primary interface for invoking AI agents. Each command maps to a specific agent and workflow phase.

## Commands by Category

### Analysis Commands

| Command | Agent | Description | Link |
|---------|-------|-------------|------|
| `/analyze` | Analyst | Standard task analysis with multiple approaches | [Analyst](/ai-development/commands/analyst) |
| `/analyze-schema` | Analyst | Schema analysis with tech debt focus | [Analyst](/ai-development/commands/analyst) |

### Architecture Commands

| Command | Agent | Description | Link |
|---------|-------|-------------|------|
| `/review-plan` | Architect | Review analysis, select approach, create spec | [Architect](/ai-development/commands/architect) |

### Development Commands

| Command | Agent | Description | Link |
|---------|-------|-------------|------|
| `/write-tests` | Developer | TDD red phase - write tests first | [Developer](/ai-development/commands/developer) |
| `/implement` | Developer | TDD green phase - write code to pass tests | [Developer](/ai-development/commands/developer) |
| `/investigate` | Developer | Bug investigation and root cause analysis | [Developer](/ai-development/commands/developer) |

### Design Commands

| Command | Agent | Description | Link |
|---------|-------|-------------|------|
| `/review-ux` | Designer | UX review of spec before development | [Designer](/ai-development/commands/designer) |
| `/review-ui` | Designer | UI review of implementation | [Designer](/ai-development/commands/designer) |
| `/align-design` | Designer | Review design guides for UI alignment | [Designer](/ai-development/commands/designer) |

### PM Commands

| Command | Agent | Description | Link |
|---------|-------|-------------|------|
| `/plan` | PM | Create tasks from high-level goal | [PM](/ai-development/commands/pm) |
| `/replan-task` | PM | Refactor poorly-written task | [PM](/ai-development/commands/pm) |
| `/roadmap` | PM | View or update project roadmap | [PM](/ai-development/commands/pm) |
| `/epic-review` | PM | Review completed epic, create follow-ups | [PM](/ai-development/commands/pm) |
| `/next-task` | PM | Find next task ready to work on | [PM](/ai-development/commands/pm) |
| `/task-status` | PM | Check task status | [PM](/ai-development/commands/pm) |

### QA Commands

| Command | Agent | Description | Link |
|---------|-------|-------------|------|
| `/qa` | QA | Full QA validation against requirements | [QA](/ai-development/commands/qa) |
| `/verify-fix` | QA | Verify bug fix with fresh context | [QA](/ai-development/commands/qa) |
| `/integration-test` | QA | Run integration tests | [QA](/ai-development/commands/qa) |

### Review Commands

| Command | Agent | Description | Link |
|---------|-------|-------------|------|
| `/review-code` | Reviewer | Fresh-eyes code review | [Reviewer](/ai-development/commands/reviewer) |
| `/review-migration` | Reviewer | Migration safety review for schema tasks | [Reviewer](/ai-development/commands/reviewer) |

### Documentation Commands

| Command | Agent | Description | Link |
|---------|-------|-------------|------|
| `/outline` | Writer | Create document outline for approval | [Writer](/ai-development/commands/writer) |
| `/write-docs` | Writer | Write standalone documentation | [Writer](/ai-development/commands/writer) |
| `/review-docs` | Writer | Technical accuracy review | [Writer](/ai-development/commands/writer) |
| `/update-docs` | Writer | Update docs after implementation | [Writer](/ai-development/commands/writer) |
| `/document` | Writer | Full documentation workflow | [Writer](/ai-development/commands/writer) |

### Training Commands

| Command | Agent | Description | Link |
|---------|-------|-------------|------|
| `/audit` | Trainer | Review specific agent output for quality | [Trainer](/ai-development/commands/trainer) |
| `/postmortem` | Trainer | Deep dive on agent failure | [Trainer](/ai-development/commands/trainer) |
| `/refine-agent` | Trainer | Analyze patterns across outputs | [Trainer](/ai-development/commands/trainer) |
| `/apply-improvements` | Trainer | Implement approved agent changes | [Trainer](/ai-development/commands/trainer) |
| `/write-improvement` | Trainer | Write and track technical improvements | [Trainer](/ai-development/commands/trainer) |

### Utility Commands

| Command | Agent | Description | Link |
|---------|-------|-------------|------|
| `/commit-and-pr` | Git Agent | Create commit and pull request | [Utility](/ai-development/commands/utility) |
| `/skip-github` | - | Skip GitHub automation for manual workflow | [Utility](/ai-development/commands/utility) |
| `/investigate-failure` | - | Investigate integration test failure | [Utility](/ai-development/commands/utility) |

## Workflow → Command Mapping

Which commands apply to which workflow category:

| Command | development | schema | infrastructure | documentation | bugfix |
|---------|-------------|--------|----------------|---------------|--------|
| `/analyze` | ✅ | - | ✅ (standard) | - | - |
| `/analyze-schema` | - | ✅ | - | - | - |
| `/review-plan` | ✅ | ✅ | ✅ (standard) | - | - |
| `/review-ux` | ✅ (frontend) | - | - | - | - |
| `/write-tests` | ✅ | - | ✅ (standard) | - | ✅ |
| `/implement` | ✅ | ✅ | ✅ | - | ✅ |
| `/review-ui` | ✅ (frontend) | - | - | - | - |
| `/review-code` | ✅ | - | ✅ (standard) | - | ✅ (standard) |
| `/review-migration` | - | ✅ | - | - | - |
| `/qa` | ✅ | ✅ | ✅ (standard) | - | - |
| `/verify-fix` | - | - | - | - | ✅ |
| `/outline` | - | - | - | ✅ (standard) | - |
| `/write-docs` | - | - | - | ✅ | - |
| `/review-docs` | - | - | - | ✅ (standard) | - |
| `/update-docs` | ✅ | ✅ | ✅ (standard) | - | - |
| `/investigate` | - | - | - | - | ✅ (standard) |

## Command Invocation

Commands are invoked with a task ID:

```bash
/analyze E01-T001
/write-tests E01-T001
/implement E01-T001
```

Some commands accept additional flags:

```bash
/epic-review E01 --create           # Create follow-up tasks
/refine-agent qa --all              # Analyze all outputs
/apply-improvements path.md --items 1,3  # Apply specific items
```

## Command Files

Command definitions live in `.claude/commands/`:

```
.claude/commands/
├── analyst/
│   ├── analyze.md
│   └── analyze-schema.md
├── architect/
│   └── review-plan.md
├── developer/
│   ├── write-tests.md
│   ├── implement.md
│   └── investigate.md
├── designer/
│   ├── review-ux.md
│   ├── review-ui.md
│   └── align-design.md
├── pm/
│   ├── plan.md
│   ├── replan-task.md
│   ├── roadmap.md
│   ├── epic-review.md
│   ├── next-task.md
│   └── task-status.md
├── qa/
│   ├── qa.md
│   ├── verify-fix.md
│   └── integration-test.md
├── reviewer/
│   ├── review-code.md
│   └── review-migration.md
├── writer/
│   ├── outline.md
│   ├── write-docs.md
│   ├── review-docs.md
│   ├── update-docs.md
│   └── document.md
├── trainer/
│   ├── audit.md
│   ├── postmortem.md
│   ├── refine-agent.md
│   ├── apply-improvements.md
│   └── write-improvement.md
└── utility/
    ├── commit-and-pr.md
    ├── skip-github.md
    └── investigate-failure.md
```

## Related Pages

- [Current Agents](/ai-development/agents/current/) — Agents invoked by commands
- [Deliberative Workflow](/ai-development/workflows/deliberative) — Command sequences
- [Archived Commands](/ai-development/commands/archived) — Historical commands (E01-E05)

**Source Reference:**
- Command definitions: `.claude/commands/**/*.md`
