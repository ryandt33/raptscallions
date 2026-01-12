# GitHub CI/CD File Structure

Visual overview of all GitHub-related files and their relationships.

## Complete File Tree

```
raptscallions/
├── .github/
│   ├── workflows/                    # GitHub Actions automation
│   │   ├── ci.yml                   # Main CI pipeline ⚡
│   │   ├── security.yml             # Security scanning 🔒
│   │   ├── dependency-update.yml    # Weekly updates 📦
│   │   └── auto-merge.yml           # Auto-merge PRs 🤖
│   │
│   ├── ISSUE_TEMPLATE/              # Issue creation templates
│   │   ├── bug_report.md           # Bug reports 🐛
│   │   ├── feature_request.md      # Feature requests ✨
│   │   ├── task.md                 # Task tracking 📋
│   │   └── config.yml              # Template configuration
│   │
│   ├── hooks/                       # Local git hooks
│   │   └── pre-commit              # Pre-commit validation ✓
│   │
│   ├── CODEOWNERS                   # Auto-assign reviewers 👥
│   ├── pull_request_template.md     # PR description template 📝
│   │
│   ├── README.md                    # 📍 Directory overview
│   ├── QUICKSTART.md                # ⚡ 5-minute setup
│   ├── SETUP.md                     # 📖 Detailed setup
│   ├── SETUP_SUMMARY.md             # 📋 Complete overview
│   └── STRUCTURE.md                 # 🌲 This file
│
├── .claude/
│   └── rules/
│       └── github.md                # GitHub conventions for Claude 🤖
│
├── docs/
│   └── CI_CD.md                     # Comprehensive CI/CD docs 📚
│
├── scripts/
│   ├── commit-msg-helper.sh        # Interactive commit tool 💬
│   └── README.md                   # Scripts documentation 📄
│
└── package.json                     # Updated with CI scripts 📦
```

## File Purposes

### 🔄 GitHub Actions Workflows

#### ci.yml (Main CI Pipeline)
**Triggers:** Push, PR, Manual  
**Duration:** ~10-15 minutes  
**Jobs:**
- Type checking (`pnpm typecheck`)
- Linting (`pnpm lint`)
- Unit tests (`pnpm test`)
- Test coverage (`pnpm test:coverage`)
- Build verification (`pnpm build`)

**Required for merge:** ✅ Yes

#### security.yml (Security Scanning)
**Triggers:** Push, PR, Weekly (Mon 9am UTC)  
**Duration:** ~15-20 minutes  
**Jobs:**
- CodeQL static analysis
- Dependency audit (`pnpm audit`)
- Secret detection (TruffleHog)

**Required for merge:** ❌ No (informational)

#### dependency-update.yml (Weekly Updates)
**Triggers:** Weekly (Mon 10am UTC), Manual  
**Duration:** ~15 minutes  
**Process:**
1. Update all dependencies
2. Run tests
3. Create PR with `automerge` label
4. Auto-merge if tests pass

**Required for merge:** N/A (creates PRs)

#### auto-merge.yml (Auto-Merge)
**Triggers:** PR events, Check completion  
**Duration:** < 1 minute  
**Process:**
1. Check for `automerge` label
2. Wait for required checks
3. Merge with squash method
4. Post comment

**Required for merge:** N/A (automation)

### 📝 Templates

#### pull_request_template.md
**Used when:** Creating PRs via GitHub UI  
**Sections:**
- Summary
- Task reference
- Changes made
- Testing checklist
- Breaking changes
- Deployment notes

#### bug_report.md
**Used when:** Creating bug report issues  
**Sections:**
- Description
- Steps to reproduce
- Expected vs actual
- Environment
- Logs/screenshots

#### feature_request.md
**Used when:** Creating feature requests  
**Sections:**
- Feature description
- Problem statement
- Proposed solution
- Alternatives
- Acceptance criteria

#### task.md
**Used when:** Creating task tracking issues  
**Sections:**
- Task reference (Epic/Task ID)
- Description
- Acceptance criteria
- Dependencies
- Estimated effort

### 🔧 Configuration Files

#### CODEOWNERS
**Purpose:** Auto-assign reviewers based on file paths  
**Example:**
```
/apps/api/ @backend-team
/apps/web/ @frontend-team
/.github/ @devops-team
```

**When used:** Automatically when PR touches those files

#### hooks/pre-commit
**Purpose:** Local validation before commits  
**Runs:**
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`

**Installation:**
```bash
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Bypass:**
```bash
git commit --no-verify  # Not recommended
```

### 📚 Documentation Files

#### QUICKSTART.md
**Target audience:** Developers setting up for first time  
**Read time:** 5 minutes  
**Contains:**
- Push to GitHub
- Enable Actions
- Set up branch protection
- Configure auto-merge
- Test setup

#### SETUP.md
**Target audience:** Developers needing detailed config  
**Read time:** 20 minutes  
**Contains:**
- Step-by-step configuration
- Branch protection rules
- Auto-merge methods
- Secret management
- Status badges
- Troubleshooting

#### SETUP_SUMMARY.md
**Target audience:** Developers wanting overview  
**Read time:** 10 minutes  
**Contains:**
- Complete file list
- Key features summary
- Next steps
- Checklist
- Command reference

#### README.md
**Target audience:** All developers  
**Read time:** 5 minutes  
**Contains:**
- Directory structure
- Quick navigation
- Workflow summaries
- Template descriptions
- Useful links

#### STRUCTURE.md
**Target audience:** Visual learners  
**Read time:** 5 minutes  
**Contains:**
- This file you're reading!
- Visual file tree
- File purpose explanations
- Relationship map

### 📁 Supporting Files

#### .claude/rules/github.md
**Purpose:** Claude Code context for GitHub/Git conventions  
**Contains:**
- Branch naming
- Commit message format
- PR process
- Auto-merge usage
- CI/CD commands

**Used by:** Claude Code AI assistant

#### docs/CI_CD.md
**Purpose:** Comprehensive CI/CD documentation  
**Contains:**
- Complete workflow details
- Branch strategy
- Commit conventions
- Auto-merge deep dive
- Security details
- Deployment process
- Troubleshooting guide

**Read time:** 30 minutes

#### scripts/commit-msg-helper.sh
**Purpose:** Interactive commit message formatter  
**Usage:**
```bash
pnpm commit
# OR
./scripts/commit-msg-helper.sh
```

**Features:**
- Prompts for type/scope
- Formats automatically
- Adds task reference
- Shows preview

#### package.json (updated scripts)
**New scripts:**
```json
{
  "typecheck": "pnpm -r typecheck",
  "prepare": "cp .github/hooks/pre-commit ...",
  "commit": "bash scripts/commit-msg-helper.sh",
  "ci:check": "pnpm typecheck && pnpm lint && pnpm test && pnpm build"
}
```

## File Relationships

### CI Pipeline Flow

```
Developer commits
      ↓
[pre-commit hook] (local)
      ↓
Push to GitHub
      ↓
[ci.yml] triggered
      ↓
Jobs run in parallel:
  - typecheck
  - lint
  - test (+ coverage)
  - build
      ↓
[All Checks Passed]
      ↓
[auto-merge.yml] checks label
      ↓
Auto-merge if labeled
```

### Security Scan Flow

```
Push to GitHub / Weekly schedule
      ↓
[security.yml] triggered
      ↓
Jobs run in parallel:
  - CodeQL analysis
  - pnpm audit
  - TruffleHog secrets
      ↓
Results posted to Security tab
      ↓
Alerts created (if issues found)
```

### PR Creation Flow

```
Developer creates branch
      ↓
Makes changes
      ↓
[commit-msg-helper.sh] (optional)
      ↓
Push and create PR
      ↓
[pull_request_template.md] loads
      ↓
Fill in template
      ↓
[CODEOWNERS] auto-requests reviews
      ↓
[ci.yml] runs checks
      ↓
Reviews + Checks pass
      ↓
[auto-merge.yml] merges (if labeled)
```

### Dependency Update Flow

```
Monday 10am UTC
      ↓
[dependency-update.yml] triggered
      ↓
Update all dependencies
      ↓
Run tests
      ↓
Create PR with `automerge` label
      ↓
[ci.yml] runs on PR
      ↓
[auto-merge.yml] merges if pass
```

## Reading Order

### For First-Time Setup
1. 📍 [.github/README.md](.github/README.md) — Overview
2. ⚡ [.github/QUICKSTART.md](.github/QUICKSTART.md) — Setup
3. 📋 [.github/SETUP_SUMMARY.md](.github/SETUP_SUMMARY.md) — Verify
4. 📚 [docs/CI_CD.md](../docs/CI_CD.md) — Deep dive (optional)

### For Daily Development
1. 💬 `pnpm commit` — Commit changes
2. 🔍 `pnpm ci:check` — Verify locally
3. 📝 `gh pr create` — Create PR
4. 🤖 `gh pr edit <PR> --add-label automerge` — Auto-merge

### For Troubleshooting
1. 📖 [.github/SETUP.md](.github/SETUP.md) — Detailed setup
2. 📚 [docs/CI_CD.md#troubleshooting](../docs/CI_CD.md#troubleshooting)
3. 📄 [scripts/README.md](../scripts/README.md) — Scripts help

### For Customization
1. 📖 [.github/SETUP.md](.github/SETUP.md) — Configuration options
2. 🔧 Edit workflow files directly
3. 📚 [docs/CI_CD.md](../docs/CI_CD.md) — Best practices

## File Size Summary

```
workflows/ci.yml                 ~300 lines   Main CI pipeline
workflows/security.yml           ~120 lines   Security scanning
workflows/dependency-update.yml   ~60 lines   Dependency updates
workflows/auto-merge.yml          ~90 lines   Auto-merge logic
SETUP.md                         ~900 lines   Detailed setup guide
CI_CD.md                        ~1000 lines   Comprehensive docs
commit-msg-helper.sh            ~150 lines   Interactive commit tool
```

**Total documentation:** ~3000 lines  
**Total automation code:** ~570 lines

## Quick Command Reference

```bash
# Setup
pnpm install                    # Install + hook
gh workflow list                # List workflows

# Development
pnpm commit                     # Interactive commit
pnpm ci:check                   # Run all checks

# PR Management
gh pr create                    # Create PR
gh pr edit <PR> --add-label automerge  # Enable auto-merge
gh pr checks <PR>               # Check status

# Workflow Management
gh run list --workflow=ci.yml   # View CI runs
gh run watch <RUN_ID>          # Watch live
gh run rerun <RUN_ID> --failed # Re-run failed
```

---

**Navigate:** [README.md](.github/README.md) | [QUICKSTART.md](.github/QUICKSTART.md) | [SETUP.md](.github/SETUP.md) | [CI_CD.md](../docs/CI_CD.md)
