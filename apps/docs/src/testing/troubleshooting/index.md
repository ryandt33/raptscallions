---
title: Testing Troubleshooting
description: Solutions for frequent test failures and common issues
related_code:
  - apps/api/src/__tests__/**/*.test.ts
last_verified: 2026-01-14
---

# Testing Troubleshooting

Guides for resolving common testing issues.

## Available Guides

- [Common Issues](/testing/troubleshooting/common-issues) — Solutions for frequent test failures including mocking issues, Fastify problems, assertion failures, and environment issues

## Quick Troubleshooting

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Mocks not applied | Singleton timing | Use `vi.hoisted()` |
| Hooks not firing | Plugin encapsulation | Wrap with `fastify-plugin` |
| Tests timeout | Missing `await` or cleanup | Check async/await, call `app.close()` |
| Coverage too low | Untested branches | Run coverage report, add tests |
| Mock state leaks | Missing reset | Add `vi.clearAllMocks()` in `beforeEach` |

## Related Pages

- [Testing Overview](/testing/) — Domain overview and quick reference
- [Testing Patterns](/testing/patterns/) — Reusable testing patterns
- [Mocking Patterns](/testing/patterns/mocking) — vi.mock and vi.hoisted
