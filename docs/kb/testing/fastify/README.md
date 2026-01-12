# Fastify Testing Knowledge Base

This directory contains lessons learned from testing Fastify applications with Vitest.

## Articles

| Article | Description |
|---------|-------------|
| [Plugin Encapsulation](./plugin-encapsulation.md) | Why hooks don't apply to routes in other plugins, and how to fix it |

## Quick Reference

### Common Gotchas

1. **Hooks not firing**: Wrap plugins with `fastify-plugin` (fp)
2. **Mocks not working**: Use dependency injection instead of `vi.mock()`
3. **Singletons defeating mocks**: Module aliases resolve before mocks apply

### Testing Checklist

- [ ] Middleware wrapped with `fastify-plugin` if hooks need global scope
- [ ] Use dependency injection for testable services
- [ ] Create test server in `beforeAll`, not globally
- [ ] Call `app.ready()` before running tests
- [ ] Call `app.close()` in `afterAll`
- [ ] Use `vi.clearAllMocks()` in `beforeEach`

### Useful Imports for Tests

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";
```

### Creating Test Server

```typescript
beforeAll(async () => {
  const fastify = await import("fastify");
  app = fastify.default({ logger: false });

  // Register plugins...

  await app.ready();
});

afterAll(async () => {
  await app.close();
});
```
