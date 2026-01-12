# Workflow Guide v2

This document describes the intended workflow process. The orchestrator (config.yaml) will be updated to match this once validated.

---

## Key Principles

1. **Route reviews by task type** - Backend tasks skip UI reviews
2. **Specs are requirements, not code** - No implementation details in specs
3. **Fewer, more focused reviews** - Each reviewer has a clear, narrow scope
4. **Fail fast** - Catch issues in the right phase

---

## Task Types and Review Routing

Tasks are categorized by their labels. This determines which reviews they go through.

| Task Type | Labels | Review Path |
|-----------|--------|-------------|
| Backend | backend, api, database, auth, infrastructure | TECH_REVIEW → QA |
| Frontend | frontend, ui, web, components | TECH_REVIEW → UI_REVIEW → QA |
| Fullstack | fullstack | TECH_REVIEW → UI_REVIEW → QA |
| Docs | documentation, docs | TECH_REVIEW only |
| Infrastructure | devops, ci, deployment, docker | TECH_REVIEW → QA |

**Important**: Backend tasks should NEVER go through UI_REVIEW or UX_REVIEW. Those reviews are only for tasks that have user-facing components.

---

## Workflow States (Simplified)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PLANNING PHASE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   DRAFT ──→ SPEC_WRITING ──→ SPEC_REVIEW ──→ APPROVED                      │
│              (analyst)        (architect)                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           IMPLEMENTATION PHASE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   APPROVED ──→ IMPLEMENTING ──→ IMPLEMENTED                                │
│                 (developer)                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             REVIEW PHASE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   IMPLEMENTED ──→ TECH_REVIEW ──→ UI_REVIEW* ──→ QA ──→ DONE              │
│                    (reviewer)     (designer)     (qa)                       │
│                                                                             │
│   * UI_REVIEW only for frontend/fullstack tasks                            │
│                                                                             │
│   On rejection: → IMPLEMENTING (fix) → return to rejecting review          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### State Descriptions

| State | Agent | Purpose |
|-------|-------|---------|
| DRAFT | - | Task created, awaiting spec |
| SPEC_WRITING | analyst | Write requirements spec (NO code) |
| SPEC_REVIEW | architect | Validate architecture fit, scope, dependencies |
| APPROVED | - | Ready for implementation |
| IMPLEMENTING | developer | TDD: write tests, then code |
| IMPLEMENTED | - | Code complete, tests passing |
| TECH_REVIEW | reviewer | Code quality, patterns, security |
| UI_REVIEW | designer | Visual/UX quality (frontend only) |
| QA | qa | Acceptance criteria verification |
| DONE | - | Ready for PR/merge |

---

## Spec Writing Rules

### What Specs MUST Contain

1. **Overview** - What and why (1-2 paragraphs)
2. **Requirements** - Functional and non-functional
3. **Acceptance Criteria** - Specific, testable criteria
4. **Files** - Paths to create/modify (NO code)
5. **Dependencies** - Blocking tasks, new packages
6. **Test Strategy** - What to test (categories, not implementations)

### What Specs MUST NOT Contain

1. **Implementation code** - No TypeScript examples
2. **Library API details** - Developer discovers these
3. **Step-by-step instructions** - That's the developer's job
4. **Copy-paste code blocks** - Leads to outdated examples

### Example Spec Structure

```markdown
# Spec: E02-T007 - Rate Limiting Middleware

## Overview

Implement rate limiting to prevent abuse of auth endpoints and API routes.
Auth routes need stricter limits (5 req/min) than general API (100 req/min).

## Requirements

### Functional Requirements
- FR1: Auth routes (login, register) rate limited by IP address
- FR2: API routes rate limited by user ID (or IP if anonymous)
- FR3: Rate limit exceeded returns 429 with Retry-After header
- FR4: Per-route override capability for expensive operations

### Non-Functional Requirements
- NFR1: Use Redis for distributed rate limiting across instances
- NFR2: Rate limits configurable via environment variables

## Acceptance Criteria

- [ ] AC1: @fastify/rate-limit plugin configured with Redis backend
- [ ] AC2: Auth routes: 5 requests per minute per IP
- [ ] AC3: API routes: 100 requests per minute per user
- [ ] AC4: 429 response includes X-RateLimit-* headers
- [ ] AC5: Health endpoints exempt from rate limiting

## Files

### To Create
| Path | Purpose |
|------|---------|
| apps/api/src/middleware/rate-limit.middleware.ts | Rate limit plugin |
| packages/core/src/errors/rate-limit.error.ts | Error class |

### To Modify
| Path | Changes |
|------|---------|
| apps/api/src/server.ts | Register middleware |
| apps/api/src/config.ts | Add rate limit config |

## Dependencies
- Requires: E02-T001 (Fastify server setup)
- New packages: @fastify/rate-limit, ioredis

## Test Strategy

### What to Test
- Rate limit triggers after threshold exceeded
- Different limits for auth vs API routes
- Redis storage works across requests
- Retry-After header is accurate
- Health endpoints bypass rate limiting

### Test Categories
- Unit: Key generation, error formatting
- Integration: Actual rate limiting behavior
```

---

## Review Responsibilities

### SPEC_REVIEW (Architect)

**Checks:**
- Does this fit our architecture?
- Are dependencies identified correctly?
- Is scope appropriate for one task?
- Any security or performance concerns?
- Are acceptance criteria testable?

**Does NOT check:**
- UX concerns (that's post-implementation, frontend only)
- Code quality (no code exists yet)

### TECH_REVIEW (Code Reviewer)

**Checks:**
- Code quality and readability
- Follows project conventions (CONVENTIONS.md)
- No security vulnerabilities
- Test coverage adequate
- No unnecessary complexity
- Types are correct

**Does NOT check:**
- Visual appearance (that's UI_REVIEW)
- Acceptance criteria (that's QA)

### UI_REVIEW (Designer) - Frontend/Fullstack Only

**Checks:**
- Visual consistency with design system
- Accessibility (WCAG AA)
- Responsive behavior
- User experience patterns

**Does NOT check:**
- Code quality (that's TECH_REVIEW)
- Backend logic (not applicable)

### QA

**Checks:**
- All acceptance criteria from spec
- Tests run and pass
- Build succeeds
- No regressions introduced

**Does NOT check:**
- Code style (that's TECH_REVIEW)
- Visual design (that's UI_REVIEW)

---

## Rejection Handling

When a review rejects:

1. Task returns to IMPLEMENTING
2. Developer sees rejection feedback
3. Developer fixes issues
4. Task returns to the **rejecting** review (skips passed reviews)

Example:
```
TECH_REVIEW passes → UI_REVIEW rejects → IMPLEMENTING
→ fix → UI_REVIEW (skips TECH_REVIEW) → QA → DONE
```

### Max Rejections

After 3 rejection cycles on the same review, pause for human intervention.

---

## Migration from v1

The current config.yaml (v1) routes all tasks through UX_REVIEW and UI_REVIEW.
To align with v2:

1. **For backend tasks**: Manually skip UI_REVIEW by setting `workflow_state` directly
2. **For specs**: Follow the new spec format (no code)
3. **For reviews**: Focus only on your domain (see responsibilities above)

Once validated, config.yaml will be updated to implement automatic routing.
