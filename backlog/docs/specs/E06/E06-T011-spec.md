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

### Implementation Attempt #1: Numbered Citations (FAILED)

**Attempted Solution:** Academic-style numbered citations using markdown reference-style link definitions

```markdown
This pattern was established during auth implementation[1].

## References

[1]: /backlog/completed/E02/E02-T002.md "E02-T002: OAuth providers"
```

**Result:** Complete failure
- Inline `[1]` rendered as plain text (not clickable)
- References section was invisible (reference definitions don't render)
- Markdown reference-style links are metadata, not visible content

**Failure Analysis:** See [E06-T011-failure-analysis.md](../../reviews/E06/E06-T011-failure-analysis.md)

### Post-Failure UX Review: Hybrid Approach Rejected

**Attempted Solution:** Hybrid approach with visible numbered citations

```markdown
Sessions track authenticated users [[1]](/backlog/completed/E02/E02-T002.md).

## References

**[1]** E02-T002: Sessions table ([Task](/path), [Spec](/path))
```

**UX Verdict:** NEEDS_UX_CHANGES

**Critical Issues:**
1. **Manual numbering unsustainable** - 5-10 min overhead per citation insertion
2. **Accessibility violations** - WCAG 2.1 2.4.4 failure (link text is just "1")
3. **Redundant References section** - duplicates inline link information
4. **Pattern inconsistency** - KB uses descriptive links, not academic citations
5. **Mobile experience degraded** - no hover tooltips on touch devices

**UX Review:** See [E06-T011-spec.md:1430-1557](./E06-T011-spec.md#L1430-L1557)

---

## Proposed Solution

Use **descriptive inline links** with task IDs (consistent with existing KB patterns):

### Inline Citations

```markdown
Sessions track authenticated users across requests. The session lifecycle
implementation (see [E02-T002: Sessions table](/backlog/completed/E02/E02-T002.md))
uses Lucia for session creation, validation, and expiration.
```

### Related Pages Section

Group backlog references at end of page:

```markdown
## Related Pages

**Related Documentation:**
- [Lucia Configuration](/auth/concepts/lucia)
- [OAuth Providers](/auth/concepts/oauth)

**Implementation:**
- [E02-T002: Sessions table and Lucia setup](/backlog/completed/E02/E02-T002.md) ([spec](/backlog/docs/specs/E02/E02-T002-spec.md))
- [E02-T008: Auth integration tests](/backlog/completed/E02/E02-T008.md) ([spec](/backlog/docs/specs/E02/E02-T008-spec.md))
```

**Benefits:**

1. ✅ **Clickable**: Direct navigation to task files and specs
2. ✅ **Searchable**: VitePress indexes link text (task IDs)
3. ✅ **Accessible**: Link purpose clear from text (WCAG 2.1 compliant)
4. ✅ **No Manual Numbering**: Add/remove references without renumbering
5. ✅ **Maintainable**: Single location for backlog references
6. ✅ **Mobile-Friendly**: No hover dependency, works on all devices
7. ✅ **Pattern Consistent**: Uses same descriptive link style as internal KB cross-references

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

### 2. Inline Citation Format

Use descriptive links with task IDs in the text:

```markdown
<!-- Brief mention in prose -->
The authentication system (see [E02-T002: OAuth providers](/backlog/completed/E02/E02-T002.md))
uses Arctic for OAuth integration.

<!-- Parenthetical reference -->
Sessions are managed by Lucia (see [E02-T002: Sessions table](/backlog/completed/E02/E02-T002.md)).

<!-- Multiple references -->
The testing approach combines factories ([E02-T008: Auth integration tests](/backlog/completed/E02/E02-T008.md))
and AAA pattern ([E01-T008: Vitest configuration](/backlog/completed/E01/E01-T008.md)).
```

**Format Rules:**
- **Link Text**: `[{TASK-ID}: {Brief Description}]`
  - Always include task ID for searchability
  - Brief description (3-8 words) for context
  - Use title case for consistency
- **Path**: `/backlog/{status}/{epic}/{task}.md`
  - `status`: `tasks/` (active) or `completed/` (done)
  - `epic`: Epic ID (e.g., `E02`)
  - `task`: Task filename (e.g., `E02-T002.md`)
- **Placement**: Inline with prose, typically in parenthetical "(see ...)" or at end of sentence

### 3. Related Pages Section

Add "Implementation" subsection to group backlog references:

```markdown
## Related Pages

**Related Documentation:**
- [Lucia Configuration](/auth/concepts/lucia)
- [Session Lifecycle](/auth/concepts/sessions)

**Implementation:**
- [E02-T002: Sessions table and Lucia setup](/backlog/completed/E02/E02-T002.md) ([spec](/backlog/docs/specs/E02/E02-T002-spec.md))
- [E02-T008: Auth integration tests](/backlog/completed/E02/E02-T008.md) ([spec](/backlog/docs/specs/E02/E02-T008-spec.md))
```

**Structure:**
- **Related Documentation** - Links to other KB pages
- **Implementation** - Backlog task and spec references
- Each Implementation entry: `[TASK-ID: Description](task-path) ([spec](spec-path))`
- Optional: Add `([review](review-path))` for review artifacts

---

## Citation Types & Conventions

### Task Files

**Active Tasks:**
```markdown
[E06-T011: Backlog citation system](/backlog/tasks/E06/E06-T011.md)
```

**Completed Tasks:**
```markdown
[E02-T002: Sessions table and Lucia setup](/backlog/completed/E02/E02-T002.md)
```

### Specification Documents

```markdown
([spec](/backlog/docs/specs/E02/E02-T002-spec.md))
```

**Note:** Specs are typically linked inline after task reference, not standalone

### Review Documents

**Code Reviews:**
```markdown
([code review](/backlog/docs/reviews/E02/E02-T002-code-review.md))
```

**QA Reports:**
```markdown
([QA report](/backlog/docs/reviews/E02/E02-T002-qa-report.md))
```

**UI Reviews:**
```markdown
([UI review](/backlog/docs/reviews/E02/E02-T002-ui-review.md))
```

**Architecture Reviews:**
```markdown
([architecture review](/backlog/docs/reviews/E02/E02-T002-plan-review.md))
```

**Epic Reviews:**
```markdown
[E02 Epic Review](/backlog/docs/reviews/E02/_epic-review.md)
```

### Epic Files

```markdown
[E02: Authentication & Authorization](/backlog/tasks/E02/_epic.md)
```

---

## Standard Related Pages Section Format

Every KB page should include a "Related Pages" section at the end (before any footnotes or appendices).

### Simple Format (KB-only references)

If page only references other KB documentation:

```markdown
## Related Pages

- [Lucia Configuration](/auth/concepts/lucia)
- [Authentication Guards](/auth/patterns/guards)
- [Session Lifecycle](/auth/concepts/sessions)
```

### With Implementation References

If page references backlog tasks:

```markdown
## Related Pages

**Related Documentation:**
- [Lucia Configuration](/auth/concepts/lucia)
- [OAuth Providers](/auth/concepts/oauth)

**Implementation:**
- [E02-T002: Sessions table and Lucia setup](/backlog/completed/E02/E02-T002.md) ([spec](/backlog/docs/specs/E02/E02-T002-spec.md))
- [E02-T008: Auth integration tests](/backlog/completed/E02/E02-T008.md) ([spec](/backlog/docs/specs/E02/E02-T008-spec.md))
```

### With Source Code Links

If page includes GitHub source links:

```markdown
## Related Pages

**Related Documentation:**
- [Lucia Configuration](/auth/concepts/lucia)
- [Authentication Guards](/auth/patterns/guards)

**Implementation:**
- [E02-T002: Sessions table and Lucia setup](/backlog/completed/E02/E02-T002.md) ([spec](/backlog/docs/specs/E02/E02-T002-spec.md))

**Source Files:**
- [session.service.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/auth/src/session.service.ts)
- [lucia.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/auth/src/lucia.ts)
```

**Guidelines:**

- **Always use subsections** when mixing KB links and backlog references
- **Related Documentation** - Other KB pages (use descriptive link text)
- **Implementation** - Backlog tasks with specs inline
- **Source Files** - GitHub links (use filename as link text)
- Order subsections: Documentation → Implementation → Source Files

---

## Migration Strategy

### Phase 1: Update Citation Guide (Immediate)

1. Update `apps/docs/src/contributing/kb-page-design.md`:
   - Add section on "Backlog References"
   - Provide inline citation examples
   - Document Related Pages format with Implementation subsection
   - Show before/after examples

2. Update `apps/docs/src/contributing/documentation.md`:
   - Add backlog reference format to templates
   - Update Related Pages section templates
   - Remove any numbered citation references

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
- `/auth/` - Update references to use descriptive links
- `/testing/` - Update references to use descriptive links

**Priority 2: In-Progress Domains** (E06-T006, E06-T007)
- `/database/` - Use new format from start
- `/ai/` - Use new format from start

**Priority 3: Future Domains**
- Use new citation system from start

**Migration Approach:**
- Don't batch-update all docs at once
- Update opportunistically when editing pages
- Use new format for all new content
- No forced rewrite of existing content

### Phase 4: Validation Script (Future Enhancement)

Create script to validate backlog links (out of scope for initial implementation):

```bash
# Check for broken backlog links
pnpm docs:validate-backlog-links

# Output:
# ❌ apps/docs/src/auth/concepts/sessions.md:42
#    Link points to non-existent file: /backlog/completed/E02/E02-T999.md
# ✅ 45 backlog links validated successfully
```

---

## Examples

### Example 1: Concept Page with Inline Citations

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

Sessions track authenticated users across requests. The session system
(see [E02-T002: Sessions table and Lucia setup](/backlog/completed/E02/E02-T002.md))
uses Lucia for session management with custom extensions for our multi-tenant
architecture.

## Session Creation

When a user logs in, the system creates a new session using Lucia's
`createSession` method. This implementation was refined based on security
review feedback during the auth epic.

```typescript
const session = await lucia.createSession(userId, {
  expiresIn: sessionConfig.maxAge,
});
```

## Session Validation

The authentication middleware (see [E02-T002: Sessions table and Lucia setup](/backlog/completed/E02/E02-T002.md))
validates sessions on every protected route. If the session is valid and
approaching expiration, it's automatically extended.

## Related Pages

**Related Documentation:**
- [Lucia Configuration](/auth/concepts/lucia)
- [Authentication Guards](/auth/patterns/guards)
- [OAuth Providers](/auth/concepts/oauth)

**Implementation:**
- [E02-T002: Sessions table and Lucia setup](/backlog/completed/E02/E02-T002.md) ([spec](/backlog/docs/specs/E02/E02-T002-spec.md))
```

### Example 2: Pattern Page with Multiple References

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

Factory functions create consistent mock data across tests. This pattern
emerged during auth testing implementation (see [E02-T008: Auth integration tests](/backlog/completed/E02/E02-T008.md))
and has become standard across the codebase.

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

The design was validated during code review and refined based on QA feedback.

## Composition

Factories can compose other factories (see [E02-T008: Auth integration tests](/backlog/completed/E02/E02-T008.md)):

```typescript
function createMockSession(userOverrides = {}) {
  const user = createMockUser(userOverrides);
  return {
    id: "session-123",
    userId: user.id,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
  };
}
```

## Related Pages

**Related Documentation:**
- [Test Structure (AAA Pattern)](/testing/patterns/aaa)
- [Mocking Strategies](/testing/patterns/mocking)

**Implementation:**
- [E02-T008: Auth integration tests](/backlog/completed/E02/E02-T008.md) ([spec](/backlog/docs/specs/E02/E02-T008-spec.md))
- [E01-T008: Vitest configuration](/backlog/completed/E01/E01-T008.md) ([spec](/backlog/docs/specs/E01/E01-T008-spec.md))

**Source Files:**
- [abilities.test.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/auth/__tests__/abilities.test.ts)
- [auth.routes.test.ts](https://github.com/ryandt33/raptscallions/blob/main/apps/api/src/__tests__/integration/auth.routes.test.ts)
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

**Cause:** HTTPS enforcement in production without proper configuration

**Solution:** Ensure `SESSION_COOKIE_SECURE` matches environment:

```typescript
const sessionConfig = {
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
};
```

This was identified during integration testing (see [E02-T008: Auth integration tests](/backlog/completed/E02/E02-T008.md))
and resolved per the original specification.

## Session Timeout Issues

**Symptom:** Sessions expire too quickly or never expire

**Cause:** Misconfigured `SESSION_MAX_AGE` or missing auto-extension

**Solution:** Verify session configuration matches the spec (see [E02-T002: Sessions table and Lucia setup](/backlog/completed/E02/E02-T002.md)).

## Related Pages

**Related Documentation:**
- [Session Lifecycle](/auth/concepts/sessions)
- [Lucia Configuration](/auth/concepts/lucia)

**Implementation:**
- [E02-T002: Sessions table and Lucia setup](/backlog/completed/E02/E02-T002.md) ([spec](/backlog/docs/specs/E02/E02-T002-spec.md))
- [E02-T008: Auth integration tests](/backlog/completed/E02/E02-T008.md) ([spec](/backlog/docs/specs/E02/E02-T008-spec.md), [QA report](/backlog/docs/reviews/E02/E02-T008-qa-report.md))
```

---

## Validation & Testing

### Manual Testing Checklist

After implementing the alias configuration:

- [ ] **Dev Mode Navigation**
  - Start dev server: `pnpm docs:dev`
  - Navigate to a page with backlog references
  - Click task links
  - Click spec links
  - Verify navigation to backlog files

- [ ] **Production Build**
  - Build docs: `pnpm docs:build`
  - Preview: `pnpm docs:preview`
  - Test same backlog links
  - Verify all links resolve correctly

- [ ] **Search Integration**
  - Open VitePress search (Cmd/Ctrl + K)
  - Search for task ID (e.g., "E02-T008")
  - Verify KB pages with references appear in results
  - Verify clicking result navigates correctly

- [ ] **Cross-Platform**
  - Test on macOS, Linux, Windows (if applicable)
  - Verify paths resolve on all platforms
  - Check for case-sensitivity issues

- [ ] **Accessibility**
  - Test keyboard navigation (Tab to links, Enter to activate)
  - Test with screen reader (link text should be descriptive)
  - Test on mobile (no hover required)

### Edge Cases

**Active vs Completed Tasks:**
- Tasks in `/backlog/tasks/` → Link text as-is
- Tasks in `/backlog/completed/` → Link text as-is
- No special labeling needed (path indicates status)

**File Moves:**
- When task moves from `tasks/` to `completed/`, update path in Related Pages
- Inline citations may still work (less critical to update immediately)
- Use grep to find references: `grep -r "E02-T008" apps/docs/src/`

**Missing Files:**
- Link points to non-existent file
- Browser shows 404 or broken link
- Solution: Validation script (future enhancement)

**Epic Reorganization:**
- If epic structure changes, all references may break
- Solution: Keep epic structure stable, use validation script

---

## Maintaining References Through Task Lifecycle

### When Tasks Complete

When a task moves from `ANALYZED` → `DONE` and files move from `/backlog/tasks/` to `/backlog/completed/`, update Related Pages references:

**Required Workflow:**

1. **Before marking task DONE**, find all references to the task:
   ```bash
   # From repository root
   grep -r "E02-T008" apps/docs/src/
   ```

2. **Update Related Pages sections** found:
   ```diff
   **Implementation:**
   - - [E02-T008: Auth integration tests](/backlog/tasks/E02/E02-T008.md) ([spec](/backlog/docs/specs/E02/E02-T008-spec.md))
   + [E02-T008: Auth integration tests](/backlog/completed/E02/E02-T008.md) ([spec](/backlog/docs/specs/E02/E02-T008-spec.md))
   ```

3. **Optionally update inline citations** (lower priority):
   ```diff
   - The testing approach (see [E02-T008: Auth tests](/backlog/tasks/E02/E02-T008.md))
   + The testing approach (see [E02-T008: Auth tests](/backlog/completed/E02/E02-T008.md))
   ```

4. **Verify links work** after task completion:
   ```bash
   pnpm docs:dev
   # Click updated references to verify they resolve
   ```

**Task Completion Checklist Addition:**

Add to task completion checklist:
- [ ] Search KB docs for references to this task (`grep -r "{TASK-ID}" apps/docs/src/`)
- [ ] Update Related Pages reference paths from `/backlog/tasks/` to `/backlog/completed/`
- [ ] Optionally update inline citation paths (lower priority)
- [ ] Verify updated references resolve correctly in dev server

---

## Documentation Updates

### 1. Update KB Page Design Guide

**File:** `apps/docs/src/contributing/kb-page-design.md`

Add new section after "Cross-Referencing":

```markdown
## Backlog References

KB pages can reference backlog tasks, specs, and reviews using descriptive inline links.

### Inline References

Reference tasks inline with descriptive link text:

\`\`\`markdown
The session system (see [E02-T002: Sessions table](/backlog/completed/E02/E02-T002.md))
uses Lucia for session management.
\`\`\`

**Format:**
- Link text: `[{TASK-ID}: {Brief Description}]`
- Always include task ID for searchability
- Brief description (3-8 words) provides context
- Use parenthetical "(see ...)" or place at end of sentence

### Related Pages Section

Group backlog references in "Implementation" subsection:

\`\`\`markdown
## Related Pages

**Related Documentation:**
- [Lucia Configuration](/auth/concepts/lucia)
- [OAuth Providers](/auth/concepts/oauth)

**Implementation:**
- [E02-T002: Sessions table and Lucia setup](/backlog/completed/E02/E02-T002.md) ([spec](/backlog/docs/specs/E02/E02-T002-spec.md))
- [E02-T008: Auth integration tests](/backlog/completed/E02/E02-T008.md) ([spec](/backlog/docs/specs/E02/E02-T008-spec.md))
\`\`\`

### Backlog Path Structure

- **Tasks**: `/backlog/{tasks|completed}/{EPIC}/{TASK-ID}.md`
  - Active: `/backlog/tasks/E06/E06-T011.md`
  - Completed: `/backlog/completed/E02/E02-T002.md`
- **Specs**: `/backlog/docs/specs/{EPIC}/{TASK-ID}-spec.md`
- **Reviews**: `/backlog/docs/reviews/{EPIC}/{TASK-ID}-{type}-review.md`
- **Epics**: `/backlog/tasks/{EPIC}/_epic.md`

### Quick Reference

Copy-paste templates for common backlog reference types:

\`\`\`markdown
<!-- Inline task reference -->
(see [E02-T002: Sessions table](/backlog/completed/E02/E02-T002.md))

<!-- Related Pages with Implementation -->
**Implementation:**
- [E02-T002: Sessions table and Lucia setup](/backlog/completed/E02/E02-T002.md) ([spec](/backlog/docs/specs/E02/E02-T002-spec.md))

<!-- With review artifact -->
- [E02-T008: Auth integration tests](/backlog/completed/E02/E02-T008.md) ([spec](/backlog/docs/specs/E02/E02-T008-spec.md), [QA report](/backlog/docs/reviews/E02/E02-T008-qa-report.md))
\`\`\`

### Best Practices

- Include task ID in link text for searchability
- Use descriptive text (not just "see task E02-T002")
- Group backlog references in Related Pages section
- Separate KB links from backlog references (use subsections)
- Update paths when tasks move to completed status
- Don't overuse inline references (1-2 per paragraph max)
```

### 2. Update Documentation Guide

**File:** `apps/docs/src/contributing/documentation.md`

Update templates to include Related Pages with Implementation:

```markdown
## Pattern Page Template

\`\`\`markdown
---
title: {Pattern Name}
description: {Brief description}
---

# {Pattern Name}

Brief introduction with inline reference (see [E02-T002: Brief description](/backlog/completed/E02/E02-T002.md)).

## Implementation

Code examples and explanations.

## Related Pages

**Related Documentation:**
- [Related Concept](/domain/concepts/topic)

**Implementation:**
- [E02-T002: Full task description](/backlog/completed/E02/E02-T002.md) ([spec](/backlog/docs/specs/E02/E02-T002-spec.md))
\`\`\`
```

### 3. Update Contributing Overview

**File:** `apps/docs/src/contributing/index.md`

Add bullet point under "Documentation Structure":

```markdown
- Use descriptive inline links to reference backlog tasks
- Group backlog references in Related Pages > Implementation section
```

---

## Acceptance Criteria

### Configuration

- [ ] VitePress config includes `/backlog` alias
- [ ] Alias resolves correctly in dev mode (`pnpm docs:dev`)
- [ ] Alias resolves correctly in production build (`pnpm docs:build`)
- [ ] Backlog links navigate to task/spec files

### Documentation

- [ ] KB Page Design guide updated with "Backlog References" section
- [ ] Documentation guide templates include Related Pages with Implementation
- [ ] Contributing overview mentions backlog reference system
- [ ] All backlog reference types documented with examples

### Examples

- [ ] At least 3 existing KB pages updated to use new reference format
- [ ] Examples cover inline references and Related Pages section
- [ ] Examples demonstrate task, spec, and review references

### Testing

- [ ] Manual testing checklist completed
- [ ] Backlog links clickable in dev mode
- [ ] Backlog links clickable in production build
- [ ] VitePress search indexes link text (task IDs)
- [ ] Links work on desktop and mobile

### Accessibility

- [ ] Link text is descriptive (includes task ID and description)
- [ ] Links work with keyboard navigation
- [ ] Links work on mobile (no hover dependency)
- [ ] Screen readers can navigate links

### Code Quality

- [ ] TypeScript compilation succeeds
- [ ] No console errors in dev mode
- [ ] No broken links in build output
- [ ] Linting passes

---

## Out of Scope

**Deferred to future enhancements:**

- Automated validation script for broken backlog links
- Batch update of all existing documentation
- CI integration to fail on broken links
- Auto-suggestion or autocomplete for task IDs
- GitHub Issues integration
- Link analytics or usage tracking
- Numbered academic-style citations (rejected approach)

---

## Success Metrics

After implementation, measure:

1. **Adoption Rate**: % of new KB pages using backlog references
2. **Navigation Rate**: How often backlog links are clicked (if analytics added)
3. **Maintenance Time**: Time saved with descriptive links vs. manual updates
4. **Developer Satisfaction**: Qualitative feedback on usability

---

## Implementation Checklist

### Phase 1: Configuration (30 min)

- [ ] Add Vite alias to `.vitepress/config.ts`
- [ ] Test alias resolution in dev mode
- [ ] Test alias resolution in production build
- [ ] Commit configuration changes

### Phase 2: Documentation Updates (1-2 hours)

- [ ] Update `kb-page-design.md` with "Backlog References" section
- [ ] Update `documentation.md` templates
- [ ] Update `contributing/index.md` overview
- [ ] Add examples to each guide
- [ ] Commit documentation changes

### Phase 3: Example Migrations (1-2 hours)

- [ ] Update `/auth/concepts/sessions.md`
- [ ] Update `/testing/patterns/factories.md`
- [ ] Update `/auth/troubleshooting/session-issues.md`
- [ ] Verify all backlog links work correctly
- [ ] Commit example updates

### Phase 4: Validation (30 min)

- [ ] Run through manual testing checklist
- [ ] Verify no broken links in build
- [ ] Verify search integration works
- [ ] Create list of pages to update opportunistically

### Phase 5: Announce & Document (15 min)

- [ ] Add note in CLAUDE.md about backlog reference system
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
- Markdown Links: https://www.markdownguide.org/basic-syntax/#links

**Related Tasks:**
- E06-T002: KB folder structure (completed)
- E06-T005: Document auth system (completed)
- E06-T008: Cross-linking conventions (completed)

---

## UX Review

**Reviewer:** designer
**Date:** 2026-01-15
**Verdict:** NEEDS_UX_CHANGES

### Summary

The backlog citation system spec proposes a well-thought-out academic-style numbered reference system for linking KB documentation to backlog artifacts. The core concept is solid and addresses real pain points with the current plain-text reference format. However, there are several UX concerns that should be addressed before implementation to ensure the system is intuitive, discoverable, and maintainable.

---

## User Flow Analysis

### For Documentation Authors (Primary Users)

**Positive:**
- Clear format templates reduce cognitive load
- Subsection grouping (Primary Implementation, Code Reviews & QA, etc.) provides logical organization
- Incremental migration strategy prevents overwhelming existing contributors

**Concerns:**

1. **Numbering Management is Manual and Error-Prone**
   - Authors must manually track sequential numbering across edits
   - Adding a citation mid-document requires renumbering all subsequent citations
   - No guidance on what to do when deleting citations (leave gaps or renumber?)
   - **Impact:** High friction for document maintenance

2. **No Clear Workflow for Citation Lifecycle**
   - Spec mentions tasks move from `/tasks/` to `/completed/`, breaking citations
   - Authors expected to update citations "as part of task completion checklist"
   - No visual indicator in spec that this is a required step
   - **Impact:** High likelihood of broken links accumulating over time

3. **Multiple Citation Formats Creates Decision Fatigue**
   - Spec shows `[1][2]` AND `[1,2]` for multiple citations with note "choose one convention"
   - No clear guidance on which to use or when
   - Different authors will make different choices
   - **Impact:** Inconsistent citation style across KB

### For Documentation Readers (Secondary Users)

**Positive:**
- Numbered citations are familiar (academic convention)
- Hover titles provide context before navigation
- Citations are clickable (solves current pain point)

**Concerns:**

1. **Numbered Citations May Confuse Without Context**
   - In technical documentation, `[1]` could be confused with:
     - Array indexing in code examples
     - Mathematical notation
     - TypeScript tuple syntax
   - No visual differentiation between citation and code
   - **Impact:** Potential confusion when scanning content

2. **References Section is Far From Citations**
   - Academic papers are printed; web pages scroll
   - Readers must scroll to bottom to see what `[1]` references
   - Back-and-forth navigation is tedious on long pages
   - **Impact:** Poor UX for understanding citation context before clicking

3. **No Preview of Citation Content**
   - Hover shows only title: "E02-T002: OAuth providers"
   - Doesn't indicate if it's a task, spec, or review without looking at URL
   - Readers can't judge relevance without clicking
   - **Impact:** Unnecessary navigation to low-value citations

---

## Accessibility Analysis

### Keyboard Navigation

**Good:**
- Standard markdown links support Tab navigation
- Enter/Space activates links (browser default)

**Concerns:**

1. **No Skip-to-References Landmark**
   - Screen reader users must navigate through entire document to reach References
   - No ARIA landmark or heading structure to jump directly
   - Spec doesn't mention making References section semantically distinct
   - **Impact:** Poor screen reader UX

2. **Hover Titles Aren't Accessible to All Users**
   - Spec relies on hover for context ("Hover shows full title")
   - Touch users (mobile/tablet) can't hover
   - Keyboard-only users don't see hover tooltips
   - Screen readers may or may not announce title attribute
   - **Impact:** Critical context unavailable to non-mouse users

### Visual Clarity

**Concerns:**

1. **Numbered Links Lack Visual Affordance**
   - `[1]` looks identical to inline code in prose
   - No indication it's clickable vs. notation
   - Spec examples show citations styled identically to surrounding text
   - **Impact:** Low discoverability, users may not realize citations are links

---

## Consistency with Existing Patterns

### Alignment with KB Conventions

**Good:**
- Uses markdown reference-style links (consistent with VitePress)
- Follows existing heading structure patterns
- Integrates with current "Related Pages" section pattern

**Concerns:**

1. **Conflicts with Existing References Section**
   - Current pattern (see `factories.md`): References section has **Key Files** with GitHub URLs
   - New pattern: References section is for backlog citations only
   - Mixing both creates two different reference systems in one section
   - **Impact:** Confusion about what goes in References vs. Related Pages

2. **Subsection Structure is Inconsistent**
   - Spec shows optional subsections (Primary Implementation, Code Reviews & QA, etc.)
   - No guidance on when subsections are required vs. optional
   - Example 3 (troubleshooting page) has no subsections, just flat list
   - Example 2 has subsections AND "Key Source Files" (GitHub links)
   - **Impact:** Authors will apply subsections inconsistently

---

## Discoverability

### For New Contributors

**Concerns:**

1. **Citation System Not Self-Evident**
   - Numbered citations are familiar in academia, not software docs
   - Many developers unfamiliar with reference-style markdown links
   - No in-context help or examples when writing
   - **Impact:** High learning curve for first-time KB authors

2. **Format Rules Are Complex**
   - Path structure: `/backlog/{status}/{epic}/{task}.md`
   - Status can be `tasks/` OR `completed/`
   - Must remember to add "(active)" label for active tasks
   - Title format: `"{TASK-ID}: {Brief Description}"`
   - **Impact:** High cognitive load, likely to get format wrong

3. **No Tooling or Validation**
   - Authors must manually construct paths
   - No autocomplete for task IDs
   - No validation until build (or not at all per spec)
   - Typos in paths create silent broken links
   - **Impact:** High error rate, low confidence

### Documentation of the System

**Good:**
- Spec includes comprehensive examples
- Documentation updates planned for multiple files

**Concerns:**

1. **No Quick Reference Guide**
   - Citation format is documented across 3 files (kb-page-design.md, documentation.md, contributing/index.md)
   - No single cheat sheet for common citation types
   - Examples are verbose (good for learning, bad for quick lookup)
   - **Impact:** Authors must search multiple files to remember format

---

## Error States & Edge Cases

### Broken Links

**Major Concerns:**

1. **No Immediate Feedback for Broken Citations**
   - Spec says "Browser shows 404 or broken link"
   - Authors won't discover broken links until they manually test
   - VitePress may not warn about `/backlog` alias paths (needs verification)
   - **Impact:** Broken links accumulate silently

2. **Task Migration Breaks Citations Systematically**
   - Every task completion moves file from `/tasks/` to `/completed/`
   - All citations to that task break
   - Spec says to update "as part of task completion checklist"
   - No mechanism to find all citations to update
   - **Impact:** Broken links guaranteed with every task completion

3. **No Rollback Strategy**
   - If alias configuration breaks, all citations break instantly
   - No fallback or graceful degradation
   - Authors can't temporarily disable broken citations
   - **Impact:** High-risk single point of failure

### File Organization Changes

**Concern:**

1. **Fragile Path Dependencies**
   - Citations encode full path: `/backlog/completed/E02/E02-T002.md`
   - Any backlog reorganization breaks all citations
   - Spec says "Keep epic structure stable" (not realistic long-term)
   - **Impact:** System discourages necessary refactoring

---

## Visual Design Concerns

### Citation Readability

**Concerns:**

1. **Inline Numbers Don't Stand Out**
   - Examples show: `The session lifecycle[1] follows Lucia's patterns`
   - `[1]` blends into text, especially in technical content with brackets
   - No visual weight or styling differentiation
   - **Impact:** Citations are easy to miss when scanning

2. **No Indication of Citation Type**
   - `[1]` could be task, spec, review, epic - no way to tell inline
   - All citations look identical regardless of importance
   - Primary implementation citation looks same as tangential reference
   - **Impact:** Readers can't prioritize which citations to follow

### References Section Layout

**Concerns:**

1. **Subsection Headers Break Flow**
   - Numbered citations in References: `[1]: /path "Title"`
   - Subsection headers: `### Primary Implementation`
   - Numbers don't restart per subsection, continue sequentially
   - Visual hierarchy suggests numbers should restart, but they don't
   - **Impact:** Confusing visual structure

---

## Recommendations

### Must Fix (Blocking Implementation)

~~1. **Standardize Multiple Citation Format**~~ ✅ **FIXED**
   - ✅ Chose `[1][2]` format (not `[1,2]`)
   - ✅ Documented rationale: separate link targets, markdown-compatible
   - ✅ Updated all examples and best practices section

~~2. **Add Visual Styling for Citations**~~ ⚠️ **DEFERRED**
   - Decision: Use standard markdown links without custom styling
   - Rationale: VitePress provides default link styling (colored, underlined)
   - Citations already visually distinct from code blocks (which use backticks)
   - Custom CSS would require VitePress theme override (out of scope)
   - Future enhancement: Could add custom component for enhanced styling

~~3. **Create Citation Lifecycle Documentation**~~ ✅ **FIXED**
   - ✅ Added "Maintaining Citations Through Task Lifecycle" section
   - ✅ Provided step-by-step workflow with example commands
   - ✅ Documented both renumbering and gap-leaving strategies
   - ✅ Updated task completion checklist in section

~~4. **Improve Accessibility**~~ ✅ **FIXED**
   - ✅ Added type indicators in titles: `[Task]`, `[Spec]`, `[Review]`, `[Epic]`
   - ✅ Documented accessibility limitations (hover titles don't work on mobile/keyboard)
   - ✅ Added accessibility note to KB page design guide updates
   - ⚠️ ARIA landmark deferred (requires VitePress custom component)

~~5. **Simplify Subsection Structure**~~ ✅ **FIXED**
   - ✅ Clear guidance: "Use subsections when you have 6+ citations"
   - ✅ Simple format example (flat list)
   - ✅ Grouped format example (subsections)
   - ✅ Updated all three example pages to demonstrate both patterns

### Should Fix (High Priority)

1. **Add Quick Reference Guide**
   - Create single-page citation format cheat sheet
   - Include in kb-page-design.md as expandable section
   - Show all citation types with copy-paste templates

2. **Improve Error Handling Guidance**
   - Add section on how to find broken citations manually
   - Document VitePress broken link detection behavior
   - Provide example grep/ripgrep command to find all citations to a task

3. **Clarify Hover vs. Mobile Experience**
   - Acknowledge hover titles don't work on mobile
   - Document alternative UX for mobile users (must click to see destination)
   - Consider recommending inline citation type indicator for mobile accessibility

4. **Address References Section Overlap**
   - Clarify relationship between References and Related Pages sections
   - Provide guidance on when to use GitHub URLs vs. backlog citations
   - Show example of page with both types of references

### Nice to Have (Suggestions)

1. **Consider Tooltip Component**
   - Custom VitePress component could show citation preview on hover/focus
   - Preview could include citation type, task status, and brief description
   - Would solve accessibility and discoverability issues
   - Out of scope for initial implementation, but worth documenting as future enhancement

2. **Provide VS Code Snippet**
   - Create snippet for common citation formats
   - Include in contributing guide as optional tooling
   - Reduces manual typing and format errors

3. **Add Migration Priority Guidance**
   - Current spec says "update opportunistically"
   - Provide heuristic: prioritize high-traffic pages, concept pages, pattern pages
   - Set realistic expectation: full migration may take months

---

## Verdict Reasoning

The backlog citation system addresses a real need and the technical approach is sound. However, the UX has several concerning gaps:

1. **Manual numbering** creates high maintenance burden and error potential
2. **Broken link lifecycle** is documented but not adequately addressed with tooling or process
3. **Accessibility** relies on hover titles which don't work for keyboard/mobile/screen reader users
4. **Visual clarity** is poor - citations blend into technical content
5. **Discoverability** is low - complex format with no tooling support

These issues will lead to:
- Authors avoiding citations due to high friction
- Accumulation of broken links over time
- Inconsistent citation styles across docs
- Poor UX for non-mouse users

**Original Status: NEEDS_UX_CHANGES**

The spec should be updated to address the "Must Fix" items before implementation. The core concept is good, but the execution needs refinement to ensure the system is actually usable by both authors and readers.

---

## UX Review Resolution (2026-01-15)

**Status: READY_FOR_IMPLEMENTATION** ✅

All "Must Fix" items have been addressed:

1. ✅ **Standardized citation format**: `[1][2]` for multiple citations
2. ⚠️ **Visual styling**: Deferred (VitePress default link styling sufficient)
3. ✅ **Citation lifecycle workflow**: Comprehensive maintenance guide added
4. ✅ **Accessibility improvements**: Type indicators in titles, mobile limitations documented
5. ✅ **Subsection structure**: Clear guidance for simple vs. grouped format

**Remaining Concerns:**

- Manual numbering is inherent to academic citation style (accepted tradeoff)
- Broken link validation requires tooling (deferred to future enhancement)
- Custom styling/tooltips require VitePress components (out of scope)

**Decision**: Proceed with implementation. The refined spec addresses critical UX issues while maintaining simplicity. Future enhancements can add validation tooling and custom components.

---

## Architecture Review

**Reviewer:** architect
**Date:** 2026-01-15
**Verdict:** APPROVED

### Summary

The backlog citation system spec proposes a clean, minimal implementation that adds VitePress alias configuration to enable markdown reference-style links to backlog artifacts. The technical approach is architecturally sound, requires no new dependencies, and aligns perfectly with the documentation-as-code philosophy and VitePress's native capabilities.

### Technology Alignment

✅ **Fully Aligned**

- **VitePress native feature**: Uses Vite's `resolve.alias` configuration, which is a standard VitePress pattern (no custom plugins required)
- **No new dependencies**: Implementation requires only `path` module (Node.js built-in) for path resolution
- **Markdown standards**: Uses reference-style links, which are native markdown (not VitePress-specific extensions)
- **Zero TypeScript impact**: Configuration change only, no TypeScript code involved
- **Documentation stack**: Aligns with VitePress 1.5+ as specified in ARCHITECTURE.md

The spec correctly identifies the technology layer (VitePress configuration) and doesn't introduce unapproved dependencies.

### Code Organization

✅ **Correct Structure**

File locations match conventions:

- **VitePress config**: `apps/docs/src/.vitepress/config.ts` ✅
- **KB page design guide**: `apps/docs/src/contributing/kb-page-design.md` ✅
- **Documentation guide**: `apps/docs/src/contributing/documentation.md` ✅
- **Example pages**: All use correct KB structure (`/auth/concepts/`, `/testing/patterns/`, etc.)

Naming conventions:

- Files use kebab-case: `kb-page-design.md`, `session-issues.md` ✅
- Paths follow established structure: `/domain/type/article` ✅
- No violations of monorepo structure ✅

### TypeScript Standards

✅ **Non-Applicable (Configuration Only)**

This task involves:

1. Adding Vite alias to `.vitepress/config.ts` (pure configuration, no type signatures)
2. Writing markdown documentation (no TypeScript)
3. Updating existing markdown files (no TypeScript)

The spec correctly shows TypeScript in configuration example using proper syntax. No `any` types, no type issues.

### Error Handling

✅ **Appropriate for Scope**

The spec acknowledges error states:

- **Broken links**: Documented in "Edge Cases" section
- **File moves**: "Maintaining Citations Through Task Lifecycle" section
- **Missing files**: Identified as browser 404 (correct for static documentation)
- **Validation**: Deferred to future enhancement (appropriate for v1)

No custom error classes needed—this is static documentation with browser-native error handling.

### Testing Requirements

✅ **Comprehensive Manual Testing Strategy**

The spec provides detailed testing checklist:

- **Dev mode testing**: `pnpm docs:dev` validation ✅
- **Production build testing**: `pnpm docs:build` and `pnpm docs:preview` ✅
- **Search integration**: VitePress search indexing verification ✅
- **Cross-platform**: Platform-specific path resolution checks ✅
- **Manual testing checklist**: 4 categories with specific steps

**No automated tests required** because:

1. This is VitePress configuration (build-time, not runtime)
2. Validation happens during build/preview (VitePress native)
3. No business logic to unit test
4. Manual testing is appropriate for documentation features

### Documentation Standards

✅ **Excellent Documentation Design**

The spec demonstrates deep understanding of KB documentation patterns:

- **Follows KB Page Design guide**: All examples use frontmatter, heading hierarchy, code blocks correctly
- **Three comprehensive examples**: Concept page (sessions), pattern page (factories), troubleshooting page (session-issues)
- **Citation format templates**: Quick-reference section for copy-paste
- **Accessibility documented**: Hover title limitations for mobile/keyboard users
- **Progressive disclosure**: Simple format (≤5 citations) vs. grouped format (6+ citations)

**Updates KB structure correctly**:

- `kb-page-design.md`: New "Citation System" section after "Cross-Referencing" ✅
- `documentation.md`: Updated templates to include References section ✅
- `contributing/index.md`: Bullet point addition ✅

All updates follow existing KB patterns from CONVENTIONS.md.

### Integration & Dependencies

✅ **Clean Integration Points**

**Dependencies (all satisfied)**:

- ✅ E06-T002: KB folder structure (completed)
- ✅ VitePress installed (verified)
- ✅ Existing KB pages (verified)

**No new dependencies added**:

- Uses Node.js built-in `path` module
- Uses VitePress native Vite configuration
- Uses standard markdown syntax

**Integration with existing systems**:

- **Backlog structure**: Read-only consumption of `/backlog` directory (no modifications to backlog system)
- **VitePress build**: Alias resolves at build time (no runtime performance impact)
- **Search**: Citations automatically indexed by VitePress local search (no custom search logic)

**No conflicts identified** with:

- Current VitePress theme (custom Modern Agricultural design)
- Existing sidebar navigation (citations are content-level, not nav-level)
- Other documentation tooling (staleness tracking, CI validation)

### Risks & Concerns

#### Low Risk (Acceptable)

1. **Manual maintenance burden**: Acknowledged in spec and UX review. Accepted tradeoff for simplicity. Future enhancement can add validation tooling.

2. **Broken links on task completion**: Spec provides comprehensive workflow with grep commands and checklist. Risk mitigated through documentation.

3. **No automated validation**: Deferred to future enhancement (validation script outlined). Appropriate for v1 scope.

#### No Risk

1. **Path resolution**: Uses standard Node.js `path.resolve()` with `__dirname` (works on Windows, macOS, Linux)

2. **Build performance**: Alias resolution happens once at build time (no performance impact)

3. **Breaking changes**: Adding alias to VitePress config is non-breaking (additive change)

### Recommendations

#### Must Fix (Blocking)

**None.** All architectural concerns have been addressed.

#### Should Fix (High Priority)

**None.** The spec is implementation-ready as written.

#### Nice to Have (Suggestions)

1. **Consider adding build-time validation later**: The spec mentions a future validation script. Consider prioritizing this as a follow-up task once citation adoption reaches ~20-30% of KB pages. This would prevent accumulation of broken links without blocking initial implementation.

2. **Document citation lifecycle in CONVENTIONS.md**: After implementation, consider adding a brief section to `docs/CONVENTIONS.md` (around line 943 in "Documentation Standards") that references the KB citation system. This would make it discoverable to developers who read CONVENTIONS.md before KB guides.

3. **Add citation format to `.editorconfig` or linting**: Future enhancement could add markdownlint rules to enforce citation format consistency. Out of scope for v1.

### Verdict Reasoning

**APPROVED** for the following reasons:

1. **Architecturally sound**: Uses VitePress native features (Vite alias) without hacks or workarounds
2. **Zero risk**: Configuration-only change with comprehensive manual testing strategy
3. **Well-documented**: Spec includes detailed examples, edge cases, and maintenance workflows
4. **Conventions-compliant**: All file locations, naming, and KB patterns follow established standards
5. **No new dependencies**: Leverages existing VitePress capabilities
6. **UX-reviewed and refined**: All "Must Fix" UX issues have been addressed (see UX Review Resolution section)
7. **Appropriate scope**: Defers complex features (automated validation) to future enhancements while delivering immediate value

The spec demonstrates excellent understanding of both the technical architecture and documentation needs. The citation system is a thoughtful, minimal enhancement that improves KB usability without introducing technical debt.

**No changes required before implementation.** Developer can proceed directly to implementation phase.

---

## Architecture Review Re-Confirmation (2026-01-15)

**Reviewer:** architect
**Re-review Date:** 2026-01-15
**Verdict:** APPROVED (No Changes Required)

### Re-Review Context

After initial implementation failure (markdown reference-style links are invisible), the spec was revised to use **descriptive inline links** instead of numbered citations. This re-review validates the updated approach against architecture and conventions.

### Changes Summary

**Original Approach (Failed):**
- Academic-style numbered citations: `[1]`, `[2]`
- Markdown reference-style link definitions (invisible in rendered output)
- References section with metadata

**Revised Approach (Current):**
- Descriptive inline links: `[E02-T002: Sessions table](/backlog/completed/E02/E02-T002.md)`
- Related Pages section with Implementation subsection
- Standard markdown links (visible and clickable)

### Architecture Validation

✅ **All previous architectural validations remain valid:**

1. **VitePress alias configuration** - No changes to technical implementation
2. **File structure** - Same KB structure and naming conventions
3. **Zero new dependencies** - Still uses only Node.js `path` module
4. **No TypeScript changes** - Configuration and markdown only
5. **Browser-native error handling** - Broken links still show 404

### New Approach Benefits

✅ **Architectural improvements from revision:**

1. **Simpler implementation**: Standard markdown links (no custom components needed)
2. **Zero maintenance overhead**: No manual numbering system to manage
3. **Better searchability**: Task IDs in link text automatically indexed by VitePress search
4. **Accessibility compliance**: WCAG 2.1 2.4.4 satisfied (descriptive link text)
5. **Pattern consistency**: Aligns with existing KB cross-reference patterns

### Pattern Alignment

✅ **Perfectly aligned with CONVENTIONS.md KB patterns:**

From `docs/CONVENTIONS.md` lines 989-1000:

```markdown
**Code Examples:**

```typescript
// ✅ Good - complete, runnable
import { UserService } from "@raptscallions/api";

const userService = new UserService(db);
const user = await userService.getById("123");

// ❌ Bad - incomplete, assumes context
userService.getById("123"); // returns user
```
```

The revised spec follows the same "good example" pattern: descriptive, self-contained, and clear.

### Risks Eliminated

✅ **Issues from numbered citation approach now resolved:**

1. ~~Manual numbering errors~~ → No numbering required
2. ~~Accessibility violations~~ → Link text is descriptive
3. ~~Inconsistent patterns~~ → Uses existing KB link style
4. ~~Redundant References section~~ → Single Related Pages section

### Final Verdict

**APPROVED** - The revised spec is **architecturally superior** to the original:

- **Simpler**: Less complexity, fewer moving parts
- **More maintainable**: No manual numbering overhead
- **More accessible**: WCAG 2.1 compliant
- **Better UX**: Consistent with existing KB patterns
- **Zero risk**: Uses standard VitePress/markdown features

**Recommendation:** Proceed with implementation using the revised descriptive inline link approach. No architectural changes required.

---

## Post-Implementation Failure Review (2026-01-15)

**Reviewer:** designer
**Context:** Implementation used markdown reference-style links (invisible), causing complete failure. Failure analysis recommends Option 3: Hybrid Approach.

### Review of Hybrid Approach (Option 3)

**Verdict:** NEEDS_UX_CHANGES

The Hybrid Approach solves the immediate technical problem (making citations clickable) but introduces significant UX issues:

#### Critical Issues

1. **Manual Numbering is Unsustainable**
   - Authors must manually maintain sequential numbering
   - Inserting citation mid-document requires renumbering all subsequent citations
   - Discourages adding citations to existing content
   - 5-10 minutes overhead per citation insertion

2. **Accessibility Violations (WCAG 2.1 2.4.4 - FAILS)**
   - Link text is just "1" (provides no context)
   - Title attribute not reliably supported by screen readers
   - Mobile/touch users cannot access hover tooltips
   - Keyboard-only users don't see hover state
   - **Example:** Screen reader announces "link 1" instead of "E02-T002: Sessions table"

3. **Redundant References Section**
   - Inline `[[1]](/path)` already provides navigation
   - References section duplicates same information
   - Users unlikely to scroll to bottom when clicking inline works
   - Creates maintenance burden (two places to update)

4. **Inconsistency with Existing KB Patterns**
   - Current KB uses descriptive links: `[Session Lifecycle](/auth/concepts/session-lifecycle)`
   - Hybrid Approach introduces academic-style numbered citations (new pattern)
   - Would have two citation systems in same KB

5. **Mobile/Touch Experience Degraded**
   - Desktop users can hover to see tooltip before clicking
   - Mobile/tablet users must click blindly (no tooltip)
   - 30-40% of users get degraded experience

#### Comparison to Original Issues

**Original problems:**
1. Manual numbering (high maintenance) ← **Still present in Hybrid Approach**
2. References section invisible ← **Fixed** (now visible)
3. Inline citations not clickable ← **Fixed** (`[[1]](/path)` is clickable)
4. Hover-only context ← **Still present in Hybrid Approach**

**Verdict:** Hybrid Approach fixes 2 out of 4 issues, but introduces new problems

### Recommended Alternative: Descriptive Inline Links

Use KB's existing descriptive link pattern with task IDs:

```markdown
Sessions track authenticated users across requests. The session lifecycle
implementation (see [E02-T002: Sessions table](/backlog/completed/E02/E02-T002.md))
uses Lucia for session creation, validation, and expiration.

## Related Pages

**Related Documentation:**
- [Lucia Configuration](/auth/concepts/lucia)
- [OAuth Providers](/auth/concepts/oauth)

**Implementation:**
- [E02-T002: Sessions table and Lucia setup](/backlog/completed/E02/E02-T002.md) ([spec](/backlog/docs/specs/E02/E02-T002-spec.md))
- [E02-T008: Auth integration tests](/backlog/completed/E02/E02-T008.md) ([spec](/backlog/docs/specs/E02/E02-T008-spec.md))
```

**Benefits:**
- ✅ No manual numbering
- ✅ Link purpose clear from text (WCAG 2.1 compliant)
- ✅ Works on all devices (no hover dependency)
- ✅ Accessible to screen readers
- ✅ Consistent with existing KB patterns
- ✅ Single location for backlog references (Related Pages)
- ✅ Easy to add/remove references

**Drawbacks:**
- Longer inline text (but improves clarity)
- Not "academic style" (but KB isn't an academic paper)

### Must Fix Recommendations

1. **Eliminate Manual Numbering**
   - Replace `[[1]]`, `[[2]]` with descriptive task IDs: `[E02-T002]`
   - Let task ID serve as the "number" (naturally unique)

2. **Remove Redundant References Section**
   - Move all backlog references to "Related Pages" section
   - Use single "Implementation" subsection
   - Avoid duplicating inline + References

3. **Make Links Accessible Without Hover**
   - Include task ID in link text: `[E02-T002: Sessions table]`
   - Remove dependency on title attribute
   - Ensure link purpose clear from text alone

4. **Use Existing KB Pattern**
   - Apply descriptive links pattern to backlog citations
   - Maintain consistency with internal KB cross-references
   - Don't introduce new citation system for one use case

5. **Group Backlog References in Related Pages**
   - Add "Implementation" subsection to Related Pages
   - Include Task link and Spec link on same line: `([spec](/path))`
   - Separate from "Related Documentation" (KB pages)

### Verdict Reasoning

**NEEDS_UX_CHANGES** because the Hybrid Approach:

- **Maintenance Burden Too High:** Manual numbering is error-prone and time-consuming
- **Accessibility Failures:** Violates WCAG 2.1 2.4.4, excludes mobile/keyboard users
- **Unnecessary Complexity:** References section adds no value over inline links
- **Pattern Inconsistency:** Conflicts with established KB conventions
- **Usability Regressions:** Introduces problems while fixing others

**Recommended path forward:**
1. Use descriptive inline links with task IDs in link text
2. Group backlog references in "Related Pages > Implementation"
3. Eliminate numbered citations entirely
4. Follow existing KB patterns for consistency

This provides all the benefits (clickable, searchable, maintainable) without the drawbacks (manual numbering, accessibility issues, redundant sections).
