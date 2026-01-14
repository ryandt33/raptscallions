# .github Directory

GitHub configuration and CI/CD automation for RaptScallions.

## 📁 Directory Structure

```
.github/
├── workflows/              # GitHub Actions workflows
│   ├── ci.yml             # Main CI pipeline (typecheck, lint, test, build)
│   ├── security.yml       # Security scanning (CodeQL, audit, secrets)
│   ├── dependency-update.yml  # Weekly dependency updates
│   └── auto-merge.yml     # Auto-merge PRs with label
│
├── ISSUE_TEMPLATE/        # Issue templates
│   ├── bug_report.md      # Bug report template
│   ├── feature_request.md # Feature request template
│   ├── task.md            # Task tracking template
│   └── config.yml         # Template configuration
│
├── hooks/                 # Git hooks (local development)
│   └── pre-commit         # Pre-commit validation hook
│
├── CODEOWNERS             # Auto-assign reviewers by path
├── pull_request_template.md  # PR description template
│
├── QUICKSTART.md          # ⚡ Start here - 5 min setup
├── SETUP.md               # 📖 Detailed setup guide
├── SETUP_SUMMARY.md       # 📋 Complete overview
└── README.md              # 📍 This file
```

## 🚀 Quick Start

**New to this project?** Start here:

1. **[QUICKSTART.md](QUICKSTART.md)** — Get running in 5 minutes
2. **[SETUP_SUMMARY.md](SETUP_SUMMARY.md)** — See what's configured
3. **[SETUP.md](SETUP.md)** — Detailed configuration guide
4. **[../docs/CI_CD.md](../docs/CI_CD.md)** — Full documentation

## 🔄 GitHub Actions Workflows

### CI Pipeline (`ci.yml`)

**Runs on:** Push, PR, Manual

**Jobs:**

- ✅ **Type Check** — `pnpm typecheck` (zero errors)
- ✅ **Lint** — `pnpm lint` (zero warnings)
- ✅ **Test** — `pnpm test` (with PostgreSQL + Redis)
- ✅ **Test Coverage** — `pnpm test:coverage` (→ Codecov)
- ✅ **Build** — `pnpm build` (all packages)

**Time:** ~10-15 minutes
**Caching:** pnpm store
**Status:** Required for merge

### Security Scanning (`security.yml`)

**Runs on:** Push, PR, Weekly (Mondays)

**Jobs:**

- 🔒 **CodeQL** — Static analysis (JS/TS)
- 🔒 **Dependency Audit** — `pnpm audit`
- 🔒 **Secret Scanning** — TruffleHog OSS

**Time:** ~15-20 minutes
**Status:** Informational (doesn't block merge)

### Dependency Updates (`dependency-update.yml`)

**Runs on:** Weekly (Mondays), Manual

**Process:**

1. Updates all dependencies
2. Runs tests
3. Creates PR with `automerge` label
4. Auto-merges if tests pass

### Auto-Merge (`auto-merge.yml`)

**Runs on:** PR events, Check completion

**Process:**

1. Checks for `automerge` label
2. Waits for required checks to pass
3. Automatically merges with squash method
4. Posts status comment

## 📝 Templates

### Pull Request Template

[pull_request_template.md](pull_request_template.md)

Includes:

- Summary section
- Task reference (Epic/Task)
- Changes made
- Testing checklist
- Breaking changes
- Deployment notes

**Automatically populated when creating PR via GitHub UI.**

### Issue Templates

**Bug Report** ([bug_report.md](ISSUE_TEMPLATE/bug_report.md))

- Description
- Reproduction steps
- Expected vs actual behavior
- Environment details

**Feature Request** ([feature_request.md](ISSUE_TEMPLATE/feature_request.md))

- Feature description
- Problem statement
- Proposed solution
- Acceptance criteria

**Task** ([task.md](ISSUE_TEMPLATE/task.md))

- Task reference (Epic/Task ID)
- Description
- Acceptance criteria
- Dependencies

## 👥 CODEOWNERS

[CODEOWNERS](CODEOWNERS) automatically requests reviews based on file paths.

**Example:**

```
# Backend
/apps/api/ @backend-team

# Frontend
/apps/web/ @frontend-team

# Infrastructure
/.github/ @devops-team
```

**Update this file with your team structure!**

## 🪝 Git Hooks

### Pre-Commit Hook

[hooks/pre-commit](hooks/pre-commit)

**Runs before each commit:**

```bash
pnpm typecheck  # TypeScript errors
pnpm lint       # Code style
pnpm test       # Unit tests
```

**Install:**

```bash
# Automatic on pnpm install
pnpm install

# Or manual
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Bypass (not recommended):**

```bash
git commit --no-verify
```

## 🔐 Required Status Checks

For branch protection on `main`:

- ✅ `typecheck` — TypeScript must pass
- ✅ `lint` — Linting must pass
- ✅ `test` — Tests must pass
- ✅ `build` — Build must succeed
- ✅ `All Checks Passed` — Summary job

**Configure in:** Settings → Branches → Branch protection rules

## 🏷️ Recommended Labels

Create these labels for better organization:

```bash
gh label create automerge --color "FBCA04" --description "Auto-merge when checks pass"
gh label create bug --color "d73a4a" --description "Something isn't working"
gh label create feature --color "00ff00" --description "New feature"
gh label create enhancement --color "a2eeef" --description "Enhancement to existing feature"
gh label create documentation --color "0075ca" --description "Documentation changes"
gh label create dependencies --color "0366d6" --description "Dependency updates"
gh label create breaking --color "ff6347" --description "Breaking changes"
gh label create security --color "ff0000" --description "Security-related"
```

## 📊 Status Badges

Add to your `README.md`:

```markdown
[![CI](https://github.com/YOUR_ORG/raptscallions/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_ORG/raptscallions/actions/workflows/ci.yml)
[![Security](https://github.com/YOUR_ORG/raptscallions/actions/workflows/security.yml/badge.svg)](https://github.com/YOUR_ORG/raptscallions/actions/workflows/security.yml)
[![codecov](https://codecov.io/gh/YOUR_ORG/raptscallions/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_ORG/raptscallions)
```

## 🛠️ Customization

### Add Custom Workflow

1. Create `.github/workflows/my-workflow.yml`
2. Define triggers and jobs
3. Update branch protection if required check

### Modify CI Jobs

Edit [`workflows/ci.yml`](workflows/ci.yml):

```yaml
jobs:
  my-custom-job:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Custom job"
```

### Change Auto-Merge Method

**Option A:** Use built-in auto-merge (simplest)

**Option B:** Keep label-based workflow (more control)

**Option C:** Custom workflow logic

See [SETUP.md](SETUP.md) for details.

## 📚 Documentation

| Document                                     | Purpose                |
| -------------------------------------------- | ---------------------- |
| [QUICKSTART.md](QUICKSTART.md)               | 5-minute setup guide   |
| [SETUP.md](SETUP.md)                         | Detailed configuration |
| [SETUP_SUMMARY.md](SETUP_SUMMARY.md)         | Complete overview      |
| [../docs/CI_CD.md](../docs/CI_CD.md)         | Comprehensive docs     |
| [../scripts/README.md](../scripts/README.md) | Helper scripts         |

## 🤝 Contributing

When contributing to workflows or CI/CD:

1. Test changes in a fork first
2. Document new workflows/jobs
3. Update this README
4. Update relevant docs in `/docs`
5. Follow conventional commits

## 🆘 Troubleshooting

### Workflow Not Running

```bash
# Check workflow file syntax
gh workflow view ci

# View recent runs
gh run list --workflow=ci.yml

# Check workflow logs
gh run view <RUN_ID> --log
```

### Status Check Not Required

1. Go to Settings → Branches
2. Edit branch protection rule for `main`
3. Add check name to required status checks
4. Check name must match exactly (case-sensitive)

### Auto-Merge Not Working

**Common issues:**

- PR is in draft mode (`gh pr ready <PR>`)
- Missing `automerge` label
- Checks haven't passed yet
- Merge conflicts present
- Workflow permissions not configured

See [troubleshooting guide](../docs/CI_CD.md#troubleshooting) for more.

## 🔗 Useful Links

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [Auto-Merge PRs](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)
- [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [Issue Templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests)

---

**Questions?** Read [QUICKSTART.md](QUICKSTART.md) or [full CI/CD docs](../docs/CI_CD.md).
