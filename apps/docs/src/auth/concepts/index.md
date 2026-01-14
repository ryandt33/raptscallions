---
title: Auth Concepts
description: Core concepts for authentication and authorization
---

# Auth Concepts

Core mental models for understanding the authentication and authorization system.

## Topics

- [Session Lifecycle](/auth/concepts/sessions) — How sessions are created, validated, extended, and expired
- [Lucia Configuration](/auth/concepts/lucia) — Lucia v3 setup, Drizzle adapter, and TypeScript type augmentation
- [OAuth Providers](/auth/concepts/oauth) — Google and Microsoft OAuth flows with PKCE
- [CASL Permissions](/auth/concepts/casl) — Role-based permission definitions and attribute-based access control

## Quick Reference

| Concept | Key File | Purpose |
|---------|----------|---------|
| Sessions | `packages/auth/src/session.service.ts` | Session CRUD operations |
| Lucia | `packages/auth/src/lucia.ts` | Session management configuration |
| OAuth | `packages/auth/src/oauth.ts` | OAuth client setup |
| CASL | `packages/auth/src/abilities.ts` | Permission building by role |

## Related

- [Auth Patterns](/auth/patterns/) — Implementation patterns for authentication
- [Auth Troubleshooting](/auth/troubleshooting/) — Common issues and solutions
