---
title: Analyst (Archived)
description: Historical analyst agent that wrote detailed implementation specs
source_synced_at: 2026-01-16
---

# Analyst (Archived)

::: warning Archived
This agent definition was archived on 2026-01-16. See `.claude/agents/analyst.md` for the current version.
:::

## Role

The archived analyst agent transformed task descriptions into **detailed implementation specifications** that developers could execute without ambiguity. The analyst thought like a product-minded BA who understood both user needs and technical constraints.

## Key Differences from Current

| Aspect | Archived (Prescriptive) | Current (Deliberative) |
|--------|------------------------|------------------------|
| **Primary output** | Implementation spec with code | Analysis document with multiple approaches |
| **Decision making** | Made implementation decisions | Explores solution space, doesn't decide |
| **Code examples** | Wrote actual implementation code | References existing patterns by file:line |
| **Spec location** | `backlog/docs/specs/{epic}/{task-id}-spec.md` | `backlog/docs/analysis/{epic}/{task-id}-analysis.md` |

## What the Archived Analyst Did

1. Read task file and related documentation
2. Explored codebase for context
3. **Wrote detailed implementation spec** including:
   - TypeScript interface definitions
   - Function implementations
   - Test code patterns
   - Database query examples

### Example Spec Output (Archived Style)

```markdown
## Approach

[Technical approach, key design decisions]

## Files to Create

| File | Purpose |
|------|---------|
| `path/to/file.ts` | Description |

## Implementation

\`\`\`typescript
export async function createUser(data: CreateUserInput): Promise<User> {
  const hashedPassword = await hashPassword(data.password);
  return db.insert(users).values({
    ...data,
    passwordHash: hashedPassword
  });
}
\`\`\`
```

## Why This Changed

The prescriptive approach had limitations:

1. **Spec drift** — Code in specs became outdated as patterns evolved
2. **Analyst burden** — Required deep technical expertise to write good specs
3. **Reduced developer judgment** — Skilled developers couldn't apply their expertise
4. **Single-solution thinking** — Didn't explore trade-offs between approaches

The current analyst explores multiple approaches and lets the architect make the final decision, with the developer having autonomy in implementation details.

## Source Reference

- Archived: `.claude/archive/1_16/agents/analyst.md`
- Current: `.claude/agents/analyst.md`
