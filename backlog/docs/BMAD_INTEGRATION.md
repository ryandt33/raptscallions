# BMad Method Integration Guide

This document explains how the BMad Method (BMAD) integrates with the Raptscallions backlog system.

## Overview

Raptscallions uses two complementary systems:

1. **Backlog.md + Workflow Config** - Task tracking and state management
2. **BMad Method** - Framework for creating agents, workflows, and structured processes

## Directory Structure

```
raptscallions/
├── _bmad/                          # BMad Method installation
│   ├── bmb/                        # BMad Builder (create agents/workflows)
│   │   ├── config.yaml             # → Outputs to backlog/docs/bmb-creations
│   │   ├── agents/                 # Agent builder definitions
│   │   └── workflows/              # Agent/Workflow/Module creation workflows
│   │
│   ├── bmm/                        # Business Management Module
│   │   ├── config.yaml             # → Outputs to backlog/docs/
│   │   ├── agents/                 # PM, analyst, architect, dev, etc.
│   │   └── workflows/              # Planning, implementation, review workflows
│   │
│   ├── core/                       # Core framework (brainstorming, etc.)
│   └── _config/                    # Installation configuration
│
├── backlog/
│   ├── tasks/                      # Active tasks (E01-T001 format)
│   ├── completed/                  # Completed tasks
│   └── docs/
│       ├── .workflow/              # Task state machine config
│       ├── specs/                  # Implementation specifications
│       ├── reviews/                # Review artifacts
│       ├── planning-artifacts/     # BMM planning outputs (PRD, architecture)
│       ├── implementation-artifacts/  # BMM implementation outputs (stories)
│       └── bmb-creations/          # BMB created agents/workflows
│
└── .claude/
    ├── agents/                     # Project-specific agents (task-aware)
    └── commands/
        ├── bmad/                   # BMad commands (persona-based)
        └── *.md                    # Project commands (/analyze, /implement)
```

## Two Agent Systems

### 1. Project Agents (`.claude/agents/`)

These agents are **task-aware** and work with the Backlog.md workflow:

| Agent      | Role                  | Used in Workflow States               |
|------------|-----------------------|---------------------------------------|
| `analyst`  | Write specs           | ANALYZING → ANALYZED                  |
| `architect`| Review plans          | PLAN_REVIEW → APPROVED                |
| `developer`| Write tests and code  | WRITING_TESTS, IMPLEMENTING           |
| `reviewer` | Fresh-eyes code review| CODE_REVIEW                           |
| `qa`       | Validation            | QA_REVIEW, INTEGRATION_TESTING        |
| `designer` | UX/UI review          | UX_REVIEW, UI_REVIEW                  |
| `writer`   | Documentation         | DOCS_UPDATE                           |
| `pm`       | Task breakdown        | BACKLOG → BREAKING_DOWN               |

### 2. BMM Agents (`.claude/commands/bmad/bmm/agents/`)

These agents are **persona-based** with menu systems for interactive sessions:

| Agent      | Persona | Specialty                                    |
|------------|---------|----------------------------------------------|
| `analyst`  | Mary    | Research, product briefs, competitive analysis|
| `pm`       | James   | PRD creation, epic/story breakdown           |
| `architect`| Otto    | System architecture, technical decisions     |
| `dev`      | Devin   | Story implementation, code quality           |
| `ux-designer`| Curby| UX design, wireframes                        |
| `tea`      | Tabitha | Test engineering, QA automation              |
| `tech-writer`| Doc   | Documentation                                |

## When to Use Which

### Use Project Agents When:

- Working on a specific task (E01-T001)
- Following the workflow state machine
- Need task-aware context (spec files, test files, etc.)
- Running commands like `/analyze E01-T002`, `/implement E02-T003`

```bash
# Example: Analyze a task
/analyze E02-T006

# Example: Implement a task
/implement E02-T006
```

### Use BMM Agents/Workflows When:

- Starting a new project or feature area (greenfield planning)
- Creating comprehensive PRDs, architecture docs
- Running structured research or competitive analysis
- Sprint planning and retrospectives
- Need interactive, menu-driven sessions

```bash
# Example: Start BMM analyst for research
/bmad/bmm/agents/analyst

# Example: Run architecture workflow
/bmad/bmm/workflows/create-architecture

# Example: Sprint planning
/bmad/bmm/workflows/sprint-planning
```

## Artifact Mapping

| BMM Artifact           | Backlog Location                         |
|------------------------|------------------------------------------|
| Product Brief          | `backlog/docs/planning-artifacts/`       |
| PRD                    | `backlog/docs/planning-artifacts/`       |
| Architecture Doc       | `backlog/docs/planning-artifacts/`       |
| UX Design              | `backlog/docs/planning-artifacts/`       |
| Epics/Stories          | `backlog/docs/planning-artifacts/`       |
| Sprint Status          | `backlog/docs/implementation-artifacts/` |
| Story Files            | `backlog/docs/implementation-artifacts/` |
| Task Specs             | `backlog/docs/specs/{epic}/`             |
| Created Agents         | `backlog/docs/bmb-creations/`            |

## Workflow Integration

### Creating Tasks from BMM Stories

When using BMM to plan stories/epics, you can convert them to Backlog tasks:

1. Run BMM epic planning: `/bmad/bmm/workflows/create-epics-and-stories`
2. Stories created in `backlog/docs/implementation-artifacts/`
3. Convert to tasks: Create task files in `backlog/tasks/{epic}/`
4. Run through normal workflow: DRAFT → ANALYZING → etc.

### Using BMM Workflows Within Tasks

Some BMM workflows can supplement the task workflow:

| Task State         | BMM Workflow Option                    |
|--------------------|----------------------------------------|
| Before ANALYZING   | `/bmad/bmm/workflows/research`         |
| PLAN_REVIEW        | `/bmad/bmm/workflows/create-architecture`|
| CODE_REVIEW        | `/bmad/bmm/workflows/code-review`      |
| QA_REVIEW          | `/bmad/bmm/workflows/testarch-*`       |

## Configuration Files

### BMM Config (`_bmad/bmm/config.yaml`)

```yaml
project_name: raptscallions
planning_artifacts: "{project-root}/backlog/docs/planning-artifacts"
implementation_artifacts: "{project-root}/backlog/docs/implementation-artifacts"
project_knowledge: "{project-root}/docs"
output_folder: "{project-root}/backlog/docs"
```

### BMB Config (`_bmad/bmb/config.yaml`)

```yaml
bmb_creations_output_folder: "{project-root}/backlog/docs/bmb-creations"
output_folder: "{project-root}/backlog/docs"
```

### Workflow Config (`backlog/docs/.workflow/config.yaml`)

Defines the task state machine and agent mappings for the Backlog system.

## Common Commands

### Project Task Commands

```bash
/analyze E01-T002        # Write spec for task
/review-plan E01-T002    # Architect review
/write-tests E01-T002    # TDD red phase
/implement E01-T002      # TDD green phase
/review-code E01-T002    # Fresh-eyes review
/qa E01-T002             # QA validation
/integration-test E01-T002  # Integration testing
/update-docs E01-T002    # Documentation
```

### BMad Commands

```bash
# Agents (interactive menu-driven)
/bmad/bmm/agents/analyst
/bmad/bmm/agents/pm
/bmad/bmm/agents/architect
/bmad/bmm/agents/dev

# Workflows (structured processes)
/bmad/bmm/workflows/research
/bmad/bmm/workflows/create-product-brief
/bmad/bmm/workflows/prd
/bmad/bmm/workflows/create-architecture
/bmad/bmm/workflows/create-epics-and-stories
/bmad/bmm/workflows/dev-story
/bmad/bmm/workflows/code-review

# Builder (create new agents/workflows)
/bmad/bmb/workflows/agent
/bmad/bmb/workflows/workflow
```

## Best Practices

1. **Use Backlog for Task Execution** - Individual tasks flow through the state machine
2. **Use BMM for Planning** - New features, architecture decisions, comprehensive planning
3. **Store All Artifacts in Backlog** - Keep everything in `backlog/docs/`
4. **Reference Task IDs** - When BMM workflows create artifacts, reference task IDs
5. **Convert Stories to Tasks** - BMM stories should become Backlog tasks for execution

## Troubleshooting

### BMM commands not finding files

Check that paths resolve correctly:
- `{project-root}` should be `/home/ryan/Documents/coding/claude-box/raptscallions`
- Verify directories exist: `backlog/docs/planning-artifacts/`, etc.

### Agent persona not loading

For BMM agents, ensure you:
1. Load the full agent file: `@_bmad/bmm/agents/{agent}.md`
2. Read `_bmad/bmm/config.yaml` for session variables

### Workflow outputs not saving

Check `config.yaml` output paths and ensure directories exist.
