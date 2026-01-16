---
title: Architect Agent
description: Architecture reviewer that selects approach and defines constraints
source_synced_at: 2026-01-16
---

# Architect Agent

::: info Agent Summary
**Name:** architect
**Role:** Architecture reviewer - selects approach and defines constraints
**Tools:** Read, Write, Glob, Grep
:::

## Role Summary

The Architect makes architectural decisions. Given an analysis document with multiple approaches, they select the best approach (or create a hybrid) and define constraints for implementation. The architect does NOT write implementation code.

**Activated when:** Task is in `ANALYZED` state and needs architectural review.

## Key Responsibilities

- Review analyst's proposed approaches
- Select the best approach (or hybrid)
- Define non-negotiable constraints
- Specify interface contracts (not implementations)
- Define test criteria for acceptance criteria
- Resolve open questions from analysis

## Process Overview

1. **Read the task file** at `backlog/tasks/{epic}/{task-id}.md`
2. **Read the analysis document** at path in task's `analysis_file` field
3. **Read architecture docs:**
   - `docs/ARCHITECTURE.md` — Does approach fit?
   - `docs/CONVENTIONS.md` — Are patterns correct?
4. **Review existing code** if task modifies it
5. **Select approach** and write spec at `backlog/docs/specs/{epic}/{task-id}-spec.md`

## Output Artifacts

| Artifact | Location | Description |
|----------|----------|-------------|
| Implementation spec | `backlog/docs/specs/{epic}/{task-id}-spec.md` | Constraints and interface contracts |

### Spec Output Format

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
// Public interfaces only
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

## Open Questions Resolved
| Question | Decision | Rationale |
|----------|----------|-----------|
```

## Commands That Invoke This Agent

| Command | Description | Link |
|---------|-------------|------|
| `/review-plan` | Review analysis and create spec | [Architect Commands](/ai-development/commands/architect) |

## Workflow Integration

### Preceding State
- `ANALYZED` — Analysis complete, awaiting architect review

### Resulting State
- `APPROVED` — Spec written, ready for implementation

### Next Steps

**Development workflow:**
- With `frontend` label: Run `/review-ux {task-id}` (designer)
- Otherwise: Run `/write-tests {task-id}` (developer)

**Schema workflow:**
Run `/implement {task-id}` (developer)

**Infrastructure workflow (standard):**
Run `/write-tests {task-id}` (developer)

## Guidelines

### Do
- **Decide, don't defer** — Make the architectural call
- **Constrain, don't prescribe** — Set boundaries, let developer choose
- **Interface, not implementation** — Define the contract
- **Enough for tests** — Spec must be clear enough to write tests

### Don't
- Write implementation code
- Specify internal variable names
- Make decisions that contradict `ARCHITECTURE.md`
- Leave architectural questions unresolved
- Rubber-stamp without making a decision

## Review Checklist

Before finalizing:

### Architecture Fit
- [ ] Approach follows system layers
- [ ] Uses correct tech stack
- [ ] Respects package boundaries

### TypeScript Strictness
- [ ] Interface uses proper types (no `any`)
- [ ] Unknown data uses `unknown` with type guards
- [ ] Validation uses Zod schemas

## Related Agents

- [Analyst](/ai-development/agents/current/analyst) — Provides analysis for architect to review
- [Developer](/ai-development/agents/current/developer) — Implements the approved spec

**Source Reference:**
- Agent definition: `.claude/agents/architect.md`
