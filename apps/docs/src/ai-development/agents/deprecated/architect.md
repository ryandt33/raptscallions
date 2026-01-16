---
title: Architect (Archived)
description: Historical architect agent that validated specs rather than writing them
source_synced_at: 2026-01-16
---

# Architect (Archived)

::: warning Archived
This agent definition was archived on 2026-01-16. See `.claude/agents/architect.md` for the current version.
:::

## Role

The archived architect agent reviewed implementation specs to ensure they aligned with system architecture, followed established patterns, and wouldn't create technical debt. The architect thought like a senior engineer maintaining the codebase long-term.

## Key Differences from Current

| Aspect | Archived (Prescriptive) | Current (Deliberative) |
|--------|------------------------|------------------------|
| **Primary function** | Validated analyst-written specs | Selects approach AND writes implementation spec |
| **Decision making** | Approved/rejected existing specs | Makes architectural decisions on approach |
| **Output** | Review appended to spec file | New spec file with constraints |
| **Spec ownership** | Analyst owned the spec | Architect owns the final spec |

## What the Archived Architect Did

1. Read task file and analyst-written spec
2. Compared spec against architecture docs
3. Ran review checklist:
   - Architecture fit
   - Code quality patterns
   - TypeScript strictness
   - Database considerations
   - Testing approach
   - Dependencies
   - Security
4. **Appended review verdict** to the spec:
   - `APPROVED` — Spec is solid, developer can proceed
   - `NEEDS_CHANGES` — Issues that must be fixed before implementation

### Example Review Output (Archived Style)

```markdown
## Architecture Review

**Reviewer:** architect
**Date:** 2026-01-10
**Verdict:** APPROVED

### Summary
Spec is well-structured and follows established patterns.

### Checklist Results
- ✅ Architecture Fit
- ✅ Code Quality
- ✅ TypeScript Strictness
- ✅ Database
- ✅ Testing
- ✅ Security

### Suggestions
- Consider adding index on email column for lookups
```

## Why This Changed

The prescriptive approach limited the architect's role:

1. **Reactive position** — Could only approve/reject, not shape the approach
2. **Late decisions** — Architectural concerns surfaced after spec was written
3. **Analyst bottleneck** — Analyst had to guess what architect would accept

The current architect actively makes decisions:
- Reviews multiple approaches from analyst
- Selects the best approach (or creates a hybrid)
- Writes the final spec with constraints
- Defines interface contracts, not implementations

## Source Reference

- Archived: `.claude/archive/1_16/agents/architect.md`
- Current: `.claude/agents/architect.md`
