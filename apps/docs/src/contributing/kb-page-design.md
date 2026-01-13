---
title: KB Page Design Patterns
description: VitePress markdown patterns for consistent KB documentation pages
---

# KB Page Design Patterns

This guide documents VitePress markdown patterns for writing consistent KB documentation. It provides concrete examples and a complete template to help you create well-structured, accessible documentation pages quickly.

## Quick Reference

| Task | Section |
|------|---------|
| Start a new page | [Frontmatter and Title](#frontmatter-and-title) |
| Organize content | [Page Structure](#standard-page-structure) |
| Choose heading level | [Heading Hierarchy](#heading-hierarchy) |
| Add code examples | [Code Blocks](#code-blocks) |
| Highlight important info | [Custom Containers](#custom-containers-callouts) |
| Create tables | [Tables](#tables) |
| Link to other pages | [Cross-Referencing](#cross-referencing) |
| Add lists | [Lists](#lists) |
| Use VitePress features | [VitePress Features](#vitepress-specific-features) |
| Copy full template | [Complete Template](#complete-example-template) |

## Frontmatter and Title

Every KB page starts with YAML frontmatter and an H1 title:

```yaml
---
title: Session Lifecycle
description: How Lucia sessions are created, validated, and expired
---

# Session Lifecycle
```

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

::: warning Required Frontmatter
Both `title` and `description` are required in frontmatter. Description is used for:
- Search engine results
- KB search previews
- Link previews when shared
:::

## Standard Page Structure

All KB pages follow this structure:

1. **Frontmatter** — Title and description
2. **H1 Title** — Main page heading
3. **Overview** — 1-2 paragraph summary of what page covers
4. **Main Sections** — H2 headings for major topics
5. **Subsections** — H3 headings for details within sections
6. **Related Links** — Optional footer linking to related pages

**Example:**

```markdown
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
```

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

```markdown
# Permission System

## Overview

High-level introduction to permissions.

## CASL Abilities

How CASL defines permissions.

### Creating abilities

Step-by-step guide.

### Permission hierarchy

Parent-child permission structure.

## Permission Guards

Middleware for route protection.
```

**Wrong hierarchy (don't do this):**

```markdown
# Permission System

### Creating Abilities  ❌ Skipped H2 level

## CASL Abilities

#### Deep Section  ❌ Skipped H3 level
```

::: tip Accessibility
Proper heading hierarchy helps screen readers navigate content. Always use headings in logical order without skipping levels.
:::

## Code Blocks

### Inline Code

Use single backticks for inline code:

- Variable names: `userId`, `sessionId`
- File names: `auth.service.ts`, `permissions.ts`
- Short code snippets: `req.user.id`

### Block Code

Use triple backticks with language tag:

```typescript
export async function validateSession(sessionId: string): Promise<Session | null> {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId)
  });
  return session;
}
```

**Supported languages:** `typescript`, `javascript`, `json`, `bash`, `sql`, `yaml`, `markdown`

### Line Highlighting

Highlight specific lines with `{line-numbers}` syntax:

```typescript{2,4-6}
export function createUser(data: CreateUserInput) {
  const hashedPassword = await hashPassword(data.password); // highlighted

  const user = await db.insert(users).values({ // highlighted
    ...data,                                    // highlighted
    passwordHash: hashedPassword                // highlighted
  });

  return user;
}
```

### Line Numbers

Add line numbers with `:line-numbers` flag:

```typescript:line-numbers
function example() {
  return "With line numbers";
}
```

### Code Groups

Show multiple language examples with code groups:

::: code-group
```typescript [TypeScript]
const user: User = { id: "123", name: "Alice" };
```

```javascript [JavaScript]
const user = { id: "123", name: "Alice" };
```
:::

### File Paths in Code Blocks

Show file path in code block header:

```typescript
// apps/api/src/services/user.service.ts
export class UserService {
  // ...
}
```

Or use VitePress syntax:

```typescript [apps/api/src/services/user.service.ts]
export class UserService {
  // ...
}
```

::: tip Keep Code Examples Concise
If your code example exceeds ~50 lines, consider:
- Breaking into smaller, focused examples
- Using comments to indicate omitted code
- Linking to full example in GitHub repository
:::

## Custom Containers (Callouts)

VitePress provides custom containers for highlighting important information.

### Tip (Success/Best Practice)

Use for best practices, helpful hints, and positive reinforcement:

::: tip Best Practice
Always validate session on server-side before processing requests.
:::

**Renders as:** Green box with checkmark icon

### Info (Neutral Information)

Use for additional context, related information, or FYI notes:

::: info
Lucia sessions expire after 30 days of inactivity by default.
:::

**Renders as:** Blue box with info icon

### Warning (Caution)

Use for potential pitfalls, deprecated features, or breaking changes:

::: warning
Do not store sensitive data in session attributes. Use server-side storage.
:::

**Renders as:** Yellow box with warning icon

### Danger (Critical/Error)

Use for security vulnerabilities, data loss risks, or critical errors:

::: danger Security Risk
Never expose session secrets in client-side code or logs.
:::

**Renders as:** Red box with danger icon

### Custom Title

Override default container title:

::: tip Remember
Custom titles make containers more specific.
:::

### When to Use

| Container | Use Case | Example |
|-----------|----------|---------|
| **Tip** | Best practices, recommendations | "Use TypeScript strict mode" |
| **Info** | Additional context, FYI | "Drizzle supports PostgreSQL 12+" |
| **Warning** | Potential issues, deprecations | "Prisma migration deprecated" |
| **Danger** | Security risks, data loss | "Do not commit .env files" |

::: warning Containers Cannot Be Nested
Do not nest custom containers inside each other. Use separate containers or standard markdown for nested content.
:::

## Tables

Use tables for structured data with multiple columns. For simple lists, use bullet points instead.

### Basic Table

```markdown
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:id` | Fetch user by ID |
| POST | `/api/users` | Create new user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |
```

Renders as:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:id` | Fetch user by ID |
| POST | `/api/users` | Create new user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

### Alignment

Control column alignment with colons:

```markdown
| Left | Center | Right |
|:-----|:------:|------:|
| Text | Text   | Text  |
```

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

::: info Table Formatting
Markdown tables render correctly regardless of source formatting, but aligned columns improve readability when editing. Use VS Code extensions like "Markdown Table" for auto-formatting.
:::

## Cross-Referencing

### Internal Links (KB Pages)

Link to other KB pages using absolute paths:

```markdown
See [Session Lifecycle](/auth/concepts/session-lifecycle) for details.

Related: [Permission Guards](/auth/patterns/permission-guards)
```

**Rules:**
- Use absolute paths from KB root: `/auth/concepts/...`
- Omit `.md` extension
- Use descriptive link text (not "click here")

::: tip Verify Internal Links
Test all internal links in dev server before committing. VitePress will show console warnings for broken links.
:::

### External Links

Link to external resources with full URL:

```markdown
See the [VitePress documentation](https://vitepress.dev) for more.

Reference: [Lucia Auth Docs](https://lucia-auth.com)
```

### Anchor Links (Headings)

Link to specific heading on same or different page:

```markdown
See [Best Practices](#best-practices) below.

Jump to [CASL Setup → Creating Abilities](/auth/concepts/casl-setup#creating-abilities)
```

**Rules:**
- Heading anchors are auto-generated: lowercase, spaces to hyphens
- Example: `## Best Practices` → `#best-practices`
- Works across pages: `/path/to/page#heading-anchor`

**Special characters in headings are removed:**
- `## API: Overview` → `#api-overview`
- `## Using <Badge>` → `#using-badge`

### Related Links Section

End pages with related links for navigation:

```markdown
## Related Pages

- [CASL Abilities](/auth/concepts/casl-abilities)
- [Route Handlers](/api/patterns/route-handlers)
- [Error Handling](/api/patterns/error-handling)
```

**Format:**
- Use H2 heading: `## Related Pages` or `## Related Concepts`
- Bullet list of internal links
- Keep to 3-6 related pages
- Prioritize direct dependencies or common next steps

## Lists

### Unordered Lists

Use `-` for bullet lists:

```markdown
- First item
- Second item
- Third item
```

### Ordered Lists

Use `1.` for numbered lists (numbers auto-increment):

```markdown
1. First step
2. Second step
3. Third step
```

**Note:** Markdown auto-numbers, so you can use `1.` for all items:

```markdown
1. Step one
1. Step two (renders as "2.")
1. Step three (renders as "3.")
```

### Nested Lists

Indent with 2 spaces:

```markdown
- Top level
  - Nested item
  - Another nested item
    - Deeply nested
- Back to top level
```

### Multi-Paragraph List Items

Use blank lines and indentation:

```markdown
1. First item with multiple paragraphs.

   This is the second paragraph of the first item.

2. Second item.
```

### Task Lists

Use `- [ ]` and `- [x]`:

```markdown
- [x] Completed task
- [ ] Pending task
- [ ] Another pending task
```

## VitePress-Specific Features

### Badges

Add inline badges for status or version:

```markdown
# Feature Name <Badge type="tip" text="New" />
# API Endpoint <Badge type="warning" text="Deprecated" />
# Package Version <Badge type="info" text="v2.0" />
```

**Badge types:** `tip` (green), `warning` (yellow), `danger` (red), `info` (blue)

### Emoji

Use emoji shortcodes or Unicode:

```markdown
:rocket: Deployment
:warning: Warning
:white_check_mark: Completed

Or use Unicode directly: 🚀 🌱 ✅
```

### Frontmatter Options

Control page behavior with frontmatter:

```yaml
---
title: Page Title
description: Page description
lastUpdated: false        # Hide last updated timestamp
outline: [2, 3]           # Show H2 and H3 in right TOC
sidebar: false            # Hide sidebar on this page
aside: false              # Hide right TOC (outline)
layout: home              # Use home layout (for index pages)
---
```

### Code Import

Import code from external files (useful for tested examples):

```markdown
```typescript
<<< @/path/to/file.ts
\```
```

### Table of Contents

Right sidebar shows page outline automatically (H2 and H3 by default).

Control with `outline` frontmatter:

```yaml
---
outline: [2, 4]    # Show H2, H3, and H4
outline: false     # Hide TOC
outline: deep      # Show all heading levels
---
```

### Search Keywords

Add custom search keywords (not visible on page):

```yaml
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
```

## Images and Diagrams

### Basic Image Syntax

```markdown
![Alt text](/images/diagram.png)
```

**Rules:**
- Store images in `apps/docs/src/public/images/`
- Use kebab-case file names: `session-lifecycle-diagram.png`
- Always provide alt text for accessibility
- Optimize images (PNG for diagrams, JPEG for photos, SVG for icons)

### Image with Caption

Use italic text below image for caption:

```markdown
![Session validation flow](/images/session-validation.png)

*Figure 1: Session validation flow showing cookie parsing and database lookup*
```

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

## Complete Example Template

Copy this template when creating new KB pages:

```markdown
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

### When to use tables

| Feature | Use Case | Example |
|---------|----------|---------|
| Tables | Structured data | API endpoints |
| Lists | Simple items | Related links |

### When to use lists

- Use unordered lists for non-sequential items
- Use ordered lists for step-by-step instructions
- Keep list items concise (one sentence each)

### Code example with highlighting

\```typescript{2,4}
function highlightedExample() {
  const important = "This line is highlighted"; // highlighted
  const normal = "This is not";
  return important; // highlighted
}
\```

### Cross-references

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
```

## Tips for Writing KB Pages

### Show, Don't Tell

Every pattern should have a concrete example. Instead of saying "use code blocks for code," show a code block in action.

### Keep Examples Short

Aim for 5-10 lines max for code blocks. Long examples overwhelm readers and obscure the point.

### Use Real Syntax

All examples should be valid markdown that can be copy-pasted directly.

### Test Everything

Render your page in the dev server (`pnpm docs:dev`) before committing. Check:
- All code blocks have proper syntax highlighting
- All links work (internal and external)
- Custom containers render correctly
- Tables format properly

### Make It Scannable

Use short paragraphs (2-3 sentences), plenty of headings, and visual breaks. Readers often skim documentation looking for specific information.

### Provide Context

Don't assume the reader has deep knowledge. Briefly explain why a pattern matters before showing how to use it.

## Related Pages

- [Contributing Overview](/contributing/)
- [Documentation Structure](/contributing/#documentation-structure)
