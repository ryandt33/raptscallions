---
title: Authentication & Authorization
description: Lucia sessions, CASL permissions, OAuth providers, guards, and rate limiting
---

# Authentication & Authorization

The auth domain covers user authentication (proving identity) and authorization (determining permissions). The system uses Lucia v3 for session management, CASL for attribute-based access control, and Arctic for OAuth providers.

## What's Here

**Concepts** — Session lifecycle, permission hierarchy, OAuth flows, role-based access control (RBAC)

**Patterns** — Guard middleware composition, permission checks, OAuth provider setup, session validation

**Decisions** — Why Lucia over Passport, CASL for permissions, Arctic for OAuth, rate limiting strategy

**Troubleshooting** — Session cookies not set, permission denied errors, OAuth callback failures, rate limit issues

## Coming Soon

This section is currently being populated with documentation from implemented tasks (E02-T002 through E02-T007).

Check back soon or see the [GitHub repository](https://github.com/ryandt33/raptscallions) for implementation progress.

## Related Domains

- [API](/api/) — Route handlers that use auth guards
- [Testing](/testing/) — Testing auth middleware and guards
