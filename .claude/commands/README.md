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

| Phase | Command | Description |
|-------|---------|-------------|
| Analysis | `/analyst:analyze` | Write implementation spec |
| Plan Review | `/architect:review-plan` | Validate approach |
| UX Review | `/designer:review-ux` | Review spec for UX (if `frontend`) |
| Tests | `/developer:write-tests` | Write tests (TDD red phase) |
| Implementation | `/developer:implement` | Implement code |
| UI Review | `/designer:review-ui` | Review UI (if `frontend`) |
| Code Review | `/reviewer:review-code` | Fresh-eyes review |
| QA | `/qa:qa` | Validate + integration tests |
| Docs | `/writer:update-docs` | Update documentation |

### Schema Workflow

| Phase | Command | Description |
|-------|---------|-------------|
| Analysis | `/analyst:analyze-schema` | Schema analysis with tech debt focus |
| Plan Review | `/architect:review-plan` | Tech debt sign-off |
| Implementation | `/developer:implement` | Create migration |
| Migration Review | `/reviewer:review-migration` | Migration safety review |
| QA | `/qa:qa` | Integration testing |
| Docs | `/writer:update-docs` | Update documentation |

### Infrastructure Workflow

**Standard:**
| Phase | Command | Description |
|-------|---------|-------------|
| Analysis | `/analyst:analyze` | Implementation spec |
| Plan Review | `/architect:review-plan` | Validate approach |
| Tests | `/developer:write-tests` | Write tests for scripts |
| Implementation | `/developer:implement` | Implement |
| Code Review | `/reviewer:review-code` | Code review |
| QA | `/qa:qa` | Validation |
| Docs | `/writer:update-docs` | Update documentation |

**Simple (`infra:simple`):**
| Phase | Command | Description |
|-------|---------|-------------|
| Implementation | `/developer:implement` | Create config/code |
| Docs | `/writer:update-docs` | Update documentation |

### Documentation Workflow

**Standard:**
| Phase | Command | Description |
|-------|---------|-------------|
| Outline | `/writer:outline` | Create structure |
| Writing | `/writer:write-docs` | Write content |
| Review | `/writer:review-docs` | Technical accuracy |

**Simple (`docs:simple`):**
| Phase | Command | Description |
|-------|---------|-------------|
| Writing | `/writer:write-docs` | Write content |

### Bugfix Workflow

**Standard:**
| Phase | Command | Description |
|-------|---------|-------------|
| Investigation | `/developer:investigate` | Root cause diagnosis |
| Tests | `/developer:write-tests` | Regression test |
| Fix | `/developer:implement` | Implement fix |
| Code Review | `/reviewer:review-code` | Review fix |
| Verification | `/qa:verify-fix` | Verify bug fixed |

**Simple (`bugfix:simple`):**
| Phase | Command | Description |
|-------|---------|-------------|
| Fix | `/developer:implement` | Implement fix |
| Verification | `/qa:verify-fix` | Verify bug fixed |

**Hotfix (`bugfix:hotfix`):**
| Phase | Command | Description |
|-------|---------|-------------|
| Investigation | `/developer:investigate` | Quick root cause |
| Fix | `/developer:implement` | Implement fix |
| Tests | `/developer:write-tests` | Regression test (after fix) |
| Verification | `/qa:verify-fix` | Verify bug fixed |

---

## All Commands Reference

### Analyst Commands

**`/analyst:analyze [task-id]`**
- Reads task and explores codebase
- Writes detailed implementation spec
- Example: `/analyst:analyze E01-T003`

**`/analyst:analyze-schema [task-id]`**
- Schema-focused analysis with tech debt assessment
- Outputs migration approach + tech debt risks
- Example: `/analyst:analyze-schema E02-T005`

### Architect Commands

**`/architect:review-plan [task-id]`**
- Validates implementation approach
- Checks architectural consistency
- Example: `/architect:review-plan E01-T003`

### Developer Commands

**`/developer:write-tests [task-id]`**
- Writes tests first (TDD red phase)
- Creates comprehensive test coverage
- Example: `/developer:write-tests E01-T003`

**`/developer:implement [task-id]`**
- Implements code to pass tests
- TDD green phase
- Example: `/developer:implement E01-T003`

**`/developer:investigate [task-id]`**
- Diagnoses bug root cause
- Documents findings in task file
- Example: `/developer:investigate E06-T020`

### Designer Commands

**`/designer:review-ux [task-id]`**
- Reviews spec for UX concerns
- Checks usability and accessibility
- Example: `/designer:review-ux E01-T005`

**`/designer:review-ui [task-id]`**
- Reviews implemented UI/components
- Validates design consistency
- Example: `/designer:review-ui E01-T005`

**`/designer:align-design [--domain <name>] [--create]`**
- Reviews/creates design guides
- Ensures UI alignment standards
- Example: `/designer:align-design --domain ui --create`

### PM Commands

**`/pm:plan [goal/feature description]`**
- Creates epics and tasks from goals
- Defines dependencies and priorities
- **Selects workflow category and variant**
- Example: `/pm:plan "Add user authentication"`

**`/pm:replan-task [task-id]`**
- Refactors poorly-written tasks
- Removes implementation detail
- Example: `/pm:replan-task E05-T006`

**`/pm:roadmap`**
- Shows current project roadmap
- Example: `/pm:roadmap` or `/pm:roadmap plan-next`

**`/pm:epic-review [epic-id]`**
- Reviews completed epic
- Creates follow-up tasks
- Example: `/pm:epic-review E01 --create`

**`/pm:next-task`**
- Shows ready tasks by priority
- Example: `/pm:next-task` or `/pm:next-task E01`

**`/pm:task-status`**
- Shows task board or specific task
- Example: `/pm:task-status E01-T003`

### QA Commands

**`/qa:qa [task-id]`**
- Runs unit tests, build, typecheck
- Includes integration testing (Docker)
- Validates acceptance criteria
- Example: `/qa:qa E01-T003`

**`/qa:verify-fix [task-id]`**
- Verifies bug is fixed with fresh context
- Checks regression test passes
- Example: `/qa:verify-fix E06-T020`

**`/qa:integration-test [task-id]`** *(DEPRECATED)*
- Now merged into `/qa:qa`
- Kept for standalone use

**`/utility:investigate-failure [task-id]`**
- Analyzes integration test failures
- Routes to appropriate next step
- Example: `/utility:investigate-failure E01-T003`

### Reviewer Commands

**`/reviewer:review-code [task-id]`**
- Fresh-eyes code review
- Identifies issues by severity
- Example: `/reviewer:review-code E01-T003`

**`/reviewer:review-migration [task-id]`**
- Migration safety review
- Checks reversibility, data integrity
- Example: `/reviewer:review-migration E02-T005`

### Writer Commands

**`/writer:outline [task-id]`**
- Creates document structure
- Identifies sections and code examples
- Example: `/writer:outline E06-T010`

**`/writer:write-docs [task-id]`**
- Writes standalone documentation
- Follows KB design patterns
- Example: `/writer:write-docs E06-T010`

**`/writer:review-docs [task-id]`**
- Technical accuracy review
- Verifies code examples work
- Example: `/writer:review-docs E06-T010`

**`/writer:update-docs [task-id]`**
- Updates docs after implementation
- Part of dev/schema/infra workflows
- Example: `/writer:update-docs E01-T003`

**`/writer:document [task-id]`**
- Two-phase KB documentation workflow
- Writer + reviewer in one command
- Example: `/writer:document E06-T010`

### Trainer Commands

**`/trainer:audit <agent-type> <artifact-path>`**
- Analyzes agent output quality
- Example: `/trainer:audit qa backlog/docs/reviews/E01/E01-T009-qa-report.md`

**`/trainer:postmortem <agent-type> <artifact-path>`**
- Deep dive when agent fails
- Example: `/trainer:postmortem developer packages/db/src/schema.ts`

**`/trainer:refine-agent <agent-type> [--epic EPIC-ID]`**
- Analyzes patterns across outputs
- Creates improvement plan
- Example: `/trainer:refine-agent qa --epic E01`

**`/trainer:apply-improvements <plan-path>`**
- Applies improvements to agent files
- Example: `/trainer:apply-improvements backlog/docs/training/qa-improvements.md`

**`/trainer:write-improvement [--domain <name>]`**
- Tracks tech debt in KB improvements
- Example: `/trainer:write-improvement --domain ai`

### Utility Commands

**`/utility:commit-and-pr [task-id]`**
- Commits and creates PR
- Runs CI checks locally first
- Example: `/utility:commit-and-pr E01-T003`

**`/utility:skip-github`**
- Skip GitHub automation for manual workflow
- Use when CI/GitHub is unavailable

**`/utility:investigate-failure [task-id]`**
- Analyzes integration failures
- Routes to appropriate next step

---

## Adding New Commands

1. Create `.claude/commands/{agent-type}/{command}.md`
2. Include frontmatter with `description` and `allowed-tools`
3. Include "Next Step" section at end with fully-qualified command format
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

Run `/{agent-type}:{next-command} {task-id}` - Description of what happens next
```

**Note:** Commands use the format `/{agent}:{command}` (e.g., `/developer:implement`, `/qa:qa`).

---

## Related Documentation

- [workflows/README.md](../workflows/README.md) - Workflow selection and phases
- [agents/](../agents/) - Agent definitions
- [CLAUDE.md](../../CLAUDE.md) - Project instructions
