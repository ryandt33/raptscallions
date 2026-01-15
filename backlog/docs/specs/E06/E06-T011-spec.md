# E06-T011 Specification: Backlog Citation System in KB

**Epic:** E06 - Knowledge Base & Documentation Infrastructure
**Task ID:** E06-T011
**Priority:** High
**Depends On:** E06-T002 (KB folder structure and navigation)
**Blocks:** None (enhancement to existing docs)

---

## Problem Statement

Currently, KB documentation references backlog tasks and specs using plain text without clickable links:

```markdown
**Implements:** E02-T002 (OAuth Provider Implementation)
```

This creates several issues:

1. **Not Discoverable**: References don't show up in VitePress search
2. **Not Clickable**: Users can't navigate directly to task files or specs
3. **Not Verifiable**: No way to validate references aren't broken
4. **Inconsistent Format**: No standard citation style across docs

### Current Reference Pattern Problems

**Example from `/testing/patterns/factories.md`:**

```markdown
## References

**Implements:** E02-T008 (Auth integration tests)

**Key Files:**
- [abilities.test.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/auth/__tests__/abilities.test.ts)
```

**Issues:**
- Task reference is plain text (not a link)
- GitHub URLs are brittle (break when files move)
- No way to link to local task files or specs
- Can't reference multiple related tasks cleanly

---

## Proposed Solution

Implement an academic-style citation system with numbered references that link directly to backlog files:

```markdown
This pattern was established during auth implementation[1] based on the
original design spec[2].

## References

[1]: /backlog/completed/E02/E02-T002.md "E02-T002: Implement OAuth providers"
[2]: /backlog/docs/specs/E02/E02-T002-spec.md "E02-T002 Specification"
[3]: /backlog/docs/reviews/E02/E02-T002-code-review.md "E02-T002 Code Review"
```

**Benefits:**

1. ✅ **Clickable**: Direct navigation to task files, specs, reviews
2. ✅ **Searchable**: VitePress indexes citation content
3. ✅ **Clean Inline**: Numbers don't clutter prose (`[1]` vs. long URLs)
4. ✅ **Standardized**: Consistent format across all KB docs
5. ✅ **Maintainable**: Relative paths work locally and in production
6. ✅ **Accessible**: Hover shows full title without clicking

---

## Technical Approach

### 1. VitePress Alias Configuration

Add alias to `.vitepress/config.ts` to resolve `/backlog` paths:

```typescript
import { defineConfig } from "vitepress";
import path from "path";

export default defineConfig({
  // ... existing config

  vite: {
    resolve: {
      alias: {
        "/backlog": path.resolve(__dirname, "../../../backlog"),
      },
    },
  },
});
```

**Why This Works:**
- VitePress uses Vite's resolver for markdown links
- Alias maps virtual `/backlog` to actual relative path
- Works in dev mode (`pnpm docs:dev`) and production build (`pnpm docs:build`)
- Doesn't require changing existing backlog structure

### 2. Markdown Link Format

Use markdown reference-style links with descriptive titles:

```markdown
[1]: /backlog/completed/E02/E02-T002.md "E02-T002: Implement OAuth providers"
```

**Format Rules:**
- **Path**: `/backlog/{status}/{epic}/{task}.md`
  - `status`: `tasks/` (active) or `completed/` (done)
  - `epic`: Epic ID (e.g., `E02`)
  - `task`: Task filename (e.g., `E02-T002.md`)
- **Title**: `"{TASK-ID}: {Brief Description}"`
  - Shows on hover in VitePress
  - Helps users understand context before clicking
- **Numbering**: Sequential `[1]`, `[2]`, `[3]` per page
  - Restart numbering on each page (not global)
  - Maintain order throughout document lifecycle

**Examples:**

```markdown
[1]: /backlog/completed/E02/E02-T002.md "E02-T002: Implement OAuth providers"
[2]: /backlog/docs/specs/E02/E02-T002-spec.md "E02-T002 Specification"
[3]: /backlog/docs/reviews/E02/E02-T002-code-review.md "E02-T002 Code Review"
[4]: /backlog/tasks/E06/E06-T011.md "E06-T011: Backlog citation system (active)"
```

### 3. Inline Citation Usage

Reference citations inline with prose:

```markdown
The session lifecycle[1] follows Lucia's recommended patterns. OAuth
providers[2] were implemented according to the security guidelines[3].

## References

[1]: /backlog/completed/E02/E02-T001.md "E02-T001: Session management"
[2]: /backlog/completed/E02/E02-T002.md "E02-T002: OAuth providers"
[3]: /backlog/docs/specs/E02/E02-T002-spec.md "E02-T002 Security requirements"
```

**Best Practices:**
- Place citations at end of sentence or clause
- Use superscript-style numbers: `[1]`, not `[ref 1]` or `(1)`
- Multiple citations: `[1][2]` or `[1,2]` (choose one convention)
- Don't overuse: 1-2 citations per paragraph max

---

## Citation Types & Conventions

### Task Files

**Active Tasks:**
```markdown
[N]: /backlog/tasks/{EPIC}/{TASK-ID}.md "{TASK-ID}: {Title} (active)"
```

**Completed Tasks:**
```markdown
[N]: /backlog/completed/{EPIC}/{TASK-ID}.md "{TASK-ID}: {Title}"
```

### Specification Documents

```markdown
[N]: /backlog/docs/specs/{EPIC}/{TASK-ID}-spec.md "{TASK-ID} Specification"
```

### Review Documents

**Code Reviews:**
```markdown
[N]: /backlog/docs/reviews/{EPIC}/{TASK-ID}-code-review.md "{TASK-ID} Code Review"
```

**QA Reports:**
```markdown
[N]: /backlog/docs/reviews/{EPIC}/{TASK-ID}-qa-report.md "{TASK-ID} QA Report"
```

**UI Reviews:**
```markdown
[N]: /backlog/docs/reviews/{EPIC}/{TASK-ID}-ui-review.md "{TASK-ID} UI Review"
```

**Architecture Reviews:**
```markdown
[N]: /backlog/docs/reviews/{EPIC}/{TASK-ID}-plan-review.md "{TASK-ID} Architecture Review"
```

**Epic Reviews:**
```markdown
[N]: /backlog/docs/reviews/{EPIC}/_epic-review.md "{EPIC-ID} Epic Review"
```

### Epic Files

```markdown
[N]: /backlog/tasks/{EPIC}/_epic.md "{EPIC-ID}: {Epic Title}"
```

---

## Standard References Section Format

Every KB page should include a "References" section at the end:

```markdown
## References

### Primary Implementation

[1]: /backlog/completed/E02/E02-T008.md "E02-T008: Auth integration tests"
[2]: /backlog/docs/specs/E02/E02-T008-spec.md "E02-T008 Specification"

### Code Reviews & QA

[3]: /backlog/docs/reviews/E02/E02-T008-code-review.md "E02-T008 Code Review"
[4]: /backlog/docs/reviews/E02/E02-T008-qa-report.md "E02-T008 QA Report"

### Related Tasks

[5]: /backlog/completed/E01/E01-T008.md "E01-T008: Configure Vitest"
[6]: /backlog/completed/E02/E02-T001.md "E02-T001: Session management"

### Key Source Files

[7]: https://github.com/ryandt33/raptscallions/blob/main/packages/auth/__tests__/abilities.test.ts "abilities.test.ts"
```

**Section Breakdown:**

1. **Primary Implementation**: The main task(s) and spec(s) this page documents
2. **Code Reviews & QA**: Review artifacts for quality assurance
3. **Related Tasks**: Dependencies or connected implementations
4. **Key Source Files**: Links to actual code (use GitHub URLs for stability)

**Subsections are optional** - use only if you have multiple citation types.

---

## Migration Strategy

### Phase 1: Update Citation Guide (Immediate)

1. Update `apps/docs/src/contributing/kb-page-design.md`:
   - Add section on "Citation System"
   - Provide examples and templates
   - Document all citation types

2. Update `apps/docs/src/contributing/documentation.md`:
   - Add citation format to templates
   - Show before/after examples
   - Update style guide

### Phase 2: Configure VitePress (Immediate)

1. Modify `.vitepress/config.ts`:
   - Add `/backlog` alias
   - Test in dev mode
   - Test in production build

2. Verify resolution:
   ```bash
   # Dev mode
   pnpm docs:dev
   # Check that /backlog links resolve

   # Production build
   pnpm docs:build
   pnpm docs:preview
   # Verify links still work
   ```

### Phase 3: Update Existing Docs (Incremental)

**Priority 1: Completed Domains** (E06-T005, E06-T009, E06-T010)
- `/auth/` - Already documented, update references
- `/testing/` - Already documented, update references
- `/api/` - Already documented, update references

**Priority 2: In-Progress Domains** (E06-T006, E06-T007)
- `/database/` - Add citations as docs are created
- `/ai/` - Add citations as docs are created

**Priority 3: Future Domains**
- Use new citation system from start

**Migration Approach:**
- Don't batch-update all docs at once
- Update opportunistically when editing pages
- Use new format for all new content
- No forced rewrite of existing content

### Phase 4: Validation Script (Future Enhancement)

Create script to validate citations (out of scope for initial implementation):

```bash
# Check for broken citation links
pnpm docs:validate-citations

# Output:
# ❌ apps/docs/src/auth/concepts/sessions.md:42
#    Citation [3] points to non-existent file: /backlog/completed/E02/E02-T999.md
# ✅ 45 citations validated successfully
```

---

## Examples

### Example 1: Concept Page with Citations

**File:** `apps/docs/src/auth/concepts/sessions.md`

```markdown
---
title: Session Lifecycle
description: How Lucia sessions are created, validated, and expired
related_code:
  - packages/auth/src/session.service.ts
  - apps/api/src/middleware/session.middleware.ts
last_verified: 2026-01-14
---

# Session Lifecycle

The session system[1] uses Lucia for session management with custom
extensions for our multi-tenant architecture[2].

## Session Creation

When a user logs in, the system creates a new session[3]:

```typescript
const session = await lucia.createSession(userId, {
  expiresIn: sessionConfig.maxAge,
});
```

This implementation was refined based on security review feedback[4].

## References

### Primary Implementation

[1]: /backlog/completed/E02/E02-T002.md "E02-T002: Lucia session integration"
[2]: /backlog/docs/specs/E02/E02-T002-spec.md "E02-T002 Specification"

### Code Reviews & QA

[3]: /backlog/docs/reviews/E02/E02-T002-code-review.md "E02-T002 Code Review"
[4]: /backlog/docs/reviews/E02/_epic-review.md "E02 Epic Review"

### Related Documentation

- [Lucia Configuration](/auth/concepts/lucia)
- [Authentication Guards](/auth/patterns/guards)
```

### Example 2: Pattern Page with Multiple Citations

**File:** `apps/docs/src/testing/patterns/factories.md`

```markdown
---
title: Test Factories
description: Creating reusable mock data with factory functions
related_code:
  - packages/auth/__tests__/abilities.test.ts
  - apps/api/src/__tests__/integration/auth.routes.test.ts
last_verified: 2026-01-14
---

# Test Factories

Factory functions create consistent mock data[1]. This pattern emerged
during auth testing implementation[2] and has become standard across
the codebase[3].

## Basic Factory Pattern

```typescript
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    ...overrides,
  };
}
```

The design was validated during code review[4] and refined based on
QA feedback[5].

## References

### Primary Implementation

[1]: /backlog/completed/E02/E02-T008.md "E02-T008: Auth integration tests"
[2]: /backlog/docs/specs/E02/E02-T008-spec.md "E02-T008 Specification"

### Code Reviews & QA

[3]: /backlog/docs/reviews/E02/E02-T008-code-review.md "E02-T008 Code Review"
[4]: /backlog/docs/reviews/E02/E02-T008-qa-report.md "E02-T008 QA Report"

### Related Tasks

[5]: /backlog/completed/E01/E01-T008.md "E01-T008: Vitest configuration"

### Key Source Files

[6]: https://github.com/ryandt33/raptscallions/blob/main/packages/auth/__tests__/abilities.test.ts "abilities.test.ts"
```

### Example 3: Troubleshooting Page

**File:** `apps/docs/src/auth/troubleshooting/session-issues.md`

```markdown
---
title: Session Issues
description: Common session-related problems and solutions
---

# Session Issues

## Cookie Not Set

**Symptom:** Session cookie not appearing in browser

**Cause:** HTTPS enforcement in production without proper configuration[1]

**Solution:** Ensure `SESSION_COOKIE_SECURE` matches environment:

```typescript
const sessionConfig = {
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
};
```

This was identified during integration testing[2] and documented in
the troubleshooting guide[3].

## References

[1]: /backlog/docs/specs/E02/E02-T002-spec.md "E02-T002 Cookie security requirements"
[2]: /backlog/docs/reviews/E02/E02-T008-qa-report.md "E02-T008 QA findings"
[3]: /backlog/completed/E02/E02-T008.md "E02-T008: Integration tests"

### Related Documentation

- [Session Lifecycle](/auth/concepts/sessions)
- [Lucia Configuration](/auth/concepts/lucia)
```

---

## Validation & Testing

### Manual Testing Checklist

After implementing the alias configuration:

- [ ] **Dev Mode Navigation**
  - Start dev server: `pnpm docs:dev`
  - Navigate to a page with citations
  - Click citation links
  - Verify navigation to backlog files
  - Verify hover shows title text

- [ ] **Production Build**
  - Build docs: `pnpm docs:build`
  - Preview: `pnpm docs:preview`
  - Test same citation links
  - Verify all links resolve correctly

- [ ] **Search Integration**
  - Open VitePress search (Cmd/Ctrl + K)
  - Search for task ID (e.g., "E02-T008")
  - Verify KB pages with citations appear in results
  - Verify clicking result navigates correctly

- [ ] **Cross-Platform**
  - Test on macOS, Linux, Windows (if applicable)
  - Verify paths resolve on all platforms
  - Check for case-sensitivity issues

### Edge Cases

**Active vs Completed Tasks:**
- Tasks in `/backlog/tasks/` → Use "active" label in title
- Tasks in `/backlog/completed/` → No label needed

**File Moves:**
- When task moves from `tasks/` to `completed/`, citations break
- Solution: Update citations when task completes (part of task completion checklist)

**Missing Files:**
- Citation points to non-existent file
- Browser shows 404 or broken link
- Solution: Validation script (future enhancement)

**Epic Reorganization:**
- If epic structure changes, all citations may break
- Solution: Keep epic structure stable, use validation script

---

## Documentation Updates

### 1. Update KB Page Design Guide

**File:** `apps/docs/src/contributing/kb-page-design.md`

Add new section after "Cross-Referencing":

```markdown
## Citation System

KB pages use academic-style numbered citations to reference backlog tasks,
specs, and reviews.

### Citation Format

Use markdown reference-style links:

\`\`\`markdown
This pattern was established during auth implementation[1].

## References

[1]: /backlog/completed/E02/E02-T002.md "E02-T002: OAuth providers"
\`\`\`

### Citation Types

- **Tasks**: `/backlog/{tasks|completed}/{EPIC}/{TASK-ID}.md`
- **Specs**: `/backlog/docs/specs/{EPIC}/{TASK-ID}-spec.md`
- **Reviews**: `/backlog/docs/reviews/{EPIC}/{TASK-ID}-{type}-review.md`

### Best Practices

- Place citations at end of sentence or clause
- Use sequential numbering: `[1]`, `[2]`, `[3]`
- Provide descriptive titles for hover text
- Group citations by type in References section

See examples in [Session Lifecycle](/auth/concepts/sessions).
```

### 2. Update Documentation Guide

**File:** `apps/docs/src/contributing/documentation.md`

Update templates to include References section:

```markdown
## Pattern Page Template

\`\`\`markdown
---
title: {Pattern Name}
description: {Brief description}
---

# {Pattern Name}

Brief introduction with citations[1].

## Implementation

Code examples and explanations[2].

## References

[1]: /backlog/completed/{EPIC}/{TASK-ID}.md "{TASK-ID}: {Title}"
[2]: /backlog/docs/specs/{EPIC}/{TASK-ID}-spec.md "{TASK-ID} Specification"
\`\`\`
```

### 3. Update Contributing Overview

**File:** `apps/docs/src/contributing/index.md`

Add bullet point under "Documentation Structure":

```markdown
- Use numbered citations to reference backlog tasks and specs
```

---

## Acceptance Criteria

### Configuration

- [ ] VitePress config includes `/backlog` alias
- [ ] Alias resolves correctly in dev mode (`pnpm docs:dev`)
- [ ] Alias resolves correctly in production build (`pnpm docs:build`)
- [ ] Hover text shows citation titles

### Documentation

- [ ] KB Page Design guide updated with citation section
- [ ] Documentation guide templates include References section
- [ ] Contributing overview mentions citation system
- [ ] All citation types documented with examples

### Examples

- [ ] At least 3 existing KB pages updated to use new citation format
- [ ] Examples cover all citation types (tasks, specs, reviews)
- [ ] Examples demonstrate inline usage and References section

### Testing

- [ ] Manual testing checklist completed
- [ ] Citations clickable in dev mode
- [ ] Citations clickable in production build
- [ ] VitePress search indexes citation content

### Code Quality

- [ ] TypeScript compilation succeeds
- [ ] No console errors in dev mode
- [ ] No broken links in build output
- [ ] Linting passes

---

## Out of Scope

**Deferred to future enhancements:**

- Automated validation script for broken citations
- Batch update of all existing documentation
- CI integration to fail on broken citations
- Auto-numbering or citation management tools
- GitHub Issues integration
- Citation analytics or usage tracking

---

## Success Metrics

After implementation, measure:

1. **Adoption Rate**: % of new KB pages using citation system
2. **Click-through Rate**: How often citations are clicked (if analytics added)
3. **Maintenance Time**: Time saved not manually updating references
4. **Developer Satisfaction**: Qualitative feedback on usability

---

## Implementation Checklist

### Phase 1: Configuration (30 min)

- [ ] Add Vite alias to `.vitepress/config.ts`
- [ ] Test alias resolution in dev mode
- [ ] Test alias resolution in production build
- [ ] Commit configuration changes

### Phase 2: Documentation Updates (1-2 hours)

- [ ] Update `kb-page-design.md` with citation section
- [ ] Update `documentation.md` templates
- [ ] Update `contributing/index.md` overview
- [ ] Add examples to each guide
- [ ] Commit documentation changes

### Phase 3: Example Migrations (1-2 hours)

- [ ] Update `/auth/concepts/sessions.md`
- [ ] Update `/testing/patterns/factories.md`
- [ ] Update `/auth/troubleshooting/session-issues.md`
- [ ] Verify all citations work correctly
- [ ] Commit example updates

### Phase 4: Validation (30 min)

- [ ] Run through manual testing checklist
- [ ] Verify no broken links in build
- [ ] Verify search integration works
- [ ] Create list of pages to update opportunistically

### Phase 5: Announce & Document (15 min)

- [ ] Add note in CLAUDE.md about citation system
- [ ] Update task completion in backlog
- [ ] Mark E06-T011 as DONE

---

## Dependencies

### Prerequisites

- [x] E06-T002: KB folder structure and navigation
- [x] VitePress installed and configured
- [x] Existing KB pages to use as examples

### Blocks

None - this is an enhancement to existing documentation

---

## References

**Policy Context:**
- E06-T012 Policy provides complementary improvements tracking system

**Technical References:**
- VitePress Configuration: https://vitepress.dev/reference/site-config
- Vite Alias Resolution: https://vitejs.dev/config/shared-options.html#resolve-alias
- Markdown Reference Links: https://www.markdownguide.org/basic-syntax/#reference-style-links

**Related Tasks:**
- E06-T002: KB folder structure (completed)
- E06-T005: Document auth system (completed)
- E06-T008: Cross-linking conventions (completed)
