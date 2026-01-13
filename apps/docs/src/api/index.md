---
title: API Design & Patterns
description: Fastify route handlers, middleware, services, validation, and error handling
---

# API Design & Patterns

The API domain covers Fastify route handler patterns, middleware composition, service layer design, Zod validation, and typed error handling. The system uses Fastify (not Express) for performance and native TypeScript support.

## What's Here

**Concepts** — RESTful design, route handler structure, middleware composition, service patterns, error handling

**Patterns** — Route handler templates, preHandler arrays, service dependency injection, Zod validation, typed responses

**Decisions** — Why Fastify over Express, Zod for validation, typed error classes, response format conventions

**Troubleshooting** — Plugin encapsulation issues, validation failures, error responses, CORS problems

## Coming Soon

This section is currently being populated with documentation from implemented routes (auth, users, groups, classes, tools, chat sessions).

Check back soon or see the [GitHub repository](https://github.com/ryandt33/raptscallions) for implementation progress.

## Related Domains

- [Auth](/auth/) — Authentication and authorization patterns
- [Database](/database/) — Service layer database queries
- [Testing](/testing/) — Testing Fastify routes
