# Technical Debt Registry

**Purpose:** Track ongoing code quality, testing, performance, and documentation gaps. Update this document as you discover issues during development. Create time-boxed tasks when ready to address specific items.

**Last Updated:** 2026-01-15

---

## Test Coverage Gaps

### Priority: Critical (No Coverage)

*Core functionality with no tests - highest risk*

- [ ] **To be identified** - Use coverage reports to find critical untested paths

### Priority: High (Partial Coverage)

*Incomplete test coverage on important code*

- [ ] **To be identified** - Focus on services, middleware, and route handlers

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

## Coverage Report Instructions

### Generate Coverage Report

```bash
# Run tests with coverage
pnpm test:coverage

# View HTML report
open coverage/index.html

# View terminal summary
pnpm test:coverage --reporter=text
```

### Find Critical Gaps

```bash
# Find files with 0% coverage (critical)
pnpm test:coverage --reporter=json | jq '.coverage[] | select(.lines.pct == 0) | .path'

# Find files with <50% coverage (high priority)
pnpm test:coverage --reporter=json | jq '.coverage[] | select(.lines.pct < 50) | .path'
```

### Update This Document

After generating a coverage report, add specific files/functions to the appropriate priority section above.

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
