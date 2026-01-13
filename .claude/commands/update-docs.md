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
5. Read KB authoring guide at `apps/docs/src/contributing/kb-page-design.md`

### Phase 2: Domain Detection

Parse `code_files` from task frontmatter and map to KB domains:

| Code Path Pattern | KB Domain | Example |
|-------------------|-----------|---------|
| `packages/auth/` | `auth/` | Session management, permissions, OAuth |
| `packages/db/` | `database/` | Drizzle schemas, migrations, queries |
| `apps/api/src/routes/` | `api/` | Route handlers, validation |
| `apps/api/src/services/` | `api/` | Business logic services |
| `apps/api/src/middleware/` | `api/` | Request middleware |
| `packages/ai/` | `ai/` | OpenRouter client, streaming |
| `apps/docs/` | `contributing/` | KB infrastructure, design system |

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

**4.3 Apply Updates Following KB Patterns:**
- Maintain heading hierarchy (H1 → H2 → H3, never skip levels)
- Use proper code block syntax with language tags
- Add custom containers if appropriate (tip, info, warning, danger)
- Extract code examples from actual implementation files (never invent code)
- Update cross-references if structure changes
- Preserve existing content (extend, don't replace)

**4.4 Update Frontmatter:**
```yaml
---
title: Existing Title (unchanged)
description: Existing description (unchanged)
related_code:
  - packages/auth/src/session.service.ts  # existing
  - apps/api/src/middleware/session.middleware.ts  # NEW from task
implements_task: E02-T002  # original task ID (if present)
last_verified: 2026-01-13  # UPDATED to today's date (YYYY-MM-DD)
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
- Use template from `apps/docs/src/contributing/kb-page-design.md` (lines 647-729)
- Set frontmatter with `related_code` and `last_verified`
- Add `implements_task: {TASK-ID}` to track origin
- Follow heading hierarchy strictly
- Include code examples from implementation
- Add to appropriate content type folder (concepts, patterns, decisions, troubleshooting)

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

  Raptscallions uses Lucia for session-based authentication with support for OAuth providers.

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
Add new section to task file:
```markdown
## Documentation Updates

**KB Documentation:**
- Updated: `apps/docs/src/auth/patterns/session-guards.md`
  - Added example for role-based guards
  - Updated `related_code` with new middleware file
  - Set `last_verified: 2026-01-13`
- Updated: `apps/docs/src/api/patterns/middleware.md`
  - Added guard middleware pattern
  - Updated frontmatter

**Legacy Documentation:**
- Updated: `docs/CONVENTIONS.md` section "Middleware Patterns"
- Added cross-reference to KB guard pattern

**Verification:**
- ✅ Staleness check passed (0 stale docs)
- ✅ Build check passed (no broken links)
```

**8.2 Update Task Frontmatter:**
```yaml
workflow_state: PR_READY
status: in-progress
updated_at: 2026-01-13T14:30:00Z
```

**8.3 DO NOT Move to Completed:**
Task moves to `completed/` only after PR is merged (handled by `/commit-and-pr`)

## KB Page Structure Reference

When updating or creating KB pages, follow these content types:

| Content Type | Purpose | Example Topics |
|--------------|---------|----------------|
| **concepts/** | Core ideas, mental models | Session lifecycle, CASL abilities, ltree hierarchy |
| **patterns/** | Reusable implementation patterns | Guard middleware, error handling, query builders |
| **decisions/** | Architecture decision records (ADRs) | Why Drizzle over Prisma, why Fastify over Express |
| **troubleshooting/** | Problem → solution guides | Session expiry debugging, permission denied errors |

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
```markdown
\```typescript
export async function validateSession(sessionId: string): Promise<Session | null> {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId)
  });
  return session;
}
\```
```

### With File Path
```markdown
\```typescript [packages/auth/src/session.service.ts]
export async function validateSession(sessionId: string): Promise<Session | null> {
  // Implementation...
}
\```
```

### With Line Highlighting
```markdown
\```typescript{2,4-6}
export function createUser(data: CreateUserInput) {
  const hashedPassword = await hashPassword(data.password); // highlighted

  const user = await db.insert(users).values({ // highlighted
    ...data,                                    // highlighted
    passwordHash: hashedPassword                // highlighted
  });

  return user;
}
\```
```

### Code Groups (Multiple Languages)
```markdown
::: code-group
\```typescript [TypeScript]
const user: User = { id: "123", name: "Alice" };
\```

\```javascript [JavaScript]
const user = { id: "123", name: "Alice" };
\```
:::
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
# 4. Updates:
#    - apps/docs/src/auth/patterns/session-guards.md
#    - apps/docs/src/api/patterns/middleware.md
# 5. Updates frontmatter (related_code, last_verified)
# 6. Runs staleness check → passes
# 7. Runs build check → passes
# 8. Updates CONVENTIONS.md with cross-reference
# 9. Adds Documentation Updates section to task
# 10. Sets workflow_state to PR_READY

# Next step: Create PR
/commit-and-pr E02-T003
```

## Notes

- This command implements the E06 epic vision (KB docs stay in sync with code)
- Leverages staleness detection infrastructure (E06-T003)
- Reuses KB authoring patterns from `/document` command
- Maintains backward compatibility (legacy docs still updated)
- Reduces manual KB maintenance burden significantly
- Prepares for future where all tasks include "KB docs updated" in acceptance criteria
