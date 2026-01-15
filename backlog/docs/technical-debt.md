# Technical Debt Registry

**Purpose:** Track ongoing code quality, testing, performance, and documentation gaps. Update this document as you discover issues during development. Create time-boxed tasks when ready to address specific items.

**Last Updated:** 2026-01-15 (Coverage configuration updated to exclude VitePress docs)

---

## Test Coverage Gaps

### Priority: Critical (No Coverage)

*Core functionality with no tests - highest risk*

- [ ] None currently identified - Great work!

### Priority: High (Partial Coverage)

*Incomplete test coverage on important code*

- [ ] `apps/api/src/middleware/request-logger.ts` - Only 46.42% coverage (lines 9-13, 17-26 uncovered)
- [ ] `packages/auth/src/lucia.ts` - 89.21% coverage but 0% function coverage (lines 73-77, 84-89 uncovered)
- [ ] `packages/core/src/errors/rate-limit.error.ts` - 82.35% coverage, 0% function coverage (lines 14-16 uncovered)

### Priority: Medium (Low Coverage)

*Would benefit from more tests but not blocking*

- [ ] **To be identified** - Utilities, helpers, and edge cases

### Priority: Low (Could Be Better)

*Minor gaps that are nice-to-have*

- [ ] **To be identified** - Additional edge case coverage

---

## Performance Issues

### Slow Queries (>100ms)

- [ ] **To be identified** - Run query profiling to find bottlenecks

### Missing Indexes

- [ ] **To be identified** - Review pg_stat_statements for sequential scans

### Inefficient Code

- [ ] **To be identified** - Look for N+1 queries, unnecessary loops

---

## Security Concerns

### Authentication/Authorization

- [ ] **To be identified** - Review auth flows for vulnerabilities

### Input Validation

- [ ] **To be identified** - Check for XSS, SQL injection, command injection risks

### Configuration

- [ ] **To be identified** - Review CORS, rate limiting, security headers

---

## Documentation Gaps

### Knowledge Base (KB)

- [ ] **To be identified** - Missing domain documentation, patterns, decisions

### API Documentation

- [ ] **To be identified** - Undocumented endpoints or unclear usage

### Code Comments

- [ ] **To be identified** - Complex logic lacking explanation

---

## Refactoring Opportunities

### Code Duplication

- [ ] **To be identified** - Similar logic that could be abstracted

### Complexity

- [ ] **To be identified** - Functions/files that are too large or complex

### Outdated Patterns

- [ ] **To be identified** - Code not following current conventions

---

## How to Use This Document

### Adding Items

When you discover technical debt during development:

```bash
# Edit this file to add the gap
vim backlog/docs/technical-debt.md

# Commit the update
git add backlog/docs/technical-debt.md
git commit -m "docs: track [brief description] in technical debt"
```

### Creating Tasks

When ready to address an item:

1. **Pick a time-boxed scope** (1-3 hours typically)
2. **Create a task** in the appropriate epic (use current epic or E01 for general hygiene)
3. **Add `technical-debt` label** to the task
4. **Reference this document** in the task context
5. **Check off the item here** when the task is completed

### Example Task Creation

```markdown
---
id: "E01-T099"
title: "Add test coverage for user service"
status: "todo"
priority: "medium"
epic: "E01"
labels: ["technical-debt", "testing"]
---

# Add Test Coverage for User Service

## Description
Add comprehensive unit tests for core user service methods.

## Why This Matters
User service is critical for auth - lack of tests risks regressions.

## Acceptance Criteria
- [ ] AC1: CRUD operations have happy path tests
- [ ] AC2: Error cases tested
- [ ] AC3: Coverage reaches 80%+

## Constraints
- 2-hour time-box
- Follow AAA pattern

## Context
Addresses gap from backlog/docs/technical-debt.md
```

---

## Finding Test Coverage Gaps

### Method 1: Manual Inspection

Look for source files without corresponding test files:

```bash
# Find all source files
find packages/*/src -name "*.ts" -not -path "*/__tests__/*" -not -name "*.test.ts" -not -name "index.ts" | sort

# Find all test files
find packages/*/src -name "*.test.ts" -o -path "*/__tests__/*.test.ts" | sort

# Compare the two lists to find files without tests
```

### Method 2: Coverage Report (if working)

```bash
# Run tests with coverage
pnpm test:coverage

# View HTML report
open coverage/index.html

# View terminal summary
pnpm test:coverage --reporter=text
```

**Note:** If you get source map errors, use Method 1 or Method 3 instead.

### Method 3: Quick File Comparison

```bash
# List source files that don't have a corresponding .test.ts file
for file in $(find packages/*/src -name "*.ts" -not -path "*/__tests__/*" -not -name "*.test.ts" -not -name "index.ts"); do
  testfile="${file/.ts/.test.ts}"
  testdir="$(dirname $file)/__tests__/$(basename $testfile)"
  if [ ! -f "$testfile" ] && [ ! -f "$testdir" ]; then
    echo "Missing tests: $file"
  fi
done
```

### Method 4: Use Claude to Identify Gaps

Ask Claude to search for source files and check if they have corresponding tests:

```
Please find all .ts files in packages/auth/src that don't have corresponding test files.
Ignore index.ts and files in __tests__ directories.
```

### Update This Document

After identifying gaps using any method, add specific files/functions to the appropriate priority section above.

---

## Notes

- **Time-box everything** - Don't aim for perfection, aim for meaningful improvement
- **Prioritize by risk** - Focus on auth, permissions, data integrity first
- **Batch related work** - Group similar fixes into a single task when possible
- **Update regularly** - Keep this doc current as you discover new gaps
- **Archive completed items** - Move to a "Resolved" section at the bottom when done

---

## Resolved Items

*Move completed items here for historical reference*

### Test Coverage
- None yet

### Performance
- None yet

### Security
- None yet

### Documentation
- None yet

### Refactoring
- None yet
