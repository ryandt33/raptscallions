---
description: Update documentation after implementation
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Update Documentation

Update documentation to reflect new implementation, including both legacy docs (ARCHITECTURE.md, CONVENTIONS.md) and VitePress Knowledge Base (KB) documentation.

## Usage

```
/update-docs E01-T001
```

## Overview

This command updates all relevant documentation after a task is implemented:

1. **VitePress KB** — Domain-organized documentation in `apps/docs/src/`
2. **Legacy Docs** — High-level reference docs in `docs/` directory
3. **Task Metadata** — Documentation Updates section with verification results

The command automatically detects which KB domains are affected, finds existing KB pages to update, and maintains documentation freshness with staleness tracking.

## Process

### Phase 1: Setup and Context Gathering

1. Load the writer agent: `@writer`
2. Read the task at `backlog/tasks/{epic}/{task-id}.md`
3. Read the spec at `backlog/docs/specs/{epic}/{task-id}-spec.md`
4. Read implemented code files (from `code_files` in task frontmatter)
5. Read KB authoring guides:
   - `apps/docs/src/contributing/documentation.md` — What to write, templates, linking conventions
   - `apps/docs/src/contributing/kb-page-design.md` — How to format, markdown syntax, VitePress features
   - `apps/docs/src/contributing/design-system.md` — Visual identity, colors, typography
   - `apps/docs/src/contributing/ci-validation.md` — How docs are validated in CI

### Phase 2: Domain Detection

Parse `code_files` from task frontmatter and map to KB domains:

| Code Path Pattern          | KB Domain       | Example                                |
| -------------------------- | --------------- | -------------------------------------- |
| `packages/auth/`           | `auth/`         | Session management, permissions, OAuth |
| `packages/db/`             | `database/`     | Drizzle schemas, migrations, queries   |
| `apps/api/src/routes/`     | `api/`          | Route handlers, validation             |
| `apps/api/src/services/`   | `api/`          | Business logic services                |
| `apps/api/src/middleware/` | `api/`          | Request middleware                     |
| `packages/ai/`             | `ai/`           | OpenRouter client, streaming           |
| `apps/docs/`               | `contributing/` | KB infrastructure, design system       |

**Edge Cases:**

- No `code_files` → Skip KB updates, proceed with legacy docs only
- Multiple domains → Update all relevant domains
- Unknown domain (e.g., `apps/worker/`) → Log info, continue with known domains

### Phase 3: KB Page Discovery

For each detected KB domain:

1. Search `apps/docs/src/{domain}/**/*.md` for pages with `related_code` frontmatter
2. Parse frontmatter using YAML parser
3. Check if any `related_code` entries match task's `code_files`:
   - Exact match: `packages/auth/src/session.service.ts`
   - Glob pattern: `packages/auth/src/**/*.ts` (use minimatch logic)
4. Collect matching pages as "update candidates"

**Result:** List of KB pages to update per domain

### Phase 4: KB Update Execution

For each KB page identified:

**4.1 Read and Analyze:**

- Read existing page content
- Parse frontmatter metadata
- Understand current structure and content

**4.2 Determine Update Type:**
Writer agent decides what to update:

- Add new code example from task implementation
- Update existing example with improved pattern
- Add new subsection for new feature/pattern
- Update troubleshooting section with new solution
- Add cross-reference to newly created related page

**4.3 Apply Updates Following KB Guidelines:**

Follow the contributing documentation standards:

- **Structure** (from documentation.md): Use correct doc type template, domain selection, references section
- **Formatting** (from kb-page-design.md): Maintain heading hierarchy (H1 → H2 → H3), proper code blocks, custom containers
- **Style** (from design-system.md): Maintain consistent visual identity and tone
- **Validation** (from ci-validation.md): Ensure changes will pass CI checks

Key practices:
- Extract code examples from actual implementation files (never invent code)
- Update cross-references if structure changes
- Preserve existing content (extend, don't replace)
- Use proper linking conventions (no `.md` for KB links, GitHub URLs for source code)

**4.4 Update Frontmatter:**

```yaml
---
title: Existing Title (unchanged)
description: Existing description (unchanged)
related_code:
  - packages/auth/src/session.service.ts # existing
  - apps/api/src/middleware/session.middleware.ts # NEW from task
implements_task: E02-T002 # original task ID (if present)
last_verified: 2026-01-13 # UPDATED to today's date (YYYY-MM-DD)
---
```

**Important:**

- Add new `related_code` entries for files from this task
- Update `last_verified` to today's date (ISO 8601 format: YYYY-MM-DD)
- Preserve `implements_task` if already present
- Do NOT change title or description unless content significantly changed

**4.5 Code Example Guidelines:**

- Copy code directly from implementation files
- Keep examples concise (5-15 lines ideal, max 50 lines)
- Use line highlighting for important lines: ` ```typescript{2,4-6} `
- Add file path in code block header: ` ```typescript [path/to/file.ts] `
- Include relevant imports and context
- Add comments to explain non-obvious logic

**4.6 Add Backlog References:**

When updating KB pages, add or update implementation references in the Related Pages section:

```markdown
## Related Pages

**Related Documentation:**
- [Related KB Concept](/domain/concepts/concept)
- [Related KB Pattern](/domain/patterns/pattern)

**Implementation:**
- [E02-T002: Sessions table and Lucia setup](/backlog/completed/E02/E02-T002.md) ([spec](/backlog/docs/specs/E02/E02-T002-spec.md))
- [E02-T008: Auth integration tests](/backlog/completed/E02/E02-T008.md) ([spec](/backlog/docs/specs/E02/E02-T008-spec.md), [QA report](/backlog/docs/reviews/E02/E02-T008-qa-report.md))
```

**Guidelines:**

- Include task ID in link text for searchability: `[E02-T002: Brief description](...)`
- Use descriptive text (3-8 words) that explains what was implemented
- Separate KB documentation links from backlog references with subsections
- Link to spec if spec exists: `([spec](/backlog/docs/specs/{EPIC}/{TASK-ID}-spec.md))`
- Link to review artifacts if relevant: `([QA report](/backlog/docs/reviews/...))`
- Use correct backlog path based on task status:
  - Active tasks: `/backlog/tasks/{EPIC}/{TASK-ID}.md`
  - Completed tasks: `/backlog/completed/{EPIC}/{TASK-ID}.md`

**Note:** At documentation time, task is still in `tasks/` directory. Use `/backlog/tasks/` path initially. The path will be updated when the task moves to `completed/` after PR merge.

**4.7 Inline Task References (Optional):**

For significant implementation details within content, add inline references sparingly:

```markdown
The session system (see [E02-T002: Sessions table](/backlog/tasks/E02/E02-T002.md))
uses Lucia for session management.
```

**When to use:**

- Explaining implementation details from a specific task
- Pointing to specifications for complex features
- Linking to review artifacts for context
- Maximum 1-2 per paragraph
- Use parenthetical "(see ...)" placement

### Phase 5: New Page Decision Point

If no existing KB pages match task's code files:

**5.1 Analyze Task Scope:**
Determine if new KB page would be valuable:

- ✅ New concept introduced (e.g., two-factor authentication)
- ✅ New pattern implemented (e.g., guard middleware)
- ✅ New troubleshooting guidance (e.g., session expiry debugging)
- ✅ New API feature with reusable pattern
- ❌ Minor bug fix with no reusable pattern
- ❌ Internal refactoring with no API change
- ❌ Build/tooling changes

**5.2 If Valuable, Ask User:**
Use clear prompt format:

```
No existing KB pages found for this task's code changes.

Affected domain: auth/
Implemented files:
  - packages/auth/src/two-factor.service.ts
  - packages/auth/src/totp.ts

Suggested KB page: auth/patterns/two-factor-authentication.md
Reason: Implements reusable pattern for TOTP-based 2FA

Options:
1. Create new KB page (recommended for reusable patterns)
2. Skip KB page creation (if pattern is too specific)

Choice: [1/2]
```

**5.3 If User Approves, Create New Page:**

**5.3a Choose Template:**

Use appropriate template from `apps/docs/src/contributing/documentation.md`:
  - Concept Template (for mental models and "how X works")
  - Pattern Template (for reusable implementations)
  - Decision Record Template (for ADRs)
  - Troubleshooting Template (for problem → solution guides)

**5.3b Set Frontmatter:**

```yaml
---
title: New Page Title
description: Brief one-sentence description
related_code:
  - packages/auth/src/two-factor.service.ts
  - packages/auth/src/totp.ts
implements_task: E02-T010
last_verified: 2026-01-15
---
```

**5.3c Write Content:**

- Follow formatting guidelines from `kb-page-design.md` (heading hierarchy, code blocks, containers)
- Follow design system from `design-system.md` (consistent tone and style)
- Include code examples from implementation
- Add to appropriate content type folder (concepts, patterns, decisions, troubleshooting)

**5.3d Add Related Pages Section:**

Every new KB page must include a Related Pages section with backlog references:

```markdown
## Related Pages

**Related Documentation:**
- [Related Concept](/domain/concepts/related)
- [Related Pattern](/domain/patterns/pattern)

**Implementation:**
- [E02-T010: Two-factor authentication with TOTP](/backlog/tasks/E02/E02-T010.md) ([spec](/backlog/docs/specs/E02/E02-T010-spec.md))
```

This provides:
- Navigation to related KB pages
- Traceability to implementing task
- Quick access to implementation spec

**5.4 Update Sidebar Config:**

If new page created, update `.vitepress/config.ts`:

- Find relevant domain section
- Add new page entry in appropriate content type array
- Replace "Coming Soon" placeholder if present
- Use descriptive link text matching page title

### Phase 6: Staleness Verification

After KB updates complete:

**6.1 Run Staleness Check:**

```bash
pnpm --filter @raptscallions/docs check-staleness --format markdown
```

**6.2 Verify Results:**

- Confirm updated pages show `last_verified: TODAY`
- Confirm no stale entries for updated pages
- If staleness issues detected, review and fix before proceeding

**6.3 Verify Build:**

```bash
pnpm docs:build
```

- Catches broken internal links
- Validates markdown syntax
- Confirms frontmatter is valid YAML
- If build fails, fix issues before proceeding

### Phase 7: Legacy Documentation Updates

After KB updates complete, update legacy docs:

**7.1 Identify Relevant Sections:**

- **ARCHITECTURE.md** — High-level system design, technology choices
- **CONVENTIONS.md** — Code style, patterns, file naming
- **README.md** — Project overview, getting started

**7.2 Update Content:**

- Update relevant sections with new patterns/changes
- Keep content high-level (details belong in KB)
- Add cross-references to KB for details:

  ```markdown
  ## Authentication

  RaptScallions uses Lucia for session-based authentication with support for OAuth providers.

  For detailed patterns and examples, see:

  - [Session Lifecycle](/auth/concepts/session-lifecycle) in the Knowledge Base
  - [Permission Guards](/auth/patterns/permission-guards)
  ```

**7.3 Avoid Duplication:**

- Legacy docs = overview + links to KB
- KB = detailed patterns + code examples
- Don't duplicate code examples in both places

### Phase 8: Task Metadata Updates

**8.1 Add Documentation Updates Section:**

Add new section to task file with details on all KB and legacy doc updates:

```markdown
## Documentation Updates

**KB Documentation:**

- Updated: `apps/docs/src/auth/patterns/session-guards.md`
  - Added example for role-based guards
  - Updated `related_code` with new middleware file
  - Added backlog reference in Related Pages section
  - Set `last_verified: 2026-01-13`
- Updated: `apps/docs/src/api/patterns/middleware.md`
  - Added guard middleware pattern
  - Updated frontmatter
  - Added backlog reference to this task

**Legacy Documentation:**

- Updated: `docs/CONVENTIONS.md` section "Middleware Patterns"
- Added cross-reference to KB guard pattern

**Verification:**

- ✅ Staleness check passed (0 stale docs)
- ✅ Build check passed (no broken links)
- ✅ All KB pages include backlog references
```

**Important:** When documenting KB updates, note:
- Which backlog references were added to Related Pages sections
- Use correct backlog paths based on task status (tasks/ vs completed/)
- At documentation time, task is still in `tasks/` directory

**8.2 Update Task Frontmatter:**

```yaml
workflow_state: PR_READY
status: in-progress
updated_at: 2026-01-13T14:30:00Z
```

**8.3 DO NOT Move to Completed:**

Task moves to `completed/` only after PR is merged (handled by `/commit-and-pr`). When task moves:
- Backlog reference paths in KB pages will need updating from `/backlog/tasks/` to `/backlog/completed/`
- This is handled automatically by the `/commit-and-pr` workflow

## KB Page Structure Reference

When updating or creating KB pages, follow these content types:

| Content Type         | Purpose                              | Example Topics                                     |
| -------------------- | ------------------------------------ | -------------------------------------------------- |
| **concepts/**        | Core ideas, mental models            | Session lifecycle, CASL abilities, ltree hierarchy |
| **patterns/**        | Reusable implementation patterns     | Guard middleware, error handling, query builders   |
| **decisions/**       | Architecture decision records (ADRs) | Why Drizzle over Prisma, why Fastify over Express  |
| **troubleshooting/** | Problem → solution guides            | Session expiry debugging, permission denied errors |

**Choosing Content Type:**

- New mental model or concept? → `concepts/`
- Reusable code pattern? → `patterns/`
- Explaining a tech choice? → `decisions/`
- Debugging guide? → `troubleshooting/`

## Custom Containers (Callouts)

Use VitePress custom containers to highlight important information:

```markdown
::: tip Best Practice
Always validate sessions on the server side before processing requests.
:::

::: info
Lucia sessions expire after 30 days of inactivity by default.
:::

::: warning
Do not store sensitive data in session attributes. Use server-side storage.
:::

::: danger Security Risk
Never expose session secrets in client-side code or logs.
:::
```

**When to use:**

- **tip** — Best practices, recommendations, helpful hints
- **info** — Additional context, FYI, related information
- **warning** — Potential pitfalls, deprecated features, breaking changes
- **danger** — Security risks, data loss warnings, critical errors

## Code Example Patterns

### Basic Example

````markdown
\```typescript
export async function validateSession(sessionId: string): Promise<Session | null> {
const session = await db.query.sessions.findFirst({
where: eq(sessions.id, sessionId)
});
return session;
}
\```
````

### With File Path

````markdown
\```typescript [packages/auth/src/session.service.ts]
export async function validateSession(sessionId: string): Promise<Session | null> {
// Implementation...
}
\```
````

### With Line Highlighting

````markdown
\```typescript{2,4-6}
export function createUser(data: CreateUserInput) {
const hashedPassword = await hashPassword(data.password); // highlighted

const user = await db.insert(users).values({ // highlighted
...data, // highlighted
passwordHash: hashedPassword // highlighted
});

return user;
}
\```
````

### Code Groups (Multiple Languages)

````markdown
::: code-group
\```typescript [TypeScript]
const user: User = { id: "123", name: "Alice" };
\```

\```javascript [JavaScript]
const user = { id: "123", name: "Alice" };
\```
:::
````

## Backlog Reference Best Practices

When adding backlog references to KB pages, follow these guidelines:

**DO:**

- ✅ Include task ID in link text: `[E02-T002: Sessions table and Lucia setup](...)`
- ✅ Use brief descriptions (3-8 words) that explain what was implemented
- ✅ Separate KB documentation links from backlog references with subsections
- ✅ Link to specs for complex implementations: `([spec](/backlog/docs/specs/...))`
- ✅ Link to review artifacts when relevant: `([QA report](/backlog/docs/reviews/...))`
- ✅ Use correct paths based on task status (tasks/ or completed/)
- ✅ Group related task references together in Implementation subsection

**DON'T:**

- ❌ Use bare task IDs without description: `[E02-T002](...)`
- ❌ Use generic text like "click here" or "see task"
- ❌ Mix KB documentation links and backlog references in same list
- ❌ Overuse inline references (max 1-2 per paragraph)
- ❌ Forget to include spec links when specs exist
- ❌ Skip backlog references entirely (they provide critical traceability)

**Example of correct Related Pages section:**

```markdown
## Related Pages

**Related Documentation:**
- [Session Lifecycle](/auth/concepts/session-lifecycle)
- [CASL Permissions](/auth/concepts/casl-setup)

**Implementation:**
- [E02-T002: Sessions table and Lucia setup](/backlog/completed/E02/E02-T002.md) ([spec](/backlog/docs/specs/E02/E02-T002-spec.md))
- [E02-T008: Auth integration tests](/backlog/completed/E02/E02-T008.md) ([spec](/backlog/docs/specs/E02/E02-T008-spec.md), [QA report](/backlog/docs/reviews/E02/E02-T008-qa-report.md))
```

## Verification Checklist

Before completing the command, verify:

- [ ] All affected KB domains identified correctly
- [ ] All matching KB pages updated (not just first match)
- [ ] Frontmatter updated: `related_code` + `last_verified`
- [ ] Code examples extracted from actual implementation
- [ ] Heading hierarchy maintained (no skipped levels)
- [ ] Custom containers used appropriately
- [ ] Cross-references updated if structure changed
- [ ] **Related Pages section includes Implementation subsection**
- [ ] **Backlog references use descriptive link text (not just task ID)**
- [ ] **Backlog paths are correct (tasks/ vs completed/)**
- [ ] **Spec links included where specs exist**
- [ ] **Review artifact links included where relevant**
- [ ] Staleness check passes (0 stale docs for updated pages)
- [ ] Build check passes (no broken links)
- [ ] Legacy docs updated with cross-references
- [ ] Documentation Updates section added to task
- [ ] Task frontmatter updated to `PR_READY`

## Integration with Other Commands

### After `/update-docs` Completes:

```
Task state: PR_READY
Next step: /commit-and-pr
```

The `/commit-and-pr` command will:

1. Commit all changes (code + KB docs + legacy docs)
2. Create PR with documentation updates included
3. Single review covers implementation + documentation

### Relation to `/document`:

- `/document` — For dedicated KB documentation tasks (E06 epic)
- `/update-docs` — For implementation tasks that also update KB
- No conflict, complementary purposes

### Relation to Epic Review:

- Epic review checks if KB docs exist for completed tasks
- `/update-docs` reduces need for follow-up doc tasks
- If docs still missing, epic review creates follow-up tasks

## Troubleshooting

### No KB Pages Found

If no KB pages match task's code files and no new page seems needed:

- This is normal for internal refactoring
- Skip KB updates gracefully
- Proceed with legacy doc updates only
- Document in task: "No KB updates needed (internal changes only)"

### Staleness Check Fails

If staleness check reports issues after update:

- Verify `last_verified` date is today (YYYY-MM-DD format)
- Verify `related_code` paths are correct (relative to repo root)
- Check for typos in file paths
- Re-run check after fixing

### Build Check Fails

If `pnpm docs:build` fails:

- Check for broken internal links (use absolute paths like `/auth/concepts/...`)
- Verify frontmatter YAML is valid (no syntax errors)
- Check for unclosed code blocks or custom containers
- Fix issues and re-run build

### Multiple Domains Detected

If task touches multiple domains:

- Update all relevant domains (don't skip any)
- Group updates by domain in Documentation Updates section
- Verify each domain's pages independently

## Arguments

- `$ARGUMENTS` - The task ID (e.g., E01-T001)

## Example Workflow

```bash
# Run update-docs command
/update-docs E02-T003

# Writer agent workflow:
# 1. Reads task, spec, and code files
# 2. Detects domains: auth/, api/
# 3. Finds KB pages with matching related_code
# 4. Updates KB pages with:
#    - apps/docs/src/auth/patterns/session-guards.md
#      * New code example from implementation
#      * Updated related_code frontmatter
#      * Updated last_verified date
#      * Added backlog reference in Related Pages:
#        **Implementation:**
#        - [E02-T003: Session middleware guards](/backlog/tasks/E02/E02-T003.md) ([spec](/backlog/docs/specs/E02/E02-T003-spec.md))
#    - apps/docs/src/api/patterns/middleware.md
#      * Updated guard middleware pattern
#      * Added backlog reference to this task
# 5. Runs staleness check → passes
# 6. Runs build check → passes
# 7. Updates CONVENTIONS.md with cross-reference to KB
# 8. Adds Documentation Updates section to task
# 9. Sets workflow_state to PR_READY

# Next step: Create PR
/commit-and-pr E02-T003

# After PR merge, task moves to backlog/completed/E02/
# KB page backlog references will show updated path automatically
```

## Contributing Documentation Reference

The writer agent should reference these guides when updating or creating KB documentation:

| Guide | Location | Purpose |
|-------|----------|---------|
| **Documentation Guide** | `apps/docs/src/contributing/documentation.md` | What to write — templates, conventions, domain selection, linking rules |
| **KB Page Design** | `apps/docs/src/contributing/kb-page-design.md` | How to format — markdown syntax, VitePress features, code blocks, containers |
| **Design System** | `apps/docs/src/contributing/design-system.md` | Visual identity — colors, typography, spacing, theme system, brand consistency |
| **CI Validation** | `apps/docs/src/contributing/ci-validation.md` | Quality assurance — how docs are validated in CI, fixing build errors, staleness checks |

**Quick Decision Tree:**

1. Need a template? → `documentation.md` (Doc Type Templates section)
2. Not sure which domain/folder? → `documentation.md` (Domain Selection Guide)
3. How to format code blocks? → `kb-page-design.md` (Code Block Patterns)
4. How to link to other pages? → `documentation.md` (Linking Conventions)
5. How to add backlog references? → `kb-page-design.md` (Backlog References section)
6. What tone/style to use? → `design-system.md` (Writing Guidelines)
7. Will this pass CI? → `ci-validation.md` (Local Validation)

## Next Step

Based on all workflows that include docs update:

**Development workflow:**
Task is ready for PR creation (human step)

**Schema workflow:**
Task is ready for PR creation (human step)

**Infrastructure workflow:**
Task is ready for PR creation (human step)

---

*After docs are updated, the task is `PR_READY`. Human creates PR and merges.*

## Notes

- This command implements the E06 epic vision (KB docs stay in sync with code)
- Leverages staleness detection infrastructure (E06-T003)
- Reuses KB authoring patterns from `/document` command
- Maintains backward compatibility (legacy docs still updated)
- Reduces manual KB maintenance burden significantly
- Prepares for future where all tasks include "KB docs updated" in acceptance criteria
