---
title: Git Agent (Archived)
description: Historical git agent for commit and PR operations
source_synced_at: 2026-01-16
---

# Git Agent (Archived)

::: warning Archived
This agent definition was archived on 2026-01-16. See `.claude/agents/git-agent.md` for the current version.
:::

## Role

The archived git agent was a Git and GitHub operations specialist focused on following commit conventions, running CI checks, and creating well-formatted pull requests.

## Key Differences from Current

| Aspect | Archived | Current |
|--------|----------|---------|
| **Commands** | `commit-and-pr` | Same with utility commands |
| **Organization** | Standalone | Grouped with utility commands |

## What Remained Similar

The git agent remained largely unchanged. Core functionality includes:

### Responsibilities
1. **Commit Management** — Conventional format, task references
2. **Branch Management** — Feature branches, proper naming
3. **CI/CD Integration** — Run `pnpm ci:check` before commits
4. **Pull Request Creation** — Templates, labels, automerge

### Commit Message Format
```
<type>(<scope>): <subject>

[optional body]

Refs: <task-id>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Branch Naming
- `feature/E01-T001-description`
- `bugfix/E02-T005-issue`
- `chore/description`

### Safety Rules
- Never commit without passing CI checks
- Never force push to main/master
- Never commit secrets
- Never bypass pre-commit hooks

## Minor Changes

The current git agent is organized under utility commands:
- `/commit-and-pr` — Same functionality
- `/skip-github` — Skip GitHub automation (new)
- `/investigate-failure` — Analyze CI failures (new)

## Source Reference

- Archived: `.claude/archive/1_16/agents/git-agent.md`
- Current: `.claude/agents/git-agent.md`
