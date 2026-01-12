# GitHub & CI/CD Rules

When working with Git, GitHub, and CI/CD workflows:

## Branch Naming

```
feature/E01-T001-user-authentication
bugfix/E02-T005-session-timeout
chore/update-dependencies
hotfix/critical-security-patch
```

**Format:** `{type}/{epic-task-description}` or `{type}/{description}`

## Commit Messages

Follow Conventional Commits with task references:

```
feat(auth): implement login with email/password

- Add login route handler
- Implement password verification with Argon2
- Add session creation

Refs: E01-T002
```

**Format:**
```
<type>(<scope>): <subject>

[optional body with bullet points]

[Refs|Fixes]: <task-id>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `refactor` — Code change that neither fixes a bug nor adds a feature
- `test` — Adding or updating tests
- `docs` — Documentation only
- `chore` — Maintenance (deps, config, etc.)
- `perf` — Performance improvement
- `ci` — CI/CD changes

**Scopes:** `auth`, `chat`, `api`, `db`, `ui`, `module`, `test`, `workflow`

## Pull Requests

### PR Title Format
```
feat(auth): implement OAuth providers [E01-T002]
```

### PR Description Template
```markdown
## Summary
Brief description of changes (1-2 sentences)

## Task Reference
- Epic: E01 - Foundation Infrastructure
- Task: E01-T002 - Implement OAuth providers

## Changes Made
- Added Google OAuth provider
- Added Microsoft OAuth provider
- Added Clever OAuth provider
- Updated auth routes to handle OAuth flow

## Testing
- [ ] Unit tests pass (`pnpm test`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Manual testing completed
- [ ] Integration tests pass (if applicable)

## Breaking Changes
None / [describe if any]

## Deployment Notes
Requires new environment variables:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
[etc.]
```

## CI/CD Requirements

### Pre-Merge Checks (MUST PASS)
1. **Type checking** — `pnpm typecheck` (zero errors)
2. **Linting** — `pnpm lint` (zero warnings)
3. **Unit tests** — `pnpm test` (all passing)
4. **Build** — `pnpm build` (successful)

### Optional Checks
5. **Coverage** — `pnpm test:coverage` (80%+ recommended)
6. **Integration tests** — If applicable

### Auto-Merge Rules
Pull requests can be auto-merged when:
1. All required checks pass
2. PR has approving review from maintainer (if required)
3. Branch is up to date with base branch
4. No unresolved review comments
5. PR is labeled with `automerge` (optional, based on settings)

## Branch Protection

**Main/master branch should have:**
- Require pull request reviews (1 approver minimum)
- Require status checks to pass:
  - `typecheck`
  - `lint`
  - `test`
  - `build`
- Require branches to be up to date before merging
- Require linear history (optional)
- Do not allow force pushes
- Do not allow deletions

**Feature branches:**
- No protection needed
- Delete after merge

## Workflow Commands

### Creating a Feature Branch
```bash
# From main branch
git checkout -b feature/E01-T001-description

# Make changes, commit
git add .
git commit -m "feat(scope): description

Refs: E01-T001"

# Push with upstream tracking
git push -u origin feature/E01-T001-description

# Create PR
gh pr create --title "feat(scope): description [E01-T001]" --body "..."
```

### Keeping Branch Updated
```bash
# Rebase on main (preferred for clean history)
git fetch origin
git rebase origin/main

# Or merge (if rebase conflicts are complex)
git merge origin/main
```

### Preparing for Auto-Merge
```bash
# Ensure all checks pass locally first
pnpm typecheck
pnpm lint
pnpm test
pnpm build

# Push changes
git push

# Enable auto-merge on PR
gh pr merge --auto --squash  # or --merge, --rebase
```

## GitHub Actions Best Practices

1. **Cache dependencies** — Cache `node_modules` and pnpm store
2. **Matrix testing** — Test on multiple Node versions if needed
3. **Fail fast** — Stop on first error to save CI time
4. **Artifact uploads** — Save coverage reports, build artifacts
5. **Status badges** — Add to README for visibility
6. **Scheduled runs** — Weekly dependency checks
7. **Security scanning** — CodeQL, npm audit

## Common CI Commands

```yaml
# Install dependencies (pnpm)
pnpm install --frozen-lockfile

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Testing
pnpm test                    # Run all tests
pnpm test:coverage          # With coverage report

# Building
pnpm build

# Docker
docker compose up -d         # Start services
docker compose down          # Stop services
```

## Semantic Versioning

This project follows [Semantic Versioning](https://semver.org/):

- `MAJOR.MINOR.PATCH` (e.g., `1.2.3`)
- `MAJOR` — Breaking changes
- `MINOR` — New features (backward compatible)
- `PATCH` — Bug fixes (backward compatible)

During pre-1.0 development: `0.MINOR.PATCH`
- Breaking changes can happen in MINOR versions
- Current: `0.1.0` (Foundation phase)

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create release commit: `chore: release v0.2.0`
4. Create git tag: `git tag v0.2.0`
5. Push: `git push && git push --tags`
6. GitHub Actions will build and deploy automatically

## Troubleshooting CI Failures

### TypeScript Errors
```bash
pnpm typecheck          # See all errors
pnpm typecheck --watch  # Watch mode for fixing
```

### Lint Errors
```bash
pnpm lint              # See all errors
pnpm lint --fix        # Auto-fix where possible
```

### Test Failures
```bash
pnpm test              # Run all tests
pnpm test:ui           # Visual test runner
pnpm test --reporter=verbose  # Detailed output
```

### Build Failures
```bash
pnpm build             # See build errors
pnpm clean && pnpm install  # Clean rebuild
```
