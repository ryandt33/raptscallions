---
title: OAuth Providers
description: Google and Microsoft OAuth flows with PKCE and Arctic
related_code:
  - packages/auth/src/oauth.ts
  - packages/auth/src/oauth-state.ts
  - apps/api/src/services/oauth.service.ts
  - apps/api/src/routes/oauth.routes.ts
last_verified: 2026-01-14
---

# OAuth Providers

RaptScallions supports Google and Microsoft OAuth for authentication. The implementation uses Arctic (Lucia's companion library) with PKCE for enhanced security.

## Supported Providers

| Provider | Library | Scopes |
|----------|---------|--------|
| Google | `arctic.Google` | `email`, `profile` |
| Microsoft | `arctic.MicrosoftEntraId` | `User.Read`, `email`, `profile`, `openid` |

## OAuth Flow Overview

```
User clicks "Sign in with Google"
    ↓
GET /auth/google
    ↓
Generate state + code verifier (PKCE)
    ↓
Store in cookies, redirect to Google
    ↓
User authenticates with Google
    ↓
Google redirects to /auth/google/callback
    ↓
Validate state, exchange code for tokens
    ↓
Fetch user profile, create/link account
    ↓
Create session, redirect to /dashboard
```

## Client Configuration

OAuth clients are configured in `packages/auth/src/oauth.ts`:

```typescript
// packages/auth/src/oauth.ts
import { Google, MicrosoftEntraId } from "arctic";
import { config } from "@raptscallions/core";

export const googleOAuthClient: Google | null = (() => {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    return null;
  }

  return new Google(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    `${config.OAUTH_REDIRECT_BASE}/auth/google/callback`
  );
})();

export const microsoftOAuthClient: MicrosoftEntraId | null = (() => {
  if (!config.MICROSOFT_CLIENT_ID || !config.MICROSOFT_CLIENT_SECRET) {
    return null;
  }

  return new MicrosoftEntraId(
    "common",
    config.MICROSOFT_CLIENT_ID,
    config.MICROSOFT_CLIENT_SECRET,
    `${config.OAUTH_REDIRECT_BASE}/auth/microsoft/callback`
  );
})();
```

::: info Lazy Initialization
Clients are initialized at module load time. If credentials are missing, the client is `null` and the routes will return a 503 error.
:::

### Helper Functions

```typescript
export function requireGoogleOAuth(): Google {
  if (!googleOAuthClient) {
    throw new AppError("Google OAuth not configured", "OAUTH_NOT_CONFIGURED", 503);
  }
  return googleOAuthClient;
}

export function requireMicrosoftOAuth(): MicrosoftEntraId {
  if (!microsoftOAuthClient) {
    throw new AppError("Microsoft OAuth not configured", "OAUTH_NOT_CONFIGURED", 503);
  }
  return microsoftOAuthClient;
}
```

## Environment Variables

```bash
# .env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
OAUTH_REDIRECT_BASE=http://localhost:3000
```

## PKCE and State Management

### State Parameter (CSRF Protection)

The state parameter prevents CSRF attacks by ensuring the callback came from a request we initiated.

```typescript
// packages/auth/src/oauth-state.ts
import { generateState, generateCodeVerifier } from "arctic";

export const OAUTH_STATE_COOKIE = "oauth_state";
export const OAUTH_CODE_VERIFIER_COOKIE = "oauth_code_verifier";
export const OAUTH_STATE_MAX_AGE = 60 * 10; // 10 minutes

export function generateOAuthState(): string {
  return generateState();
}

export function validateOAuthState(
  receivedState: string | undefined,
  storedState: string | undefined
): boolean {
  if (!receivedState || !storedState) {
    return false;
  }
  return receivedState === storedState;
}
```

### PKCE (Proof Key for Code Exchange)

PKCE adds an extra layer of security by proving the callback request came from the same client that initiated the flow.

```typescript
export function generateOAuthCodeVerifier(): string {
  return generateCodeVerifier();
}
```

## Initiating OAuth Flow

```typescript
// apps/api/src/services/oauth.service.ts
export async function initiateGoogleOAuth(reply: FastifyReply): Promise<void> {
  const google = requireGoogleOAuth();
  const state = generateOAuthState();
  const codeVerifier = generateOAuthCodeVerifier();

  const url = google.createAuthorizationURL(state, codeVerifier, [
    "email",
    "profile",
  ]);

  // Store state in cookie for CSRF protection
  reply.setCookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: OAUTH_STATE_MAX_AGE,
    path: "/",
  });

  // Store code verifier in cookie for PKCE
  reply.setCookie(OAUTH_CODE_VERIFIER_COOKIE, codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: OAUTH_STATE_MAX_AGE,
    path: "/",
  });

  reply.redirect(url.toString());
}
```

## Handling OAuth Callback

```typescript
// apps/api/src/services/oauth.service.ts
export async function handleGoogleCallback(
  db: Database,
  request: FastifyRequest<{ Querystring: { code?: string; state?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { code, state, error } = request.query;
  const storedState = request.cookies[OAUTH_STATE_COOKIE];
  const storedCodeVerifier = request.cookies[OAUTH_CODE_VERIFIER_COOKIE];

  // Handle OAuth provider errors
  if (error) {
    throw new UnauthorizedError("Google authentication failed");
  }

  // Validate state parameter (CSRF protection)
  if (!validateOAuthState(state, storedState)) {
    throw new UnauthorizedError("Invalid OAuth state");
  }

  // Validate code and verifier
  if (!code || !storedCodeVerifier) {
    throw new UnauthorizedError("Missing authorization code or verifier");
  }

  const google = requireGoogleOAuth();

  // Exchange code for tokens (with PKCE verification)
  const tokens = await google.validateAuthorizationCode(code, storedCodeVerifier);

  // Fetch user profile
  const response = await fetch("https://www.googleapis.com/oauth2/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.accessToken()}` },
  });

  const rawProfile: unknown = await response.json();
  const googleUser = googleUserProfileSchema.parse(rawProfile);

  // Verify email
  if (!googleUser.email_verified) {
    throw new UnauthorizedError("Email not verified with Google");
  }

  // Find or create user
  const user = await findOrCreateOAuthUser(db, googleUser.email, googleUser.name);

  // Create session
  const session = await lucia.createSession(user.id, {
    context: "oauth_google",
    last_activity_at: new Date(),
  });

  reply.setCookie("rapt_session", session.id, sessionService.sessionCookieAttributes);

  // Clear OAuth cookies
  reply.setCookie(OAUTH_STATE_COOKIE, "", { maxAge: 0 });
  reply.setCookie(OAUTH_CODE_VERIFIER_COOKIE, "", { maxAge: 0 });

  reply.redirect("/dashboard");
}
```

## Account Linking

OAuth accounts are linked by email address. If a user with the same email already exists, they're logged in to that account.

```typescript
async function findOrCreateOAuthUser(
  db: Database,
  email: string,
  name: string
): Promise<User> {
  // Find existing user by email
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    return existingUser; // Link to existing account
  }

  // Create new user (password_hash is null for OAuth users)
  const [newUser] = await db
    .insert(users)
    .values({
      email,
      name,
      status: "active",
      // passwordHash is null for OAuth users
    })
    .returning();

  return newUser;
}
```

::: warning Email Verification
Google OAuth requires email verification (`email_verified: true`). Users with unverified emails cannot authenticate.
:::

## API Routes

```typescript
// apps/api/src/routes/oauth.routes.ts
export const oauthRoutes: FastifyPluginAsync = async (app) => {
  // Initiate Google OAuth
  app.get("/google", async (request, reply) => {
    await initiateGoogleOAuth(reply);
  });

  // Handle Google callback
  app.get("/google/callback", async (request, reply) => {
    await handleGoogleCallback(db, request, reply);
  });

  // Initiate Microsoft OAuth
  app.get("/microsoft", async (request, reply) => {
    await initiateMicrosoftOAuth(reply);
  });

  // Handle Microsoft callback
  app.get("/microsoft/callback", async (request, reply) => {
    await handleMicrosoftCallback(db, request, reply);
  });
};
```

## Error Handling

| Scenario | Error | Status |
|----------|-------|--------|
| Provider not configured | `OAUTH_NOT_CONFIGURED` | 503 |
| Invalid state parameter | `UnauthorizedError` | 401 |
| Missing authorization code | `UnauthorizedError` | 401 |
| Profile fetch failed | `OAUTH_PROFILE_FETCH_FAILED` | 502 |
| Email not verified | `UnauthorizedError` | 401 |
| Provider returns error | `UnauthorizedError` | 401 |

## Security Considerations

### Cookie Security

OAuth state cookies use strict security settings:

```typescript
{
  httpOnly: true,           // No JavaScript access
  secure: true,             // HTTPS only in production
  sameSite: "lax",          // CSRF protection
  maxAge: 600,              // 10 minute expiration
  path: "/",                // Available to all routes
}
```

### State Validation

- State is generated with cryptographically random bytes
- State is stored in an httpOnly cookie
- State from callback is compared against stored value
- Cookies are cleared after use (success or failure)

### PKCE Verification

- Code verifier is generated with cryptographically random bytes
- Stored securely in httpOnly cookie
- Sent during token exchange
- Provider verifies the code challenge

## Provider-Specific Notes

### Google

- Uses Google OAuth 2.0
- Profile endpoint: `https://www.googleapis.com/oauth2/v1/userinfo`
- Requires `email_verified: true`
- Uses `email` and `name` from profile

### Microsoft

- Uses Microsoft Entra ID (formerly Azure AD)
- Tenant ID: `common` (allows personal and work/school accounts)
- Profile endpoint: `https://graph.microsoft.com/v1.0/me`
- Email from `mail` or `userPrincipalName`
- Uses `displayName` for name

## Related Pages

- [Session Lifecycle](/auth/concepts/sessions) — How OAuth sessions work
- [Lucia Configuration](/auth/concepts/lucia) — Session management after OAuth
- [Authentication Guards](/auth/patterns/guards) — Protecting routes for OAuth users
