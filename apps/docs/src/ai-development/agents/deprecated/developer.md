---
title: Developer (Archived)
description: Historical developer agent with less implementation autonomy
source_synced_at: 2026-01-16
---

# Developer (Archived)

::: warning Archived
This agent definition was archived on 2026-01-16. See `.claude/agents/developer.md` for the current version.
:::

## Role

The archived developer agent implemented features using strict Test-Driven Development. The developer wrote tests first (red phase), then wrote code to pass them (green phase), then refactored. The key difference was **less autonomy** — the spec dictated implementation details.

## Key Differences from Current

| Aspect | Archived (Prescriptive) | Current (Deliberative) |
|--------|------------------------|------------------------|
| **Spec interpretation** | Implemented spec code exactly | Has autonomy within architectural constraints |
| **Implementation decisions** | Made by analyst in spec | Made by developer during implementation |
| **Code structure** | Followed spec's patterns exactly | Can choose patterns within constraints |
| **Rejection criteria** | Reject tests for API mismatches | Reject tests for API mismatches OR spec incoherence |

## What the Archived Developer Did

The core TDD process was similar:

1. **Phase 1: Writing Tests** (APPROVED → TESTS_READY)
   - Read task and spec
   - Write test files based on spec's Test Strategy
   - Verify tests compile but fail (red state)

2. **Phase 2: Implementation** (TESTS_READY → IMPLEMENTED)
   - Read spec for implementation details
   - **Implement code exactly as specified in spec**
   - Make tests pass (green state)
   - Refactor while keeping tests green

### The "Implement Exactly" Principle

In prescriptive workflow, the spec contained code like:

```typescript
// From analyst spec — implement as written
export async function getUser(id: string): Promise<User | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id)
  });
  return user ?? null;
}
```

The developer was expected to implement this code as-is, without significant modifications.

## Why This Changed

The prescriptive approach limited developer effectiveness:

1. **Reduced expertise application** — Experienced developers couldn't improve on spec code
2. **Rigid implementation** — No room to adapt when better patterns emerged
3. **Analyst dependency** — Developer success depended on analyst's implementation quality
4. **Lost learning** — Developers didn't develop judgment about implementation trade-offs

The current developer:
- Receives architectural constraints, not implementation code
- Makes implementation decisions within those constraints
- Can reject specs that are incoherent (not just tests)
- Has responsibility for code quality decisions

## Core Principles (Unchanged)

These principles carried forward to the current developer agent:

- **Zero TypeScript errors** — `pnpm typecheck` must pass
- **No `any` type** — Use `unknown` with type guards or Zod
- **TDD discipline** — Tests first, then implementation
- **Quality standards** — Complete, correct, clean, type-safe code

## Source Reference

- Archived: `.claude/archive/1_16/agents/developer.md`
- Current: `.claude/agents/developer.md`
