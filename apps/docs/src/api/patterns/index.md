---
title: API Patterns
description: Reusable implementation patterns for Fastify routes and middleware
---

# API Patterns

This section documents the implementation patterns used in RaptScallions' API layer. These are proven patterns extracted from actual code.

## Available Patterns

- [Route Handlers](/api/patterns/route-handlers) — Route definition with types and validation
- [Error Handling](/api/patterns/error-handling) — AppError classes and global error handler
- [Validation](/api/patterns/validation) — Zod schemas with Fastify integration
- [Middleware](/api/patterns/middleware) — Session, auth guards, rate limiting, logging

## Quick Reference

| Pattern | Use Case |
|---------|----------|
| **Route Handlers** | Defining typed routes with Zod validation |
| **Error Handling** | Throwing typed errors, formatting responses |
| **Validation** | Request body, params, and query validation |
| **Middleware** | Authentication, authorization, rate limiting |

## Return to Overview

See the [API Overview](/api/) for concepts, decisions, and troubleshooting guides.
