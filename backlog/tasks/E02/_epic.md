---
id: "E02"
title: "API Foundation & Authentication"
description: "Fastify API server setup, Lucia authentication, OAuth providers, and CASL permissions"
status: "planned"
priority: 2
estimated_weeks: 2
depends_on_epics: ["E01"]
---

# Epic E02: API Foundation & Authentication

## Goals

Establish the core API server using Fastify and implement a complete authentication system with Lucia (local + OAuth), session management, and CASL-based authorization with role-based access control.

## Success Criteria

- [ ] Fastify API server running with health checks and error handling
- [ ] Email/password authentication working with Argon2 hashing
- [ ] OAuth authentication (Google, Microsoft) integrated via Arctic
- [ ] Session management with secure cookies and Redis
- [ ] CASL permissions system enforcing group-scoped roles
- [ ] Authentication middleware protecting routes
- [ ] Comprehensive test coverage for auth flows

## Tasks

| ID       | Title                                           | Priority | Depends On         |
| -------- | ----------------------------------------------- | -------- | ------------------ |
| E02-T001 | Fastify API server foundation                   | critical | -                  |
| E02-T002 | Sessions table and Lucia setup                  | critical | E02-T001           |
| E02-T003 | Email/password authentication routes            | critical | E02-T002           |
| E02-T004 | OAuth integration with Arctic                   | high     | E02-T002           |
| E02-T005 | CASL permission definitions and middleware      | high     | E02-T002           |
| E02-T006 | Authentication guards and decorators            | high     | E02-T003, E02-T005 |
| E02-T007 | Rate limiting middleware                        | medium   | E02-T001           |
| E02-T008 | Auth integration tests                          | high     | E02-T006           |
| E02-T009 | Encapsulate session cookie creation in auth pkg | low      | E02-T003, E02-T004 |
| E02-T010 | Make database pool settings configurable        | medium   | -                  |

## Out of Scope

- Frontend login UI (covered in E06)
- Password reset flow (deferred to later epic)
- Two-factor authentication (future enhancement)
- Account linking between OAuth and local (future enhancement)

## Risks

| Risk                                      | Mitigation                                                      |
| ----------------------------------------- | --------------------------------------------------------------- |
| Session storage performance with Redis    | Use connection pooling, monitor latency in development          |
| OAuth provider configuration complexity   | Provide clear setup docs, environment variable validation       |
| CASL rule complexity for nested groups    | Start with simple role checks, add hierarchy support iteratively |
| Argon2 hashing performance impact         | Use async hashing, tune parameters for balance (security vs speed) |

## Notes

This epic establishes the authentication foundation that all other features depend on. We're using:

- **Fastify** for API framework (NOT Express) - 2-3x performance, native TypeScript support
- **Lucia v3** for session management - modern, TypeScript-first, handles edge cases
- **Arctic** for OAuth - official Lucia companion library for Google/Microsoft/Clever
- **CASL v6** for permissions - attribute-based access control, group-scoped roles
- **Argon2** for password hashing - more secure than bcrypt, recommended by OWASP

Sessions are stored in Redis (ephemeral data) with automatic expiration. The CASL permission system enforces the role hierarchy defined in group_members:

| Role           | Scope  | Capabilities                              |
| -------------- | ------ | ----------------------------------------- |
| `system_admin` | System | Everything                                |
| `group_admin`  | Group  | Manage group, users, settings             |
| `teacher`      | Group  | Create tools, assignments, view analytics |
| `student`      | Class  | Use assigned tools                        |

Permissions cascade through the group hierarchy via ltree queries.
