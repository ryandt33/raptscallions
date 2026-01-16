---
description: Write and track technical improvements in the KB
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Write Improvement

Add a technical improvement recommendation to the KB improvements tracking system.

## Usage

```
/write-improvement
/write-improvement --domain ai
/write-improvement --domain ai --from-review backlog/docs/reviews/E04/E04-T002-code-review.md
```

## Overview

This command helps capture technical debt, enhancement opportunities, and optimization recommendations identified during development. It ensures improvements are properly categorized, formatted, and tracked according to the Improvements Policy.

## When to Use

- After code reviews identify non-blocking improvements
- After epic reviews extract recommendations
- When you discover technical debt while working
- When you identify performance optimization opportunities
- When security hardening recommendations emerge

## Reference Documentation

**REQUIRED: Read these before writing any improvement:**

- `apps/docs/src/contributing/improvements-policy.md` — Full policy including priority criteria, ID format, lifecycle management
- `apps/docs/src/improvements/index.md` — Overview and current statistics
- `apps/docs/src/improvements/{domain}.md` — Target domain's existing improvements

## Process

### Phase 1: Gather Information

1. Load the writer agent: `@writer`
2. **REQUIRED: Read the improvements policy:** `apps/docs/src/contributing/improvements-policy.md`
3. If `--from-review` provided, read the source review document
4. If `--domain` provided, read the target domain's improvement page
5. Otherwise, ask user which domain this improvement belongs to

### Phase 2: Classify Improvement

Determine the following through conversation if not obvious:

**2.1 Domain Selection:**

| Domain | KB Path | Covers |
|--------|---------|--------|
| auth | `improvements/auth.md` | Authentication, authorization, sessions, permissions |
| database | `improvements/database.md` | Drizzle schemas, migrations, queries, connections |
| api | `improvements/api.md` | Fastify routes, middleware, services, validation |
| ai | `improvements/ai.md` | OpenRouter client, streaming, credentials, errors |
| testing | `improvements/testing.md` | Test patterns, coverage, mocking strategies |
| infrastructure | `improvements/infrastructure.md` | Docker, CI/CD, dev workflow, dependencies |

**2.2 Priority Assessment (from improvements-policy.md):**

| Priority | Criteria | Action |
|----------|----------|--------|
| **Critical** | Security vulnerability, data loss risk, blocks deployment | Create task immediately |
| **High** | Major performance/UX impact, security hardening | Schedule within 2-3 sprints |
| **Medium** | Code quality, DX improvements, testing gaps | Consider in current/next epic |
| **Low** | Nice-to-have, future-proofing, convenience | Backlog for future |

**2.3 Issue Type:**

One of: Security, Performance, DX, Testing, Configuration, Code Quality, Enhancement, Documentation

**2.4 Effort Estimate:**

- **Small**: <4 hours
- **Medium**: 4-16 hours
- **Large**: >16 hours

### Phase 3: Generate ID

Read the target domain's improvement file and find the highest existing ID number. Increment by 1.

Format: `{DOMAIN}-{NNN}` (e.g., `AI-003`, `DB-016`)

### Phase 4: Write Entry

**4.1 Add Table Entry:**

In the appropriate priority section, add a new table row following the format from `improvements-policy.md`:

```markdown
| {ID} | {Type} | {Brief description} | {Impact} | {Effort} | Backlog | {YYYY-MM-DD} |
```

**4.2 Add Details Section:**

Below the table, add details following the policy format:

```markdown
**{ID} Details:**
- **Source**: [Link to review, discussion, or "Direct observation"]
- **Description**: Full explanation of the issue and context
- **Impact**: What happens if this isn't addressed
- **Mitigation**: Suggested approach or solution
- **Blocking**: Yes/No - Does this block deployment?
```

Optional additional fields based on complexity:
- **Why This Matters**: Bullet list of specific consequences
- **Suggested Implementation**: Phased approach if multi-step
- **Security Considerations**: For security-related items
- **Related Tasks**: Links to related backlog tasks

### Phase 5: Update Index

Update `apps/docs/src/improvements/index.md`:

1. Update the Summary Statistics counts
2. Update the domain's "Active" count
3. Update the domain's "Recent focus" description

### Phase 6: Verify

1. Ensure table formatting is correct (pipe alignment)
2. Ensure details section follows policy format
3. Ensure ID is unique and sequential
4. Ensure priority categorization matches criteria from policy

## Arguments

- `$ARGUMENTS` - Optional flags:
  - `--domain <name>` - Target domain (auth, database, api, ai, testing, infrastructure)
  - `--from-review <path>` - Source review document to extract improvement from

## Examples

### Interactive (No Arguments)

```bash
/write-improvement

# Writer reads improvements-policy.md first
# Writer asks: Which domain does this improvement belong to?
# User selects: ai
# Writer reads apps/docs/src/improvements/ai.md
# Writer asks: What's the improvement?
# User describes the improvement
# Writer classifies, assigns ID, writes entry
```

### With Domain Specified

```bash
/write-improvement --domain database

# Writer reads improvements-policy.md
# Writer reads apps/docs/src/improvements/database.md
# Asks for improvement description
# Writes formatted entry
```

### From Review Document

```bash
/write-improvement --from-review backlog/docs/reviews/E04/E04-T002-code-review.md

# Writer reads improvements-policy.md
# Writer reads review document
# Extracts non-blocking improvements mentioned
# Asks which ones to track (if multiple)
# Auto-detects domain from review context
# Writes formatted entries
```

## Output Format

After completion, report what was added:

```markdown
## Improvement Added

**ID:** AI-003
**Domain:** ai
**Priority:** Medium
**Type:** Security

**Entry:**
| AI-003 | Security | Encryption key rotation procedure not documented | Medium | Medium | Backlog | 2026-01-16 |

**Details written to:** `apps/docs/src/improvements/ai.md`
**Index updated:** Summary statistics incremented

**Next Steps:**
- Review the improvement at `/improvements/ai#ai-003`
- Consider creating a task if priority escalates
```

## What This Command Does NOT Do

- Does NOT create backlog tasks (improvements stay in KB until promoted)
- Does NOT modify code (only documentation)
- Does NOT bypass the improvements policy (must follow format)
- Does NOT auto-escalate to Critical (user must confirm)

## Related Commands

| Command | Purpose |
|---------|---------|
| `/document` | Full KB documentation workflow |
| `/update-docs` | Update docs after implementation |
| `/epic-review` | Reviews epics, may output improvements |

## Related Documentation

- [Improvements Policy](/contributing/improvements-policy) — `apps/docs/src/contributing/improvements-policy.md`
- [Improvements Index](/improvements/) — `apps/docs/src/improvements/index.md`
- [Domain Improvement Pages](/improvements/{domain}) — `apps/docs/src/improvements/{domain}.md`
