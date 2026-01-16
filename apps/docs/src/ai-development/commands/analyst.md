---
title: Analyst Commands
description: Commands for task analysis and approach exploration
source_synced_at: 2026-01-16
---

# Analyst Commands

Commands that invoke the [Analyst Agent](/ai-development/agents/current/analyst) for requirements analysis and approach exploration.

## Overview

Analyst commands initiate the analysis phase of a task. The analyst reads requirements, explores the codebase, and proposes multiple approaches with trade-offs.

## Commands

| Command | Description | Used In Workflows |
|---------|-------------|-------------------|
| `/analyze` | Standard task analysis | development, infrastructure (standard) |
| `/analyze-schema` | Schema analysis with tech debt focus | schema |

---

## `/analyze`

Standard task analysis that proposes multiple implementation approaches.

### Purpose

Explore the solution space for a task and propose 3 distinct approaches with trade-offs. Does NOT make the final decision or write implementation code.

### Invocation

```bash
/analyze E01-T001
```

### Input

- Task ID (e.g., `E01-T001`)
- Task must be in `DRAFT` state

### Process

1. Read task file at `backlog/tasks/{epic}/{task-id}.md`
2. Read related documentation (ARCHITECTURE.md, CONVENTIONS.md)
3. Identify existing patterns in codebase
4. Write analysis document

### Output

Analysis document at `backlog/docs/analysis/{epic}/{task-id}-analysis.md`:

```markdown
# Analysis: {TASK-ID}

## Problem Statement
[What problem are we solving?]

## Proposed Approaches

### Approach A: {Name}
**Summary:** [2-3 sentences]
**Trade-offs:**
| Pros | Cons |
|------|------|
| ✅ [Benefit] | ⚠️ [Drawback] |

### Approach B: {Name}
[Same structure]

### Approach C: {Name}
[Same structure]

## Analyst Recommendation
[Which approach to lean toward]
```

### Next Step

Run `/review-plan {task-id}` (architect)

### Source Reference

`.claude/commands/analyst/analyze.md`

---

## `/analyze-schema`

Schema analysis with tech debt focus for database tasks.

### Purpose

Analyze schema changes with special attention to:
- Tech debt implications
- Migration safety
- Index requirements
- Foreign key relationships

### Invocation

```bash
/analyze-schema E01-T001
```

### Input

- Task ID for a schema task
- Task must be in `DRAFT` state

### Process

1. Read task file
2. Analyze existing schema in `packages/db/`
3. Identify tech debt concerns
4. Propose approaches with migration considerations

### Output

Analysis document with additional sections for:
- Tech debt assessment
- Migration complexity
- Index recommendations
- Relationship mapping

### Next Step

Run `/review-plan {task-id}` (architect) — Includes tech debt sign-off

### Source Reference

`.claude/commands/analyst/analyze-schema.md`

---

## Related Commands

- [Architect Commands](/ai-development/commands/architect) — Reviews analysis and creates spec
- [Developer Commands](/ai-development/commands/developer) — Implements approved spec
