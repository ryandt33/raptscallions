---
title: AI Gateway Integration Improvements
description: Technical debt, enhancements, and optimizations for the AI domain
implements_task: E06-T012
last_verified: 2026-01-15
---

# AI Gateway Integration Improvements

Recommendations for improving OpenRouter client, streaming patterns, error handling, and model management. Items sourced from epic reviews, code reviews, and production monitoring.

## Domain Overview

**Current State:**
- OpenRouter client with SSE streaming
- Support for multiple AI models
- Type-safe request/response handling
- Comprehensive error handling

**Recent Changes:**
- E04 completed: OpenRouter client foundation
- Streaming SSE implementation working
- Test coverage comprehensive

## Active Recommendations

### Critical (Blocking)

::: tip No Critical Items
No blocking items currently. 🎉
:::

### High Priority

No high priority items currently.

### Medium Priority

| ID | Issue | Description | Impact | Effort | Tracking | Added |
|----|-------|-------------|--------|--------|----------|-------|
| AI-002 | Security | Encryption key rotation procedure not documented | Medium | Medium | Backlog | 2026-01-16 |

**AI-002 Details:**
- **Source**: E04 Epic Review - Credential Management Discussion
- **Description**: The credential encryption system (XChaCha20-Poly1305 via `@noble/ciphers`) requires a documented key rotation procedure. Currently there's no process for rotating the `CREDENTIAL_ENCRYPTION_KEY` without data loss.
- **Impact**: Without key rotation capability, compromised keys or compliance requirements (periodic rotation policies) cannot be addressed safely
- **Blocking**: No - system works, but operational security is incomplete
- **Why This Matters**:
  - Key compromise requires re-encryption with new key
  - Compliance policies may mandate periodic rotation (e.g., 90-day rotation)
  - Staff turnover may necessitate key changes
  - No current path to recover if rotation is needed
- **Suggested Implementation**:
  1. **Phase 1**: Document manual rotation procedure
     - Decrypt all credentials with old key
     - Re-encrypt with new key
     - Update environment variable
     - Verify all credentials still work
  2. **Phase 2**: CLI tool for automated rotation
     ```bash
     pnpm credential:rotate --old-key <hex> --new-key <hex>
     ```
  3. **Phase 3**: Consider dual-key support during transition
     - Allow old key as fallback during migration window
     - Auto-upgrade on decrypt (re-encrypt with new key)
- **Security Considerations**:
  - Rotation must be atomic (all-or-nothing)
  - Old key should be securely destroyed after rotation
  - Audit log should record rotation events
  - Backup strategy before rotation is critical
- **Related Tasks**: [E04-T012: AI credentials schema and encryption](/backlog/tasks/E04/E04-T012.md)

### Low Priority

| ID | Issue | Description | Impact | Effort | Tracking | Added |
|----|-------|-------------|--------|--------|----------|-------|
| AI-001 | Error Handling | Store timeout as instance variable in OpenRouter client | Low | Trivial | Backlog | 2026-01-15 |

**AI-001 Details:**
- **Source**: [E04-T002 Code Review](/backlog/docs/reviews/E04/E04-T002-code-review.md) (Should Fix #2)
- **Description**: Error handler accesses global `aiConfig.AI_REQUEST_TIMEOUT_MS` instead of client's configured timeout when creating `TimeoutError`
- **Impact**: Error messages show incorrect timeout value if client was constructed with custom timeout
- **Mitigation**: Store configured timeout as instance variable and use in error handler
- **Blocking**: No - functionality works, just error message accuracy
- **Suggested Implementation**:
  ```typescript
  // Store configured timeout in instance
  private timeout: number;

  constructor(options) {
    this.timeout = options?.timeout ?? aiConfig.AI_REQUEST_TIMEOUT_MS;
  }

  // Then in handleError:
  return new TimeoutError(this.timeout);
  ```

## Completed Improvements

Archive of addressed recommendations with implementation details.

::: info No Completed Items Yet
As improvements are implemented, they will be moved here with completion date and task reference.
:::

## Notes

The AI domain is in early stages with solid foundation. Future improvements will likely focus on:
- Performance optimization for streaming
- Retry strategies for transient failures
- Model selection and routing logic
- Cost tracking and monitoring

## References

**Source Reviews:**
- [Post-Docker Setup Review Summary](/backlog/docs/reviews/2026-01-12_post-docker-setup/_SUMMARY.md)
- [E04-T002: OpenRouter client](/backlog/completed/E04/E04-T002.md)

**Related Documentation:**
- [AI Overview](/ai/)
- [AI Concepts](/ai/concepts/) (coming soon)
- [AI Patterns](/ai/patterns/) (coming soon)
