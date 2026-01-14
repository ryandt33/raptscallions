---
title: Auth Troubleshooting
description: Solutions for common authentication and authorization issues
---

# Auth Troubleshooting

Problem-solution guides for common auth issues.

## Topics

- [Session Issues](/auth/troubleshooting/session-issues) — Session not found, cookie problems, expiration, OAuth callback failures

## Quick Diagnosis

| Symptom | Likely Cause | See |
|---------|--------------|-----|
| 401 Unauthorized | Session expired or missing | [Session Issues](/auth/troubleshooting/session-issues#session-not-found) |
| 403 Forbidden | Missing permission or role | [Session Issues](/auth/troubleshooting/session-issues#permission-denied-unexpectedly) |
| 429 Too Many Requests | Rate limit exceeded | [Session Issues](/auth/troubleshooting/session-issues#rate-limit-issues) |
| OAuth redirect fails | State/verifier cookie issue | [Session Issues](/auth/troubleshooting/session-issues#oauth-callback-failures) |

## Debugging Checklist

1. Check cookies are being sent
2. Check session exists in database
3. Check user's group memberships
4. Check request.ability permissions
5. Check rate limit headers

## Related

- [Auth Concepts](/auth/concepts/) — Understanding how auth works
- [Auth Patterns](/auth/patterns/) — Implementation patterns
