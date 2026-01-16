---
title: Prescriptive Workflow
description: Historical workflow style with detailed specs and less developer autonomy
source_synced_at: 2026-01-16
---

# Prescriptive Workflow

::: warning Archived / Historical
This documents the **prescriptive workflow**, which is no longer used for new tasks. This page exists for historical reference to help understand tasks with `agentic_style: "prescriptive"` markers and older specs containing implementation code.

For the current workflow system, see the Deliberative Workflow documentation (E06-T014b).
:::

## Overview

The prescriptive workflow was the original approach to AI-assisted development in RaptScallions. It was characterized by analysts writing detailed implementation specifications with code examples, which developers then implemented exactly as specified.

## Key Characteristics

### Analyst-Written Specs with Code

In the prescriptive workflow, analysts would write comprehensive implementation specifications that included:

- Detailed TypeScript code examples
- Specific function signatures and implementations
- Database query patterns
- Test implementation patterns

**Example from archived spec:**

```markdown
## Implementation

### Service Method

\`\`\`typescript
async create(data: CreateUserInput): Promise<User> {
  const hashedPassword = await hashPassword(data.password);
  const user = await db.insert(users).values({
    ...data,
    passwordHash: hashedPassword
  });
  return user;
}
\`\`\`
```

### Less Developer Autonomy

Developers were expected to implement the spec exactly as written. The implementation code in specs was treated as authoritative, leaving little room for developer judgment on implementation details.

### Architect as Validator

The architect's role was primarily to validate that specs were architecturally sound, rather than making implementation decisions.

### Single Implicit Flow

There was one workflow for all tasks, without formal workflow categories or variants:

```
DRAFT → /analyze → ANALYZED → /review-plan → APPROVED → /write-tests → TESTS_READY → /implement → IMPLEMENTED → /review-code → CODE_REVIEW → /qa → QA_REVIEW → /update-docs → PR_READY
```

## How It Worked

### Task Flow

1. **PM creates task** with acceptance criteria
2. **Analyst writes spec** with implementation code in `backlog/docs/specs/{epic}/{task-id}-spec.md`
3. **Architect validates** the spec approach
4. **Developer writes tests** based on spec's test strategy
5. **Developer implements** exactly as specified in the spec
6. **Reviewer, QA, Writer** complete remaining phases

### File Structure

Commands were organized in a flat structure:

```
.claude/commands/
├── analyze.md
├── implement.md
├── review-plan.md
├── review-code.md
├── qa.md
└── ...
```

## Comparison with Deliberative Workflow

| Aspect | Prescriptive | Deliberative |
|--------|--------------|--------------|
| **Analyst output** | Detailed specs with implementation code | Multiple approaches without code |
| **Architect role** | Validates existing specs | Selects approach AND writes spec |
| **Developer autonomy** | Implements exactly as specified | Has autonomy within constraints |
| **Command structure** | Flat directory | Organized by agent type |
| **Workflow variants** | Single implicit flow | Formal categories with variants |
| **Spec content** | Full implementation details | Interface contracts and constraints |

## When You'll See This

### `agentic_style: "prescriptive"` Marker

Tasks created under the prescriptive workflow may have this marker in their frontmatter:

```yaml
agentic_style: "prescriptive"
```

This indicates the task was designed for the prescriptive workflow and may have associated specs with implementation code.

### Interpreting Old Specs

When you encounter a prescriptive-era spec:

1. **The code in the spec was intended to be implemented as-is**
2. **Test strategies may include specific test code**
3. **Less flexibility was expected in implementation**

::: tip Reading Historical Specs
If working on a task that references an old prescriptive spec, focus on the **acceptance criteria** and **test requirements** rather than the specific implementation code. The deliberative approach gives you more flexibility in how to achieve the same outcomes.
:::

## Why We Moved Away

The prescriptive workflow had several limitations:

1. **Spec Drift** — Implementation code in specs would become outdated
2. **Reduced Developer Judgment** — Skilled developers couldn't apply their expertise
3. **Analyst Burden** — Analysts needed deep technical knowledge to write good specs
4. **Inflexibility** — Hard to adapt when better approaches emerged during implementation

The deliberative workflow addresses these by:

- Keeping implementation decisions with developers (who see the code)
- Having analysts focus on problem exploration and trade-offs
- Having architects make the final approach decision and define constraints
- Allowing workflow variants for different task types

## Related Pages

- Deliberative Workflow — Current workflow (E06-T014b, coming soon)
- [Deprecated Agents](/ai-development/agents/deprecated/) — Archived agent definitions
- [Archived Commands](/ai-development/commands/archived) — Commands from prescriptive era

**Source Reference:**
- Archived files: `.claude/archive/1_16/`
- Archived command README: `.claude/archive/1_16/commands/README.md`
