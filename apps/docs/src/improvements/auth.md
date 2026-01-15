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

No high priority items currently.

### Medium Priority

No medium priority items currently.

### Low Priority

No low priority items currently.

## Completed Improvements

Archive of addressed recommendations with implementation details.

### AUTH-001: Update Lucia v3 test suite
**Completed**: 2026-01-15
**Resolution**: All 136 tests in packages/auth are now passing. Tests were updated to use Lucia v3's public API correctly, fixing sessionCookie access patterns and dynamic import issues. Test suite includes lucia.test.ts (23 tests), session.service.test.ts (32 tests), and additional validation tests.
**Verification**: Verified via test suite execution - all packages/auth tests passing
**Impact**: Full test coverage restored for session management functionality, providing confidence in authentication system reliability.

### AUTH-002: Register session middleware in API server
**Completed**: 2026-01-15
**Resolution**: Session middleware properly registered in apps/api/src/server.ts at line 48 in the correct middleware order (after CORS, before rate limiting). The middleware validates session cookies and populates request.user and request.session for authenticated requests.
**Verification**: [apps/api/src/server.ts:48](https://github.com/ryandt33/raptscallions/blob/main/apps/api/src/server.ts#L48)
**Impact**: Session validation now runs on all API requests, enabling authentication-protected routes and user context tracking.

## References

**Source Reviews:**
- [E02-T002: Sessions table and Lucia setup - Code Review](/backlog/docs/reviews/E02/E02-T002-code-review.md)
- [Post-Docker Setup Review Summary](/backlog/docs/reviews/2026-01-12_post-docker-setup/_SUMMARY.md)

**Related Documentation:**
- [Session Lifecycle](/auth/concepts/sessions)
- [Lucia Configuration](/auth/concepts/lucia)
- [OAuth Providers](/auth/concepts/oauth)
- [Authentication Guards](/auth/patterns/guards)
