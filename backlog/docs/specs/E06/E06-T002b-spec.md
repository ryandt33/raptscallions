# Implementation Spec: E06-T002b

**Task:** Create KB Page Design Pattern Guide
**Epic:** E06 - Knowledge Base Documentation
**Status:** Analyzed
**Created:** 2026-01-13

---

## Overview

Create a comprehensive guide documenting VitePress markdown patterns for writing KB documentation pages. This guide ensures consistent page structure, heading hierarchy, code block styling, callout usage, and cross-referencing across all KB content. It serves as the single source of truth for KB authors, providing concrete examples and actionable patterns rather than abstract theory.

**Key Goals:**
1. Document standard page structure (frontmatter → overview → sections → related links)
2. Define heading hierarchy rules (H1 for title, H2 for sections, H3 for subsections)
3. Specify code block conventions (language tags, inline vs block, VitePress features)
4. Document callout/container patterns (tip, warning, danger, info - when to use)
5. Establish cross-referencing patterns (internal, external, anchor links)
6. Provide table vs list guidelines
7. Document VitePress-specific features (custom containers, badges, frontmatter)
8. Include complete example template demonstrating all patterns

---

## Approach

### Technical Strategy

**Documentation-as-Code:**
- Create a single markdown file at `apps/docs/src/contributing/kb-page-design.md`
- Heavy on practical examples, light on theory (under 1000 words prose)
- Include complete template at end that demonstrates all patterns
- Reference VitePress markdown extensions documentation

**Content Organization:**
- Quick reference at top (TL;DR section)
- Pattern sections with before/after examples
- Complete template at end for copy-paste
- Links to VitePress docs for advanced features

**Validation Approach:**
- Every pattern shown in the guide should be demonstrated in the example template
- Example template should render correctly in VitePress dev server
- Patterns should reference real KB pages as examples (auth/index.md, contributing/index.md)

**Integration:**
- Add page to contributing section in sidebar navigation
- Reference from main contributing/index.md page
- Link to design-system.md (from E06-T002a) for styling context

---

## Files to Create

| File | Purpose |
|------|---------|
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/src/contributing/kb-page-design.md` | KB page design pattern guide with examples and template |

---

## Files to Modify

| File | Changes |
|------|---------|
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/.vitepress/config.ts` | Add kb-page-design.md to contributing sidebar section |
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/src/contributing/index.md` | Add reference to KB Page Design guide in Quick Links or structure section |

---

## Dependencies

### Required Tasks
- **Requires:** E06-T002a (KB theme) - provides design context and Modern Agricultural styling reference
- **Requires:** E06-T002 (KB folder structure) - establishes domain-first organization

### Related Tasks
- None (tasks E06-T002c-e were removed as too granular)

### External Resources
- VitePress Markdown Extensions: https://vitepress.dev/guide/markdown
- VitePress Custom Containers: https://vitepress.dev/guide/markdown#custom-containers
- VitePress Frontmatter Config: https://vitepress.dev/reference/frontmatter-config

---

## Detailed Content Outline

### 1. Page Header (Frontmatter + Title)

**Section Purpose:** Document frontmatter structure and H1 title pattern.

**Content:**
```markdown
## Frontmatter and Title

Every KB page starts with YAML frontmatter and an H1 title:

\```yaml
---
title: Session Lifecycle
description: How Lucia sessions are created, validated, and expired
---

# Session Lifecycle
\```

**Required fields:**
- `title`: Page title (appears in browser tab, search results, sidebar)
- `description`: Brief summary (for meta tags and search previews)

**Optional fields:**
- `lastUpdated: false` — Hide "Last Updated" timestamp
- `outline: [2, 3]` — Control which headings appear in right TOC (default: [2, 3])

**Rules:**
- H1 (`#`) should match frontmatter title exactly
- Title should be Title Case
- Description should be one sentence, no period at end
- Max one H1 per page
```

---

### 2. Page Structure Pattern

**Section Purpose:** Define standard page layout structure.

**Content:**
```markdown
## Standard Page Structure

All KB pages follow this structure:

1. **Frontmatter** — Title and description
2. **H1 Title** — Main page heading
3. **Overview** — 1-2 paragraph summary of what page covers
4. **Main Sections** — H2 headings for major topics
5. **Subsections** — H3 headings for details within sections
6. **Related Links** — Optional footer linking to related pages

**Example:**

\```markdown
---
title: Permission Checks
description: Using CASL to verify user permissions in route handlers
---

# Permission Checks

This guide covers how to use CASL abilities to check permissions in Fastify route handlers. You'll learn when to use guards vs manual checks, how to handle permission denials, and common permission patterns.

## Guard Middleware

[Section content...]

### Built-in Guards

[Subsection content...]

### Custom Guards

[Subsection content...]

## Manual Permission Checks

[Section content...]

## Related Pages

- [CASL Setup](/auth/concepts/casl-setup)
- [Route Handlers](/api/patterns/route-handlers)
\```
```

---

### 3. Heading Hierarchy

**Section Purpose:** Define heading level rules and best practices.

**Content:**
```markdown
## Heading Hierarchy

**Rules:**
- **H1 (`#`)** — Page title only (one per page)
- **H2 (`##`)** — Major sections (appears in sidebar TOC)
- **H3 (`###`)** — Subsections within H2 (appears in right TOC by default)
- **H4 (`####`)** — Rare, use only for deep nesting (not in TOC)

**Don't skip levels:** Always go H1 → H2 → H3, never H1 → H3.

**Heading style:**
- Use Title Case for H1 and H2
- Use Sentence case for H3 and below
- Keep headings concise (under 60 characters)
- Avoid punctuation at end of headings

**Example of correct hierarchy:**

\```markdown
# Permission System

## Overview

High-level introduction to permissions.

## CASL Abilities

How CASL defines permissions.

### Creating Abilities

Step-by-step guide.

### Permission Hierarchy

Parent-child permission structure.

## Permission Guards

Middleware for route protection.
\```
```

---

### 4. Code Blocks

**Section Purpose:** Document inline vs block code, language tags, features.

**Content:**
```markdown
## Code Blocks

### Inline Code

Use single backticks for inline code:

- Variable names: \`userId\`, \`sessionId\`
- File names: \`auth.service.ts\`, \`permissions.ts\`
- Short code snippets: \`req.user.id\`

### Block Code

Use triple backticks with language tag:

\```typescript
export async function validateSession(sessionId: string): Promise<Session | null> {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId)
  });
  return session;
}
\```

**Supported languages:** `typescript`, `javascript`, `json`, `bash`, `sql`, `yaml`, `markdown`

### Line Highlighting

Highlight specific lines with `{line-numbers}` syntax:

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

### Line Numbers

Add line numbers with `:line-numbers` flag:

\```typescript:line-numbers
function example() {
  return "With line numbers";
}
\```

### Code Groups

Show multiple language examples with code groups:

\```md
::: code-group
\```typescript [TypeScript]
const user: User = { id: "123", name: "Alice" };
\```

\```javascript [JavaScript]
const user = { id: "123", name: "Alice" };
\```
:::
\```

### File Paths in Code Blocks

Show file path in code block header:

\```typescript
// apps/api/src/services/user.service.ts
export class UserService {
  // ...
}
\```

Or use VitePress syntax (if in title):

\```typescript [apps/api/src/services/user.service.ts]
export class UserService {
  // ...
}
\```
```

---

### 5. Custom Containers (Callouts)

**Section Purpose:** Document VitePress custom container usage.

**Content:**
```markdown
## Custom Containers (Callouts)

VitePress provides custom containers for highlighting important information.

### Tip (Success/Best Practice)

Use for best practices, helpful hints, and positive reinforcement:

\```md
::: tip Best Practice
Always validate session on server-side before processing requests.
:::
\```

**Renders as:** Green box with checkmark icon

### Info (Neutral Information)

Use for additional context, related information, or FYI notes:

\```md
::: info
Lucia sessions expire after 30 days of inactivity by default.
:::
\```

**Renders as:** Blue box with info icon

### Warning (Caution)

Use for potential pitfalls, deprecated features, or breaking changes:

\```md
::: warning
Do not store sensitive data in session attributes. Use server-side storage.
:::
\```

**Renders as:** Yellow box with warning icon

### Danger (Critical/Error)

Use for security vulnerabilities, data loss risks, or critical errors:

\```md
::: danger Security Risk
Never expose session secrets in client-side code or logs.
:::
\```

**Renders as:** Red box with danger icon

### Custom Title

Override default container title:

\```md
::: tip Remember
Custom titles make containers more specific.
:::
\```

### When to Use

| Container | Use Case | Example |
|-----------|----------|---------|
| **Tip** | Best practices, recommendations | "Use TypeScript strict mode" |
| **Info** | Additional context, FYI | "Drizzle supports PostgreSQL 12+" |
| **Warning** | Potential issues, deprecations | "Prisma migration deprecated" |
| **Danger** | Security risks, data loss | "Do not commit .env files" |
```

---

### 6. Tables

**Section Purpose:** Document table usage and when to use vs lists.

**Content:**
```markdown
## Tables

Use tables for structured data with multiple columns. For simple lists, use bullet points instead.

### Basic Table

\```markdown
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:id` | Fetch user by ID |
| POST | `/api/users` | Create new user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |
\```

### Alignment

Control column alignment with colons:

\```markdown
| Left | Center | Right |
|:-----|:------:|------:|
| Text | Text   | Text  |
\```

### When to Use Tables vs Lists

**Use tables when:**
- Data has 2+ columns
- Comparing multiple items across dimensions
- Showing API endpoints, parameters, or status codes
- Displaying configuration options with values

**Use lists when:**
- Single column of items
- Simple enumeration
- Steps or instructions
- Related links

**Example - Table is better:**

| Package | Version | Purpose |
|---------|---------|---------|
| Fastify | 4.x | API framework |
| Drizzle | 0.29+ | ORM |

**Example - List is better:**

- Fastify for API framework
- Drizzle for ORM
- Lucia for authentication
```

---

### 7. Cross-Referencing (Links)

**Section Purpose:** Document internal linking, external links, anchor links.

**Content:**
```markdown
## Cross-Referencing

### Internal Links (KB Pages)

Link to other KB pages using relative paths:

\```markdown
See [Session Lifecycle](/auth/concepts/session-lifecycle) for details.

Related: [Permission Guards](/auth/patterns/permission-guards)
\```

**Rules:**
- Use absolute paths from KB root: `/auth/concepts/...`
- Omit `.md` extension
- Use descriptive link text (not "click here")

### External Links

Link to external resources with full URL:

\```markdown
See the [VitePress documentation](https://vitepress.dev) for more.

Reference: [Lucia Auth Docs](https://lucia-auth.com)
\```

### Anchor Links (Headings)

Link to specific heading on same or different page:

\```markdown
See [Best Practices](#best-practices) below.

Jump to [CASL Setup → Creating Abilities](/auth/concepts/casl-setup#creating-abilities)
\```

**Rules:**
- Heading anchors are auto-generated: lowercase, spaces to hyphens
- Example: `## Best Practices` → `#best-practices`
- Works across pages: `/path/to/page#heading-anchor`

### Related Links Section

End pages with related links for navigation:

\```markdown
## Related Pages

- [CASL Abilities](/auth/concepts/casl-abilities)
- [Route Handlers](/api/patterns/route-handlers)
- [Error Handling](/api/patterns/error-handling)
\```

**Format:**
- Use H2 heading: `## Related Pages` or `## Related Concepts`
- Bullet list of internal links
- Keep to 3-6 related pages
- Prioritize direct dependencies or common next steps
```

---

### 8. Lists

**Section Purpose:** Document ordered, unordered, and nested lists.

**Content:**
```markdown
## Lists

### Unordered Lists

Use `-` for bullet lists:

\```markdown
- First item
- Second item
- Third item
\```

### Ordered Lists

Use `1.` for numbered lists (numbers auto-increment):

\```markdown
1. First step
2. Second step
3. Third step
\```

**Note:** Markdown auto-numbers, so you can use `1.` for all items:

\```markdown
1. Step one
1. Step two (renders as "2.")
1. Step three (renders as "3.")
\```

### Nested Lists

Indent with 2 spaces:

\```markdown
- Top level
  - Nested item
  - Another nested item
    - Deeply nested
- Back to top level
\```

### Multi-Paragraph List Items

Use blank lines and indentation:

\```markdown
1. First item with multiple paragraphs.

   This is the second paragraph of the first item.

2. Second item.
\```

### Task Lists

Use `- [ ]` and `- [x]`:

\```markdown
- [x] Completed task
- [ ] Pending task
- [ ] Another pending task
\```
```

---

### 9. VitePress-Specific Features

**Section Purpose:** Document VitePress extensions beyond standard markdown.

**Content:**
```markdown
## VitePress-Specific Features

### Badges

Add inline badges for status or version:

\```markdown
# Feature Name <Badge type="tip" text="New" />
# API Endpoint <Badge type="warning" text="Deprecated" />
# Package Version <Badge type="info" text="v2.0" />
\```

**Badge types:** `tip` (green), `warning` (yellow), `danger` (red), `info` (blue)

### Emoji

Use emoji shortcodes or Unicode:

\```markdown
:rocket: Deployment
:warning: Warning
:white_check_mark: Completed

Or use Unicode directly: 🚀 🌱 ✅
\```

### Frontmatter Options

Control page behavior with frontmatter:

\```yaml
---
title: Page Title
description: Page description
lastUpdated: false        # Hide last updated timestamp
outline: [2, 3]           # Show H2 and H3 in right TOC
sidebar: false            # Hide sidebar on this page
aside: false              # Hide right TOC (outline)
layout: home              # Use home layout (for index pages)
---
\```

### Code Import

Import code from external files (useful for tested examples):

\```markdown
\```typescript
<<< @/path/to/file.ts
\```
\```

### Table of Contents

Right sidebar shows page outline automatically (H2 and H3 by default).

Control with `outline` frontmatter:

\```yaml
---
outline: [2, 4]    # Show H2, H3, and H4
outline: false     # Hide TOC
outline: deep      # Show all heading levels
---
\```

### Search Keywords

Add custom search keywords (not visible on page):

\```yaml
---
title: Session Management
description: Lucia session lifecycle
search:
  keywords:
    - authentication
    - login
    - session cookies
    - lucia
---
\```
```

---

### 10. Images and Diagrams

**Section Purpose:** Document image usage (even if minimal for now).

**Content:**
```markdown
## Images and Diagrams

### Basic Image Syntax

\```markdown
![Alt text](/images/diagram.png)
\```

**Rules:**
- Store images in `apps/docs/src/public/images/`
- Use kebab-case file names: `session-lifecycle-diagram.png`
- Always provide alt text for accessibility
- Optimize images (PNG for diagrams, JPEG for photos, SVG for icons)

### Image with Caption

Use italic text below image for caption:

\```markdown
![Session validation flow](/images/session-validation.png)

*Figure 1: Session validation flow showing cookie parsing and database lookup*
\```

### When to Use Images

**Use images for:**
- Architecture diagrams
- Entity relationship diagrams
- UI screenshots (for troubleshooting guides)
- Complex flow charts

**Don't use images for:**
- Code examples (use code blocks instead)
- Tables or lists (use markdown tables/lists)
- Text content (poor accessibility and searchability)

### Future Enhancement

Currently KB has minimal images. As documentation grows, consider:
- Mermaid diagrams (VitePress supports via plugin)
- Excalidraw exports for hand-drawn style diagrams
- Consistent diagram style guide (colors, fonts, layout)
```

---

### 11. Example Template

**Section Purpose:** Provide complete copy-paste template demonstrating all patterns.

**Content:**
```markdown
## Complete Example Template

Copy this template when creating new KB pages:

\```markdown
---
title: Your Page Title
description: Brief one-sentence description of page content
---

# Your Page Title

Brief overview paragraph explaining what this page covers and why it matters. Keep to 2-3 sentences maximum.

## Main Section

Content for the main section. Use H2 for major topics.

### Subsection

Detailed content within the main section. Use H3 for subtopics.

**Example code block:**

\```typescript
export function exampleFunction(param: string): void {
  console.log(param);
}
\```

**Important note:**

::: tip Best Practice
Always include practical examples in your documentation.
:::

## Another Main Section

More content here.

### When to Use Tables

| Feature | Use Case | Example |
|---------|----------|---------|
| Tables | Structured data | API endpoints |
| Lists | Simple items | Related links |

### When to Use Lists

- Use unordered lists for non-sequential items
- Use ordered lists for step-by-step instructions
- Keep list items concise (one sentence each)

### Code Example with Highlighting

\```typescript{2,4}
function highlightedExample() {
  const important = "This line is highlighted"; // highlighted
  const normal = "This is not";
  return important; // highlighted
}
\```

### Cross-References

See [Related Concept](/domain/concepts/related-concept) for more details.

Jump to [specific section](#main-section) on this page.

::: info Note
This is additional contextual information that doesn't fit in main flow.
:::

::: warning Caution
Be careful of this common pitfall or deprecated feature.
:::

::: danger Security Risk
Critical security information or data loss warning.
:::

## Related Pages

- [Related Concept One](/domain/concepts/concept-one)
- [Related Pattern](/domain/patterns/pattern-name)
- [Troubleshooting Guide](/domain/troubleshooting/common-issue)
\```
```

---

## Acceptance Criteria Breakdown

### AC1: Page structure pattern is documented

**Implementation:** Section 2 ("Standard Page Structure") with template showing frontmatter → overview → sections → related links flow.

**Validation:**
- Section clearly shows 6-part structure
- Example template demonstrates structure
- Explanation includes purpose of each part

**Done When:**
- Author can look at section 2 and know exactly how to structure a new page
- Example shows all structure components

---

### AC2: Heading hierarchy is documented

**Implementation:** Section 3 ("Heading Hierarchy") with rules for H1/H2/H3/H4 usage.

**Validation:**
- Rules specify one H1 per page
- H2 for major sections (sidebar TOC)
- H3 for subsections (right TOC)
- Examples show correct vs incorrect hierarchy

**Done When:**
- Clear rules for each heading level
- Author knows when to use each level
- Don't skip levels rule is explicit

---

### AC3: Code block conventions are documented

**Implementation:** Section 4 ("Code Blocks") covering inline, block, highlighting, line numbers, code groups.

**Validation:**
- Inline code usage (backticks)
- Block code with language tags
- Line highlighting syntax
- Line numbers flag
- Code groups for multi-language examples

**Done When:**
- All code block features documented
- Examples show proper syntax
- Language tags listed

---

### AC4: Callout patterns are documented

**Implementation:** Section 5 ("Custom Containers") with tip/info/warning/danger examples and use cases.

**Validation:**
- All 4 container types documented
- Use case table shows when to use each
- Custom title syntax shown
- Color coding explained

**Done When:**
- Author knows which container to use for what
- Syntax is clear and copy-pasteable
- Examples render correctly

---

### AC5: Cross-referencing patterns are documented

**Implementation:** Section 7 ("Cross-Referencing") with internal, external, and anchor link patterns.

**Validation:**
- Internal link syntax with absolute paths
- External link syntax
- Anchor link generation rules
- Related links section format

**Done When:**
- Author can create any type of link
- Anchor generation rule is clear
- Related links format is standardized

---

### AC6: Table usage is documented

**Implementation:** Section 6 ("Tables") with table syntax and tables vs lists guidelines.

**Validation:**
- Basic table syntax shown
- Alignment options documented
- Table vs list decision matrix provided

**Done When:**
- Author knows when to use table vs list
- Table syntax is clear
- Alignment rules explained

---

### AC7: Image/diagram guidelines are provided

**Implementation:** Section 10 ("Images and Diagrams") with basic syntax and future plans.

**Validation:**
- Image syntax documented
- Storage location specified
- Alt text requirement stated
- Use cases provided

**Done When:**
- Author can add images correctly
- Accessibility requirement clear
- Future enhancement noted (Mermaid, etc.)

---

### AC8: VitePress-specific features are documented

**Implementation:** Section 9 ("VitePress-Specific Features") covering badges, emoji, frontmatter, code import, search keywords.

**Validation:**
- Badges syntax and types
- Frontmatter options (outline, lastUpdated, layout)
- Search keywords feature
- Code import syntax

**Done When:**
- All VitePress extensions documented
- Examples show proper syntax
- Links to official docs provided

---

### AC9: Example page template is provided

**Implementation:** Section 11 ("Complete Example Template") with full working template.

**Validation:**
- Template uses all documented patterns
- Can be copied directly for new pages
- Renders correctly in VitePress
- Includes all sections from guide

**Done When:**
- Template is complete and copy-pasteable
- All patterns demonstrated
- Template validates without errors

---

### AC10: Document is created at correct location

**Implementation:** File created at `apps/docs/src/contributing/kb-page-design.md` and added to sidebar.

**Validation:**
- File exists at specified path
- Added to VitePress config sidebar
- Renders in dev server
- Accessible via navigation

**Done When:**
- File created successfully
- Config updated with sidebar entry
- Page loads without errors
- Search finds the page

---

## Test Strategy

### Unit Tests
**Not Applicable:** Markdown documentation doesn't require unit tests.

---

### Integration Tests

**Manual Testing Checklist:**

#### Markdown Rendering
- [ ] Open dev server: `pnpm docs:dev`
- [ ] Navigate to Contributing → KB Page Design
- [ ] Verify all code blocks render correctly
- [ ] Check all custom containers (tip/info/warning/danger) render
- [ ] Confirm tables display properly
- [ ] Test all internal links navigate correctly
- [ ] Test all external links open correctly
- [ ] Check emoji render (if used)

#### Example Template Validation
- [ ] Copy example template from Section 11
- [ ] Create test page: `apps/docs/src/test-template.md`
- [ ] Paste template and fill with test content
- [ ] Verify page renders without errors
- [ ] Check all patterns work (code blocks, containers, tables, links)
- [ ] Delete test page after validation

#### Search Testing
- [ ] Open search (Cmd/Ctrl + K)
- [ ] Search for "code block" - should find page
- [ ] Search for "custom container" - should find page
- [ ] Search for "heading hierarchy" - should find page
- [ ] Verify search results are relevant

#### Navigation Testing
- [ ] Verify page appears in Contributing sidebar section
- [ ] Check right TOC (outline) shows all H2/H3 headings
- [ ] Test anchor links jump to correct sections
- [ ] Verify "Edit this page on GitHub" link works

#### Cross-Browser Testing
Test in:
- Chrome/Edge (Chromium)
- Firefox
- Safari (if available)

Verify:
- All markdown features render correctly
- Code syntax highlighting works
- Custom containers display properly
- Tables format correctly

#### Accessibility Testing
- [ ] All images have alt text (if any images added)
- [ ] Headings are in logical order (no skipped levels)
- [ ] Links have descriptive text
- [ ] Code blocks are readable
- [ ] Color contrast in containers meets WCAG AA

---

## Edge Cases

### 1. Very Long Code Blocks

**Scenario:** Code block exceeds 100 lines.

**Impact:** Horizontal scroll required, may overwhelm page.

**Handling:**
- Recommend breaking into smaller examples
- Use `// ... rest of code` comments to indicate omitted code
- Consider external file import if code is tested

**Guidance in Doc:**
```markdown
::: tip Keep Code Examples Concise
If your code example exceeds ~50 lines, consider:
- Breaking into smaller, focused examples
- Using comments to indicate omitted code
- Linking to full example in GitHub repository
:::
```

---

### 2. Special Characters in Headings

**Scenario:** Heading contains special characters: `## Using ::: in Markdown`.

**Impact:** Anchor link generation may be unexpected.

**Handling:**
- Document that special chars are removed/converted in anchors
- Show example: `## Using ::: in Markdown` → `#using-in-markdown`
- Recommend testing anchor links with special chars

**Guidance in Doc:**
```markdown
**Note:** Special characters in headings are removed from anchor links:
- `## API: Overview` → `#api-overview`
- `## Using <Badge>` → `#using-badge`
```

---

### 3. Nested Custom Containers

**Scenario:** Author tries to nest custom containers (not supported).

**Impact:** Markdown rendering breaks or displays incorrectly.

**Handling:**
- Document that nesting is not supported
- Provide alternative: use separate containers or regular nested content

**Guidance in Doc:**
```markdown
::: warning Containers Cannot Be Nested
Do not nest custom containers inside each other. Use separate containers or standard markdown for nested content.
:::
```

---

### 4. Broken Internal Links

**Scenario:** Author links to page that doesn't exist yet or has wrong path.

**Impact:** 404 error when clicking link, poor user experience.

**Handling:**
- VitePress shows broken link warning in dev console
- Recommend checking links during local dev testing
- Document standard link pattern to reduce errors

**Guidance in Doc:**
```markdown
::: tip Verify Internal Links
Test all internal links in dev server before committing. VitePress will show console warnings for broken links.
:::
```

---

### 5. Markdown Escaping in Examples

**Scenario:** Showing markdown syntax examples requires escaping backticks.

**Impact:** Triple backticks inside code blocks break rendering.

**Handling:**
- Use quadruple backticks to wrap examples containing triple backticks
- Or use backslash escaping: \\\`\`\`
- Document both approaches

**Guidance in Doc:**
```markdown
### Showing Markdown Syntax Examples

To show markdown syntax (including code blocks) in examples, use escaping:

**Option 1: Quadruple backticks**
\`\`\`\`markdown
\```typescript
code here
\```
\`\`\`\`

**Option 2: Backslash escaping**
\```markdown
\\\`\\\`\\\`typescript
code here
\\\`\\\`\\\`
\```
```

---

### 6. Inconsistent Table Alignment

**Scenario:** Table columns don't align visually in markdown source.

**Impact:** No rendering issue, but source is hard to read.

**Handling:**
- Document that rendering is correct regardless of source formatting
- Recommend using editor with markdown table formatting (VS Code extensions)
- Provide example of well-formatted table source

**Guidance in Doc:**
```markdown
::: info Table Formatting
Markdown tables render correctly regardless of source formatting, but aligned columns improve readability when editing. Use VS Code extensions like "Markdown Table" for auto-formatting.
:::
```

---

### 7. Empty Description in Frontmatter

**Scenario:** Author forgets to add description in frontmatter.

**Impact:** Missing meta description for SEO and search previews.

**Handling:**
- Document that description is required
- Explain its purpose (SEO, search results, link previews)
- Provide examples of good descriptions

**Guidance in Doc:**
```markdown
::: warning Required Frontmatter
Both `title` and `description` are required in frontmatter. Description is used for:
- Search engine results
- KB search previews
- Link previews when shared
:::
```

---

## Open Questions

### Q1: Should we include Mermaid diagram syntax?

**Context:** VitePress supports Mermaid diagrams via plugin, but it's not currently installed.

**Options:**
1. Document Mermaid syntax now (requires plugin installation)
2. Add "Future Enhancement" section noting Mermaid support planned
3. Skip entirely for MVP

**Recommendation:** Option 2 - Add "Future Enhancement" note in Images section. Installing Mermaid plugin is separate task (could be E06-T00X).

**Decision Needed From:** PM

---

### Q2: Should we provide pattern examples from real KB pages?

**Context:** Guide could reference actual KB pages (like `/auth/index.md`) as examples of patterns in action.

**Options:**
1. Include real page references throughout guide
2. Keep guide abstract with generic examples
3. Add "Real Examples" section at end

**Recommendation:** Option 1 - Reference real pages inline (e.g., "See `/auth/index.md` for example of domain overview page"). Makes guide more concrete.

**Decision Needed From:** Developer preference (low impact)

---

### Q3: Should we document syntax for embedding videos?

**Context:** VitePress supports embedding videos, but KB doesn't currently use them.

**Options:**
1. Document video embedding now
2. Skip for MVP, add when first video is needed
3. Add brief mention in "Future Enhancement"

**Recommendation:** Option 3 - Mention briefly in Images section as future possibility. Not needed for current KB content.

**Decision Needed From:** PM

---

### Q4: Should example template be in separate file or inline?

**Context:** Example template could be:
- Inline in guide (copy-paste from markdown)
- Separate file: `apps/docs/src/contributing/template.md`
- Both (file + shown inline)

**Options:**
1. Inline only (simpler, one source of truth)
2. Separate file only (cleaner, but author must switch files)
3. Both (redundant, but most convenient)

**Recommendation:** Option 1 - Inline only in code block. Easy to copy-paste, no file duplication issues.

**Decision Needed From:** Developer preference (low impact)

---

### Q5: Should guide include "Don't Do This" anti-patterns?

**Context:** Could show bad examples alongside good examples (e.g., wrong heading hierarchy).

**Options:**
1. Add anti-pattern examples throughout (more comprehensive)
2. Keep guide positive (only show correct patterns)
3. Add dedicated "Common Mistakes" section

**Recommendation:** Option 1 - Include brief anti-patterns inline where helpful (e.g., show wrong heading hierarchy next to correct one). Helps authors avoid mistakes.

**Decision Needed From:** Developer preference (low impact)

---

## Implementation Steps

### Phase 1: Document Creation

**Step 1:** Create guide file
```bash
touch /home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/src/contributing/kb-page-design.md
```

**Step 2:** Add frontmatter and title
```markdown
---
title: KB Page Design Patterns
description: VitePress markdown patterns for consistent KB documentation pages
---

# KB Page Design Patterns
```

**Step 3:** Write sections 1-11 following detailed content outline above
- Section 1: Frontmatter and Title
- Section 2: Standard Page Structure
- Section 3: Heading Hierarchy
- Section 4: Code Blocks
- Section 5: Custom Containers
- Section 6: Tables
- Section 7: Cross-Referencing
- Section 8: Lists
- Section 9: VitePress-Specific Features
- Section 10: Images and Diagrams
- Section 11: Complete Example Template

**Estimated Time:** 3-4 hours

---

### Phase 2: Integration

**Step 4:** Update VitePress config
```bash
# Edit apps/docs/.vitepress/config.ts
# Add to Contributing sidebar section
```

**Step 5:** Update contributing index
```bash
# Edit apps/docs/src/contributing/index.md
# Add link to KB Page Design guide
```

**Step 6:** Test in dev server
```bash
pnpm docs:dev
# Navigate to page and verify rendering
```

**Estimated Time:** 30 minutes

---

### Phase 3: Validation

**Step 7:** Test example template
- Copy template from Section 11
- Create test page
- Verify all patterns work
- Delete test page

**Step 8:** Check all internal links
- Click every internal link in guide
- Verify they navigate correctly
- Fix any broken links

**Step 9:** Test external links
- Click links to VitePress docs
- Verify they open correctly

**Step 10:** Run through all ACs
- Verify each AC is met
- Check all patterns are documented
- Confirm examples render correctly

**Estimated Time:** 1 hour

---

### Phase 4: Final QA

**Step 11:** Cross-browser testing
- Test in Chrome, Firefox, Safari
- Verify rendering consistency

**Step 12:** Search testing
- Test search finds page
- Verify search results are relevant

**Step 13:** Accessibility check
- Verify heading hierarchy
- Check link text is descriptive
- Confirm code blocks are readable

**Step 14:** Peer review
- Have another developer read guide
- Get feedback on clarity and completeness
- Make any necessary revisions

**Estimated Time:** 1 hour

---

### Total Estimated Time: 5-6 hours

---

## Success Metrics

### Completeness
- [ ] All 10 ACs met and validated
- [ ] All VitePress markdown features documented
- [ ] Complete example template provided
- [ ] All edge cases addressed

### Quality
- [ ] Every pattern has clear example
- [ ] Code examples are copy-pasteable
- [ ] Guide is under 1000 words prose (heavy on examples)
- [ ] No broken links or rendering errors

### Usability
- [ ] Author can create consistent KB page in <15 minutes using guide
- [ ] All questions answered without referring to external docs
- [ ] Example template demonstrates all patterns
- [ ] Guide is easily searchable (good headings, keywords)

### Technical
- [ ] Page renders correctly in VitePress
- [ ] All markdown features work as documented
- [ ] Search finds page with relevant queries
- [ ] Navigation works (sidebar, TOC, links)

---

## Related Documentation

- VitePress Markdown Guide: https://vitepress.dev/guide/markdown
- VitePress Frontmatter: https://vitepress.dev/reference/frontmatter-config
- GitHub Flavored Markdown: https://github.github.com/gfm/
- Design Alignment Review: `/home/ryan/Documents/coding/claude-box/raptscallions/backlog/docs/doc-001 - Design-Alignment-Review-E06-T002a-2026-01-13.md`
- E06-T002a Spec (KB Theme): `/home/ryan/Documents/coding/claude-box/raptscallions/backlog/docs/specs/E06/E06-T002a-spec.md`

---

## Notes for Developer

### Writing Tips

1. **Show, Don't Tell:** Every pattern should have concrete example
2. **Keep Examples Short:** 5-10 lines max for code blocks
3. **Use Real Syntax:** All examples should be valid markdown
4. **Test Everything:** Render guide in dev server before committing

### Testing Checklist

Before marking task complete:
- [ ] Guide renders without errors
- [ ] All code blocks have proper syntax highlighting
- [ ] All links work (internal and external)
- [ ] Example template can be copied and works
- [ ] Search finds page with relevant queries
- [ ] Page appears in sidebar navigation

### Common Pitfalls

- **Escaping Markdown:** Use quadruple backticks for examples containing code blocks
- **Anchor Links:** Test them - VitePress generates anchors differently than GitHub
- **Custom Containers:** Triple colons (:::) not double
- **Internal Links:** Use absolute paths from KB root, not relative

---

## File Locations Summary

**New Files:**
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/src/contributing/kb-page-design.md`

**Modified Files:**
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/.vitepress/config.ts` (sidebar entry)
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/src/contributing/index.md` (add link)

---

## UX Review

**Review Date:** 2026-01-13
**Reviewer:** Designer Agent
**Verdict:** ✅ APPROVED

### Executive Summary

This spec designs a comprehensive, practical markdown pattern guide for KB documentation authors. The structure is **well-organized, user-centered, and actionable**. The emphasis on examples over theory, quick-reference patterns, and copy-paste templates demonstrates strong UX thinking.

**Status: APPROVED** - Ready for implementation with minor enhancements suggested below.

---

### Strengths

**1. Exceptional Practical Focus**
- Every pattern includes concrete, copy-pasteable examples
- "Show, don't tell" approach throughout
- Under 1000 words prose keeps it actionable
- Complete template provides immediate value

**2. Strong Information Architecture**
- Logical progression: macro (page structure) → micro (specific elements)
- Pattern-based organization matches author mental model
- Related sections grouped intuitively (tables/lists/links)

**3. Excellent Scannability**
- Clear H2/H3 hierarchy
- "When to use" decision tables reduce paralysis
- Short prose sections (1-2 paragraphs max)
- Visual separation between explanation and examples

**4. Multiple Learning Paths**
- **Quick path:** Copy template, modify as needed
- **Sequential path:** Read sections in order
- **Reference path:** Jump to specific pattern via search/TOC
- Supports both novice and experienced authors

**5. Consistency Promotion**
- Standardized page structure documented
- Clear rules for every decision point (headings, links, frontmatter)
- Template codifies all standards
- Examples demonstrate consistent formatting

**6. Future-Proof Design**
- "Future Enhancement" sections note planned features
- Modular structure allows easy updates
- Links to VitePress docs for deep dives
- Considers edge cases (escaping, special characters, nested containers)

---

### Recommendations (Non-Blocking Enhancements)

#### High Value, Low Effort

**1. Add Quick Reference Index**

Place at top of guide (after intro) with a table mapping common tasks to sections. This reduces time-to-pattern for "quick lookup" use case from ~2 minutes to ~10 seconds.

**2. Strengthen Accessibility Guidance**

Add accessibility tips throughout:
- Screen reader navigation in Heading Hierarchy section
- Table accessibility in Tables section
- Accessibility checklist in Template section

**3. Include Inline Anti-Patterns**

Show brief "wrong" examples in key sections like Heading Hierarchy and Cross-Referencing. Authors learn faster from mistakes, reduces common errors in PR reviews.

---

#### Medium Value, Medium Effort

**4. Add Getting Started Workflow**

Provide a 5-minute quick-start path near the top guiding new authors through their first page creation.

**5. Add Complexity Indicators**

Mark sections with difficulty levels (🟢 Basic, 🟡 Intermediate, 🔴 Advanced) to help new authors prioritize learning.

**6. Provide Two Template Versions**

Offer both a minimal template (~30 lines) and complete template (~80 lines) to reduce initial overwhelm.

---

### Minor Concerns (Low Priority)

**1. Template Length**
- Complete template is 80+ lines, may feel overwhelming
- Mitigation: Provide minimal template option

**2. Visual Monotony**
- 11 sections of similar structure might blend together
- Mitigation: Complexity indicators add visual variety

**3. No Enforcement Mechanism**
- Authors might deviate without automated checks
- Mitigation: Add note about VitePress dev server validation

---

### Accessibility Audit

| Criterion | Status | Notes |
|-----------|--------|-------|
| Information hierarchy | ✅ Excellent | Clear H1→H2→H3 structure aids screen reader navigation |
| Scannability | ✅ Good | Tables, code blocks, short paragraphs support visual scanning |
| Descriptive headings | ✅ Excellent | All headings clearly describe section content |
| Example clarity | ✅ Excellent | Self-contained, runnable examples |
| Learning curve | ✅ Good | Multiple entry points (template/sequential/reference) |
| Decision support | ✅ Excellent | "When to use" tables reduce paralysis |
| Error prevention | ⚠️ Could improve | Anti-patterns would help prevent mistakes |
| Quick reference | ⚠️ Could improve | Index would improve findability for reference users |

**Overall Accessibility:** Strong, with room for minor improvements addressed in recommendations.

---

### User Flow Analysis

**Target User:** Developer writing KB documentation

**Primary Goals:**
1. Quickly understand how to structure a new KB page
2. Find specific syntax for markdown features
3. Copy-paste working examples without trial-and-error
4. Create consistent documentation matching existing KB pages

**Flow Assessment:**

**Scenario 1: First-time author creating concept page**
- Opens guide → Reads Getting Started → Copies minimal template → Refers to specific sections
- **Time:** 10-15 minutes ✅

**Scenario 2: Experienced author needs specific syntax**
- Opens guide → Cmd+K search → Finds section → Copies syntax
- **Time:** <30 seconds ✅

**Scenario 3: Author unsure about table vs list**
- Scans TOC → Finds Tables section → Reads decision table → Makes choice
- **Time:** 1 minute ✅

**Potential Friction Points:**
- Without Quick Reference Index, scenario 2 relies on search working well
- Without complexity indicators, scenario 1 might scan all 11 sections unnecessarily
- Without anti-patterns, authors may iterate more (make mistake, fix in review)

All recommendations above address these friction points.

---

### Verdict Details

**Why Approved:**
1. Core design is excellent - logical structure, practical focus, comprehensive coverage
2. Identified concerns are enhancements, not blockers
3. Spec is ready for implementation as written
4. Recommendations can be added during writing without redesigning spec

**Implementation Guidance:**
1. Proceed with spec as designed
2. Consider Quick Reference Index (high value, 10 minutes effort)
3. Add accessibility tips as you write each section (15 minutes total)
4. Include inline anti-patterns where helpful (5 minutes per section)
5. Test with actual author - have someone create a test page using guide

**Expected Outcome:**
Authors will be able to:
- ✅ Create well-structured KB page in <15 minutes
- ✅ Find specific markdown patterns in <30 seconds
- ✅ Produce consistent documentation across KB
- ✅ Avoid common markdown mistakes
- ✅ Meet accessibility standards by default

---

**Spec Status:** ✅ Complete
**UX Review Status:** ✅ Approved
**Ready for Developer:** Yes
**Estimated Complexity:** Medium
**Estimated Time:** 5-6 hours
