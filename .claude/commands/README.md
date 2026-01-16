# Available Commands

Commands are organized by agent type. See [workflows/README.md](../workflows/README.md) for workflow selection.

## Directory Structure

```
.claude/commands/
├── analyst/          # Analysis commands
│   └── analyze.md
├── architect/        # Architecture review
│   └── review-plan.md
├── developer/        # Development commands
│   ├── implement.md
│   └── write-tests.md
├── designer/         # Design review commands
│   ├── align-design.md
│   ├── review-ui.md
│   └── review-ux.md
├── pm/               # Project management
│   ├── epic-review.md
│   ├── next-task.md
│   ├── plan.md
│   ├── replan-task.md
│   ├── roadmap.md
│   └── task-status.md
├── qa/               # Quality assurance
│   ├── integration-test.md
│   └── qa.md
├── reviewer/         # Code review
│   └── review-code.md
├── trainer/          # Agent training
│   ├── apply-improvements.md
│   ├── audit.md
│   ├── postmortem.md
│   ├── refine-agent.md
│   └── write-improvement.md
├── utility/          # Utility commands
│   ├── commit-and-pr.md
│   ├── investigate-failure.md
│   └── skip-github.md
└── writer/           # Documentation
    ├── document.md
    └── update-docs.md
```

## Commands by Workflow

### Development Workflow

| Phase | Command | Agent | Description |
|-------|---------|-------|-------------|
| Analysis | `/analyze` | analyst | Write implementation spec |
| Plan Review | `/review-plan` | architect | Validate approach |
| UX Review | `/review-ux` | designer | Review spec for UX (if `frontend`) |
| Tests | `/write-tests` | developer | Write tests (TDD red phase) |
| Implementation | `/implement` | developer | Implement code |
| UI Review | `/review-ui` | designer | Review UI (if `frontend`) |
| Code Review | `/review-code` | reviewer | Fresh-eyes review |
| QA | `/qa` | qa | Validate + integration tests |
| Docs | `/update-docs` | writer | Update documentation |

### Schema Workflow

| Phase | Command | Agent | Description |
|-------|---------|-------|-------------|
| Analysis | `/analyze-schema` | analyst | Schema analysis with tech debt focus |
| Plan Review | `/review-plan` | architect | Tech debt sign-off |
| Implementation | `/implement` | developer | Create migration |
| Migration Review | `/review-migration` | reviewer | Migration safety review |
| QA | `/qa` | qa | Integration testing |
| Docs | `/update-docs` | writer | Update documentation |

### Infrastructure Workflow

**Standard:**
| Phase | Command | Agent | Description |
|-------|---------|-------|-------------|
| Analysis | `/analyze` | analyst | Implementation spec |
| Plan Review | `/review-plan` | architect | Validate approach |
| Tests | `/write-tests` | developer | Write tests for scripts |
| Implementation | `/implement` | developer | Implement |
| Code Review | `/review-code` | reviewer | Code review |
| QA | `/qa` | qa | Validation |
| Docs | `/update-docs` | writer | Update documentation |

**Simple (`infra:simple`):**
| Phase | Command | Agent | Description |
|-------|---------|-------|-------------|
| Implementation | `/implement` | developer | Create config/code |
| Docs | `/update-docs` | writer | Update documentation |

### Documentation Workflow

**Standard:**
| Phase | Command | Agent | Description |
|-------|---------|-------|-------------|
| Outline | `/outline` | writer | Create structure |
| Writing | `/write-docs` | writer | Write content |
| Review | `/review-docs` | writer | Technical accuracy |

**Simple (`docs:simple`):**
| Phase | Command | Agent | Description |
|-------|---------|-------|-------------|
| Writing | `/write-docs` | writer | Write content |

### Bugfix Workflow

**Standard:**
| Phase | Command | Agent | Description |
|-------|---------|-------|-------------|
| Investigation | `/investigate` | developer | Root cause diagnosis |
| Tests | `/write-tests` | developer | Regression test |
| Fix | `/implement` | developer | Implement fix |
| Code Review | `/review-code` | reviewer | Review fix |
| Verification | `/verify-fix` | qa | Verify bug fixed |

**Simple (`bugfix:simple`):**
| Phase | Command | Agent | Description |
|-------|---------|-------|-------------|
| Fix | `/implement` | developer | Implement fix |
| Verification | `/verify-fix` | qa | Verify bug fixed |

**Hotfix (`bugfix:hotfix`):**
| Phase | Command | Agent | Description |
|-------|---------|-------|-------------|
| Investigation | `/investigate` | developer | Quick root cause |
| Fix | `/implement` | developer | Implement fix |
| Tests | `/write-tests` | developer | Regression test (after fix) |
| Verification | `/verify-fix` | qa | Verify bug fixed |

---

## All Commands Reference

### Analyst Commands

**`/analyze [task-id]`**
- Reads task and explores codebase
- Writes detailed implementation spec
- Example: `/analyze E01-T003`

**`/analyze-schema [task-id]`** *(NEW)*
- Schema-focused analysis with tech debt assessment
- Outputs migration approach + tech debt risks
- Example: `/analyze-schema E02-T005`

### Architect Commands

**`/review-plan [task-id]`**
- Validates implementation approach
- Checks architectural consistency
- Example: `/review-plan E01-T003`

### Developer Commands

**`/write-tests [task-id]`**
- Writes tests first (TDD red phase)
- Creates comprehensive test coverage
- Example: `/write-tests E01-T003`

**`/implement [task-id]`**
- Implements code to pass tests
- TDD green phase
- Example: `/implement E01-T003`

**`/investigate [task-id]`** *(NEW)*
- Diagnoses bug root cause
- Documents findings in task file
- Example: `/investigate E06-T020`

### Designer Commands

**`/review-ux [task-id]`**
- Reviews spec for UX concerns
- Checks usability and accessibility
- Example: `/review-ux E01-T005`

**`/review-ui [task-id]`**
- Reviews implemented UI/components
- Validates design consistency
- Example: `/review-ui E01-T005`

**`/align-design [--domain <name>] [--create]`**
- Reviews/creates design guides
- Ensures UI alignment standards
- Example: `/align-design --domain ui --create`

### PM Commands

**`/plan [goal/feature description]`**
- Creates epics and tasks from goals
- Defines dependencies and priorities
- **Selects workflow category and variant**
- Example: `/plan "Add user authentication"`

**`/replan-task [task-id]`**
- Refactors poorly-written tasks
- Removes implementation detail
- Example: `/replan-task E05-T006`

**`/roadmap`**
- Shows current project roadmap
- Example: `/roadmap` or `/roadmap plan-next`

**`/epic-review [epic-id]`**
- Reviews completed epic
- Creates follow-up tasks
- Example: `/epic-review E01 --create`

**`/next-task`**
- Shows ready tasks by priority
- Example: `/next-task` or `/next-task E01`

**`/task-status`**
- Shows task board or specific task
- Example: `/task-status E01-T003`

### QA Commands

**`/qa [task-id]`**
- Runs unit tests, build, typecheck
- Includes integration testing (Docker)
- Validates acceptance criteria
- Example: `/qa E01-T003`

**`/verify-fix [task-id]`** *(NEW)*
- Verifies bug is fixed with fresh context
- Checks regression test passes
- Example: `/verify-fix E06-T020`

**`/integration-test [task-id]`** *(DEPRECATED)*
- Now merged into `/qa`
- Kept for standalone use

**`/investigate-failure [task-id]`**
- Analyzes integration test failures
- Routes to appropriate next step
- Example: `/investigate-failure E01-T003`

### Reviewer Commands

**`/review-code [task-id]`**
- Fresh-eyes code review
- Identifies issues by severity
- Example: `/review-code E01-T003`

**`/review-migration [task-id]`** *(NEW)*
- Migration safety review
- Checks reversibility, data integrity
- Example: `/review-migration E02-T005`

### Writer Commands

**`/outline [task-id]`** *(NEW)*
- Creates document structure
- Identifies sections and code examples
- Example: `/outline E06-T010`

**`/write-docs [task-id]`** *(NEW)*
- Writes standalone documentation
- Follows KB design patterns
- Example: `/write-docs E06-T010`

**`/review-docs [task-id]`** *(NEW)*
- Technical accuracy review
- Verifies code examples work
- Example: `/review-docs E06-T010`

**`/update-docs [task-id]`**
- Updates docs after implementation
- Part of dev/schema/infra workflows
- Example: `/update-docs E01-T003`

**`/document [task-id]`**
- Two-phase KB documentation workflow
- Writer + reviewer in one command
- Example: `/document E06-T010`

### Trainer Commands

**`/audit <agent-type> <artifact-path>`**
- Analyzes agent output quality
- Example: `/audit qa backlog/docs/reviews/E01/E01-T009-qa-report.md`

**`/postmortem <agent-type> <artifact-path>`**
- Deep dive when agent fails
- Example: `/postmortem developer packages/db/src/schema.ts`

**`/refine-agent <agent-type> [--epic EPIC-ID]`**
- Analyzes patterns across outputs
- Creates improvement plan
- Example: `/refine-agent qa --epic E01`

**`/apply-improvements <plan-path>`**
- Applies improvements to agent files
- Example: `/apply-improvements backlog/docs/training/qa-improvements.md`

**`/write-improvement [--domain <name>]`**
- Tracks tech debt in KB improvements
- Example: `/write-improvement --domain ai`

### Utility Commands

**`/commit-and-pr [task-id]`**
- Commits and creates PR
- Runs CI checks locally first
- Example: `/commit-and-pr E01-T003`

**`/skip-github`**
- Skip GitHub automation for manual workflow
- Use when CI/GitHub is unavailable

**`/investigate-failure [task-id]`**
- Analyzes integration failures
- Routes to appropriate next step

---

## Adding New Commands

1. Create `.claude/commands/{agent-type}/{command}.md`
2. Include frontmatter with `description` and `allowed-tools`
3. Include "Next Step" section at end
4. Update this README

```markdown
---
description: Brief command description
allowed-tools:
  - Read
  - Write
  - Glob
---

# Command Name

[Command documentation...]

## Next Step

Based on the **{category}** workflow ({variant}):

Run `/next-command {task-id}` (agent-type)
```

---

## Related Documentation

- [workflows/README.md](../workflows/README.md) - Workflow selection and phases
- [agents/](../agents/) - Agent definitions
- [CLAUDE.md](../../CLAUDE.md) - Project instructions
