# CI/CD Documentation

Comprehensive guide to Continuous Integration and Continuous Deployment for RaptScallions.

## Table of Contents

- [Overview](#overview)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Branch Strategy](#branch-strategy)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Auto-Merge](#auto-merge)
- [Security](#security)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Overview

RaptScallions uses GitHub Actions for CI/CD with the following goals:

- **Zero tolerance for errors** — TypeScript, linting, and tests must pass
- **Fast feedback** — Parallel jobs, caching, fail-fast
- **Automated merging** — Reduce manual overhead for approved PRs
- **Security first** — Automated dependency scanning, secret detection
- **Production ready** — All code in `main` is deployable

## GitHub Actions Workflows

### CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**

- Push to `main` or `develop`
- Pull requests to `main` or `develop`
- Manual dispatch

**Jobs:**

#### 1. Type Check

- Runs `pnpm typecheck`
- Must pass with zero errors
- Cached pnpm store for speed

#### 2. Lint

- Runs `pnpm lint`
- Must pass with zero warnings
- Enforces code style consistency

#### 3. Test

- Runs `pnpm test`
- Uses PostgreSQL 16 and Redis 7 services
- Uploads test results as artifacts

#### 4. Test Coverage

- Runs `pnpm test:coverage`
- Uploads coverage to Codecov
- Does not block merge (informational)

#### 5. Build

- Runs `pnpm build`
- Verifies all packages build successfully
- Uploads build artifacts

#### 6. All Checks Passed

- Summary job that depends on all others
- Used as required status check for merging

**Optimizations:**

- Parallel job execution
- pnpm store caching
- 10-15 minute timeouts
- Concurrency groups (cancel in-progress runs)

### Security Workflow (`.github/workflows/security.yml`)

**Triggers:**

- Push to `main` or `develop`
- Pull requests
- Weekly schedule (Mondays 9am UTC)
- Manual dispatch

**Jobs:**

#### 1. CodeQL Analysis

- Static code analysis for security issues
- Scans JavaScript/TypeScript code
- Creates security alerts in GitHub

#### 2. Dependency Audit

- Runs `pnpm audit`
- Checks for known vulnerabilities in dependencies
- Creates artifact report

#### 3. Secret Scanning

- Uses TruffleHog to detect exposed secrets
- Scans commit history
- Blocks commits with verified secrets

### Dependency Update Workflow (`.github/workflows/dependency-update.yml`)

**Triggers:**

- Weekly schedule (Mondays 10am UTC)
- Manual dispatch

**Process:**

1. Updates all dependencies to latest compatible versions
2. Runs tests to verify compatibility
3. Creates PR with changes
4. Adds `automerge` label for automatic merging

### Auto-Merge Workflow (`.github/workflows/auto-merge.yml`)

**Triggers:**

- PR labeled/unlabeled
- PR ready for review
- PR review submitted
- Check suite completed

**Process:**

1. Verifies PR has `automerge` label
2. Checks all required status checks passed
3. Automatically merges using squash method
4. Posts status comment

**Requirements:**

- PR not in draft mode
- `automerge` label applied
- All required checks passing (typecheck, lint, test, build)

## Branch Strategy

### Main Branch (`main`)

- **Protected** — No direct commits
- **Production ready** — All code is deployable
- **Requires PR** — With 1+ approvals
- **Requires checks** — All CI jobs must pass
- **Linear history** — Squash or rebase merges only

### Development Branch (`develop`) - Optional

- **Integration branch** — For staging features
- **Less strict** — Fewer approval requirements
- **Merges to main** — When stable

### Feature Branches

**Naming:** `feature/E01-T001-description`

- Created from `main` (or `develop`)
- Short-lived (< 1 week ideal)
- Deleted after merge
- Rebased to stay current

### Bugfix Branches

**Naming:** `bugfix/E02-T005-description`

- Created from `main`
- Critical fixes can skip `develop`

### Hotfix Branches

**Naming:** `hotfix/critical-security-patch`

- For production emergencies
- Fast-tracked review and merge

### Chore Branches

**Naming:** `chore/update-dependencies`

- Maintenance tasks
- Dependency updates
- Configuration changes

## Commit Conventions

### Format

```
<type>(<scope>): <subject>

[optional body]

[Refs|Fixes]: <task-id>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Types

| Type       | Description                             | Semantic Version |
| ---------- | --------------------------------------- | ---------------- |
| `feat`     | New feature                             | Minor            |
| `fix`      | Bug fix                                 | Patch            |
| `refactor` | Code change (no bug fix or feature)     | Patch            |
| `perf`     | Performance improvement                 | Patch            |
| `test`     | Add/update tests                        | -                |
| `docs`     | Documentation only                      | -                |
| `chore`    | Maintenance (deps, config)              | -                |
| `ci`       | CI/CD changes                           | -                |
| `breaking` | Breaking change (append `!` after type) | Major            |

### Scopes

Common scopes: `auth`, `chat`, `api`, `db`, `ui`, `module`, `test`, `workflow`

### Examples

**Feature:**

```
feat(auth): implement OAuth providers

- Add Google OAuth provider
- Add Microsoft OAuth provider
- Add Clever OAuth provider

Refs: E01-T002
```

**Fix:**

```
fix(chat): prevent message loss on reconnect

The WebSocket reconnection was not replaying missed messages.
Added message queue with acknowledgment.

Fixes: E03-T010
```

**Breaking Change:**

```
feat(api)!: change user authentication response format

BREAKING CHANGE: The /auth/login endpoint now returns
{ user, token } instead of { data: { user, token } }

Refs: E02-T015
```

### Helper Script

Use the commit message helper:

```bash
./scripts/commit-msg-helper.sh
```

Interactive prompts guide you through creating properly formatted commits.

## Pull Request Process

### 1. Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/E01-T001-user-authentication
```

### 2. Make Changes

- Write tests first (TDD)
- Implement changes
- Run checks locally:
  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test
  pnpm build
  ```

### 3. Commit Changes

```bash
git add .
git commit -m "feat(auth): implement user authentication

Refs: E01-T001"
```

Or use the helper:

```bash
./scripts/commit-msg-helper.sh
```

### 4. Push and Create PR

```bash
git push -u origin feature/E01-T001-user-authentication
gh pr create --title "feat(auth): implement user authentication [E01-T001]" \
  --body "$(cat .github/pull_request_template.md)"
```

### 5. Address Review Comments

```bash
# Make changes
git add .
git commit -m "fix(auth): address review comments"
git push
```

### 6. Merge

Once approved and all checks pass:

**Manual:**

- Click "Merge" button in GitHub UI
- Select "Squash and merge"

**Auto-merge:**

```bash
gh pr merge --auto --squash
```

**With label:**

```bash
gh pr edit <PR_NUMBER> --add-label automerge
```

### 7. Clean Up

```bash
git checkout main
git pull origin main
git branch -d feature/E01-T001-user-authentication
```

## Auto-Merge

### Method 1: GitHub Built-in

**Enable on PR:**

```bash
gh pr merge --auto --squash <PR_NUMBER>
```

**Requirements:**

- All required checks pass
- Required reviews approved
- No blocking conversations

### Method 2: Workflow Label

**Add `automerge` label:**

```bash
gh pr edit <PR_NUMBER> --add-label automerge
```

**Workflow automatically:**

1. Monitors PR status
2. Waits for all checks to pass
3. Merges when ready
4. Posts status comment

### Method 3: Dependabot

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
      - "automerge"
```

Dependency PRs automatically merge when tests pass.

## Security

### Secret Management

**Never commit:**

- `.env` files
- API keys
- Passwords
- Private keys
- OAuth secrets

**Use GitHub Secrets:**

```yaml
env:
  API_KEY: ${{ secrets.API_KEY }}
```

**Add secrets:**

```bash
gh secret set API_KEY < api-key.txt
```

### Dependency Auditing

**Manual check:**

```bash
pnpm audit
pnpm audit --fix  # Auto-fix where possible
```

**CI automatically runs:**

- `pnpm audit` on every PR
- Weekly scheduled scan
- Uploads report as artifact

### CodeQL Scanning

- Runs on every push/PR
- Weekly scheduled scan
- Creates security alerts
- Scans for:
  - SQL injection
  - XSS vulnerabilities
  - Command injection
  - Path traversal
  - And more...

### Secret Scanning

**TruffleHog OSS:**

- Scans commit history
- Detects exposed secrets
- Blocks verified secrets
- Runs on every push

**If secret detected:**

1. Revoke compromised secret immediately
2. Remove from git history (careful!)
3. Update in secret management
4. Audit usage

## Deployment

### Current: Manual

**To staging:**

```bash
git checkout develop
git pull
# Deploy to staging environment
```

**To production:**

```bash
git checkout main
git pull
# Deploy to production environment
```

### Future: Automated

**Deployment workflow** (to be added):

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Build Docker images
      # Push to registry
      # Deploy to Kubernetes/Heroku/etc.
```

### Deployment Targets

**Planned:**

- Docker Compose (development)
- Heroku (simple deployment)
- Kubernetes (production scale)
- AWS ECS (alternative)

## Troubleshooting

### CI Jobs Failing

#### "pnpm: command not found"

**Cause:** pnpm not installed or wrong version

**Fix:**

```yaml
- uses: pnpm/action-setup@v3
  with:
    version: 9 # Must match package.json
```

#### "Type errors in CI but not locally"

**Cause:** Local cache or different dependencies

**Fix:**

```bash
pnpm clean
rm -rf node_modules
pnpm install
pnpm typecheck
```

#### "Tests pass locally but fail in CI"

**Cause:** Environment differences

**Check:**

- Environment variables
- Database/Redis connection
- Time zones
- File paths

**Fix:**

```yaml
env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
  REDIS_URL: redis://localhost:6379
  NODE_ENV: test
  TZ: UTC
```

#### "Build artifacts missing"

**Cause:** Build step failed or path incorrect

**Fix:**

```yaml
- name: Upload artifacts
  uses: actions/upload-artifact@v4
  with:
    name: build
    path: |
      apps/*/dist
      packages/*/dist
```

### Auto-Merge Not Working

#### "Auto-merge button disabled"

**Causes:**

- Draft PR
- Checks not passing
- Merge conflicts
- Branch not up to date

**Fix:**

1. Mark PR as ready
2. Resolve conflicts
3. Update branch
4. Wait for checks

#### "Workflow not triggering"

**Check:**

1. Label spelled correctly (`automerge`)
2. Workflow permissions in Settings → Actions
3. Workflow file syntax

**Fix:**

```bash
# Check workflow syntax
gh workflow view auto-merge

# Check workflow runs
gh run list --workflow=auto-merge.yml
```

### Security Issues

#### "pnpm audit found vulnerabilities"

**Check severity:**

```bash
pnpm audit
```

**Fix:**

```bash
# Auto-fix where possible
pnpm audit --fix

# Update specific package
pnpm update <package-name>

# Override (last resort)
# Add to package.json:
"pnpm": {
  "overrides": {
    "vulnerable-package": "^safe-version"
  }
}
```

#### "CodeQL alert"

**Process:**

1. Review alert in Security tab
2. Assess severity and exploitability
3. Fix in code or mark as false positive
4. PR with fix triggers re-scan

#### "Secret detected"

**Immediate action:**

1. Revoke secret (API keys, tokens, etc.)
2. Generate new secret
3. Update in GitHub Secrets
4. Consider rewriting git history (advanced)

## Best Practices

### Local Development

**Before committing:**

```bash
pnpm typecheck  # Zero errors
pnpm lint       # Zero warnings
pnpm test       # All passing
```

**Install pre-commit hook:**

```bash
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### Pull Requests

**Keep PRs small:**

- < 400 lines changed (ideal)
- One feature/fix per PR
- Easy to review and test

**Write clear descriptions:**

- What changed
- Why it changed
- How to test
- Breaking changes
- Deployment notes

**Request reviews:**

- Tag relevant experts
- Respond to comments promptly
- Don't merge without approval

### Merging

**Squash merge (default):**

- Clean commit history
- One commit per PR
- Descriptive commit message

**Rebase merge (alternative):**

- Keep all commits
- Linear history
- Good for well-structured commits

**Merge commit (avoid):**

- Creates merge commits
- Cluttered history
- Use only when necessary

### Maintenance

**Weekly:**

- Review dependency update PRs
- Check security alerts
- Update documentation

**Monthly:**

- Review workflow efficiency
- Update CI cache strategies
- Audit secret usage

**Quarterly:**

- Review branch protection rules
- Update Node.js version
- Audit dependencies

## Additional Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [CodeQL Queries](https://codeql.github.com/docs/)
- [TruffleHog](https://github.com/trufflesecurity/trufflehog)
