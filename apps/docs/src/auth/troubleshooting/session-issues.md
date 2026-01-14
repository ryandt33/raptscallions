---
title: Session Issues
description: Troubleshooting session not found, cookie problems, and expiration issues
related_code:
  - packages/auth/src/session.service.ts
  - apps/api/src/middleware/session.middleware.ts
last_verified: 2026-01-14
---

# Session Issues

Common authentication issues and how to resolve them.

## Session Not Found

**Symptom**: User is logged out unexpectedly, or `request.user` is `null` when it shouldn't be.

### Possible Causes

**1. Session expired**

Sessions expire after 30 days of inactivity. If the user hasn't made a request recently, the session may have expired.

**Resolution**: User needs to log in again. This is expected behavior.

**2. Session invalidated**

Sessions are invalidated when:
- User logs out
- Admin invalidates all user sessions
- Password is changed

**Resolution**: User needs to log in again. Check if any of these events occurred.

**3. Cookie not sent**

The browser may not be sending the session cookie.

**Debugging steps:**

```typescript
// In route handler, log the cookies
console.log("Cookies:", request.cookies);
console.log("Session cookie:", request.cookies.rapt_session);
```

**Common causes:**
- Cross-origin requests without `credentials: 'include'`
- Cookie blocked by browser privacy settings
- Cookie expired (browser-cleared session cookie)

**Resolution:**

```typescript
// Client-side: include credentials
fetch('/api/profile', {
  credentials: 'include'
});
```

**4. Cookie domain mismatch**

Cookies are domain-specific. If the API is on a different domain than the frontend, cookies won't be sent.

**Resolution**: Ensure API and frontend are on the same domain, or configure cookies for the parent domain.

## Cookie Not Set After Login

**Symptom**: Login succeeds but subsequent requests show user as unauthenticated.

### Possible Causes

**1. Missing reply.setCookie**

Verify the login route sets the cookie:

```typescript
const sessionCookie = lucia.createSessionCookie(sessionId);
reply.setCookie(
  sessionCookie.name,
  sessionCookie.value,
  sessionCookie.attributes
);
```

**2. Secure cookie in development**

The `secure` attribute prevents cookies from being set over HTTP.

**Resolution**: Ensure `NODE_ENV !== 'production'` in development, or use HTTPS.

```typescript
// packages/auth/src/lucia.ts
sessionCookie: {
  attributes: {
    secure: process.env.NODE_ENV === "production", // false in dev
  },
}
```

**3. SameSite blocking**

The `sameSite: 'lax'` attribute blocks cookies on cross-origin POST requests.

**Resolution**: Use `sameSite: 'none'` with `secure: true` for cross-origin, or keep requests same-origin.

## Invalid Session Error

**Symptom**: Getting "Invalid session" error even with a valid-looking session ID.

### Possible Causes

**1. Malformed session ID**

Session IDs have a specific format. If tampered with, validation fails.

```typescript
// packages/auth/src/session.service.ts
async validate(sessionId: string): Promise<SessionValidationResult> {
  try {
    return await lucia.validateSession(sessionId);
  } catch (error) {
    throw new UnauthorizedError("Invalid session");
  }
}
```

**Resolution**: Clear cookies and log in again. Check if the cookie is being modified by proxies or middleware.

**2. Session ID from different environment**

Session IDs from staging won't work in production (different databases).

**Resolution**: Use the correct environment's credentials.

**3. Database connection issues**

If the database is unreachable, session validation fails.

**Debugging:**

```typescript
// Check database connectivity
const session = await db.query.sessions.findFirst({
  where: eq(sessions.id, sessionId)
});
console.log("Session in DB:", session);
```

## Session Not Extending

**Symptom**: User is logged out after inactivity even when actively using the app.

### Possible Causes

**1. Fresh session logic not working**

Sessions are only extended when "fresh" (< 50% lifetime remaining). If requests happen too frequently early in the session lifecycle, extension doesn't occur.

**Expected behavior**: Extension happens automatically when session is past 50% of its lifetime.

**2. Cookie not being updated**

The middleware should set a new cookie when the session is extended:

```typescript
if (session?.fresh) {
  reply.setCookie(
    sessionService.sessionCookieName,
    session.id,
    sessionService.sessionCookieAttributes
  );
}
```

**Debugging:**

```typescript
// Log fresh session detection
console.log("Session fresh:", session?.fresh);
console.log("Session expires:", session?.expiresAt);
```

## OAuth Callback Failures

**Symptom**: OAuth login redirects back to app but user isn't logged in.

### Possible Causes

**1. Invalid state parameter**

The state cookie expired or was cleared before callback.

```
Error: Invalid OAuth state
```

**Resolution**: State cookies expire after 10 minutes. Complete OAuth flow quickly, or check cookie settings.

**2. Missing code verifier**

PKCE verification failed because the code verifier cookie was lost.

```
Error: Missing code verifier
```

**Resolution**: Same as state - check cookie settings and complete flow quickly.

**3. OAuth provider error**

The provider returned an error (user denied consent, invalid credentials).

**Debugging:**

```typescript
// Log the error from provider
const { error } = request.query;
if (error) {
  console.log("OAuth provider error:", error);
}
```

**4. Email not verified (Google)**

Google OAuth requires verified email addresses.

```
Error: Email not verified with Google
```

**Resolution**: User must verify their Google email address.

## Permission Denied Unexpectedly

**Symptom**: User is authenticated but gets 403 Forbidden on routes they should access.

### Possible Causes

**1. Missing group membership**

User's group memberships determine permissions. If not a member of any group, most permissions are denied.

**Debugging:**

```typescript
// Check user's memberships
const memberships = await db.query.groupMembers.findMany({
  where: eq(groupMembers.userId, request.user.id),
});
console.log("User memberships:", memberships);
```

**2. Role insufficient for action**

The user has a group membership but their role doesn't grant the required permission.

**Debugging:**

```typescript
// Check ability
console.log("Can create Tool?", request.ability.can("create", "Tool"));
console.log("User roles:", memberships.map(m => m.role));
```

**3. Stale permissions**

Permissions are built on each request from current memberships. If memberships were just changed, ensure the user makes a new request.

## Rate Limit Issues

**Symptom**: Getting 429 Too Many Requests unexpectedly.

### Possible Causes

**1. Shared IP blocking**

In schools or offices, multiple users share an IP. If one user makes many unauthenticated requests, it affects everyone.

**Resolution**: Authenticate users to switch to user-based rate limiting.

**2. Auth route limit too restrictive**

Auth routes have a 5/min limit. Multiple failed login attempts trigger this quickly.

**Debugging:**

```bash
# Check remaining requests
curl -I http://localhost:3000/api/health
# Look for X-RateLimit-Remaining header
```

**3. Redis connection issues**

If Redis is unavailable, rate limiting may behave unexpectedly.

**Resolution**: Check Redis connectivity and logs.

## Debugging Checklist

When troubleshooting auth issues:

1. **Check cookies**
   ```typescript
   console.log("Cookies:", request.cookies);
   ```

2. **Check session**
   ```typescript
   console.log("Session:", request.session);
   console.log("User:", request.user);
   ```

3. **Check ability**
   ```typescript
   console.log("Ability rules:", request.ability.rules);
   ```

4. **Check database**
   ```sql
   SELECT * FROM sessions WHERE user_id = 'uuid-here';
   SELECT * FROM group_members WHERE user_id = 'uuid-here';
   ```

5. **Check logs**
   - Session middleware logs
   - Permission middleware logs
   - Rate limit logs

## Related Pages

- [Session Lifecycle](/auth/concepts/sessions) — How sessions work
- [Lucia Configuration](/auth/concepts/lucia) — Session and cookie setup
- [OAuth Providers](/auth/concepts/oauth) — OAuth flow details
- [CASL Permissions](/auth/concepts/casl) — How permissions are built
