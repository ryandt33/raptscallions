# GitHub CI/CD Quick Start

Get up and running with GitHub Actions and auto-merge in 5 minutes.

## 1. Push Code to GitHub (If Not Already)

```bash
# Create new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/raptscallions.git
git branch -M main
git push -u origin main
```

## 2. Enable GitHub Actions

1. Go to your repository on GitHub
2. Click **Actions** tab
3. GitHub will detect the workflows automatically
4. Click **I understand my workflows, go ahead and enable them**

That's it! Your CI workflows are now active.

## 3. Set Up Branch Protection (Essential)

```bash
# Use GitHub CLI (fastest)
gh repo set-default YOUR_USERNAME/raptscallions

gh api repos/{owner}/{repo}/branches/main/protection -X PUT \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["typecheck", "lint", "test", "build", "All Checks Passed"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true,
  "required_conversation_resolution": true
}
EOF
```

**Or via Web UI:**

1. Go to **Settings** → **Branches**
2. Click **Add branch protection rule**
3. Branch name: `main`
4. Check these boxes:
   - ✅ Require a pull request before merging (1 approval)
   - ✅ Require status checks to pass (`typecheck`, `lint`, `test`, `build`, `All Checks Passed`)
   - ✅ Require branches to be up to date
   - ✅ Require conversation resolution
   - ✅ Require linear history
5. Save

## 4. Set Up Auto-Merge (Optional but Recommended)

### Enable Workflow Permissions

1. Go to **Settings** → **Actions** → **General**
2. Under "Workflow permissions", select:
   - ✅ **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**
3. Save

### Using Built-in Auto-Merge

```bash
# When creating a PR
gh pr create --title "feat(auth): add login" --body "..."

# Enable auto-merge on the PR
gh pr merge --auto --squash <PR_NUMBER>
```

### Using Auto-Merge Label

The workflow `.github/workflows/auto-merge.yml` will automatically merge PRs with the `automerge` label:

```bash
# Add label to PR
gh pr edit <PR_NUMBER> --add-label automerge
```

**Create the label first:**
```bash
gh label create automerge --description "Automatically merge when checks pass" --color "FBCA04"
```

## 5. Test the Setup

### Test CI

```bash
# Create a test branch
git checkout -b test/ci-setup

# Make a trivial change
echo "# CI Test" >> TEST.md
git add TEST.md

# Use the commit helper (or commit manually)
pnpm commit
# OR
git commit -m "test(ci): verify GitHub Actions setup"

# Push and create PR
git push -u origin test/ci-setup
gh pr create --title "test(ci): verify GitHub Actions" --body "Testing CI setup"
```

Watch the Actions tab to see your workflows run!

### Test Auto-Merge

```bash
# On the test PR
gh pr edit <PR_NUMBER> --add-label automerge

# Wait for checks to pass
# PR will automatically merge
```

### Clean Up

```bash
git checkout main
git pull
git branch -d test/ci-setup
```

## 6. Install Pre-Commit Hook (Developer Setup)

Each developer should run:

```bash
# Installs automatically on first pnpm install
pnpm install

# Or manually
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

This runs checks before each commit to catch issues early.

## 7. Daily Workflow

### Create Feature

```bash
git checkout main
git pull
git checkout -b feature/E01-T001-add-auth

# Make changes, then commit
pnpm commit  # Interactive helper
# OR
git commit -m "feat(auth): implement OAuth providers

Refs: E01-T001"

# Push and create PR
git push -u origin feature/E01-T001-add-auth
gh pr create --title "feat(auth): implement OAuth [E01-T001]"
```

### Review and Merge

```bash
# Request reviews
gh pr edit <PR_NUMBER> --add-reviewer @teammate

# Enable auto-merge (optional)
gh pr merge --auto --squash <PR_NUMBER>
# OR
gh pr edit <PR_NUMBER> --add-label automerge

# Once approved and checks pass, it merges automatically
```

### Stay Updated

```bash
git checkout main
git pull
```

## Quick Reference Commands

### CI Check Locally

```bash
# Run all CI checks locally (before pushing)
pnpm ci:check

# Or individually
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

### PR Management

```bash
# Create PR
gh pr create --title "feat: description" --body "..."

# View PR status
gh pr view <PR_NUMBER>

# Check CI status
gh pr checks <PR_NUMBER>

# Merge PR
gh pr merge --squash <PR_NUMBER>

# Enable auto-merge
gh pr merge --auto --squash <PR_NUMBER>

# Add label for auto-merge workflow
gh pr edit <PR_NUMBER> --add-label automerge
```

### Workflow Management

```bash
# List workflows
gh workflow list

# View workflow runs
gh run list --workflow=ci.yml

# View specific run
gh run view <RUN_ID>

# Re-run failed jobs
gh run rerun <RUN_ID> --failed

# Watch run in terminal
gh run watch <RUN_ID>
```

## Helpful Aliases

Add to your `~/.gitconfig` or `~/.zshrc`:

```bash
# Git aliases
alias gc="pnpm commit"
alias gpr="gh pr create"
alias gpm="gh pr merge --auto --squash"
alias gps="gh pr checks"

# CI check
alias ci="pnpm ci:check"
```

## Troubleshooting

### "Checks are not passing"

Run locally to debug:
```bash
pnpm typecheck  # Fix TypeScript errors
pnpm lint       # Fix linting errors
pnpm test       # Fix failing tests
```

### "Required reviews not met"

```bash
# Request reviews
gh pr edit <PR_NUMBER> --add-reviewer @username
```

### "Branch protection rules not working"

- Make sure you're not an admin (or turn off "Allow admins to bypass")
- Check rule is active for `main` branch
- Verify status check names match workflow job names

### "Auto-merge not working"

- Check PR is not in draft mode: `gh pr ready <PR_NUMBER>`
- Verify all checks passed: `gh pr checks <PR_NUMBER>`
- Check `automerge` label is applied (if using label method)
- Verify workflow permissions (Settings → Actions → General)

## Next Steps

- Read [.github/SETUP.md](.github/SETUP.md) for detailed configuration
- Read [docs/CI_CD.md](docs/CI_CD.md) for comprehensive documentation
- Set up CODEOWNERS in [.github/CODEOWNERS](.github/CODEOWNERS)
- Configure Codecov for coverage reporting
- Set up deployment workflows (when ready)

## Support

- 📖 [Full Setup Guide](.github/SETUP.md)
- 📚 [CI/CD Documentation](../docs/CI_CD.md)
- 🔧 [Troubleshooting](../docs/CI_CD.md#troubleshooting)
- 💬 [GitHub Discussions](https://github.com/YOUR_USERNAME/raptscallions/discussions)
