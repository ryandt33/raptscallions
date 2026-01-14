---
layout: home

hero:
  name: RaptScallions
  text: Knowledge Base
  tagline: Architecture, patterns, decisions, and troubleshooting for the RaptScallions platform
  actions:
    - theme: brand
      text: Get Started
      link: /
    - theme: alt
      text: View on GitHub
      link: https://github.com/ryandt33/raptscallions

features:
  - icon: 🏗️
    title: Architecture
    details: System design, technology stack, and core entity relationships
  - icon: 🎨
    title: Patterns
    details: Reusable implementation patterns for common scenarios
  - icon: 📚
    title: Domain Guides
    details: Deep dives into auth, database, API, AI, and testing domains
  - icon: 🔍
    title: Troubleshooting
    details: Problem-solution guides for common issues
---

## About This KB

This knowledge base documents the **implemented** features of the RaptScallions platform. Unlike planning documents, every article here is verified against working code.

### What's Inside

- **Concepts**: Mental models and core ideas
- **Patterns**: Reusable code patterns with examples
- **Decisions**: Architecture decision records (ADRs)
- **Troubleshooting**: Guides for resolving common issues

### Navigation

Use the search bar (Cmd/Ctrl + K) to find topics quickly, or browse by domain using the sidebar.

### Contributing

Documentation contributions are welcome. See the main repository for contribution guidelines.

## Browse by Domain

### [Authentication & Authorization](/auth/)

Lucia sessions, CASL permissions, OAuth providers, guards, and rate limiting.

### [Database & ORM](/database/)

PostgreSQL schemas, Drizzle ORM patterns, migrations, and entity relationships.

### [API Design & Patterns](/api/)

Fastify route handlers, middleware, services, validation, and error handling.

### [AI Gateway Integration](/ai/)

OpenRouter client, streaming, error handling, and usage patterns.

### [Testing](/testing/)

Vitest setup, AAA pattern, mocking strategies, Fastify integration testing.

### [Contributing](/contributing/)

How to contribute code, documentation, and improvements.
