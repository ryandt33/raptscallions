# Documentation Category: Workflow Analysis

> **Status:** Draft
> **Created:** 2026-01-16
> **Purpose:** Define workflow for documentation-only tasks (KB pages, guides, references)

## What Documentation Tasks Involve

Documentation tasks create or update written content without modifying application code:

| Type | Examples | Validation Method |
|------|----------|-------------------|
| KB pages | Concepts, patterns, troubleshooting guides | Content review + VitePress build |
| Architecture docs | ARCHITECTURE.md updates, decision records | Content review |
| README files | Package READMEs, feature docs | Content review |
| API documentation | Endpoint docs, schema docs | Accuracy against code |
| Tutorial/guides | Step-by-step instructions | Follow-along test |

**Key insight:** Documentation correctness is validated by **human review and build success**, not by unit tests.

---

## Current Workflow Observations

Documentation tasks currently follow varying patterns:

| Task | Workflow | Notes |
|------|----------|-------|
| E06-T001 (VitePress setup) | Infrastructure workflow | Tooling + docs together |
| E06-T005+ (KB pages) | Simplified workflow | Content creation only |

**Observations:**
1. Documentation tasks have no code to test
2. Quality is subjective (clarity, accuracy, completeness)
3. Human review is essential (can't automate "is this clear?")
4. Build validation ensures no broken links/formatting
5. Technical accuracy requires checking against actual code

---

## The 7 Benefits Matrix: Documentation Workflow

| Benefit | Applicability | Notes |
|---------|---------------|-------|
| Context Insulation | ⚠️ Limited | Writer can have full context; no "test blindness" risk |
| Natural Friction | ✅ Needed | Human review catches unclear content |
| Artifact Persistence | ✅ Needed | Docs are the artifact |
| Specialization Focus | ⚠️ Limited | Same person can write and review structure |
| Error Recovery | ✅ Helpful | Can restart from draft |
| Parallelization | ⚠️ Limited | Sequential by nature |
| Cost Management | ✅ Helpful | Can use smaller model for drafts |

### Analysis

**Context Insulation:** Less critical for documentation. Unlike code where test blindness is a risk, documentation doesn't have the same "wrote it, can't see the bug" problem. A writer can review their own structure.

**Natural Friction:** Critical. Human review catches:
- Unclear explanations
- Missing context for newcomers
- Incorrect technical claims
- Broken examples

**Artifact Persistence:** Documentation IS the artifact. Version history provides audit trail.

**Specialization Focus:** Writer can handle most phases. Technical accuracy check may benefit from separate reviewer who knows the code.

**Error Recovery:** Helpful but less critical. Documentation is easier to fix than code bugs.

**Parallelization:** Limited. Documentation is inherently sequential (outline → draft → polish).

**Cost Management:** Can use smaller/faster model for initial drafts, larger model for review.

---

## Proposed Documentation Workflow

### Simple Documentation (`docs:simple`)

For straightforward content updates:

```
DRAFT → WRITING → REVIEW → PR_READY → DONE
```

**Characteristics:**
- Skip analysis (content is clear)
- Skip plan review (straightforward update)
- No TDD (no code)
- Human review for clarity/accuracy
- VitePress build validation

**When to use:**
- Fixing typos/errors in existing docs
- Adding missing details to existing pages
- Small clarifications
- README updates

### Standard Documentation (default)

For new KB pages and significant content:

```
DRAFT → OUTLINED → CONTENT_REVIEW → WRITING → TECHNICAL_REVIEW → PR_READY → DONE
```

**Characteristics:**
- Outline step (structure before prose)
- Content review (is outline complete?)
- Writing phase (create content)
- Technical review (accuracy check)
- VitePress build validation

**When to use:**
- New KB pages
- New concept/pattern documentation
- Major restructuring
- Tutorial creation

---

## Phase Details

### 1. Outline (DRAFT → OUTLINED)

**Purpose:** Define structure before writing prose.

**Process:**
1. Read task requirements
2. Identify target audience
3. Create outline with sections and key points
4. List code examples needed
5. Identify related docs to link

**Output:** Outline in task file or draft doc

### 2. Content Review (OUTLINED → CONTENT_REVIEW)

**Purpose:** Validate structure before investing in prose.

**Human checkpoint:**
- [ ] All required topics covered?
- [ ] Logical flow?
- [ ] Appropriate depth for audience?
- [ ] Code examples identified?

### 3. Writing (CONTENT_REVIEW → WRITING)

**Purpose:** Create the documentation content.

**Process:**
1. Follow approved outline
2. Write clear, concise prose
3. Include code examples
4. Add cross-references
5. Run VitePress build to validate

### 4. Technical Review (WRITING → TECHNICAL_REVIEW)

**Purpose:** Verify technical accuracy.

**Checklist:**
- [ ] Code examples work (if runnable)
- [ ] API descriptions match actual code
- [ ] No outdated information
- [ ] Links resolve correctly
- [ ] VitePress build succeeds

### 5. PR Creation (TECHNICAL_REVIEW → DONE)

**Manual step** - Human creates PR and merges.

---

## Validation Approaches

### VitePress Build

```bash
pnpm docs:build  # Must succeed without errors
```

Validates:
- Markdown syntax
- Internal links
- Frontmatter format
- No broken references

### Technical Accuracy

For documentation that references code:
1. Verify code snippets compile/run
2. Check API descriptions against source
3. Confirm configuration options exist
4. Test step-by-step instructions

### Content Quality (Human Review)

- Clear for target audience?
- Complete coverage of topic?
- Consistent with existing docs?
- Follows KB design patterns?

---

## Documentation Requirements by Type

| Type | Outline? | Technical Review? | Notes |
|------|----------|-------------------|-------|
| Concept page | ✅ Yes | ⚠️ If code references | Structure matters |
| Pattern page | ✅ Yes | ✅ Yes | Code examples must work |
| Troubleshooting | ⚠️ Optional | ✅ Yes | Solutions must be accurate |
| Decision record | ⚠️ Optional | ⚠️ If technical | May be historical |
| README | ❌ No | ✅ Yes | Commands must work |

---

## State Machine

### Simple Documentation

```
DRAFT
  │ (writer creates content)
  ▼
WRITING
  │ (human reviews)
  ▼
REVIEW ─── (issues) ──────────────► WRITING
  │ (approved)
  ▼
PR_READY
  │ (manual PR creation)
  ▼
DONE
```

### Standard Documentation

```
DRAFT
  │ (create outline)
  ▼
OUTLINED
  │ (human approves structure)
  ▼
CONTENT_REVIEW ─── (issues) ──────► OUTLINED
  │ (approved)
  │ (writer creates content)
  ▼
WRITING
  │ (technical accuracy check)
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

## Comparison with Other Workflows

| Phase | Development | Schema | Infrastructure | Documentation |
|-------|-------------|--------|----------------|---------------|
| Analysis | ✅ Full | ✅ Schema-focused | ✅/❌ (type) | ❌ Outline instead |
| Plan Review | ✅ Yes | ✅ Tech debt | ✅/❌ (type) | ✅ Content review |
| TDD | ✅ Yes | ❌ No | ✅/❌ (type) | ❌ No |
| Implementation | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Writing |
| Code Review | ✅ Yes | ❌ Migration review | ✅/❌ (type) | ❌ No |
| QA | ✅ Yes | ✅ Integration | ✅/❌ (type) | ✅ Technical review |
| Docs | ✅ Yes | ✅ Yes | ✅ Yes | N/A (is the output) |

---

## Commands for Documentation

| Command | Agent | Purpose |
|---------|-------|---------|
| `/outline` | writer | Create document outline |
| `/write-docs` | writer | Write documentation content |
| `/review-docs` | reviewer | Technical accuracy review |

**Note:** These may be new commands or modes of existing commands.

---

## Decisions (Resolved)

### 1. Outline Command

**Decision:** Use separate `/outline` command for documentation.

**Rationale:** Different output format from `/analyze`. Outline produces section structure and headings, not implementation specs.

### 2. Technical Review Agent

**Decision:** Writer agent performs technical review.

**Rationale:** Writer already has context from creating the content. Technical accuracy check is a natural extension of the writing process.

### 3. Simple Docs Review

**Decision:** Simple docs skip agent review; PR review is sufficient.

**Rationale:** VitePress build catches syntax issues. PR review provides human checkpoint. Same pattern as `infra:simple`.

### 4. Integration with `/update-docs`

**Decision:** Keep commands separate with clear distinction.

- `/update-docs` = Post-implementation documentation (dev/schema/infra workflows)
- `/write-docs` = Standalone documentation tasks (this workflow)

---

## Open Questions (None Remaining)

All open questions have been resolved. See Decisions section above.

---

## Summary

| Current Problem | Proposed Solution |
|-----------------|-------------------|
| Full dev workflow for docs | Separate documentation workflow |
| TDD for content (doesn't apply) | Skip TDD, use outline + review |
| Code review for prose | Technical review instead |
| No structure validation | Outline step for standard docs |

**Key insight:** Documentation quality is validated by **human review and build success**. The workflow should focus on structure (outline) and accuracy (technical review) rather than testing.
