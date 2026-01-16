---
title: Architect Commands
description: Commands for architectural review and spec creation
source_synced_at: 2026-01-16
---

# Architect Commands

Commands that invoke the [Architect Agent](/ai-development/agents/current/architect) for architectural decisions and spec creation.

## Overview

Architect commands initiate the plan review phase. The architect selects an approach from the analyst's options, defines constraints, and writes the implementation spec.

## Commands

| Command | Description | Used In Workflows |
|---------|-------------|-------------------|
| `/review-plan` | Review analysis, select approach, create spec | development, schema, infrastructure (standard) |

---

## `/review-plan`

Review analyst's approaches, make architectural decision, and create implementation spec.

### Purpose

Make the architectural call by:
- Selecting the best approach (or creating a hybrid)
- Defining non-negotiable constraints
- Specifying interface contracts
- Resolving open questions from analysis

### Invocation

```bash
/review-plan E01-T001
```

### Input

- Task ID (e.g., `E01-T001`)
- Task must be in `ANALYZED` state
- Analysis document must exist at path in task's `analysis_file` field

### Process

1. Read task file at `backlog/tasks/{epic}/{task-id}.md`
2. Read analysis document
3. Read architecture docs (ARCHITECTURE.md, CONVENTIONS.md)
4. Review existing code if task modifies it
5. Select approach and write spec

### Output

Implementation spec at `backlog/docs/specs/{epic}/{task-id}-spec.md`:

```markdown
# Implementation Spec: {TASK-ID}

## Selected Approach
**Choice:** [Approach A / B / C / Hybrid]
**Rationale:** [Why this approach]

## Constraints
Non-negotiable requirements:
- [ ] Must follow [pattern] from [file:line-range]
- [ ] Must use [technology] for [component]
- [ ] Must NOT [anti-pattern]

## Interface Contract
```typescript
interface ExamplePublicInterface {
  methodName(param: ParamType): ReturnType;
}
```

## Test Criteria
| AC | Must Test |
|----|-----------|
| AC1 | [What to assert] |

## Edge Cases
| Edge Case | Expected Behavior |
|-----------|-------------------|

## Out of Scope
- [What NOT to implement]
```

### Task Updates

- Sets `workflow_state: APPROVED`
- Sets `spec_file` to spec path
- Updates Reviews section with verdict

### Next Step

**Development workflow:**
- With `frontend` label: Run `/review-ux {task-id}` (designer)
- Otherwise: Run `/write-tests {task-id}` (developer)

**Schema workflow:**
Run `/implement {task-id}` (developer)

**Infrastructure workflow (standard):**
Run `/write-tests {task-id}` (developer)

### Source Reference

`.claude/commands/architect/review-plan.md`

---

## Related Commands

- [Analyst Commands](/ai-development/commands/analyst) — Creates analysis for architect to review
- [Developer Commands](/ai-development/commands/developer) — Implements approved spec
- [Designer Commands](/ai-development/commands/designer) — UX review before tests (frontend tasks)
