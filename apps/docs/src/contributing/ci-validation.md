---
title: CI Documentation Validation
description: How documentation is validated in CI and what happens when checks fail
related_code:
  - .github/workflows/ci.yml
  - apps/docs/scripts/lib/ci/workflow-validator.ts
  - apps/docs/scripts/lib/ci/annotation-generator.ts
  - apps/docs/scripts/lib/ci/vitepress-config.ts
  - apps/docs/scripts/check-staleness.ts
implements_task: E06-T004
last_verified: 2026-01-15
---

# CI Documentation Validation

Documentation is automatically validated as part of the CI pipeline. This ensures documentation quality remains high and catches issues before they reach production.

## What Gets Checked

### 1. Build Validation

The VitePress site is built on every PR and push. This catches:

- **Markdown syntax errors** - Invalid markdown that VitePress cannot parse
- **Broken internal links** - Links to pages that do not exist
- **Configuration errors** - Invalid VitePress configuration
- **Missing frontmatter** - Pages without required metadata

**Status:** Blocking - Build failures prevent PR merge.

### 2. Staleness Detection

Documentation staleness is checked against related code files. This catches:

- **Outdated docs** - Documentation that may not reflect recent code changes
- **Stale verification dates** - Pages not reviewed after code modifications

**Status:** Warning only - Staleness does not block PR merge (initially).

## When CI Runs

Documentation validation runs conditionally based on which files changed. The CI uses path filtering to skip the docs job when no relevant files are modified, saving CI time.

| Files Changed | Docs Job Runs? | What Happens |
|---------------|----------------|--------------|
| `apps/docs/**` | Yes | Build docs, run staleness check, upload artifacts |
| `packages/**`, `apps/api/**`, `apps/web/**` | Yes | Build docs, run staleness check (code may affect doc accuracy) |
| `.github/workflows/ci.yml` | Yes | Build docs (workflow changes may affect docs validation) |
| Other files only | No (skipped) | Docs job skipped to save CI time |
| Manual dispatch | Yes | Build docs, upload artifacts |

### Path Filtering Details

The CI workflow uses [`dorny/paths-filter`](https://github.com/dorny/paths-filter) to detect file changes:

- **docs paths**: `apps/docs/**`, `.github/workflows/ci.yml`
- **code paths**: `packages/**`, `apps/api/**`, `apps/web/**`

When neither docs nor code paths have changes, the docs job is skipped entirely. This optimization saves approximately 60 seconds of CI time for PRs that only touch unrelated files (e.g., `apps/worker/`).

## Viewing Results

### Build Results

Build failures appear as failed checks on the PR. Click the "Docs Validation" check to see:

- Which step failed
- Error messages from VitePress
- File and line numbers when available

### Staleness Report

When documentation may be stale:

1. A warning annotation appears on the PR
2. A staleness report is uploaded as an artifact
3. Download the "staleness-report" artifact for details

To view the staleness report:

1. Go to the PR's Checks tab
2. Click on "Docs Validation" job
3. Scroll to Artifacts section
4. Download "staleness-report"

## Fixing Issues

### Build Failures

1. Check the error message in the CI logs
2. Fix the issue locally (markdown, links, config)
3. Test with `pnpm docs:build` before pushing
4. Push the fix

### Stale Documentation

If documentation is flagged as potentially stale:

1. Review the staleness report to see which docs are affected
2. Check the related code changes mentioned in the report
3. Update the documentation if needed
4. Update the `last_verified` date in frontmatter
5. Push the changes

Example frontmatter update:

```yaml
---
title: Session Lifecycle
related_code:
  - packages/auth/src/session.service.ts
last_verified: 2026-01-14  # Update to today's date
---
```

## Local Validation

Run validation locally before pushing:

```bash
# Build docs (catches markdown and link errors)
pnpm docs:build

# Check for staleness
pnpm docs:check-stale

# Check with verbose output
pnpm docs:check-stale --verbose
```

## Configuration

### Staleness Threshold

The staleness threshold defaults to 7 days. This means code changes more than 7 days after the last verification date trigger a staleness warning.

### Ignoring Dead Links

To ignore specific link patterns, update `.vitepress/config.ts`:

```typescript
export default defineConfig({
  ignoreDeadLinks: [
    /^\/api\//,  // Ignore API links (auto-generated)
  ],
});
```

## Troubleshooting

### "Dead link found" error

This means an internal link points to a non-existent page.

**Fix:** Update the link to point to an existing page, or create the missing page.

### "File not in git history"

This warning appears when a `related_code` file has no git commits.

**Fix:** Either commit the file or remove it from `related_code` if it is temporary.

### CI takes too long

The docs job should complete in under 60 seconds. If it is slow:

1. Check for very large files in `apps/docs/src/`
2. Review `related_code` patterns for expensive globs
3. Consider adding files to the ignore list

## Adding New Apps

When a new app is added to the monorepo (e.g., `apps/worker/`), you need to:

### 1. Update CI Path Filters

Add the new app to the `code` filter in `.github/workflows/ci.yml`:

```yaml
# In the 'changes' job, update the paths-filter filters
- name: Check for relevant file changes
  uses: dorny/paths-filter@v3
  id: filter
  with:
    filters: |
      docs:
        - 'apps/docs/**'
        - '.github/workflows/ci.yml'
      code:
        - 'packages/**'
        - 'apps/api/**'
        - 'apps/web/**'
        - 'apps/worker/**'  # Add new app here
```

### 2. Add Related Code References

Add `related_code` references in relevant documentation pages:

```yaml
---
title: Worker Architecture
related_code:
  - apps/worker/src/**/*.ts
---
```

This ensures documentation is checked for staleness when that app's code changes.

## Future Improvements

- Automatic PR preview deployments
- Spell checking integration
- External link validation
- Grammar and style linting
