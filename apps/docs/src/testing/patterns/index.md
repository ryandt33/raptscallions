---
title: Testing Patterns
description: Reusable testing patterns for Vitest and Fastify
related_code:
  - apps/api/src/__tests__/**/*.test.ts
  - packages/**/__tests__/**/*.test.ts
last_verified: 2026-01-14
---

# Testing Patterns

Reusable testing patterns for Vitest and Fastify integration testing.

## Available Patterns

- [Mocking](/testing/patterns/mocking) — `vi.mock()`, `vi.hoisted()`, spies, and when to use dependency injection instead
- [Test Factories](/testing/patterns/factories) — Creating reusable mock data with factory functions
- [Fastify Testing](/testing/patterns/fastify-testing) — Integration tests with `app.inject()`, plugin registration, and test server setup
- [Fastify Plugin Encapsulation](/testing/patterns/fastify-plugin-encapsulation) — Why hooks don't apply to routes in other plugins, and how to fix it using `fastify-plugin` and dependency injection
- [Integration Tests](/testing/patterns/integration-tests) — End-to-end API testing patterns with mocked dependencies

## Pattern Overview

| Pattern | When to Use |
|---------|-------------|
| [Mocking](/testing/patterns/mocking) | Need to isolate code from dependencies |
| [Test Factories](/testing/patterns/factories) | Creating consistent test data across tests |
| [Fastify Testing](/testing/patterns/fastify-testing) | Testing HTTP routes and middleware |
| [Plugin Encapsulation](/testing/patterns/fastify-plugin-encapsulation) | Hooks/decorators not working across plugins |
| [Integration Tests](/testing/patterns/integration-tests) | Testing full request/response lifecycle |

## Quick Decision Guide

**"My mocks aren't being applied"**
→ See [Mocking](/testing/patterns/mocking) — use `vi.hoisted()`

**"Session/auth hooks don't fire"**
→ See [Fastify Plugin Encapsulation](/testing/patterns/fastify-plugin-encapsulation) — wrap with `fastify-plugin`

**"How do I test a Fastify route?"**
→ See [Fastify Testing](/testing/patterns/fastify-testing) — use `app.inject()`

**"I'm repeating mock data in every test"**
→ See [Test Factories](/testing/patterns/factories) — create factory functions

**"How do I test auth flows?"**
→ See [Integration Tests](/testing/patterns/integration-tests) — full examples

## Related Pages

- [Testing Overview](/testing/) — Domain overview and quick reference
- [Vitest Monorepo Setup](/testing/concepts/vitest-setup) — Configuration hierarchy
- [Test Structure](/testing/concepts/test-structure) — AAA pattern and naming
- [Common Issues](/testing/troubleshooting/common-issues) — Troubleshooting guide
