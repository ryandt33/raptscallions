# GitHub CI/CD Setup Guide

This guide walks you through setting up GitHub Actions, branch protection, and auto-merge for the RaptScallions project.

## Prerequisites

- GitHub repository created
- Admin access to repository settings
- GitHub CLI installed (optional, for easier setup)

## 1. Repository Setup

### Enable GitHub Actions

1. Go to **Settings** → **Actions** → **General**
2. Under "Actions permissions", select **Allow all actions and reusable workflows**
3. Under "Workflow permissions", select **Read and write permissions**
4. Check **Allow GitHub Actions to create and approve pull requests**

### Enable Discussions (Optional)

1. Go to **Settings** → **General**
2. Scroll to "Features"
3. Check **Discussions**

## 2. Branch Protection Rules

### Protect Main Branch

Navigate to **Settings** → **Branches** → **Add branch protection rule**

**Branch name pattern:** `main`

Configure the following settings:

#### Required Checks

- ✅ **Require a pull request before merging**

  - Required approvals: `1` (increase for production)
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners (optional, requires CODEOWNERS file)

- ✅ **Require status checks to pass before merging**

  - ✅ Require branches to be up to date before merging
  - Required status checks:
    - `typecheck`
    - `lint`
    - `test`
    - `build`

- ✅ **Require conversation resolution before merging**

- ✅ **Require linear history** (optional, enforces clean history)

#### Additional Settings

- ✅ **Do not allow bypassing the above settings** (recommended)
- ✅ **Restrict who can push to matching branches** (optional, for strict control)
- ❌ Allow force pushes (keep disabled)
- ❌ Allow deletions (keep disabled)

**Save the rule.**

### Protect Develop Branch (Optional)

If using a `develop` branch for integration:

**Branch name pattern:** `develop`

Use same settings as `main` but optionally:

- Reduce required approvals to `0` or `1`
- Allow admins to bypass

## 3. Auto-Merge Configuration

### Method 1: Using GitHub's Built-in Auto-Merge

**Per PR:**

```bash
# Enable auto-merge on a PR (using gh CLI)
gh pr merge --auto --squash <PR_NUMBER>

# Or via web UI:
# 1. Open PR
# 2. Click "Enable auto-merge" button
# 3. Select merge method (squash recommended)
```

**Requirements:**

- All required checks must pass
- Required reviews must be approved
- No blocking conversations

### Method 2: Using Auto-Merge Workflow

The included `.github/workflows/auto-merge.yml` workflow automatically merges PRs labeled with `automerge`.

**Usage:**

```bash
# Add label to PR
gh pr edit <PR_NUMBER> --add-label automerge

# Or via web UI:
# Add "automerge" label to PR
```

**How it works:**

1. PR must have `automerge` label
2. PR must not be in draft mode
3. All required checks must pass (typecheck, lint, test, build)
4. Automatically merges using squash method
5. Posts comment when merging or if checks fail

### Method 3: Dependabot Auto-Merge

For automated dependency updates:

1. Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "automerge"
```

2. Enable Dependabot in **Settings** → **Security** → **Dependabot**

## 4. Required Secrets

### For CI/CD

No secrets required for basic CI. Optional secrets:

- `CODECOV_TOKEN` — For code coverage reporting (if using Codecov)

### For Auto-Merge Workflow

The workflow uses `GITHUB_TOKEN` which is automatically provided.

### For Deployment (Future)

When deploying, you may need:

- `DOCKER_USERNAME` / `DOCKER_PASSWORD` — Docker Hub credentials
- `HEROKU_API_KEY` — Heroku deployment
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — AWS deployment

## 5. Status Badges

Add to your `README.md`:

```markdown
[![CI](https://github.com/YOUR_ORG/raptscallions/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_ORG/raptscallions/actions/workflows/ci.yml)
[![Security](https://github.com/YOUR_ORG/raptscallions/actions/workflows/security.yml/badge.svg)](https://github.com/YOUR_ORG/raptscallions/actions/workflows/security.yml)
[![codecov](https://codecov.io/gh/YOUR_ORG/raptscallions/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_ORG/raptscallions)
```

Replace `YOUR_ORG` with your GitHub organization/username.

## 6. CODEOWNERS (Optional)

Create `.github/CODEOWNERS` to automatically request reviews:

```
# Global owners
* @your-username

# Backend code
/apps/api/ @backend-team
/packages/db/ @backend-team

# Frontend code
/apps/web/ @frontend-team

# Infrastructure
/.github/ @devops-team
/docker-compose.yml @devops-team
/Dockerfile @devops-team

# Documentation
/docs/ @tech-writers
*.md @tech-writers
```

## 7. Workflow Customization

### Adjust Required Checks

Edit `.github/workflows/ci.yml` to add/remove jobs:

```yaml
jobs:
  typecheck:
    # ...
  lint:
    # ...
  test:
    # ...
  build:
    # ...
  # Add custom jobs here
```

Update branch protection rules to include new job names.

### Adjust Test Environment

Modify services in `ci.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    # ... customize postgres config
  redis:
    image: redis:7-alpine
    # ... customize redis config
```

### Matrix Testing (Multiple Node Versions)

Add to any job in `ci.yml`:

```yaml
strategy:
  matrix:
    node-version: [18, 20, 21]

steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
```

## 8. Recommended Labels

Create these labels in **Issues** → **Labels**:

- `bug` (red) — Bug reports
- `feature` (green) — Feature requests
- `enhancement` (blue) — Enhancements to existing features
- `documentation` (purple) — Documentation changes
- `dependencies` (gray) — Dependency updates
- `automerge` (yellow) — Auto-merge enabled
- `breaking` (orange) — Breaking changes
- `security` (red) — Security-related
- `help wanted` (green) — Community contributions welcome
- `good first issue` (green) — Good for newcomers

## 9. Testing the Setup

### Test CI Workflow

1. Create a feature branch:

   ```bash
   git checkout -b feature/test-ci
   ```

2. Make a small change and commit:

   ```bash
   echo "# Test" >> test.md
   git add test.md
   git commit -m "test(ci): verify CI workflow"
   ```

3. Push and create PR:

   ```bash
   git push -u origin feature/test-ci
   gh pr create --title "test(ci): verify CI workflow" --body "Testing CI setup"
   ```

4. Verify all checks run and pass

5. Merge and delete branch

### Test Auto-Merge

1. Create another test PR
2. Add `automerge` label (if using workflow method)
3. Verify it merges automatically when checks pass

## 10. Troubleshooting

### CI Fails with "pnpm: command not found"

- Ensure `pnpm/action-setup@v3` is included in workflow
- Check pnpm version matches `package.json` `packageManager` field

### Auto-Merge Not Working

- Check PR is not in draft mode
- Verify `automerge` label is applied
- Ensure all required checks are passing
- Check workflow permissions in repository settings

### Tests Fail in CI But Pass Locally

- Check environment variables in workflow
- Verify PostgreSQL/Redis services are healthy
- Ensure `--frozen-lockfile` doesn't cause version mismatches

### Branch Protection Not Enforced

- Verify you're testing with a non-admin account
- Check "Do not allow bypassing" is enabled
- Ensure status check names match exactly

## 11. Next Steps

1. ✅ Review and customize workflow files
2. ✅ Set up branch protection rules
3. ✅ Configure auto-merge method
4. ✅ Add status badges to README
5. ✅ Create CODEOWNERS file (optional)
6. ✅ Set up Codecov (optional)
7. ✅ Test with real PR
8. ✅ Document team workflow in CONTRIBUTING.md

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Auto-Merge PRs](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)
- [Dependabot](https://docs.github.com/en/code-security/dependabot)
- [CodeQL](https://codeql.github.com/docs/)
