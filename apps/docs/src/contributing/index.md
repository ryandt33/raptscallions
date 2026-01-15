---
title: Contributing to RaptScallions
description: How to contribute code, documentation, and improvements
---

# Contributing to RaptScallions

Guidelines for contributing to the RaptScallions project, including code contributions, documentation updates, and development workflow.

## Documentation Guides

These guides help you write and format KB documentation:

| Guide | Purpose |
|-------|---------|
| [Documentation Guide](/contributing/documentation) | **What to write** — Templates, conventions, where to put docs, linking rules |
| [KB Page Design Patterns](/contributing/kb-page-design) | **How to format** — Markdown syntax, VitePress features, code blocks, containers |
| [Design System](/contributing/design-system) | **Visual identity** — Colors, typography, spacing, theme system |
| [CI Validation](/contributing/ci-validation) | **Quality assurance** — How docs are validated in CI, fixing build errors |

::: tip Start Here
If you're writing KB documentation, read the [Documentation Guide](/contributing/documentation) first. It explains what templates to use, where to put your content, and how to link to other pages.
:::

## Documentation Structure

The knowledge base follows a domain-first organization:

### Domain Folders

Each domain represents a major codebase area:

- **auth/** — Authentication and authorization
- **database/** — Database schemas and ORM patterns
- **api/** — API design and Fastify patterns
- **ai/** — AI gateway integration
- **testing/** — Testing patterns and conventions
- **contributing/** — Contribution guidelines

### Content Types

Within each domain, content is organized by type:

- **concepts/** — Core ideas and mental models
- **patterns/** — Reusable implementation patterns
- **decisions/** — Architecture decision records (ADRs)
- **troubleshooting/** — Problem → solution guides

### Naming Conventions

- **Files:** Use kebab-case for file names (`session-lifecycle.md`)
- **Folders:** Use kebab-case for folder names (`api/`, `troubleshooting/`)
- **Titles:** Use Title Case in frontmatter
- **Max depth:** 3 levels (domain/type/article)

### Adding New Content

When adding documentation:

1. Choose the appropriate domain folder
2. Choose the content type (concepts, patterns, decisions, troubleshooting)
3. Create a new `.md` file with kebab-case name
4. Add frontmatter with title and description
5. Use descriptive inline links to reference backlog tasks and specs
6. Update the sidebar in `.vitepress/config.ts` to add the new page

Example:

```markdown
---
title: Session Lifecycle
description: How Lucia sessions are created, validated, and expired
---

# Session Lifecycle

[Content here...]
```

For complete templates and examples, see the [Documentation Guide](/contributing/documentation).

## Improvements & Recommendations

The KB tracks technical debt and enhancement opportunities in a dedicated [Improvements section](/improvements/).

**When to add an improvement:**
- Non-blocking code review suggestions
- Technical debt discovered during development
- Performance optimization opportunities
- Security hardening ideas
- DX enhancements

**How to add an improvement:**
1. Choose appropriate domain page (`/improvements/{domain}.md`)
2. Assign next available ID (`{DOMAIN}-{NNN}`)
3. Categorize priority (Critical/High/Medium/Low)
4. Estimate effort (Small/Medium/Large)
5. Link to source (epic review, code review, etc.)

See [Improvements Policy](/contributing/improvements-policy) for detailed guidelines.

## Code Contributions

Coming soon:

- Development environment setup
- Code contribution guidelines
- Testing requirements
- PR review process

Check the [GitHub repository](https://github.com/ryandt33/raptscallions) for current contribution guidelines.

## Quick Links

- [GitHub Issues](https://github.com/ryandt33/raptscallions/issues)
- [Pull Requests](https://github.com/ryandt33/raptscallions/pulls)
- [Project Board](https://github.com/ryandt33/raptscallions/projects)
