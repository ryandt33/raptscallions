# Documentation Workflow

> **Category:** `documentation`
> **Use for:** KB pages, guides, architecture docs, READMEs (without code changes)

## Workflow Overview

### Simple Documentation (`docs:simple` label)

```
DRAFT → WRITING → PR_READY → DONE
```

### Standard Documentation (default)

```
DRAFT → OUTLINED → CONTENT_REVIEW → WRITING → TECHNICAL_REVIEW → PR_READY → DONE
```

**Key differences from development workflow:**
- No TDD (documentation has no code to test)
- `/outline` replaces `/analyze` (structure vs implementation approach)
- Writer performs technical review (has context from writing)
- Simple docs skip agent review (PR review is sufficient)

---

## Simple vs Standard Documentation

### Simple Documentation (`docs:simple`)

PM sets this label at task creation when ALL criteria are met:

- ✅ Updating existing content (not creating new)
- ✅ Scope is clear and narrow
- ✅ No structural changes
- ✅ No new code examples to verify

**Examples:**
- Fixing typos or errors
- Adding missing details to existing pages
- Small clarifications
- Minor README updates

**Workflow:** Direct to writing, VitePress build validates, PR review is human checkpoint

### Standard Documentation (default)

Any documentation task that doesn't meet simple criteria:

- ❌ New KB pages
- ❌ New concept/pattern documentation
- ❌ Major restructuring of existing docs
- ❌ Tutorial or guide creation
- ❌ Decision records with technical depth

**Workflow:** Outline first, human approves structure, then writing with technical review

---

## Phase Reference

### Simple Workflow

| Phase | Command | Input | Output |
|-------|---------|-------|--------|
| DRAFT → WRITING | `/writer:write-docs` | Task file | Documentation content |
| WRITING → PR_READY | — | — | VitePress build validates |

### Standard Workflow

| Phase | Command | Input | Output |
|-------|---------|-------|--------|
| DRAFT → OUTLINED | `/writer:outline` | Task file | Document outline |
| OUTLINED → CONTENT_REVIEW | — | Outline | Human approval |
| CONTENT_REVIEW → WRITING | `/writer:write-docs` | Approved outline | Documentation content |
| WRITING → TECHNICAL_REVIEW | `/writer:review-docs` | Content | Technical accuracy check |
| TECHNICAL_REVIEW → PR_READY | — | — | Manual PR creation |

---

## Phase Details

### 1. Outline (DRAFT → OUTLINED)

**Command:** `/outline {task-id}`
**Agent:** writer

**Purpose:** Define structure before writing prose.

**Process:**
1. Read task requirements
2. Identify target audience
3. Create outline with sections and key points
4. List code examples needed
5. Identify related docs to cross-reference

**Output:** Outline in task file with:
- Section headings
- Key points per section
- Code examples to include
- Related documents to link

**Transitions:**
- ✅ Success → OUTLINED (ready for content review)
- ❌ Failure → Re-run `/outline`

---

### 2. Content Review (OUTLINED → CONTENT_REVIEW)

**Human checkpoint** - Approve structure before writing.

**Checklist:**
- [ ] All required topics covered?
- [ ] Logical flow for target audience?
- [ ] Appropriate depth (not too shallow, not too deep)?
- [ ] Code examples identified?

**Transitions:**
- ✅ Approved → CONTENT_REVIEW (ready for writing)
- ❌ Issues → OUTLINED (revise outline)

---

### 3. Writing (→ WRITING)

**Command:** `/write-docs {task-id}`
**Agent:** writer

**Purpose:** Create the documentation content.

**Process:**
1. Follow approved outline (standard) or task requirements (simple)
2. Write clear, concise prose
3. Include working code examples
4. Add cross-references and internal links
5. Follow KB page design patterns
6. Run VitePress build to validate

**Validation:**
```bash
pnpm docs:build  # Must succeed
```

**Output:** Markdown file(s) in appropriate location

**Transitions:**
- ✅ Success → WRITING (ready for review or PR)
- ❌ Build fails → Fix and re-run

---

### 4. Technical Review (WRITING → TECHNICAL_REVIEW)

**Command:** `/review-docs {task-id}`
**Agent:** writer

**Purpose:** Verify technical accuracy of the content.

**Checklist:**

**Technical Accuracy:**
- [ ] Code examples compile/run correctly
- [ ] API descriptions match actual code
- [ ] Configuration options exist and work
- [ ] Step-by-step instructions are accurate

**Content Quality:**
- [ ] Clear for target audience
- [ ] Complete coverage of topic
- [ ] Consistent with existing documentation
- [ ] Follows KB design patterns

**Build Validation:**
- [ ] VitePress build succeeds
- [ ] Internal links resolve
- [ ] Frontmatter is correct

**Transitions:**
- ✅ Approved → TECHNICAL_REVIEW (ready for PR)
- ❌ Issues → WRITING (fix and re-review)

---

### 5. PR Creation (→ DONE)

**Manual step** - Human creates PR and merges.

**For simple docs:** This is the only human review point.

---

## State Machines

### Simple Documentation

```
DRAFT
  │ /write-docs (writer)
  ▼
WRITING
  │ (VitePress build validates)
  ▼
PR_READY
  │ (manual PR creation + human review)
  ▼
DONE
```

### Standard Documentation

```
DRAFT
  │ /outline (writer)
  ▼
OUTLINED
  │ (human approves structure)
  ▼
CONTENT_REVIEW ─── (issues) ──────► OUTLINED
  │ (approved)
  │ /write-docs (writer)
  ▼
WRITING
  │ /review-docs (writer)
  ▼
TECHNICAL_REVIEW ── (issues) ─────► WRITING
  │ (approved)
  ▼
PR_READY
  │ (manual PR creation)
  ▼
DONE
```

---

## Quick Reference

**Start a simple documentation task:**
```bash
/writer:write-docs E06-T010      # Write content (VitePress validates)
# Manual: create PR and merge (human review here)
```

**Start a standard documentation task:**
```bash
/writer:outline E06-T005         # Create outline
# Human: approve structure
/writer:write-docs E06-T005      # Write content
/writer:review-docs E06-T005     # Technical accuracy check
# Manual: create PR and merge
```

---

## Documentation Types and Requirements

| Type | Outline? | Technical Review? |
|------|----------|-------------------|
| Concept page | ✅ Yes | ⚠️ If code references |
| Pattern page | ✅ Yes | ✅ Yes (code examples) |
| Troubleshooting | ⚠️ Optional | ✅ Yes (solutions must work) |
| Decision record | ⚠️ Optional | ⚠️ If technical |
| README | ❌ No | ✅ Yes (commands must work) |
| Tutorial | ✅ Yes | ✅ Yes (steps must work) |

---

## Integration with Other Workflows

**This workflow is for standalone documentation tasks.**

For documentation updates after code changes:
- Use `/update-docs` command (part of development/schema/infrastructure workflows)
- Writer agent updates docs based on implementation

**Distinction:**
| Command | When to Use |
|---------|-------------|
| `/write-docs` | Standalone documentation tasks (this workflow) |
| `/update-docs` | Post-implementation docs (dev/schema/infra workflows) |

---

## Label Reference

| Label | Effect |
|-------|--------|
| `docs:simple` | Use simple workflow (skip outline, skip agent review) |

---

## Why These Decisions

### Outline Instead of Analysis

Documentation needs **structure planning**, not implementation analysis. An outline:
- Ensures complete topic coverage
- Validates logical flow
- Gets human input before major writing effort

### Writer Does Technical Review

The writer already has context from creating the content. Technical accuracy check is a natural extension - verify code examples work, check API descriptions match code.

### Simple Docs Skip Agent Review

For typo fixes and small clarifications:
- VitePress build catches syntax/link errors automatically
- PR review provides human checkpoint
- Same pattern as `infra:simple`

### No TDD for Documentation

Documentation has no executable logic. Quality is validated by:
- Human review (is this clear?)
- VitePress build (are links valid?)
- Technical review (is this accurate?)
