---
title: QA (Archived)
description: Historical QA agent for validation testing
source_synced_at: 2026-01-16
---

# QA (Archived)

::: warning Archived
This agent definition was archived on 2026-01-16. See `.claude/agents/qa.md` for the current version.
:::

## Role

The archived QA agent validated that implementations met requirements. The agent thought like an adversarial tester — finding what's broken rather than confirming it works. QA was the last line of defense before code shipped.

## Key Differences from Current

| Aspect | Archived | Current |
|--------|----------|---------|
| **Workflow commands** | Single `/qa` command | Added `/verify-fix` and `/integration-test` |
| **Integration testing** | Not formalized | Formal integration test phase with Docker |
| **Failure analysis** | Basic reporting | Added `/investigate-failure` command |

## What Remained Similar

The core QA principles remained largely unchanged:

### Testing Philosophy
- **Thorough** — Verify every acceptance criterion
- **Adversarial** — Try to break everything
- **Deep** — Read code completely, trace execution
- **Documented** — Specific file names, line numbers, reproduction steps

### Bug Severity Categories
- 🔴 **CRITICAL** — Feature doesn't work, security issues, tests fail
- 🟠 **HIGH** — Major edge case not handled, poor error handling
- 🟡 **MEDIUM** — Minor edge case, unclear errors
- 🟢 **LOW** — Style issues, minor optimizations

### Verdict Options
- `PASSED` — All ACs verified, no blocking bugs
- `FAILED` — ACs not met or blocking bugs found

## Minor Changes

The current QA agent adds:

1. **`/verify-fix`** — Specifically verifies bug fixes
2. **`/integration-test`** — Runs tests against Docker infrastructure
3. **`/investigate-failure`** — Analyzes integration test failures
4. **Formal re-test process** — Distinct from initial comprehensive test

## Source Reference

- Archived: `.claude/archive/1_16/agents/qa.md`
- Current: `.claude/agents/qa.md`
