# Workflow GitHub Integration

Documentation for GitHub CI/CD integration in the RaptScallions development workflow.

## Overview

The workflow orchestrator now includes GitHub/Git operations as an automated step after documentation updates and before task completion. This ensures all changes are properly committed, tested, and submitted as pull requests following project conventions.

## Workflow States

The GitHub integration adds four new workflow states:

### PR_READY

**Description:** Documentation is complete, ready to commit and create PR
**Trigger:** Automatically set after `DOCS_UPDATE` completes
**Command:** `/commit-and-pr {task-id}`
**Agent:** `git-agent`
**Next State:** `PR_CREATED`

### PR_CREATED

**Description:** Pull request created, CI checks running
**Trigger:** Set by `/commit-and-pr` after successful PR creation
**Command:** None (manual monitoring)
**Agent:** None
**Next State:** `DONE` (automatic) or `PR_REVIEW`/`PR_FAILED` (manual)

**Behavior:**

- Auto-transitions to `DONE` if automerge enabled and CI passes
- Manually set to `PR_REVIEW` if requiring manual approval
- Manually set to `PR_FAILED` if CI checks fail

### PR_REVIEW

**Description:** PR created, awaiting manual review and approval
**Trigger:** Manually set when PR needs review
**Command:** None (manual monitoring)
**Agent:** None
**Next State:** `DONE` (manual, after PR merged)

**When to use:**

- High or critical priority tasks
- Breaking changes
- Security-sensitive changes
- Requires domain expert review

### PR_FAILED

**Description:** CI checks failed, needs investigation
**Trigger:** Manually set when GitHub Actions fails
**Command:** None (manual investigation)
**Agent:** None
**Next State:** `IMPLEMENTING` or `TESTS_REVISION_NEEDED` (manual)

**Recovery:**

- Investigate failure in GitHub Actions logs
- Fix code issues → set to `IMPLEMENTING`
- Fix test issues → set to `TESTS_REVISION_NEEDED`
- Update PR with fixes, CI re-runs

## Complete Workflow Flow

```
DOCS_UPDATE (update-docs completes)
     ↓
PR_READY (ready to commit)
     ↓
[commit-and-pr command]
     ↓
PR_CREATED (PR created, CI running)
     ↓
┌────┴────┬─────────┐
│         │         │
│    Auto-merge  Manual    CI Failed
│    enabled    review
│         │         │         │
↓         ↓         ↓         ↓
DONE  PR_REVIEW  PR_FAILED
          ↓         │
          │    Fix & retry
          ↓         ↓
        DONE   IMPLEMENTING
                    or
            TESTS_REVISION_NEEDED
```

## The `/commit-and-pr` Command

### What It Does

1. **Validates task state**

   - Checks `workflow_state` is `PR_READY`
   - Verifies code files exist

2. **Checks git status**

   - Runs `git status` to see changes
   - Verifies there are changes to commit

3. **Creates feature branch** (if needed)

   - Format: `feature/{epic}-{task-id}-{slug}`
   - Example: `feature/E01-T001-user-authentication`

4. **Runs CI checks locally**

   - Executes `pnpm ci:check`
   - Includes: typecheck, lint, test, build
   - **STOPS** if any check fails

5. **Commits with conventions**

   - Uses conventional commit format
   - Includes task reference
   - Adds Co-Authored-By for Claude

6. **Pushes to remote**

   - Uses `-u origin` to set upstream

7. **Creates pull request**

   - Uses `gh pr create` command
   - Applies PR template
   - Adds task reference to title

8. **Configures automerge** (conditional)

   - Adds `automerge` label for low/medium priority
   - Requires manual review for high/critical

9. **Updates task**
   - Sets `workflow_state` to `PR_CREATED`
   - Adds `pr_url` to frontmatter
   - Updates `updated_at` timestamp

### Usage

```bash
# Automatic (via orchestrator)
pnpm workflow:run E01-T001

# Manual
/commit-and-pr E01-T001
```

### Commit Message Format

```
<type>(<scope>): <subject>

[optional body with changes]

Refs: <task-id>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Example:**

```
feat(auth): implement user authentication

- Add login route handler
- Implement password verification with Argon2
- Add session creation logic
- Add unit tests for login flow

Refs: E01-T001

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### PR Title Format

```
<type>(<scope>): <subject> [<task-id>]
```

**Examples:**

- `feat(auth): implement OAuth providers [E01-T002]`
- `fix(chat): prevent message loss on reconnect [E03-T010]`

## Auto-Merge Configuration

### When Auto-Merge is Enabled

**Criteria:**

- Task priority is `low` or `medium`
- No breaking changes
- Not security-sensitive

**Process:**

1. PR created with `automerge` label
2. GitHub Actions CI runs
3. If all checks pass → auto-merges with squash
4. Task auto-transitions to `DONE`

### When Manual Review is Required

**Criteria:**

- Task priority is `high` or `critical`
- Breaking changes present
- Security-sensitive changes
- Requires domain expert review

**Process:**

1. PR created without `automerge` label
2. GitHub Actions CI runs
3. Awaits manual approval
4. Manually set task to `PR_REVIEW` state
5. After merge, manually set task to `DONE`

## CI Checks

All PRs must pass these checks before merging:

### Required Checks

1. **Type Check** (`pnpm typecheck`)

   - Zero TypeScript errors
   - Strict mode enforced

2. **Lint** (`pnpm lint`)

   - Zero linting warnings
   - Code style compliance

3. **Test** (`pnpm test`)

   - All unit tests passing
   - Integration tests passing

4. **Build** (`pnpm build`)
   - All packages build successfully
   - No build errors

### Optional Checks

5. **Coverage** (`pnpm test:coverage`)
   - Coverage report generated
   - Uploaded to Codecov
   - Does not block merge

### Security Scans

- **CodeQL** - Static analysis
- **Dependency Audit** - Vulnerability scanning
- **Secret Detection** - TruffleHog

These run automatically but don't block merges (informational).

## Error Handling

### CI Check Failures (Local)

If `pnpm ci:check` fails during `/commit-and-pr`:

1. **DO NOT** create commit or PR
2. Report specific failures to user
3. Show error output
4. Update task with error details
5. Recommend fixes
6. Task remains in `PR_READY` state

**Recovery:**

- Fix the reported issues
- Run `/commit-and-pr` again

### CI Check Failures (GitHub)

If GitHub Actions fails after PR creation:

1. Check GitHub Actions logs
2. Identify failing check
3. Manually set task to `PR_FAILED`
4. Fix the issue locally
5. Commit and push fixes
6. GitHub Actions re-runs automatically
7. If passes, manually set to `DONE` (or wait for automerge)

### Branch Already Exists

If feature branch already exists:

1. Agent asks for confirmation
2. Options:
   - Switch to existing branch
   - Create new branch name
   - Overwrite (requires explicit approval)

### PR Already Exists

If PR already exists for the branch:

1. Agent reports existing PR URL
2. Options:
   - Update existing PR
   - Skip PR creation
   - Create new branch/PR

## Task Frontmatter Updates

### PR_READY State

```yaml
workflow_state: PR_READY
status: in-progress
pr_url: ""
updated_at: 2025-01-12T10:30:00Z
```

### PR_CREATED State

```yaml
workflow_state: PR_CREATED
status: in-progress
pr_url: "https://github.com/org/repo/pull/123"
updated_at: 2025-01-12T10:35:00Z
```

### DONE State (After Merge)

```yaml
workflow_state: DONE
status: done
pr_url: "https://github.com/org/repo/pull/123"
completed_at: 2025-01-12T11:00:00Z
```

Task is then moved to `backlog/completed/{epic}/`

## Integration with Existing Workflow

### Before GitHub Integration

```
INTEGRATION_TESTING → DOCS_UPDATE → DONE
```

### After GitHub Integration

```
INTEGRATION_TESTING → DOCS_UPDATE → PR_READY → PR_CREATED → DONE
```

### Backward Compatibility

Tasks in `DOCS_UPDATE` state will automatically transition to `PR_READY` when the orchestrator runs.

## Manual Operations

### Skip GitHub Integration

If you want to skip GitHub operations:

1. After `/update-docs`, manually set `workflow_state` to `DONE`
2. Manually commit and create PR outside orchestrator
3. Update task with PR URL manually

### Force Auto-Merge

To enable automerge for high/critical tasks:

```bash
gh pr edit <PR_NUMBER> --add-label automerge
```

### Disable Auto-Merge

To disable automerge for low/medium tasks:

```bash
# Simply don't add the automerge label
# Or remove it:
gh pr edit <PR_NUMBER> --remove-label automerge
```

## Configuration

### Agent Configuration

**File:** `.claude/agents/git-agent.md`

Defines the Git agent responsible for:

- Git operations
- Commit formatting
- PR creation
- CI integration

### Command Configuration

**File:** `.claude/commands/commit-and-pr.md`

Defines the `/commit-and-pr` command flow and behavior.

### Orchestrator Configuration

**File:** `scripts/orchestrator.ts`

State machine configuration:

- `WorkflowState` type includes PR states
- `STATE_COMMANDS` maps `PR_READY` → `commit-and-pr`
- `STATE_TRANSITIONS` defines flow
- `COMMAND_AGENTS` maps `commit-and-pr` → `git-agent`

## Best Practices

### For Low/Medium Priority Tasks

✅ **DO:**

- Let automerge handle the PR
- Trust CI to validate changes
- Let orchestrator complete automatically

❌ **DON'T:**

- Manually review unless issues arise
- Override automerge without reason

### For High/Critical Priority Tasks

✅ **DO:**

- Request manual reviews
- Review PR diff before merge
- Test manually in addition to CI
- Monitor CI checks closely

❌ **DON'T:**

- Rush to merge
- Skip review process
- Disable CI checks

### For Breaking Changes

✅ **DO:**

- Require manual review
- Document breaking changes in PR
- Update migration guides
- Notify team before merge

❌ **DON'T:**

- Use automerge
- Merge without team awareness

## Troubleshooting

### "pnpm ci:check failed"

**Problem:** Local CI checks failed before commit

**Solution:**

1. Read error output
2. Fix reported issues:
   - TypeScript errors → fix types
   - Lint errors → run `pnpm lint --fix`
   - Test failures → fix failing tests
   - Build errors → fix build issues
3. Run `pnpm ci:check` again
4. Retry `/commit-and-pr`

### "GitHub Actions failed"

**Problem:** CI passed locally but failed in GitHub

**Solution:**

1. Check GitHub Actions logs
2. Common causes:
   - Environment differences
   - Missing dependencies
   - Database/Redis connection issues
   - Timing issues
3. Fix and push updates
4. CI re-runs automatically

### "Branch already exists"

**Problem:** Feature branch already exists

**Solution:**

1. Check if it's the same task
2. If yes: switch to branch and update
3. If no: create new branch name
4. Delete old branch if obsolete

### "PR already exists"

**Problem:** PR already created for this branch

**Solution:**

1. Check PR status
2. If open: update PR with new commits
3. If closed: create new branch
4. If merged: task should be DONE

## Related Documentation

- [GitHub CI/CD Setup](./../.github/SETUP.md)
- [Commit Conventions](./CONVENTIONS.md#git-conventions)
- [Comprehensive CI/CD Docs](./CI_CD.md)
- [Workflow Overview](../backlog/docs/.workflow/README.md)

## Examples

### Example 1: Automerge Flow (Low Priority)

```bash
# Task completes DOCS_UPDATE
# Orchestrator automatically runs:
/commit-and-pr E01-T001

# Output:
✓ CI checks passed locally
✓ Created branch: feature/E01-T001-add-login
✓ Committed changes
✓ Pushed to remote
✓ Created PR: https://github.com/org/repo/pull/123
✓ Added automerge label (low priority)
✓ Task updated to PR_CREATED

# GitHub Actions runs, passes
# PR auto-merges
# Task auto-transitions to DONE
```

### Example 2: Manual Review Flow (High Priority)

```bash
# Task completes DOCS_UPDATE
/commit-and-pr E02-T005

# Output:
✓ CI checks passed locally
✓ Created branch: bugfix/E02-T005-fix-session-leak
✓ Committed changes
✓ Pushed to remote
✓ Created PR: https://github.com/org/repo/pull/124
! Manual review required (high priority)
✓ Task updated to PR_CREATED

# Manually set to PR_REVIEW state
# Request reviews from team
# GitHub Actions runs, passes
# Manual approval given
# Manually merge PR
# Manually set task to DONE
```

### Example 3: CI Failure Recovery

```bash
# Task completes DOCS_UPDATE
/commit-and-pr E03-T010

# Output:
✗ CI check failed: pnpm test
  - auth.test.ts: login test failing
! Cannot create PR with failing tests

# Fix the test
# Retry:
/commit-and-pr E03-T010

# Output:
✓ CI checks passed locally
✓ Created PR: https://github.com/org/repo/pull/125
# ... continues normally
```

---

**Last Updated:** 2025-01-12
**Version:** 1.0.0
