# Task Workflows

This directory contains workflow definitions for different task categories. The PM agent selects the appropriate workflow when creating or reviewing tasks.

## Workflow Selection

| Category | When to Use | Workflow Doc |
|----------|-------------|--------------|
| `development` | Services, routes, business logic with tests | [development.md](development.md) |
| `schema` | Database schemas and migrations | [schema.md](schema.md) |
| `infrastructure` | Tooling, config, CI/CD, scripts | [infrastructure.md](infrastructure.md) |
| `documentation` | KB pages, guides, docs without code | [documentation.md](documentation.md) |
| `bugfix` | Bug fixes, defects, regressions | [bugfix.md](bugfix.md) |

## Workflow Variants

Each category may have simple/standard variants controlled by labels:

| Label | Category | Effect |
|-------|----------|--------|
| `infra:simple` | infrastructure | Skip analysis, TDD, code review |
| `docs:simple` | documentation | Skip outline, skip agent review |
| `bugfix:simple` | bugfix | Skip investigation (obvious fix) |
| `bugfix:hotfix` | bugfix | Expedited, test after fix, creates debt task |
| `schema:simple` | schema | Skip migration review (PM decides) |

## Modifier Labels

These labels modify behavior regardless of category:

| Label | Effect | Applies To |
|-------|--------|------------|
| `frontend` | Adds UX_REVIEW and UI_REVIEW phases | development |
| `security` | Forces CODE_REVIEW phase | infrastructure, any |
| `hotfix-debt` | Marks follow-up tasks from hotfixes | bugfix |

## Human Checkpoints

All workflows have these human checkpoints:

| Checkpoint | When | Purpose |
|------------|------|---------|
| PLAN_REVIEW / CONTENT_REVIEW | After analysis/outline | Approve approach before implementation |
| PR Creation | After all phases complete | Final review before merge |

Additional checkpoints by workflow:
- **Schema:** Tech debt sign-off before APPROVED
- **Bugfix (hotfix):** Creates follow-up task for debt

## Status Values

Standard status progression (varies by workflow):

```
DRAFT → ANALYZED → APPROVED → TESTS_READY → IMPLEMENTING →
CODE_REVIEW → QA_REVIEW → DOCS_UPDATE → PR_READY → DONE
```

See individual workflow docs for exact status values per workflow.

## Command → Agent Mapping

| Command | Agent | Used In |
|---------|-------|---------|
| `/analyze` | analyst | development, schema, infrastructure (standard) |
| `/analyze-schema` | analyst | schema (tech debt focus) |
| `/review-plan` | architect | development, schema, infrastructure (standard) |
| `/write-tests` | developer | development, infrastructure (standard), bugfix |
| `/implement` | developer | all workflows |
| `/investigate` | developer | bugfix |
| `/review-code` | reviewer | development, infrastructure, bugfix (standard) |
| `/review-migration` | reviewer | schema |
| `/qa` | qa | development, schema, infrastructure (standard) |
| `/verify-fix` | qa | bugfix |
| `/outline` | writer | documentation |
| `/write-docs` | writer | documentation |
| `/review-docs` | writer | documentation |
| `/update-docs` | writer | development, schema, infrastructure |
| `/review-ux` | designer | development (frontend) |
| `/review-ui` | designer | development (frontend) |

## Workflow Transitions

Each agent command ends with explicit "Next Step" guidance:

```markdown
## Next Step
Run `/review-code {task-id}` (reviewer agent)
```

**Rules:**
- Agent suggests next step based on workflow
- Human can override and run different command
- Agent can push back once if command seems wrong for current state
- Human decision is final

## PM Responsibilities

When creating/reviewing tasks, PM must:

1. **Set category** - Determines which workflow applies
2. **Set variant label** - If task qualifies for simple workflow
3. **Set modifier labels** - `frontend`, `security` as applicable
4. **Document workflow selection rationale** - In task file

PM can change category/workflow if task scope changes, but should document why.

## Quick Reference by Category

### Development
```
/analyze → /review-plan → /write-tests → /implement →
/review-code → /qa → /update-docs → PR
```
Add `/review-ux` and `/review-ui` if `frontend` label.

### Schema
```
/analyze-schema → /review-plan (tech debt sign-off) →
/implement → /review-migration → /qa → /update-docs → PR
```

### Infrastructure (standard)
```
/analyze → /review-plan → /write-tests → /implement →
/review-code → /qa → /update-docs → PR
```

### Infrastructure (simple)
```
/implement → (validate by running) → /update-docs → PR
```

### Documentation (standard)
```
/outline → (human approves) → /write-docs → /review-docs → PR
```

### Documentation (simple)
```
/write-docs → PR
```

### Bugfix (standard)
```
/investigate → /write-tests → /implement → /review-code → /verify-fix → PR
```

### Bugfix (simple)
```
/implement → /verify-fix → PR
```

### Bugfix (hotfix)
```
/investigate → /implement → /write-tests → /verify-fix → PR + follow-up task
```
