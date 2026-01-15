# Integration Failure Analysis: E06-T011

## Summary

The backlog citation system implementation uses incorrect markdown syntax. The spec confused markdown **reference-style link definitions** (which are invisible) with **academic-style citations** (which should be visible numbered references).

## Root Cause

**Category:** SPEC_AND_IMPLEMENTATION_WRONG

The spec contains a fundamental markdown syntax error that was faithfully implemented, resulting in:
- References section appears empty (link definitions are invisible in markdown rendering)
- Backlog links don't work (inline `[1]` is plain text, not a clickable link)

## Evidence

### What the Spec Prescribed

From [E06-T011-spec.md:51-60](../../specs/E06/E06-T011-spec.md):

```markdown
This pattern was established during auth implementation[1] based on the
original design spec[2].

## References

[1]: /backlog/completed/E02/E02-T002.md "E02-T002: Implement OAuth providers"
[2]: /backlog/docs/specs/E02/E02-T002-spec.md "E02-T002 Specification"
```

**The Problem:** This is **markdown reference-style link DEFINITION syntax**, not citation syntax.

### How Markdown Reference Links Actually Work

```markdown
# Correct Usage (for regular links, NOT citations)
This is a [link to Google][google-ref].

[google-ref]: https://google.com "Google Homepage"
```

**Renders as:** "This is a link to Google." (clickable)
**References section:** INVISIBLE (link definitions don't render)

### What Was Actually Implemented

**File:** [apps/docs/src/auth/concepts/sessions.md:13](../../../apps/docs/src/auth/concepts/sessions.md#L13)

```markdown
Sessions track authenticated users across requests[1]. Lucia manages...

## References

[1]: /backlog/completed/E02/E02-T002.md "[Task] E02-T002: Sessions table and Lucia setup"
[2]: /backlog/docs/specs/E02/E02-T002-spec.md "[Spec] E02-T002 Specification"
```

**How This Renders:**
- Inline text: "Sessions track authenticated users across requests[1]." - `[1]` is **plain text**, not a link
- References section: **EMPTY** - the `[1]:` and `[2]:` lines are link definitions, which are **invisible** in rendered output

### Why It Doesn't Work

1. **Inline citations aren't links:**
   - `[1]` in the text is treated as plain text literal `[1]`
   - To be a clickable link, it must reference the link definition: `[link text][1]`

2. **References section is invisible:**
   - Markdown reference definitions (`[1]: url "title"`) are metadata, not content
   - They never render as visible text in markdown output
   - They only define targets for links that reference them

3. **Missing link connection:**
   - The inline `[1]` doesn't reference the definition `[1]:`
   - Correct syntax would be `[1][1]` or `[[1]][1]`, but this still won't create academic-style citations

## Correct Markdown for Academic Citations

There are two approaches that actually work:

### Option 1: Manual HTML Anchors

```markdown
This pattern was established during auth implementation<sup>[[1]](#ref-1)</sup>.

## References

<a id="ref-1"></a>
**[1]** E02-T002: Implement OAuth providers
[View Task](/backlog/completed/E02/E02-T002.md) | [View Spec](/backlog/docs/specs/E02/E02-T002-spec.md)
```

**Pros:**
- Full control over citation appearance
- Links work bidirectionally (citation → reference, reference → task)
- References section is visible

**Cons:**
- Verbose HTML in markdown
- Manual anchor IDs
- More complex to write

### Option 2: Footnote Syntax (If VitePress Supports It)

```markdown
This pattern was established during auth implementation[^1].

[^1]: E02-T002: Implement OAuth providers - [Task](/backlog/completed/E02/E02-T002.md) | [Spec](/backlog/docs/specs/E02/E02-T002-spec.md)
```

**Pros:**
- Clean markdown syntax
- Automatic numbering
- Footnotes render at bottom of page

**Cons:**
- **Requires VitePress markdown-it-footnote plugin** (may not be enabled by default)
- Footnotes are styled differently than references
- Less control over formatting

### Option 3: Hybrid Approach (Recommended)

Use inline links with visible reference list:

```markdown
This pattern was established during auth implementation [[1]](/backlog/completed/E02/E02-T002.md "Task: E02-T002").

## References

**[1]** E02-T002: Implement OAuth providers ([Task](/backlog/completed/E02/E02-T002.md), [Spec](/backlog/docs/specs/E02/E02-T002-spec.md))

**[2]** E02-T008: Auth integration tests ([Task](/backlog/completed/E02/E02-T008.md), [Spec](/backlog/docs/specs/E02/E02-T008-spec.md))
```

**Pros:**
- Pure markdown, no HTML
- Inline citations are clickable
- References section is visible and provides additional context
- Clean, readable source
- Works in any markdown renderer

**Cons:**
- Inline links are slightly longer (but still cleaner than full URLs)
- References section requires manual maintenance

## Technical Analysis

### Why the Spec Was Wrong

The spec author misunderstood markdown reference-style links:

1. **Assumed reference definitions are visible** → They're not, they're metadata
2. **Assumed `[1]` would automatically link to `[1]:`** → It doesn't, needs `[text][1]` syntax
3. **Conflated link definitions with citations** → They serve different purposes

This appears to be a conceptual error, not a VitePress-specific issue.

### Why VitePress Alias Doesn't Help

The VitePress alias configuration in [config.ts:27-33](../../../apps/docs/src/.vitepress/config.ts#L27-L33) is correct:

```typescript
vite: {
  resolve: {
    alias: {
      "/backlog": path.resolve(__dirname, "../../../backlog"),
    },
  },
},
```

**However:**
- The alias only resolves paths for **actual links**
- Since reference definitions are invisible, the links never render
- The alias can't fix non-existent links

## Resolution Path

**Next State:** `ANALYZED` → Requires **SPEC REVISION** then **RE-IMPLEMENTATION**

This is NOT a simple bug fix - it requires rethinking the citation approach.

### Required Actions

1. **Revise the Spec** (E06-T011-spec.md)
   - Remove incorrect reference-style link examples
   - Choose one of the three working approaches (recommend Option 3: Hybrid)
   - Update all examples to use correct markdown syntax
   - Clarify that reference-style links ≠ citations

2. **Update Documentation Guides**
   - [kb-page-design.md](../../../apps/docs/src/contributing/kb-page-design.md) - Correct citation format
   - [documentation.md](../../../apps/docs/src/contributing/documentation.md) - Update templates
   - Add warning about reference-style link confusion

3. **Re-implement Example Pages**
   - [auth/concepts/sessions.md](../../../apps/docs/src/auth/concepts/sessions.md) - Use correct syntax
   - [testing/patterns/factories.md](../../../apps/docs/src/testing/patterns/factories.md) - Use correct syntax
   - [auth/troubleshooting/session-issues.md](../../../apps/docs/src/auth/troubleshooting/session-issues.md) - Use correct syntax

4. **Test Again**
   - Verify inline citations are clickable
   - Verify References section is visible
   - Verify backlog links navigate correctly

### Recommended Syntax (Option 3: Hybrid Approach)

**Inline Citations:**
```markdown
Sessions track authenticated users across requests [[1]](/backlog/completed/E02/E02-T002.md "Task: E02-T002").
```

**References Section:**
```markdown
## References

**[1]** E02-T002: Sessions table and Lucia setup
[Task](/backlog/completed/E02/E02-T002.md) | [Spec](/backlog/docs/specs/E02/E02-T002-spec.md)

**[2]** E02-T008: Auth integration tests
[Task](/backlog/completed/E02/E02-T008.md) | [Spec](/backlog/docs/specs/E02/E02-T008-spec.md)
```

**Why This Works:**
- `[[1]](/path)` creates a clickable `[1]` link inline
- `**[1]**` in References section is visible bold text
- Both inline and References use normal markdown links
- VitePress alias will resolve `/backlog` paths
- Clean, readable, and functional

## Additional Notes

### Markdown Reference Links: How They Actually Work

For future reference, this is the correct usage of reference-style links (for documentation authors):

```markdown
This is a [link to the auth guide][auth-guide] and [another link][spec].

[auth-guide]: /auth/concepts/sessions "Session Lifecycle"
[spec]: /backlog/specs/E02/E02-T002-spec.md "E02-T002 Spec"
```

**Renders as:**
"This is a link to the auth guide and another link."

Both "link to the auth guide" and "another link" are clickable. The bottom two lines are invisible.

**This is NOT for citations** - it's for avoiding repetitive long URLs in link text.

### VitePress Markdown Capabilities

VitePress uses `markdown-it` as its markdown parser. Reference-style links are a standard markdown feature and work correctly in VitePress **when used properly** (with link text that references the definition).

The issue here is not a VitePress limitation - it's a markdown syntax misunderstanding.

### Why This Wasn't Caught in QA

The QA report ([E06-T011-qa-report.md](./E06-T011-qa-report.md)) performed static analysis only:

> **Status:** ⚠️ CANNOT VERIFY
> - **Reason:** Node.js not available in test environment
> - **Evidence Required:** Manual testing needed

QA correctly identified that runtime testing was needed but didn't have access to a browser to see that:
1. References section appears empty
2. `[1]` is not clickable

This is a limitation of static-only testing for markdown rendering issues.

### Lessons Learned

1. **Markdown reference-style links are NOT citations** - they're link definitions that are invisible in output
2. **Academic citations require visible numbered references** - must use different syntax
3. **Static analysis can't catch rendering issues** - need browser-based integration tests
4. **Spec validation is critical** - this fundamental error should have been caught in spec review

---

**Failure Analysis Generated:** 2026-01-15
**Root Cause:** Spec prescribed incorrect markdown syntax (reference-style link definitions instead of citations)
**Impact:** Complete feature failure - no visible references, no clickable links
**Resolution:** Spec revision + re-implementation with correct markdown syntax
**Recommended Approach:** Option 3 (Hybrid inline links + visible References section)

## Sources

- [Markdown Extensions | VitePress](https://vitepress.dev/guide/markdown)
- [Reference style links not working on custom container title · Issue #3004](https://github.com/vuejs/vitepress/issues/3004)
