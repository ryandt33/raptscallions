---
globs:
  - "apps/api/**/*.ts"
  - "apps/api/**/*.tsx"
---

# API Code Rules

When working with API code in `apps/api/`:

## Framework

- Use **Fastify**, not Express
- Use Fastify's native typing for routes
- Use `preHandler` for middleware, not `.use()`

## Route Handlers

```typescript
// ✅ Correct pattern
app.post<{ Body: CreateUserInput }>(
  "/",
  {
    preHandler: [app.authenticate],
    schema: { body: createUserSchema },
  },
  async (request, reply) => {
    const user = await userService.create(request.body);
    return reply.status(201).send(user);
  }
);
```

## Validation

- Always use Zod schemas for request validation
- Schemas live in `@raptscallions/core/schemas`
- Use `schema` option in route config for auto-validation

## Error Handling

- Throw typed errors from `@raptscallions/core/errors`
- Never return plain objects for errors
- Let the error handler middleware format responses

## Authentication

- Use `app.authenticate` preHandler for protected routes
- Use `app.requireRole('role')` for role checks
- Use `app.requirePermission('action', 'resource')` for fine-grained

## Response Format

```typescript
// Success
return reply.send({ data: result });
return reply.send({ data: results, meta: { cursor, hasMore } });

// Created
return reply.status(201).send({ data: created });

// No content
return reply.status(204).send();
```

## File Organization

```
apps/api/src/
├── routes/
│   └── {domain}.routes.ts    # Route handlers
├── services/
│   └── {domain}.service.ts   # Business logic
├── middleware/
│   └── {name}.middleware.ts  # Request processing
└── utils/
```
