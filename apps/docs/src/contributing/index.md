---
title: Contributing to Raptscallions
description: How to contribute code, documentation, and improvements
---

# Contributing to Raptscallions

Guidelines for contributing to the Raptscallions project, including code contributions, documentation updates, and development workflow.

## Coming Soon

This section will include:
- Development environment setup
- Code contribution guidelines
- Documentation contribution process
- Testing requirements
- PR review process

Check the [GitHub repository](https://github.com/ryandt33/raptscallions) for current contribution guidelines.

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
5. Update the sidebar in `.vitepress/config.ts` to add the new page

Example:
```markdown
---
title: Session Lifecycle
description: How Lucia sessions are created, validated, and expired
---

# Session Lifecycle

[Content here...]
```

## Quick Links

- [GitHub Issues](https://github.com/ryandt33/raptscallions/issues)
- [Pull Requests](https://github.com/ryandt33/raptscallions/pulls)
- [Project Board](https://github.com/ryandt33/raptscallions/projects)
