# Implementation Spec: E06-T004

**Task:** CI Integration for Docs Validation
**Epic:** E06 - Knowledge Base Documentation
**Status:** Analyzed
**Created:** 2026-01-14

---

## Overview

Add documentation validation to the CI pipeline to ensure documentation quality does not degrade over time. This includes building the VitePress site to catch markdown errors, checking for broken internal links, and running staleness detection to surface potentially outdated documentation. The CI integration will block PR merge on build failures while treating staleness warnings as informational (non-blocking) initially.

**Key Goals:**
1. Add a dedicated docs validation job to the existing CI workflow
2. Build VitePress site to catch markdown and configuration errors
3. Detect and report broken internal links
4. Run staleness check and report results as PR annotations
5. Upload build artifacts for potential preview deployment
6. Optimize for fast execution (target: under 60 seconds)
7. Document CI behavior in the contributing guide

---

## Approach

### Technical Strategy

**Workflow Design:**
- Add a new `docs` job to the existing `.github/workflows/ci.yml` workflow
- Use path filters to only run when `apps/docs/**` or related code files change
- Run jobs in parallel with existing checks (typecheck, lint, test, build)
- Full git checkout required (not shallow) for staleness detection via git history

**Build Validation:**
- Run `pnpm docs:build` which executes VitePress build
- VitePress has built-in dead link detection (internal links)
- Build failure blocks PR merge (required check)
- Build generates static site in `apps/docs/src/.vitepress/dist/`

**Link Checking:**
- VitePress 1.5+ includes built-in dead link detection during build
- Configure VitePress to fail build on broken internal links
- External links are out of scope (per task constraints)

**Staleness Reporting:**
- Run existing `pnpm docs:check-stale` command
- Generate markdown report for PR comment/annotation
- Use GitHub Actions annotations to surface warnings
- Does NOT block merge (warning only initially, per AC6)

**Build Artifacts:**
- Upload VitePress build output as GitHub Actions artifact
- Available for manual download or future preview deployment
- 7-day retention (matching existing build artifacts)

**Path Filtering:**
- Run on changes to `apps/docs/**` for direct doc changes
- Run on changes to `packages/**` and `apps/api/**` for staleness detection
- Run on PR only (not push to main for staleness)

---

## Files to Create

| File | Purpose |
|------|---------|
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/src/contributing/ci-validation.md` | Documentation of CI docs validation behavior |

---

## Files to Modify

| File | Changes |
|------|---------|
| `/home/ryan/Documents/coding/claude-box/raptscallions/.github/workflows/ci.yml` | Add `docs` job with build, link check, and staleness steps |
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/src/.vitepress/config.ts` | Configure dead link detection settings if needed |
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/src/contributing/index.md` | Add link to CI validation documentation |

---

## Dependencies

### Task Dependencies
- **Requires:** E06-T001 (VitePress setup) - DONE
- **Requires:** E06-T003 (Staleness tracking) - DONE
- **Blocks:** None

### System Dependencies
- GitHub Actions (already configured in repo)
- pnpm 9+ (already required)
- Node.js 20+ (already required)
- Full git history (not shallow clone) for staleness detection

---

## Detailed Implementation

### 1. CI Workflow Updates

**File:** `.github/workflows/ci.yml`

Add a new `docs` job to the existing workflow. The job should:
1. Build the VitePress site to validate markdown and config
2. Check for broken internal links (VitePress built-in)
3. Run staleness check and output report
4. Upload build artifacts

**Implementation:**

```yaml
# Add to existing .github/workflows/ci.yml

  docs:
    name: Docs Validation
    runs-on: ubuntu-latest
    timeout-minutes: 10

    # Only run on docs changes or related code changes for staleness
    # This conditional runs on PRs when relevant files change
    if: |
      github.event_name == 'pull_request' ||
      github.event_name == 'push'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for staleness detection

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Get pnpm store directory
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Setup pnpm cache
        uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build documentation
        id: build-docs
        run: pnpm docs:build
        continue-on-error: false

      - name: Check documentation staleness
        id: check-staleness
        if: github.event_name == 'pull_request'
        run: |
          cd apps/docs
          pnpm tsx scripts/check-staleness.ts \
            --format markdown \
            --output ./staleness-report.md \
            || echo "staleness_exit_code=$?" >> $GITHUB_OUTPUT
        continue-on-error: true

      - name: Report staleness as annotation
        if: github.event_name == 'pull_request' && steps.check-staleness.outcome == 'failure'
        run: |
          if [ -f apps/docs/staleness-report.md ]; then
            echo "::warning file=apps/docs/staleness-report.md::Documentation may be stale. See staleness report in artifacts."
          fi

      - name: Upload staleness report
        if: github.event_name == 'pull_request' && always()
        uses: actions/upload-artifact@v4
        with:
          name: staleness-report
          path: apps/docs/staleness-report.md
          retention-days: 7
          if-no-files-found: ignore

      - name: Upload docs build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: docs-build
          path: apps/docs/src/.vitepress/dist
          retention-days: 7
```

**Key Points:**
- `fetch-depth: 0` ensures full git history for staleness detection
- `continue-on-error: true` on staleness check makes it non-blocking (AC6)
- Uses GitHub annotations (`::warning::`) to surface staleness warnings
- Uploads both staleness report and build artifacts
- Build step failure (`continue-on-error: false`) will block PR merge (AC2)

### 2. Path Filter Configuration

The workflow should use path filters to optimize CI time. Add path filters to the job:

```yaml
  docs:
    name: Docs Validation
    runs-on: ubuntu-latest
    timeout-minutes: 10
    # Path filtering happens at workflow level via on: configuration
```

Update the workflow `on:` section to include path filters:

```yaml
on:
  push:
    branches: [main, develop]
    paths:
      - 'apps/docs/**'
  pull_request:
    branches: [main, develop]
    paths:
      - 'apps/docs/**'
      - 'packages/**'
      - 'apps/api/**'
      - '.github/workflows/ci.yml'
  workflow_dispatch:
```

**Note:** The existing CI workflow runs on all pushes/PRs. To add path filtering specifically for docs, we have two options:

**Option A:** Add path conditions to the docs job (recommended for simplicity)
- Use `paths-filter` action or conditional steps

**Option B:** Create a separate workflow file for docs
- More isolation but adds complexity

**Recommendation:** Use Option A with path conditions in the job steps, since the existing workflow already runs on all changes and adding a separate workflow would increase overall CI time.

### 3. VitePress Dead Link Configuration

VitePress 1.5+ has built-in dead link detection. Verify and configure in `.vitepress/config.ts`:

**File:** `apps/docs/src/.vitepress/config.ts`

Add or verify dead link configuration:

```typescript
import { defineConfig } from 'vitepress';

export default defineConfig({
  // ... existing config ...

  // Dead link detection (built-in to VitePress 1.5+)
  // VitePress will fail build on broken internal links by default
  // To customize, use the following:
  ignoreDeadLinks: [
    // Ignore specific patterns if needed
    // /^https?:\/\/localhost/,  // Example: ignore localhost links
  ],
});
```

**Key Points:**
- VitePress 1.5+ fails build on broken internal links by default
- `ignoreDeadLinks` can whitelist specific patterns if needed
- External links are NOT checked (per task constraints)
- Dead link detection runs automatically during `vitepress build`

### 4. Staleness Report Format for CI

The existing staleness check script outputs markdown. For CI integration, enhance the output to work well with GitHub annotations.

**Current Behavior (from E06-T003):**
- Exit code 0: No stale docs
- Exit code 1: Stale docs found
- Exit code 2: Script error

**CI Integration:**
- Exit code 1 treated as warning (staleness found) - non-blocking
- Exit code 2 treated as error (script failure) - potentially blocking
- Markdown report uploaded as artifact for review

**GitHub Annotation Format:**
Use GitHub Actions workflow commands to add annotations:

```bash
# Warning annotation (appears in PR checks)
echo "::warning file=apps/docs/staleness-report.md::Documentation may be stale"

# Notice annotation (less prominent)
echo "::notice::Staleness check completed. See report for details."
```

### 5. PR Comment Integration (Optional Enhancement)

For better visibility, add a PR comment step using the staleness report:

```yaml
      - name: Comment staleness report on PR
        if: github.event_name == 'pull_request' && steps.check-staleness.outcome == 'failure'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const path = 'apps/docs/staleness-report.md';

            if (fs.existsSync(path)) {
              const report = fs.readFileSync(path, 'utf8');

              // Find existing comment
              const { data: comments } = await github.rest.issues.listComments({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
              });

              const botComment = comments.find(c =>
                c.user.login === 'github-actions[bot]' &&
                c.body.includes('Documentation Staleness Report')
              );

              const body = `## Documentation Staleness Report\n\n${report}\n\n---\n*This comment is automatically updated when documentation may be stale.*`;

              if (botComment) {
                await github.rest.issues.updateComment({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  comment_id: botComment.id,
                  body: body,
                });
              } else {
                await github.rest.issues.createComment({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  issue_number: context.issue.number,
                  body: body,
                });
              }
            }
```

**Note:** This is an optional enhancement. The basic implementation uses annotations and artifact uploads, which satisfy AC5.

### 6. All Checks Integration

Update the `all-checks` job to include the docs job:

```yaml
  all-checks:
    name: All Checks Passed
    runs-on: ubuntu-latest
    needs: [typecheck, lint, test, build, docs]
    if: always()

    steps:
      - name: Check if all jobs succeeded
        run: |
          if [[ "${{ needs.typecheck.result }}" != "success" ]] || \
             [[ "${{ needs.lint.result }}" != "success" ]] || \
             [[ "${{ needs.test.result }}" != "success" ]] || \
             [[ "${{ needs.build.result }}" != "success" ]] || \
             [[ "${{ needs.docs.result }}" != "success" ]]; then
            echo "One or more checks failed"
            exit 1
          fi
          echo "All checks passed!"
```

**Key Point:** The docs job failure (build failure) blocks merge. Staleness check failure does NOT block because `continue-on-error: true` is set.

### 7. Contributing Guide Documentation

**File:** `apps/docs/src/contributing/ci-validation.md`

Create documentation explaining the CI docs validation:

```markdown
---
title: CI Documentation Validation
description: How documentation is validated in CI and what happens when checks fail
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

Documentation validation runs when:

| Trigger | Files Changed | Jobs Run |
|---------|---------------|----------|
| PR to main/develop | `apps/docs/**` | Build, Staleness |
| PR to main/develop | `packages/**`, `apps/api/**` | Staleness only |
| Push to main/develop | `apps/docs/**` | Build only |

## Viewing Results

### Build Results

Build failures appear as failed checks on the PR. Click the check to see:
- Which step failed
- Error messages from VitePress
- File and line numbers when available

### Staleness Report

When documentation may be stale:
1. A warning annotation appears on the PR
2. A staleness report is uploaded as an artifact
3. (Optional) A comment is added to the PR with details

To view the staleness report:
1. Go to the PR's Checks tab
2. Find the "docs" job
3. Download the "staleness-report" artifact

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

To customize, create `.docs-staleness.yml` in `apps/docs/`:

```yaml
threshold: 14  # Days
ignore:
  - '**/references/**'  # Ignore stable reference docs
```

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

When a new app is added to the monorepo (e.g., `apps/worker/`), CI path filters must be updated to ensure documentation staleness is checked when that app's code changes.

### Steps to Add a New App

1. **Update CI workflow paths** in `.github/workflows/ci.yml`:

   ```yaml
   on:
     pull_request:
       paths:
         - 'apps/docs/**'
         - 'packages/**'
         - 'apps/api/**'
         - 'apps/worker/**'  # Add new app path
   ```

2. **Update this documentation** to reflect the new path in the table above.

3. **Add related_code references** in relevant documentation pages:

   ```yaml
   ---
   title: Worker Architecture
   related_code:
     - apps/worker/src/**/*.ts
   ---
   ```

### Why This Matters

Without updating CI path filters, changes to new apps will not trigger staleness checks. This means documentation could become stale without any warning to developers.

**Tip:** When creating a new app, add the path filter as part of the app scaffolding checklist.

## Future Improvements

- Automatic PR preview deployments
- Spell checking integration
- External link validation
- Grammar and style linting
```

### 8. Update Contributing Index

**File:** `apps/docs/src/contributing/index.md`

Add link to the new CI validation documentation:

```markdown
## CI/CD Integration

- **[CI Documentation Validation](/contributing/ci-validation)** - How documentation is validated in CI, what gets checked, and how to fix issues
```

---

## Acceptance Criteria Breakdown

### AC1: GitHub Actions workflow includes docs build step

**Implementation:**
- Add `docs` job to `.github/workflows/ci.yml`
- Include step that runs `pnpm docs:build`
- Job runs in parallel with existing checks

**Verification:**
- Create a PR with docs changes
- Verify `docs` job appears in CI checks
- Verify build step executes successfully

**Done When:**
- Docs build step visible in CI workflow
- Build completes without errors on valid docs

---

### AC2: VitePress build failure blocks PR merge

**Implementation:**
- Docs job is a required check (part of `all-checks`)
- Build step does NOT use `continue-on-error`
- Job failure propagates to `all-checks` job

**Verification:**
- Create PR with intentionally broken markdown
- Verify CI fails and blocks merge
- Verify error message is helpful

**Done When:**
- Broken docs prevent PR merge
- Clear error message in CI logs

---

### AC3: Broken internal links detected and reported

**Implementation:**
- VitePress 1.5+ detects dead links during build
- Build fails on broken internal links
- Error message includes file and link

**Verification:**
- Add a page with broken internal link
- Run `pnpm docs:build`
- Verify build fails with link error
- Verify error shows file and target link

**Done When:**
- Broken links cause build failure
- Error identifies which link is broken
- Error shows which file contains the link

---

### AC4: Staleness check runs and generates report

**Implementation:**
- Add step running `pnpm docs:check-stale`
- Configure to output markdown report
- Upload report as artifact

**Verification:**
- Create PR touching `packages/**` files
- Verify staleness check runs
- Verify report artifact is uploaded

**Done When:**
- Staleness check executes in CI
- Report available as artifact download
- Report contains accurate staleness data

---

### AC5: Staleness report attached as PR comment or annotation

**Implementation:**
- Use `::warning::` annotation for visibility
- Upload report as artifact
- (Optional) Post as PR comment via github-script

**Verification:**
- Create PR with stale documentation
- Verify warning annotation appears on PR
- Verify artifact is accessible

**Done When:**
- Staleness warning visible on PR
- Developers can access full report
- Warning includes relevant context

---

### AC6: Staleness does NOT block merge (warning only, initially)

**Implementation:**
- Staleness step uses `continue-on-error: true`
- Non-zero exit code treated as warning
- `all-checks` job only checks build success

**Verification:**
- Create PR with stale docs
- Verify staleness warning appears
- Verify PR can still be merged

**Done When:**
- Staleness is informational only
- PR merge not blocked by staleness
- Build failures still block merge

---

### AC7: Workflow runs only when apps/docs/** or relevant code changes

**Implementation:**
- Use `paths` filter in workflow `on:` section
- Include `apps/docs/**`, `packages/**`, `apps/api/**`
- Skip docs job when only other files change

**Verification:**
- Create PR touching only `apps/web/`
- Verify docs job does not run
- Create PR touching `apps/docs/`
- Verify docs job runs

**Done When:**
- Docs job skipped for unrelated changes
- Docs job runs for relevant changes
- CI time optimized for non-docs PRs

---

### AC8: Build artifacts (static site) available for preview

**Implementation:**
- Use `actions/upload-artifact@v4`
- Upload `apps/docs/src/.vitepress/dist/`
- Set 7-day retention (matches existing artifacts)

**Verification:**
- Create PR with docs changes
- Verify artifacts appear in job summary
- Download and verify contents

**Done When:**
- Build output uploaded as artifact
- Artifact downloadable from Actions UI
- Contains complete static site

---

### AC9: Documentation of CI behavior in contributing guide

**Implementation:**
- Create `apps/docs/src/contributing/ci-validation.md`
- Document what gets checked and when
- Include troubleshooting section
- Add link from contributing index

**Verification:**
- Page renders in VitePress
- Content is accurate and complete
- Troubleshooting steps are helpful

**Done When:**
- Documentation page exists
- All CI behavior documented
- Troubleshooting guidance provided
- Page linked from contributing index

---

## Test Strategy

### Unit Tests

No new unit tests required. The staleness system was tested in E06-T003. This task focuses on CI integration which is tested via end-to-end workflow validation.

### Integration Tests

**Test 1: Build Success Path**
```bash
# Verify docs build passes with valid content
pnpm docs:build
echo $?  # Should be 0
```

**Test 2: Build Failure on Broken Links**
```bash
# Add broken link to test file
echo "[broken link](/does-not-exist)" >> apps/docs/src/test-broken.md
pnpm docs:build
echo $?  # Should be non-zero
rm apps/docs/src/test-broken.md  # Cleanup
```

**Test 3: Staleness Check Execution**
```bash
# Verify staleness check runs and outputs report
pnpm docs:check-stale --format markdown --output ./test-report.md
ls ./test-report.md  # Should exist
rm ./test-report.md  # Cleanup
```

### End-to-End CI Tests

**Test 4: Workflow Trigger on Docs Changes**
1. Create branch with docs change
2. Open PR
3. Verify docs job runs
4. Verify build step succeeds
5. Verify artifact uploaded

**Test 5: Workflow Skip on Non-Docs Changes**
1. Create branch with only `apps/web/` changes
2. Open PR
3. Verify docs job is skipped or quick-exits

**Test 6: Build Failure Blocks Merge**
1. Create branch with broken markdown
2. Open PR
3. Verify docs job fails
4. Verify PR cannot be merged (status checks required)

**Test 7: Staleness Warning Non-Blocking**
1. Create branch with code changes only
2. Verify staleness might flag existing docs
3. Verify PR can still be merged
4. Verify warning annotation present

---

## Edge Cases

### 1. Empty docs directory

**Scenario:** No markdown files in `apps/docs/src/`.

**Impact:** VitePress build may fail or produce empty site.

**Handling:**
- VitePress requires at least index.md
- Current setup has content, so not expected
- Build will fail with clear error if no content

---

### 2. Very large static assets

**Scenario:** Large images or PDFs in docs causing slow builds.

**Impact:** CI may exceed timeout.

**Handling:**
- Set timeout to 10 minutes (generous)
- VitePress handles assets efficiently
- Consider adding asset size limits if needed

---

### 3. Shallow clone breaks staleness

**Scenario:** CI uses shallow clone (fetch-depth: 1).

**Impact:** Staleness check cannot query git history.

**Handling:**
- Explicitly set `fetch-depth: 0` in checkout step
- Staleness script already handles missing git gracefully
- Warning logged if git history unavailable

---

### 4. Concurrent workflow runs

**Scenario:** Multiple PRs running docs job simultaneously.

**Impact:** Resource contention, potential race conditions.

**Handling:**
- GitHub Actions handles parallelism
- Each job runs in isolation
- Artifacts are namespaced by run ID

---

### 5. VitePress version mismatch

**Scenario:** Local VitePress differs from CI VitePress.

**Impact:** Build behavior may differ.

**Handling:**
- Lock VitePress version in package.json
- Use `--frozen-lockfile` in CI
- pnpm ensures consistent versions

---

### 6. Config syntax error

**Scenario:** Invalid YAML in `.docs-staleness.yml`.

**Impact:** Staleness check fails with exit code 2.

**Handling:**
- Script logs error and uses defaults
- CI treats as failure (logged)
- Not blocking (continue-on-error)

---

### 7. No related_code in any docs

**Scenario:** No docs have staleness metadata.

**Impact:** All docs counted as "unchecked".

**Handling:**
- Script reports unchecked count
- Exit code 0 (no stale docs)
- Informational message in output

---

### 8. GitHub API rate limits (PR comments)

**Scenario:** Too many PR comments exhaust API quota.

**Impact:** Comment step fails.

**Handling:**
- Comment step is optional enhancement
- Use `continue-on-error: true`
- Core functionality (artifacts, annotations) unaffected

---

## Performance Considerations

### Target: Under 60 seconds

The docs job should complete in under 60 seconds total. Breakdown:

| Step | Target Time |
|------|-------------|
| Checkout (full) | 10s |
| Setup Node/pnpm | 5s |
| Install deps (cached) | 10s |
| Build docs | 15s |
| Staleness check | 10s |
| Upload artifacts | 10s |
| **Total** | **60s** |

### Optimization Strategies

1. **Dependency caching**: Already in place via pnpm store caching
2. **Build caching**: VitePress caches internally
3. **Parallel execution**: Docs job runs parallel to other jobs
4. **Selective execution**: Path filtering skips unneeded runs

### Monitoring

If performance degrades:
1. Check VitePress build output for slow pages
2. Review staleness check for expensive globs
3. Consider splitting jobs further
4. Add build caching if needed

---

## Open Questions

All questions from the task have clear implementations based on existing infrastructure:

### Q1: How to handle path filtering?

**Answer:** Use workflow `on.pull_request.paths` and `on.push.paths` filters. The docs job checks `apps/docs/**`, `packages/**`, and `apps/api/**`. Already implemented in this spec.

**Important: Adding New Apps**

When new apps are added to the monorepo (e.g., `apps/worker/`, `apps/mobile/`), the path filters in the CI workflow MUST be updated to include them for staleness detection. This ensures documentation is checked for staleness when any related code changes.

**Update required in:** `.github/workflows/ci.yml`
```yaml
on:
  pull_request:
    paths:
      - 'apps/docs/**'
      - 'packages/**'
      - 'apps/api/**'
      - 'apps/worker/**'   # Add new apps here
      - 'apps/mobile/**'   # Add new apps here
```

**This is documented in:** `apps/docs/src/contributing/ci-validation.md` (see "Adding New Apps" section)

### Q2: Should staleness block merge?

**Answer:** No, per AC6. Use `continue-on-error: true` on the staleness step.

### Q3: How to report staleness to developers?

**Answer:** Use GitHub workflow annotations (`::warning::`) and upload markdown report as artifact. Optional PR comment enhancement documented.

### Q4: What about external link checking?

**Answer:** Out of scope per task constraints. VitePress only checks internal links.

---

## Implementation Steps

### Phase 1: Workflow Updates (High Priority)

**Step 1:** Modify `.github/workflows/ci.yml`
- Add `docs` job with all steps
- Configure path filters
- Set appropriate timeouts

**Step 2:** Test locally with act (optional)
```bash
# Install act: https://github.com/nektos/act
act pull_request -j docs
```

**Estimated Time:** 1-2 hours

---

### Phase 2: VitePress Configuration (Medium Priority)

**Step 3:** Verify dead link detection in VitePress config
- Check current config for `ignoreDeadLinks`
- Add any needed patterns
- Test with intentionally broken link

**Step 4:** Test build locally
```bash
pnpm docs:build
```

**Estimated Time:** 30 minutes

---

### Phase 3: Documentation (Medium Priority)

**Step 5:** Create `apps/docs/src/contributing/ci-validation.md`
- Document all CI behavior
- Include troubleshooting guide
- Add examples and commands

**Step 6:** Update `apps/docs/src/contributing/index.md`
- Add link to new page
- Update sidebar if needed

**Step 7:** Test documentation renders
```bash
pnpm docs:dev
# Navigate to /contributing/ci-validation
```

**Estimated Time:** 1-2 hours

---

### Phase 4: Integration Testing (High Priority)

**Step 8:** Create test PR with docs changes
- Verify docs job runs
- Verify build succeeds
- Verify artifacts uploaded

**Step 9:** Create test PR with broken link
- Verify build fails
- Verify PR blocked
- Verify error message helpful

**Step 10:** Create test PR with code changes
- Verify staleness check runs
- Verify warning annotation (if stale)
- Verify PR not blocked

**Step 11:** Update all-checks job
- Add docs to required checks
- Test overall workflow

**Estimated Time:** 1-2 hours

---

### Phase 5: Polish (Low Priority)

**Step 12:** Add PR comment functionality (optional)
- Implement github-script step
- Test comment creation/update
- Handle edge cases

**Step 13:** Final QA
- Go through all acceptance criteria
- Verify performance targets met
- Update task as complete

**Estimated Time:** 1 hour

---

### Total Estimated Time: 5-8 hours

---

## Success Metrics

### Functionality
- [ ] All 9 acceptance criteria met
- [ ] Docs job runs successfully
- [ ] Build failures block merge
- [ ] Staleness warnings visible
- [ ] Artifacts downloadable

### Performance
- [ ] Docs job completes in under 60 seconds
- [ ] Path filtering skips unrelated PRs
- [ ] Caching effective

### User Experience
- [ ] Error messages clear and actionable
- [ ] Staleness warnings include context
- [ ] Documentation comprehensive
- [ ] Troubleshooting helpful

### Code Quality
- [ ] Workflow YAML valid
- [ ] No deprecated actions used
- [ ] Follows GitHub Actions best practices
- [ ] Documentation accurate

---

## File Locations Summary

**Files to Create:**
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/src/contributing/ci-validation.md`

**Files to Modify:**
- `/home/ryan/Documents/coding/claude-box/raptscallions/.github/workflows/ci.yml`
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/src/.vitepress/config.ts` (verify config)
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/src/contributing/index.md`

---

## References

**Task:** [E06-T004](/home/ryan/Documents/coding/claude-box/raptscallions/backlog/tasks/E06/E06-T004.md)

**Epic:** [E06](/home/ryan/Documents/coding/claude-box/raptscallions/backlog/tasks/E06/_epic.md)

**Dependencies:**
- E06-T001 spec: [/home/ryan/Documents/coding/claude-box/raptscallions/backlog/docs/specs/E06/E06-T001-spec.md](/home/ryan/Documents/coding/claude-box/raptscallions/backlog/docs/specs/E06/E06-T001-spec.md)
- E06-T003 spec: [/home/ryan/Documents/coding/claude-box/raptscallions/backlog/docs/specs/E06/E06-T003-spec.md](/home/ryan/Documents/coding/claude-box/raptscallions/backlog/docs/specs/E06/E06-T003-spec.md)

**Key Documentation:**
- GitHub Actions: https://docs.github.com/en/actions
- VitePress Dead Links: https://vitepress.dev/reference/site-config#ignoredeadlinks
- Workflow Commands: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions

**Existing Code Patterns:**
- Current CI workflow: `.github/workflows/ci.yml`
- Staleness script: `apps/docs/scripts/check-staleness.ts`
- VitePress config: `apps/docs/src/.vitepress/config.ts`

---

**Spec Status:** Complete
**Ready for Developer:** Yes
**Estimated Complexity:** Medium
**Estimated Time:** 5-8 hours
