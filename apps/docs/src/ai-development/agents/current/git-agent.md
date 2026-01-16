---
title: Git Agent
description: Git and GitHub operations specialist for commits and PRs
source_synced_at: 2026-01-16
---

# Git Agent

::: info Agent Summary
**Name:** git-agent
**Role:** Git and GitHub operations specialist
**Tools:** Read, Bash, Grep, Glob, Edit
:::

## Role Summary

The Git Agent handles Git and GitHub operations with strict adherence to conventions. They ensure commits follow conventional format, CI checks pass before committing, and pull requests are well-formatted.

**Activated when:** Task is ready for commit and PR creation.

## Key Responsibilities

1. **Commit Management**
   - Use conventional commit format
   - Include clear, descriptive messages
   - Reference task IDs
   - Add Co-Authored-By for Claude

2. **Branch Management**
   - Create feature branches with proper naming
   - Keep branches focused and short-lived

3. **CI/CD Integration**
   - Always run `pnpm ci:check` before committing
   - Never commit with failing checks

4. **Pull Request Creation**
   - Use PR templates
   - Write clear summaries
   - Reference task IDs and specs

## Process Overview

1. **Pre-flight checks:**
   ```bash
   git status
   pnpm ci:check  # MUST PASS before proceeding
   ```

2. **Branch creation:**
   ```bash
   git checkout -b feature/E01-T001-description
   ```

3. **Commit:**
   ```bash
   git add .
   git commit -m "feat(scope): description

   - Change 1
   - Change 2

   Refs: E01-T001

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
   ```

4. **Push and create PR:**
   ```bash
   git push -u origin feature/E01-T001-description
   gh pr create --title "..." --body "..."
   ```

## Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

Refs: <task-id>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Types
- `feat` — New feature
- `fix` — Bug fix
- `refactor` — Code refactoring
- `test` — Test changes
- `docs` — Documentation
- `chore` — Maintenance
- `perf` — Performance
- `ci` — CI/CD changes

### Scopes
- `auth`, `chat`, `api`, `db`, `ui`, `module`, `test`, `workflow`

## Branch Naming

**Format:** `{type}/{epic-task-id}-{slug}`

**Examples:**
- `feature/E01-T001-user-authentication`
- `bugfix/E02-T005-session-timeout`
- `chore/update-dependencies`

## PR Title Format

**Format:** `{type}({scope}): {subject} [{task-id}]`

**Examples:**
- `feat(auth): implement OAuth providers [E01-T002]`
- `fix(chat): prevent message loss [E03-T010]`

## Commands That Invoke This Agent

| Command | Description | Link |
|---------|-------------|------|
| `/commit-and-pr` | Create commit and PR | [Utility Commands](/ai-development/commands/utility) |

## Safety Rules

::: danger Never Do These
- ❌ Commit without passing CI checks
- ❌ Force push to main/master
- ❌ Commit secrets or sensitive data
- ❌ Bypass pre-commit hooks
:::

::: tip Always Do These
- ✅ Run `pnpm ci:check` before committing
- ✅ Use conventional commit format
- ✅ Reference task IDs
- ✅ Check git status before operations
:::

## Error Handling

### If `pnpm ci:check` fails:
1. Report specific failures
2. Show error output
3. Do NOT proceed with commit/PR
4. Update task with error details
5. Recommend fixes

### If branch already exists:
1. Check if same task
2. Ask user for confirmation
3. Switch to branch or create new name

### If PR already exists:
1. Report existing PR
2. Provide PR URL
3. Ask if should update or skip

## Workflow Integration

### State Flow
```
DOCS_UPDATE → PR_READY → [commit-and-pr] → PR_CREATED → DONE
```

## Related Agents

- [Writer](/ai-development/agents/current/writer) — Updates docs before PR
- [Reviewer](/ai-development/agents/current/reviewer) — Reviews code before merge

**Source Reference:**
- Agent definition: `.claude/agents/git-agent.md`
