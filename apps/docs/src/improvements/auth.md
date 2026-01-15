---
title: Authentication & Authorization Improvements
description: Technical debt, enhancements, and optimizations for the auth domain
implements_task: E06-T012
last_verified: 2026-01-15
---

# Authentication & Authorization Improvements

Recommendations for improving authentication, authorization, session management, and permission systems. Items sourced from epic reviews, security audits, and ongoing development.

## Domain Overview

**Current State:**
- Lucia-based session management
- CASL for permissions
- OAuth providers (Google, Microsoft, Clever planned)
- Rate limiting middleware

**Recent Changes:**
- E02 completed: Core auth infrastructure
- Session validation and middleware implemented
- OAuth foundation in place

## Active Recommendations

### Critical (Blocking)

::: tip No Critical Items
No blocking items currently. 🎉
:::

### High Priority

| ID | Issue | Description | Impact | Effort | Tracking | Added |
|----|-------|-------------|--------|--------|----------|-------|
| AUTH-001 | Testing | Update Lucia v3 test suite for API changes | Medium | Small | Backlog | 2026-01-15 |

**AUTH-001 Details:**
- **Source**: [E02-T002 Code Review](/backlog/docs/reviews/E02/E02-T002-code-review.md)
- **Description**: 11 tests failing due to Lucia v3 API changes - sessionCookie not exposed as direct property
- **Impact**: Test suite partially failing, reduces confidence in session management
- **Mitigation**: Update tests to use public API methods, fix dynamic import patterns
- **Blocking**: No - functionality works, tests need updating
- **Effort Breakdown**:
  - Update lucia.test.ts to use public API (1h)
  - Fix session.service.test.ts mock expectations (30min)
  - Fix dynamic import tests to use ESM (30min)

### Medium Priority

| ID | Issue | Description | Impact | Effort | Tracking | Added |
|----|-------|-------------|--------|--------|----------|-------|
| AUTH-002 | Integration | Register session middleware in API server | Low | Small | Backlog | 2026-01-15 |

**AUTH-002 Details:**
- **Source**: [E02-T002 Code Review](/backlog/docs/reviews/E02/E02-T002-code-review.md)
- **Description**: Session middleware exists but not registered in apps/api/src/server.ts
- **Impact**: Session validation not running, request.user/request.session always undefined
- **Mitigation**: Add middleware registration to server.ts as specified in E02-T002-spec.md
- **Blocking**: No - marked as future integration in spec
- **Related**: Authentication routes will need this before OAuth can work

### Low Priority

No low priority items currently.

## Completed Improvements

Archive of addressed recommendations with implementation details.

::: info No Completed Items Yet
As improvements are implemented, they will be moved here with completion date and task reference.
:::

## References

**Source Reviews:**
- [E02-T002: Sessions table and Lucia setup - Code Review](/backlog/docs/reviews/E02/E02-T002-code-review.md)
- [Post-Docker Setup Review Summary](/backlog/docs/reviews/2026-01-12_post-docker-setup/_SUMMARY.md)

**Related Documentation:**
- [Session Lifecycle](/auth/concepts/sessions)
- [Lucia Configuration](/auth/concepts/lucia)
- [OAuth Providers](/auth/concepts/oauth)
- [Authentication Guards](/auth/patterns/guards)
