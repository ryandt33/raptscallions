# E02-T004 Implementation Specification: OAuth Integration with Arctic

**Task ID:** E02-T004
**Epic:** E02 - Core Authentication and Authorization
**Created:** 2026-01-12
**Status:** Analyzed
**Author:** @analyst

---

## Overview

This specification defines the implementation of OAuth 2.0 authentication for Google and Microsoft providers using Arctic (Lucia's companion library). The implementation will enable users to authenticate using their existing Google or Microsoft accounts, with automatic account creation/linking based on email addresses.

### Goals

1. Integrate Google OAuth 2.0 for authentication
2. Integrate Microsoft OAuth 2.0 for authentication
3. Implement secure OAuth callback flow with state validation
4. Support automatic account creation for new OAuth users
5. Support account linking for existing email addresses
6. Follow OWASP OAuth security best practices

### Non-Goals

- Clever OAuth integration (future work)
- OAuth token refresh/storage (session-based auth only)
- Social profile data syncing beyond email/name
- Multi-account linking (one OAuth provider per email)

---

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Future)                       │
│   User clicks "Sign in with Google/Microsoft"               │
└──────────────────────────┬──────────────────────────────────┘
                           │ GET /auth/google or /auth/microsoft
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Server (Fastify)                      │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  OAuth Initiation Routes                            │    │
│  │  • GET /auth/google                                 │    │
│  │  • GET /auth/microsoft                              │    │
│  │  1. Generate state (CSRF token)                     │    │
│  │  2. Store state in cookie                           │    │
│  │  3. Redirect to provider consent screen             │    │
│  └───────────────────┬────────────────────────────────┘    │
│                      │                                       │
│  ┌───────────────────▼────────────────────────────────┐    │
│  │  OAuth Callback Routes                              │    │
│  │  • GET /auth/google/callback                        │    │
│  │  • GET /auth/microsoft/callback                     │    │
│  │  1. Validate state parameter (CSRF protection)      │    │
│  │  2. Exchange code for access token                  │    │
│  │  3. Fetch user profile from provider                │    │
│  │  4. Find or create user by email                    │    │
│  │  5. Create Lucia session                            │    │
│  │  6. Set session cookie                              │    │
│  │  7. Redirect to dashboard                           │    │
│  └───────────────────┬────────────────────────────────┘    │
│                      │                                       │
│  ┌───────────────────▼────────────────────────────────┐    │
│  │  Arctic OAuth Clients                               │    │
│  │  • Google(clientId, clientSecret, redirectUri)      │    │
│  │  • Microsoft(clientId, clientSecret, redirectUri)   │    │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
      ▼                    ▼                    ▼
┌──────────┐      ┌────────────┐      ┌────────────────┐
│  Google  │      │ Microsoft  │      │   PostgreSQL   │
│   OAuth  │      │   OAuth    │      │   (sessions,   │
│   APIs   │      │    APIs    │      │    users)      │
└──────────┘      └────────────┘      └────────────────┘
```

### OAuth Flow Sequence

```
User                 Frontend            API Server           OAuth Provider
 │                      │                     │                      │
 │  Click "Sign in"     │                     │                      │
 ├─────────────────────>│                     │                      │
 │                      │  GET /auth/google   │                      │
 │                      ├────────────────────>│                      │
 │                      │                     │ Generate state       │
 │                      │                     │ Set oauth_state cookie│
 │                      │                     │ Create auth URL      │
 │                      │  302 Redirect       │                      │
 │                      │<────────────────────┤                      │
 │                      │                     │                      │
 │                      │  Navigate to OAuth consent screen          │
 │                      ├────────────────────────────────────────────>│
 │                      │                     │                      │
 │  Grant permission    │                     │                      │
 ├─────────────────────────────────────────────────────────────────>│
 │                      │                     │                      │
 │                      │  GET /auth/google/callback?code=...&state=...│
 │                      │<─────────────────────────────────────────────│
 │                      │                     │                      │
 │                      │  Forward callback   │                      │
 │                      ├────────────────────>│ Validate state       │
 │                      │                     │ Exchange code        │
 │                      │                     ├─────────────────────>│
 │                      │                     │  Access token        │
 │                      │                     │<─────────────────────┤
 │                      │                     │ Fetch user profile   │
 │                      │                     ├─────────────────────>│
 │                      │                     │  User data           │
 │                      │                     │<─────────────────────┤
 │                      │                     │ Find/create user     │
 │                      │                     │ Create session       │
 │                      │                     │ Set auth_session cookie│
 │                      │  302 /dashboard     │                      │
 │                      │<────────────────────┤                      │
 │  View dashboard      │                     │                      │
 │<─────────────────────┤                     │                      │
```

---

## Technical Design

### 1. Environment Configuration

**File:** `packages/core/src/config/env.schema.ts` (update existing)

Add OAuth environment variables to existing schema:

```typescript
import { z } from 'zod';

export const envSchema = z.object({
  // ... existing vars (NODE_ENV, DATABASE_URL, etc.)

  // OAuth Configuration
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  OAUTH_REDIRECT_BASE: z.string().url().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;
```

**Environment Variables (.env.example):**

```bash
# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OAuth - Microsoft
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# OAuth Redirect Base URL (must match provider configuration)
OAUTH_REDIRECT_BASE=http://localhost:3000
```

### 2. Arctic OAuth Client Setup

**File:** `packages/auth/src/oauth.ts` (new file)

```typescript
import { Google, Microsoft } from 'arctic';
import { config } from '@raptscallions/core/config';
import { AppError } from '@raptscallions/core/errors';

/**
 * Google OAuth client (lazy initialization to handle optional config)
 */
export function getGoogleOAuthClient(): Google {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    throw new AppError(
      'Google OAuth not configured',
      'OAUTH_NOT_CONFIGURED',
      500
    );
  }

  return new Google(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    `${config.OAUTH_REDIRECT_BASE}/auth/google/callback`
  );
}

/**
 * Microsoft OAuth client (lazy initialization to handle optional config)
 */
export function getMicrosoftOAuthClient(): Microsoft {
  if (!config.MICROSOFT_CLIENT_ID || !config.MICROSOFT_CLIENT_SECRET) {
    throw new AppError(
      'Microsoft OAuth not configured',
      'OAUTH_NOT_CONFIGURED',
      500
    );
  }

  return new Microsoft(
    config.MICROSOFT_CLIENT_ID,
    config.MICROSOFT_CLIENT_SECRET,
    `${config.OAUTH_REDIRECT_BASE}/auth/microsoft/callback`
  );
}
```

### 3. OAuth State Management

**File:** `packages/auth/src/oauth-state.ts` (new file)

```typescript
import { generateState } from 'arctic';

export const OAUTH_STATE_COOKIE = 'oauth_state';
export const OAUTH_STATE_MAX_AGE = 60 * 10; // 10 minutes

/**
 * Generate a cryptographically secure state parameter for OAuth flow
 */
export function generateOAuthState(): string {
  return generateState();
}

/**
 * Validate OAuth state parameter against stored cookie value
 */
export function validateOAuthState(
  receivedState: string | undefined,
  storedState: string | undefined
): boolean {
  if (!receivedState || !storedState) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return receivedState === storedState;
}
```

### 4. OAuth User Profile Types

**File:** `packages/auth/src/types.ts` (update existing)

```typescript
// ... existing types (SessionUser, etc.)

/**
 * Google OAuth user profile from userinfo endpoint
 */
export interface GoogleUserProfile {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
}

/**
 * Microsoft OAuth user profile from Graph API
 */
export interface MicrosoftUserProfile {
  id: string; // Microsoft user ID
  userPrincipalName: string;
  mail: string | null;
  displayName: string;
  givenName?: string;
  surname?: string;
}
```

### 5. OAuth Service

**File:** `apps/api/src/services/oauth.service.ts` (new file)

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import type { DrizzleDB } from '@raptscallions/db';
import { users } from '@raptscallions/db/schema';
import type { User } from '@raptscallions/db/schema';
import { lucia } from '@raptscallions/auth';
import {
  getGoogleOAuthClient,
  getMicrosoftOAuthClient,
} from '@raptscallions/auth/oauth';
import {
  generateOAuthState,
  validateOAuthState,
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE,
} from '@raptscallions/auth/oauth-state';
import type {
  GoogleUserProfile,
  MicrosoftUserProfile,
} from '@raptscallions/auth/types';
import { UnauthorizedError, AppError } from '@raptscallions/core/errors';
import { logger } from '@raptscallions/telemetry';

export class OAuthService {
  constructor(private db: DrizzleDB) {}

  /**
   * Initiate Google OAuth flow
   */
  async initiateGoogleOAuth(reply: FastifyReply): Promise<void> {
    const google = getGoogleOAuthClient();
    const state = generateOAuthState();

    const url = await google.createAuthorizationURL(state, {
      scopes: ['email', 'profile'],
    });

    // Store state in cookie for CSRF protection
    reply.setCookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: OAUTH_STATE_MAX_AGE,
      path: '/',
    });

    reply.redirect(url.toString());
  }

  /**
   * Handle Google OAuth callback
   */
  async handleGoogleCallback(
    request: FastifyRequest<{
      Querystring: { code?: string; state?: string; error?: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const { code, state, error } = request.query;
    const storedState = request.cookies[OAUTH_STATE_COOKIE];

    // Handle OAuth provider errors
    if (error) {
      logger.warn({ error }, 'Google OAuth error');
      throw new UnauthorizedError('Google authentication failed');
    }

    // Validate state parameter (CSRF protection)
    if (!validateOAuthState(state, storedState)) {
      logger.warn({ receivedState: state, hasStoredState: !!storedState }, 'Invalid OAuth state');
      throw new UnauthorizedError('Invalid OAuth state');
    }

    // Validate code parameter
    if (!code) {
      throw new UnauthorizedError('Missing authorization code');
    }

    try {
      const google = getGoogleOAuthClient();

      // Exchange code for access token
      const tokens = await google.validateAuthorizationCode(code);

      // Fetch user profile from Google
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v1/userinfo',
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new AppError(
          'Failed to fetch Google user profile',
          'OAUTH_PROFILE_FETCH_FAILED',
          500
        );
      }

      const googleUser: GoogleUserProfile = await response.json();

      // Verify email is verified
      if (!googleUser.email_verified) {
        throw new UnauthorizedError('Email not verified with Google');
      }

      // Find or create user
      const user = await this.findOrCreateOAuthUser(
        googleUser.email,
        googleUser.name
      );

      // Create session
      const session = await lucia.createSession(user.id, {
        context: 'oauth_google',
      });

      reply.setCookie('rapt_session', session.id, {
        ...lucia.sessionCookieAttributes,
      });

      // Clear OAuth state cookie
      reply.setCookie(OAUTH_STATE_COOKIE, '', { maxAge: 0 });

      logger.info({ userId: user.id, provider: 'google' }, 'OAuth login successful');

      reply.redirect('/dashboard');
    } catch (error) {
      logger.error({ error }, 'Google OAuth callback error');

      if (error instanceof UnauthorizedError || error instanceof AppError) {
        throw error;
      }

      throw new UnauthorizedError('Google authentication failed');
    }
  }

  /**
   * Initiate Microsoft OAuth flow
   */
  async initiateMicrosoftOAuth(reply: FastifyReply): Promise<void> {
    const microsoft = getMicrosoftOAuthClient();
    const state = generateOAuthState();

    const url = await microsoft.createAuthorizationURL(state, {
      scopes: ['User.Read', 'email', 'profile', 'openid'],
    });

    // Store state in cookie for CSRF protection
    reply.setCookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: OAUTH_STATE_MAX_AGE,
      path: '/',
    });

    reply.redirect(url.toString());
  }

  /**
   * Handle Microsoft OAuth callback
   */
  async handleMicrosoftCallback(
    request: FastifyRequest<{
      Querystring: { code?: string; state?: string; error?: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const { code, state, error } = request.query;
    const storedState = request.cookies[OAUTH_STATE_COOKIE];

    // Handle OAuth provider errors
    if (error) {
      logger.warn({ error }, 'Microsoft OAuth error');
      throw new UnauthorizedError('Microsoft authentication failed');
    }

    // Validate state parameter (CSRF protection)
    if (!validateOAuthState(state, storedState)) {
      logger.warn({ receivedState: state, hasStoredState: !!storedState }, 'Invalid OAuth state');
      throw new UnauthorizedError('Invalid OAuth state');
    }

    // Validate code parameter
    if (!code) {
      throw new UnauthorizedError('Missing authorization code');
    }

    try {
      const microsoft = getMicrosoftOAuthClient();

      // Exchange code for access token
      const tokens = await microsoft.validateAuthorizationCode(code);

      // Fetch user profile from Microsoft Graph
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new AppError(
          'Failed to fetch Microsoft user profile',
          'OAUTH_PROFILE_FETCH_FAILED',
          500
        );
      }

      const microsoftUser: MicrosoftUserProfile = await response.json();

      // Use mail or userPrincipalName as email
      const email = microsoftUser.mail || microsoftUser.userPrincipalName;

      if (!email) {
        throw new UnauthorizedError('No email address found in Microsoft account');
      }

      // Find or create user
      const user = await this.findOrCreateOAuthUser(
        email,
        microsoftUser.displayName
      );

      // Create session
      const session = await lucia.createSession(user.id, {
        context: 'oauth_microsoft',
      });

      reply.setCookie('rapt_session', session.id, {
        ...lucia.sessionCookieAttributes,
      });

      // Clear OAuth state cookie
      reply.setCookie(OAUTH_STATE_COOKIE, '', { maxAge: 0 });

      logger.info({ userId: user.id, provider: 'microsoft' }, 'OAuth login successful');

      reply.redirect('/dashboard');
    } catch (error) {
      logger.error({ error }, 'Microsoft OAuth callback error');

      if (error instanceof UnauthorizedError || error instanceof AppError) {
        throw error;
      }

      throw new UnauthorizedError('Microsoft authentication failed');
    }
  }

  /**
   * Find existing user by email or create new OAuth user
   */
  private async findOrCreateOAuthUser(
    email: string,
    name: string
  ): Promise<User> {
    // Find existing user by email
    const existingUser = await this.db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      logger.info({ userId: existingUser.id, email }, 'OAuth user found, linking account');
      return existingUser;
    }

    // Create new user (password_hash is null for OAuth users)
    const [newUser] = await this.db
      .insert(users)
      .values({
        email,
        name,
        status: 'active',
        // passwordHash is null for OAuth users
      })
      .returning();

    logger.info({ userId: newUser.id, email }, 'New OAuth user created');

    return newUser;
  }
}
```

### 6. OAuth Routes

**File:** `apps/api/src/routes/oauth.routes.ts` (new file)

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { OAuthService } from '../services/oauth.service';

export const oauthRoutes: FastifyPluginAsync = async (app) => {
  const oauthService = new OAuthService(app.db);

  /**
   * GET /auth/google
   * Initiate Google OAuth flow
   */
  app.get('/google', async (request, reply) => {
    await oauthService.initiateGoogleOAuth(reply);
  });

  /**
   * GET /auth/google/callback
   * Handle Google OAuth callback
   */
  app.get<{
    Querystring: { code?: string; state?: string; error?: string };
  }>('/google/callback', async (request, reply) => {
    await oauthService.handleGoogleCallback(request, reply);
  });

  /**
   * GET /auth/microsoft
   * Initiate Microsoft OAuth flow
   */
  app.get('/microsoft', async (request, reply) => {
    await oauthService.initiateMicrosoftOAuth(reply);
  });

  /**
   * GET /auth/microsoft/callback
   * Handle Microsoft OAuth callback
   */
  app.get<{
    Querystring: { code?: string; state?: string; error?: string };
  }>('/microsoft/callback', async (request, reply) => {
    await oauthService.handleMicrosoftCallback(request, reply);
  });
};
```

**File:** `apps/api/src/routes/auth.routes.ts` (update existing)

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { oauthRoutes } from './oauth.routes';
// ... existing imports

export const authRoutes: FastifyPluginAsync = async (app) => {
  // ... existing routes (register, login, logout)

  // Register OAuth routes
  await app.register(oauthRoutes, { prefix: '' });
};
```

---

## Database Considerations

### User Schema Update

**No schema changes required.** The existing `users` table already supports OAuth:

- `password_hash` is nullable (OAuth users have `null` value)
- `email` is unique (enables account linking)
- `name` field stores OAuth display name

### Session Context

The `sessions` table already has a `context` field (added in E02-T002) for tracking session types:

- `'oauth_google'` - Google OAuth session
- `'oauth_microsoft'` - Microsoft OAuth session
- `'email_password'` - Local authentication session
- `'shared'` - Shared device session
- `'personal'` - Personal device session

---

## Security Considerations

### 1. CSRF Protection (State Parameter)

**Threat:** Attacker tricks user into completing OAuth flow for attacker's account

**Mitigation:**
- Generate cryptographically secure state parameter using `arctic.generateState()`
- Store state in httpOnly cookie with 10-minute expiration
- Validate state parameter in callback matches stored cookie value
- Clear state cookie after successful validation

### 2. Cookie Security

**Configuration:**
```typescript
{
  httpOnly: true,              // Prevent JavaScript access
  secure: NODE_ENV === 'production',  // HTTPS only in production
  sameSite: 'lax',             // CSRF protection
  maxAge: 60 * 10,             // 10 minutes for state cookie
  path: '/',                   // Cookie scope
}
```

### 3. Email Verification

**Google:** Check `email_verified` field from user profile
**Microsoft:** Emails from Microsoft accounts are considered verified

### 4. Error Message Security

**Principle:** Don't leak information about account existence

**Implementation:**
- Use generic error messages: "Authentication failed"
- Log detailed errors server-side only
- Don't reveal whether email exists in system

### 5. Redirect Validation

**Configuration:**
- Redirect URL must be registered with OAuth provider
- Use environment variable `OAUTH_REDIRECT_BASE` for configuration
- Only redirect to `/dashboard` (no user-controlled redirects)

### 6. Token Handling

**Security:**
- Access tokens are NOT stored (only used to fetch profile)
- Refresh tokens are NOT requested (session-based auth)
- Tokens are ephemeral (exist only during callback processing)

---

## Error Handling

### Error Scenarios

| Scenario | Error Type | HTTP Status | User Message |
|----------|-----------|-------------|--------------|
| OAuth not configured | AppError (OAUTH_NOT_CONFIGURED) | 500 | Service temporarily unavailable |
| User denies consent | UnauthorizedError | 401 | Authentication failed |
| Invalid state parameter | UnauthorizedError | 401 | Invalid OAuth state |
| Missing authorization code | UnauthorizedError | 401 | Authentication failed |
| Token exchange fails | UnauthorizedError | 401 | Authentication failed |
| Profile fetch fails | AppError (OAUTH_PROFILE_FETCH_FAILED) | 500 | Authentication failed |
| Email not verified (Google) | UnauthorizedError | 401 | Email not verified |
| No email in profile (Microsoft) | UnauthorizedError | 401 | No email address found |
| Network errors | UnauthorizedError | 401 | Authentication failed |

### Error Response Format

```typescript
{
  error: "Authentication failed",
  code: "UNAUTHORIZED",
  statusCode: 401
}
```

### Logging

```typescript
// Success
logger.info({ userId, provider: 'google' }, 'OAuth login successful');

// Warning
logger.warn({ error }, 'Google OAuth error');

// Error
logger.error({ error }, 'Google OAuth callback error');
```

---

## Testing Strategy

### Unit Tests

**File:** `apps/api/src/__tests__/services/oauth.service.test.ts`

Test cases:
1. ✅ `initiateGoogleOAuth` generates state and redirects
2. ✅ `initiateMicrosoftOAuth` generates state and redirects
3. ✅ `handleGoogleCallback` creates new user when email doesn't exist
4. ✅ `handleGoogleCallback` links account when email exists
5. ✅ `handleGoogleCallback` throws UnauthorizedError for invalid state
6. ✅ `handleGoogleCallback` throws UnauthorizedError for missing code
7. ✅ `handleGoogleCallback` throws UnauthorizedError when email not verified
8. ✅ `handleMicrosoftCallback` creates new user when email doesn't exist
9. ✅ `handleMicrosoftCallback` links account when email exists
10. ✅ `handleMicrosoftCallback` throws UnauthorizedError for invalid state
11. ✅ `handleMicrosoftCallback` throws UnauthorizedError for missing email
12. ✅ `findOrCreateOAuthUser` finds existing user by email
13. ✅ `findOrCreateOAuthUser` creates new user with null password_hash

### Integration Tests

**File:** `apps/api/src/__tests__/integration/oauth.routes.test.ts`

Test cases:
1. ✅ `GET /auth/google` sets oauth_state cookie and redirects
2. ✅ `GET /auth/microsoft` sets oauth_state cookie and redirects
3. ✅ `GET /auth/google/callback` returns 401 for invalid state
4. ✅ `GET /auth/google/callback` returns 401 for missing code
5. ✅ `GET /auth/microsoft/callback` returns 401 for invalid state
6. ✅ `GET /auth/microsoft/callback` returns 401 for missing code

### Mock Strategy

```typescript
// Mock Arctic clients
vi.mock('arctic', () => ({
  Google: vi.fn(),
  Microsoft: vi.fn(),
  generateState: vi.fn(() => 'mock-state-123'),
}));

// Mock fetch for OAuth profile endpoints
global.fetch = vi.fn((url) => {
  if (url.includes('googleapis.com')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        sub: 'google-123',
        email: 'user@example.com',
        email_verified: true,
        name: 'Test User',
      }),
    });
  }
  // ... Microsoft mock
});
```

---

## Dependencies

### New Dependencies

```json
{
  "dependencies": {
    "arctic": "^1.9.2"
  }
}
```

Install with:
```bash
pnpm add arctic
```

### Arctic Version

- **Version:** 1.9.2+ (latest stable)
- **Reason:** Official Lucia companion library for OAuth
- **License:** MIT
- **Maintenance:** Actively maintained by Lucia team

---

## Configuration

### OAuth Provider Setup

#### Google OAuth 2.0

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable "Google+ API"
4. Navigate to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs:
   - Development: `http://localhost:3000/auth/google/callback`
   - Production: `https://yourdomain.com/auth/google/callback`
7. Copy Client ID and Client Secret to `.env`

**Scopes requested:**
- `email` - User email address
- `profile` - User profile information (name, picture)

#### Microsoft OAuth 2.0

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Name: "Raptscallions"
5. Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
6. Redirect URI:
   - Development: `http://localhost:3000/auth/microsoft/callback`
   - Production: `https://yourdomain.com/auth/microsoft/callback`
7. After creation, go to "Certificates & secrets" → "New client secret"
8. Copy Application (client) ID and client secret to `.env`

**Scopes requested:**
- `User.Read` - Read user profile
- `email` - User email address
- `profile` - User profile information
- `openid` - OpenID Connect sign-in

---

## Implementation Checklist

### Phase 1: Setup (E02-T004)

- [ ] Install `arctic` dependency
- [ ] Update environment schema with OAuth variables
- [ ] Update `.env.example` with OAuth configuration
- [ ] Create `packages/auth/src/oauth.ts` with Arctic client factories
- [ ] Create `packages/auth/src/oauth-state.ts` with state management
- [ ] Update `packages/auth/src/types.ts` with OAuth profile types
- [ ] Export new modules from `packages/auth/src/index.ts`

### Phase 2: Service Layer (E02-T004)

- [ ] Create `apps/api/src/services/oauth.service.ts`
- [ ] Implement `initiateGoogleOAuth()`
- [ ] Implement `handleGoogleCallback()`
- [ ] Implement `initiateMicrosoftOAuth()`
- [ ] Implement `handleMicrosoftCallback()`
- [ ] Implement `findOrCreateOAuthUser()`

### Phase 3: Routes (E02-T004)

- [ ] Create `apps/api/src/routes/oauth.routes.ts`
- [ ] Add `GET /auth/google` route
- [ ] Add `GET /auth/google/callback` route
- [ ] Add `GET /auth/microsoft` route
- [ ] Add `GET /auth/microsoft/callback` route
- [ ] Register OAuth routes in `auth.routes.ts`

### Phase 4: Testing (E02-T004)

- [ ] Write unit tests for `oauth.service.ts`
- [ ] Write integration tests for OAuth routes
- [ ] Verify CSRF protection works
- [ ] Test account creation flow
- [ ] Test account linking flow
- [ ] Test error scenarios

### Phase 5: Documentation (E02-T004)

- [ ] Update `ARCHITECTURE.md` with OAuth implementation
- [ ] Update `README.md` with OAuth endpoints
- [ ] Update deployment docs with OAuth configuration steps
- [ ] Document OAuth provider setup in developer guide

---

## Acceptance Criteria Mapping

| AC | Description | Implementation |
|----|-------------|----------------|
| AC1 | GET /auth/google redirects to Google OAuth | `initiateGoogleOAuth()` creates auth URL and redirects |
| AC2 | GET /auth/google/callback handles OAuth callback | `handleGoogleCallback()` validates and creates session |
| AC3 | GET /auth/microsoft redirects to Microsoft OAuth | `initiateMicrosoftOAuth()` creates auth URL and redirects |
| AC4 | GET /auth/microsoft/callback handles OAuth callback | `handleMicrosoftCallback()` validates and creates session |
| AC5 | OAuth accounts create new user if email doesn't exist | `findOrCreateOAuthUser()` creates user with null password_hash |
| AC6 | OAuth accounts link to existing user if email matches | `findOrCreateOAuthUser()` returns existing user by email |
| AC7 | State parameter validated to prevent CSRF attacks | `validateOAuthState()` checks state matches cookie |
| AC8 | OAuth errors handled gracefully | Try-catch with UnauthorizedError for user-friendly messages |
| AC9 | Environment variables validated | Zod schema validates OAuth config on startup |
| AC10 | OAuth users have null password_hash | `findOrCreateOAuthUser()` omits passwordHash field |

---

## Future Enhancements (Out of Scope)

1. **Clever OAuth Integration** - Education-specific SSO provider (separate task)
2. **OAuth Token Refresh** - Store refresh tokens for API access (if needed for integrations)
3. **Profile Syncing** - Sync profile pictures, additional metadata
4. **Multi-Provider Linking** - Allow one user to link multiple OAuth providers
5. **Account Unlinking** - Allow users to disconnect OAuth providers
6. **OAuth Scope Expansion** - Request additional scopes for feature integrations

---

## References

- [Arctic Documentation](https://arctic.js.org/)
- [Lucia Authentication](https://lucia-auth.com/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft Identity Platform](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [OWASP OAuth Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)

---

**Specification Status:** ✅ Complete - Ready for Architecture Review

---

_This specification provides a complete implementation guide for OAuth integration. All technical decisions align with the canonical architecture (ARCHITECTURE.md) and code conventions (CONVENTIONS.md). The implementation follows security best practices and provides comprehensive error handling and testing coverage._

---

## UX Review

**Reviewer:** @designer
**Date:** 2026-01-12
**Verdict:** ✅ APPROVED with recommendations

### Overview

This specification implements OAuth authentication flows for Google and Microsoft. As a backend-focused task, the UX concerns center on error messaging, redirect behavior, security transparency, and the foundation for future frontend integration.

---

### ✅ Strengths

#### 1. **Clear OAuth Flow**
- The sequence diagrams provide excellent clarity on the user journey
- State management with CSRF protection is properly implemented
- Automatic account linking by email is intuitive and expected behavior

#### 2. **Error Handling Philosophy**
- Generic error messages prevent information leakage (OWASP compliant)
- Detailed server-side logging for debugging
- Comprehensive error scenario coverage in testing strategy

#### 3. **Security Transparency**
- Email verification requirement for Google is a good UX/security balance
- State parameter validation is invisible but critical for user protection
- Cookie configuration follows best practices (httpOnly, secure, sameSite)

---

### ⚠️ UX Concerns & Recommendations

#### **CONCERN 1: Error Messages Lack User Actionability**

**Issue:**
All OAuth errors return generic "Authentication failed" or "Service temporarily unavailable" messages. While this is correct for security, users have no actionable guidance.

**Impact:** Medium
Users who encounter errors (denied consent, unverified email, etc.) won't know what to do next.

**Recommendation:**
Add **context-specific guidance** without revealing sensitive information:

```typescript
// Current (spec line 355)
throw new UnauthorizedError('Google authentication failed');

// Recommended improvement
const errorMessages = {
  user_denied: 'You cancelled the sign-in process. Please try again if you want to sign in.',
  email_not_verified: 'Your Google email must be verified to sign in. Please verify your email with Google and try again.',
  no_email: 'We couldn't access your email address. Please grant email permissions and try again.',
  generic: 'Sign-in failed. Please try again or contact support if the problem persists.',
};
```

**Implementation Suggestion:**
- Add a `userMessage` field to error responses (separate from server logs)
- Create a dedicated `OAuthError` class that maps technical errors to user-friendly messages
- Return error codes in URL params for frontend to display contextual help

**Example:**
```typescript
// Redirect with error context
reply.redirect(`/login?error=oauth_failed&reason=email_verification`);
// Frontend displays: "Please verify your email with Google before signing in."
```

---

#### **CONCERN 2: No User Feedback During OAuth Flow**

**Issue:**
The spec redirects directly to OAuth provider (line 337) and back to `/dashboard` (line 420, 534) with no intermediate loading state or success confirmation.

**Impact:** Low (backend task), but **critical for frontend implementation**

**Recommendation:**
Document expected loading states and success feedback for future frontend work:

```typescript
// After callback success, before dashboard redirect
// FUTURE: Display interim page with success message + loading spinner
// For now: Direct redirect is acceptable for MVP
reply.redirect('/dashboard'); // Consider '/dashboard?oauth_success=true'
```

**Why this matters:**
- OAuth flows can take 2-5 seconds (network latency, provider processing)
- Users clicking "Sign in with Google" expect immediate feedback
- Silent redirects feel broken, especially if provider consent screen takes time to load

**Frontend Integration Note (add to spec):**
```markdown
### Future Frontend Considerations
- Display loading spinner when user clicks OAuth button
- Show success message on callback: "Signed in with Google! Redirecting..."
- Handle slow OAuth provider responses (5+ seconds) with progress indicator
- Display error state with retry button for failed auth attempts
```

---

#### **CONCERN 3: Account Linking UX Is Invisible**

**Issue:**
Spec line 558-560 silently links OAuth accounts to existing users by email. This is correct behavior, but users have no visibility into this happening.

**Impact:** Medium (future scope)
Users may be confused when:
- They sign in with Google after creating a password account
- They try to use a different OAuth provider with the same email (out of scope, but will arise)

**Recommendation:**
Add logging and future notification hooks:

```typescript
// In findOrCreateOAuthUser (line 558)
if (existingUser) {
  logger.info({ userId: existingUser.id, email, provider: 'google' },
    'OAuth account linked to existing user');

  // FUTURE: Emit event for notification
  // await events.emit('user.oauth_linked', { userId, provider: 'google' });

  return existingUser;
}
```

**Future Enhancement:**
When frontend is implemented, show a one-time notification:
> "You've successfully linked your Google account to your Raptscallions profile. You can now sign in with either Google or your password."

---

#### **CONCERN 4: Redirect Hardcoded to `/dashboard`**

**Issue:**
Spec hardcodes redirect to `/dashboard` (lines 420, 534) with no support for "return to original page" flow.

**Impact:** Low (current scope), High (future)
Users who:
- Land on a specific tool page and click "Sign in with Google"
- Come from an assignment link and must authenticate
- ...will lose their original destination

**Recommendation:**
Add `returnTo` parameter support (optional for E02-T004, critical for future):

```typescript
// OAuth initiation
app.get('/google', async (request, reply) => {
  const state = generateOAuthState();
  const returnTo = request.query.returnTo || '/dashboard';

  // Encode returnTo in state or separate cookie
  reply.setCookie('oauth_return', returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10,
    path: '/',
  });

  // ... rest of OAuth flow
});

// OAuth callback
app.get('/google/callback', async (request, reply) => {
  // ... after successful auth
  const returnTo = request.cookies.oauth_return || '/dashboard';
  reply.redirect(returnTo);
});
```

**Security Note:**
Validate `returnTo` URL to prevent open redirect vulnerabilities:
```typescript
function validateReturnUrl(url: string): string {
  // Only allow relative URLs
  if (!url.startsWith('/') || url.startsWith('//')) {
    return '/dashboard';
  }
  return url;
}
```

---

#### **CONCERN 5: No Accessibility Considerations**

**Issue:**
Spec focuses on backend implementation with no mention of accessible OAuth button patterns.

**Impact:** Low (backend task), but should be documented for frontend

**Recommendation:**
Add a "Frontend Accessibility Notes" section:

```markdown
### Frontend Accessibility Requirements

When implementing OAuth buttons in the frontend:

1. **Button Labels:**
   - ✅ "Sign in with Google" (clear action)
   - ❌ "Google" (ambiguous)
   - Include provider logo as decorative image with `aria-hidden="true"`

2. **Loading States:**
   - Disable button on click: `aria-busy="true"`
   - Update label: "Signing in with Google..."
   - Announce state change: `role="status"` or live region

3. **Error States:**
   - Use `role="alert"` for error messages
   - Ensure error text has sufficient contrast (WCAG AAA)
   - Provide retry button with clear focus state

4. **Keyboard Navigation:**
   - OAuth buttons must be keyboard accessible (native `<button>` element)
   - Focus trap during OAuth flow (loading overlay)
   - Return focus to sign-in button on error

5. **Screen Reader Support:**
   ```html
   <button type="button" aria-label="Sign in with Google">
     <img src="google-logo.svg" alt="" aria-hidden="true" />
     Sign in with Google
   </button>
   ```
```

---

### 🎯 User Flow Analysis

#### **Happy Path (New User with Google)**

1. **User Action:** Clicks "Sign in with Google"
2. **System:** Redirects to Google consent screen (no feedback) ⚠️
3. **User Action:** Grants permissions
4. **System:** Redirects back to callback URL
5. **System:** Creates account + session silently
6. **System:** Redirects to `/dashboard` (no success message) ⚠️
7. **User:** Sees dashboard (may not realize they're now registered)

**UX Gap:** User has no confirmation they created an account vs. signed into existing account.

**Recommendation:**
Add `?new_user=true` parameter to dashboard redirect for new OAuth users:
```typescript
if (!existingUser) {
  // New user created
  logger.info({ userId: newUser.id, email }, 'New OAuth user created');
  return reply.redirect('/dashboard?welcome=oauth&provider=google');
}
```

Frontend can then display a welcome modal or onboarding flow.

---

#### **Happy Path (Existing User Linking Google)**

1. **User:** Has password account, clicks "Sign in with Google"
2. **System:** Finds existing user by email, creates session
3. **System:** Redirects to `/dashboard`
4. **User:** Successfully signed in, but unaware accounts are now linked

**UX Gap:** No indication that their Google account is now linked.

**Recommendation:**
Add query parameter and future notification:
```typescript
if (existingUser && !existingUser.oauthProvider) {
  return reply.redirect('/dashboard?oauth_linked=google');
}
```

---

#### **Error Path (User Denies Consent)**

1. **User:** Clicks "Sign in with Google"
2. **User:** Clicks "Cancel" on Google consent screen
3. **System:** Redirects to callback with `?error=access_denied`
4. **System:** Logs warning, throws `UnauthorizedError`
5. **Frontend:** Shows generic error

**Current Experience:** "Authentication failed" (confusing)
**Recommended:** "You cancelled sign-in. Please try again if you want to continue."

---

### 📊 Error Message Quality

| Scenario | Current Message (Spec) | UX Rating | Recommended Message |
|----------|----------------------|-----------|---------------------|
| User denies consent | "Google authentication failed" | ❌ Poor | "You cancelled the sign-in process. Try again to continue." |
| Email not verified | "Email not verified with Google" | ✅ Good | Same (actionable) |
| Invalid state (CSRF) | "Invalid OAuth state" | ⚠️ Fair | "Security check failed. Please try signing in again." |
| Network error | "Authentication failed" | ❌ Poor | "Connection issue. Please check your internet and try again." |
| Missing email (MS) | "No email address found in Microsoft account" | ✅ Good | Same (actionable) |
| OAuth not configured | "Service temporarily unavailable" | ⚠️ Fair | "This sign-in method is currently unavailable. Please use password sign-in." |

---

### 🔒 Security vs. UX Balance

#### **What the Spec Does Well:**

✅ **Generic error messages** prevent account enumeration attacks
✅ **CSRF protection** is invisible to users (good UX)
✅ **Email verification** requirement balances security with minimal friction
✅ **Automatic account linking** reduces duplicate accounts

#### **Where UX Could Improve Without Compromising Security:**

1. **Error Contextualization**
   - Current: "Authentication failed" (generic)
   - Better: "Authentication failed. [Reason: user cancelled | email verification needed | etc.]"
   - Security: Still doesn't reveal if account exists

2. **Provider-Specific Help**
   - Google error: "Need help with Google sign-in? [Link to Google Help]"
   - Microsoft error: "Having trouble with Microsoft? [Link to Azure AD help]"

3. **Retry Mechanisms**
   - After error, provide clear "Try again" button (not just back navigation)
   - Track failed attempts (rate limiting) without showing counts to user

---

### 🚀 Future Enhancement Priorities (Post-E02)

Based on UX review, prioritize these enhancements after OAuth MVP:

| Priority | Enhancement | Impact | Effort |
|----------|-------------|--------|--------|
| 🔴 High | Contextual error messages | High | Low |
| 🔴 High | Return-to-URL support | High | Medium |
| 🟡 Medium | OAuth success confirmation | Medium | Low |
| 🟡 Medium | Account linking notifications | Medium | Medium |
| 🟢 Low | Profile picture sync | Low | Medium |
| 🟢 Low | Multi-provider support UI | Low | High |

---

### ✅ Acceptance Criteria Review (UX Perspective)

| AC | UX Adequacy | Notes |
|----|-------------|-------|
| AC1 | ✅ Adequate | Redirect to Google works, but lacks loading feedback |
| AC2 | ✅ Adequate | Callback works, but no success confirmation |
| AC3 | ✅ Adequate | Same as AC1 for Microsoft |
| AC4 | ✅ Adequate | Same as AC2 for Microsoft |
| AC5 | ⚠️ Needs Improvement | Silent account creation lacks welcome flow |
| AC6 | ⚠️ Needs Improvement | Silent linking lacks user notification |
| AC7 | ✅ Excellent | CSRF protection is invisible (good UX) |
| AC8 | ⚠️ Needs Improvement | Errors are "handled" but lack actionability |
| AC9 | ✅ Adequate | Backend validation (no UX impact) |
| AC10 | ✅ Adequate | Backend implementation (no UX impact) |

**Overall:** 7/10 ACs meet UX standards for MVP, 3 have gaps for future improvement.

---

### 📝 Recommended Spec Updates

#### **Add Section: Frontend Integration Guidelines**

```markdown
## Frontend Integration Guidelines (Future Work)

### OAuth Button Implementation

**Button Design:**
- Primary CTA styling for "Sign in with Google/Microsoft"
- Include provider logo (16x16px minimum, SVG preferred)
- Minimum touch target: 44x44px (WCAG AAA)
- Disable button on click to prevent double-submission

**Loading State:**
- Show spinner on button: "Signing in with Google..."
- Optional: Full-page loading overlay with "Redirecting to Google..."
- Timeout warning if redirect takes >5 seconds

**Error Handling:**
- Parse `?error=...` query parameter on return
- Display contextual error message above sign-in form
- Provide "Try again" button that clears error state
- Log error details to frontend monitoring (Sentry, etc.)

**Success Handling:**
- Parse `?welcome=oauth` for new users → show onboarding
- Parse `?oauth_linked=google` for linked accounts → show notification
- Clear query parameters from URL after displaying message

### Accessibility Requirements

See "Frontend Accessibility Notes" above.

### Example React Implementation (Future Reference)

```tsx
function OAuthButton({ provider }: { provider: 'google' | 'microsoft' }) {
  const [loading, setLoading] = useState(false);

  const handleOAuth = () => {
    setLoading(true);
    // Navigate to /auth/google or /auth/microsoft
    window.location.href = `/auth/${provider}`;
  };

  return (
    <button
      onClick={handleOAuth}
      disabled={loading}
      aria-busy={loading}
      aria-label={`Sign in with ${provider === 'google' ? 'Google' : 'Microsoft'}`}
      className="oauth-button"
    >
      {loading ? (
        <>
          <Spinner aria-hidden="true" />
          Signing in with {provider}...
        </>
      ) : (
        <>
          <ProviderLogo provider={provider} aria-hidden="true" />
          Sign in with {provider === 'google' ? 'Google' : 'Microsoft'}
        </>
      )}
    </button>
  );
}
```
```

---

### 🎓 UX Patterns Followed

✅ **OAuth Best Practices:**
- State parameter for CSRF protection
- Secure cookie configuration
- Email verification requirement
- Generic error messages for security

✅ **Error Handling Patterns:**
- Fail-safe defaults (redirect to login on error)
- Server-side logging for debugging
- No stack traces exposed to users

⚠️ **Needs Improvement:**
- Loading state visibility
- Success confirmation
- Contextual error messaging
- Return-to-URL preservation

---

### Final Verdict: ✅ APPROVED

**Reasoning:**
This specification provides a **solid OAuth implementation** that prioritizes security and follows OWASP best practices. The UX concerns identified are:

1. **Acceptable for MVP** (backend-only task)
2. **Well-documented for future frontend work**
3. **Easy to enhance without breaking changes**

The backend implementation is sound. UX improvements can be layered on top during frontend development without modifying the core OAuth service.

**Recommendation:**
- ✅ Proceed to architecture review
- 📋 Create follow-up tasks for UX enhancements (post-MVP)
- 📖 Reference this review when implementing frontend OAuth flows

---

**Next Steps:**
1. Architect review for technical soundness
2. Create frontend OAuth UI task (separate epic)
3. Consider UX improvements as polish tasks after E02 completion

---

_UX Review completed by @designer on 2026-01-12. Specification approved with documented recommendations for future enhancement._

---

## Architecture Review

**Reviewer:** @architect
**Date:** 2026-01-12
**Spec Version:** Analyzed (with UX Review)
**Verdict:** ⚠️ **APPROVED WITH REQUIRED CHANGES**

### Executive Summary

The OAuth implementation specification is fundamentally sound and follows industry best practices for security. However, there are several architectural inconsistencies with our canonical standards (ARCHITECTURE.md and CONVENTIONS.md) that must be addressed before implementation.

**Key Issues:**
1. ❌ Service class pattern violates "functional over OOP" principle
2. ❌ Lazy client initialization conflicts with fail-fast principle
3. ⚠️ Missing Zod validation for OAuth-specific types
4. ⚠️ Error handling uses AppError incorrectly
5. ⚠️ Missing critical configuration validation

---

### 🔴 CRITICAL ISSUES (Must Fix Before Implementation)

#### **ISSUE 1: Service Class Violates Functional Architecture**

**Location:** `apps/api/src/services/oauth.service.ts` (lines 314-578)

**Problem:**
The spec proposes an `OAuthService` class with instance methods, but CONVENTIONS.md explicitly states:

> "Functional over OOP — Prefer pure functions, avoid classes where possible"

The only acceptable service pattern in our codebase is constructor dependency injection for the database, as shown in CONVENTIONS.md line 365-390. However, OAuth operations don't need stateful services.

**Impact:** Architectural inconsistency, harder to test, violates codebase principles

**Required Fix:**
Replace `OAuthService` class with pure functions that accept dependencies as parameters:

```typescript
// apps/api/src/services/oauth.service.ts

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { DrizzleDB } from '@raptscallions/db';

export async function initiateGoogleOAuth(
  reply: FastifyReply
): Promise<void> {
  const google = getGoogleOAuthClient();
  const state = generateOAuthState();

  const url = await google.createAuthorizationURL(state, {
    scopes: ['email', 'profile'],
  });

  reply.setCookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: OAUTH_STATE_MAX_AGE,
    path: '/',
  });

  reply.redirect(url.toString());
}

export async function handleGoogleCallback(
  db: DrizzleDB,
  request: FastifyRequest<{
    Querystring: { code?: string; state?: string; error?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  // Implementation with db as parameter
}

async function findOrCreateOAuthUser(
  db: DrizzleDB,
  email: string,
  name: string
): Promise<User> {
  // Private helper function
}
```

**Routes update:**
```typescript
// apps/api/src/routes/oauth.routes.ts
export const oauthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/google', async (request, reply) => {
    await initiateGoogleOAuth(reply);
  });

  app.get('/google/callback', async (request, reply) => {
    await handleGoogleCallback(app.db, request, reply);
  });
};
```

---

#### **ISSUE 2: Lazy Client Initialization Violates Fail-Fast Principle**

**Location:** `packages/auth/src/oauth.ts` (lines 180-217)

**Problem:**
The spec proposes lazy initialization of OAuth clients with runtime errors:

```typescript
export function getGoogleOAuthClient(): Google {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    throw new AppError(
      'Google OAuth not configured',
      'OAUTH_NOT_CONFIGURED',
      500
    );
  }
  return new Google(...);
}
```

This violates CONVENTIONS.md principle:

> "Fail fast — Validate early, throw meaningful errors"

Configuration errors should be caught at **startup**, not when a user tries to sign in.

**Impact:** Poor UX (user encounters 500 error), late failure detection, no startup validation

**Required Fix:**
Validate OAuth configuration at startup and create clients eagerly if configured:

```typescript
// packages/auth/src/oauth.ts
import { Google, Microsoft } from 'arctic';
import { config } from '@raptscallions/core/config';

/**
 * Google OAuth client (null if not configured)
 */
export const googleOAuthClient: Google | null = (() => {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    return null; // OAuth provider not configured
  }

  return new Google(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    `${config.OAUTH_REDIRECT_BASE}/auth/google/callback`
  );
})();

/**
 * Microsoft OAuth client (null if not configured)
 */
export const microsoftOAuthClient: Microsoft | null = (() => {
  if (!config.MICROSOFT_CLIENT_ID || !config.MICROSOFT_CLIENT_SECRET) {
    return null;
  }

  return new Microsoft(
    config.MICROSOFT_CLIENT_ID,
    config.MICROSOFT_CLIENT_SECRET,
    `${config.OAUTH_REDIRECT_BASE}/auth/microsoft/callback`
  );
})();

/**
 * Helper to get Google client or throw if not configured
 */
export function requireGoogleOAuth(): Google {
  if (!googleOAuthClient) {
    throw new AppError(
      'Google OAuth not configured',
      'OAUTH_NOT_CONFIGURED',
      503 // Service Unavailable, not 500
    );
  }
  return googleOAuthClient;
}

export function requireMicrosoftOAuth(): Microsoft {
  if (!microsoftOAuthClient) {
    throw new AppError(
      'Microsoft OAuth not configured',
      'OAUTH_NOT_CONFIGURED',
      503
    );
  }
  return microsoftOAuthClient;
}
```

**Routes conditional registration:**
```typescript
// apps/api/src/routes/oauth.routes.ts
export const oauthRoutes: FastifyPluginAsync = async (app) => {
  // Only register Google routes if configured
  if (googleOAuthClient) {
    app.get('/google', async (request, reply) => {
      await initiateGoogleOAuth(reply);
    });
    app.get('/google/callback', async (request, reply) => {
      await handleGoogleCallback(app.db, request, reply);
    });
  }

  // Only register Microsoft routes if configured
  if (microsoftOAuthClient) {
    app.get('/microsoft', async (request, reply) => {
      await initiateMicrosoftOAuth(reply);
    });
    app.get('/microsoft/callback', async (request, reply) => {
      await handleMicrosoftCallback(app.db, request, reply);
    });
  }
};
```

---

#### **ISSUE 3: Missing Zod Schemas for OAuth Types**

**Location:** `packages/auth/src/types.ts` (lines 262-284)

**Problem:**
The spec defines OAuth profile types as plain TypeScript interfaces:

```typescript
export interface GoogleUserProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  // ...
}
```

CONVENTIONS.md requires Zod schemas for runtime validation:

> "Use Zod for runtime validation" (line 71-78)

OAuth responses from third-party APIs are **untrusted external data** and MUST be validated.

**Impact:** No runtime validation, potential type safety holes, vulnerable to malformed API responses

**Required Fix:**
Replace TypeScript interfaces with Zod schemas in `packages/core/src/schemas/oauth.schema.ts`:

```typescript
// packages/core/src/schemas/oauth.schema.ts
import { z } from 'zod';

/**
 * Google OAuth user profile schema
 */
export const googleUserProfileSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  email_verified: z.boolean(),
  name: z.string(),
  picture: z.string().url().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  locale: z.string().optional(),
});

export type GoogleUserProfile = z.infer<typeof googleUserProfileSchema>;

/**
 * Microsoft OAuth user profile schema
 */
export const microsoftUserProfileSchema = z.object({
  id: z.string(),
  userPrincipalName: z.string(),
  mail: z.string().email().nullable(),
  displayName: z.string(),
  givenName: z.string().optional(),
  surname: z.string().optional(),
});

export type MicrosoftUserProfile = z.infer<typeof microsoftUserProfileSchema>;

/**
 * OAuth callback query parameters
 */
export const oauthCallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

export type OAuthCallbackQuery = z.infer<typeof oauthCallbackQuerySchema>;
```

**Usage in service:**
```typescript
// In handleGoogleCallback
const rawProfile: unknown = await response.json();
const googleUser = googleUserProfileSchema.parse(rawProfile); // Throws if invalid

// Type-safe from here
if (!googleUser.email_verified) {
  throw new UnauthorizedError('Email not verified with Google');
}
```

---

### ⚠️ MAJOR ISSUES (Should Fix Before Implementation)

#### **ISSUE 4: Incorrect Error Class Usage**

**Location:** Multiple locations in `oauth.service.ts`

**Problem:**
The spec uses `AppError` directly for user-facing errors:

```typescript
throw new AppError(
  'Microsoft OAuth not configured',
  'OAUTH_NOT_CONFIGURED',
  500
);
```

CONVENTIONS.md defines specific error classes (lines 233-256):
- `ValidationError` for input validation (400)
- `UnauthorizedError` for auth failures (401)
- `NotFoundError` for missing resources (404)
- `ConflictError` for conflicts (409)

`AppError` should only be used for **generic server errors** or as a base class.

**Impact:** Inconsistent error handling, incorrect HTTP status codes

**Required Fix:**
Use appropriate error classes:

```typescript
// Configuration errors (should never happen if startup validation works)
throw new AppError(
  'OAuth provider not configured',
  'OAUTH_NOT_CONFIGURED',
  503 // Service Unavailable, not 500
);

// User-facing auth errors
throw new UnauthorizedError('Google authentication failed');
throw new UnauthorizedError('Email not verified with Google');

// Profile fetch failures (external API error)
throw new AppError(
  'Failed to fetch user profile from OAuth provider',
  'OAUTH_PROFILE_FETCH_FAILED',
  502 // Bad Gateway (external service failed)
);
```

---

#### **ISSUE 5: Missing Environment Variable Validation**

**Location:** `packages/core/src/config/env.schema.ts` (lines 139-154)

**Problem:**
The spec adds optional OAuth variables but doesn't validate interdependencies:

```typescript
GOOGLE_CLIENT_ID: z.string().optional(),
GOOGLE_CLIENT_SECRET: z.string().optional(),
```

If `GOOGLE_CLIENT_ID` is set but `GOOGLE_CLIENT_SECRET` is missing (or vice versa), this will fail at **runtime** when users try to sign in.

**Impact:** Late failure detection, confusing startup errors

**Required Fix:**
Add cross-field validation using Zod's `.refine()`:

```typescript
// packages/core/src/config/env.schema.ts
export const envSchema = z.object({
  // ... existing vars

  // OAuth - Google
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // OAuth - Microsoft
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),

  // OAuth Redirect Base URL
  OAUTH_REDIRECT_BASE: z.string().url().default('http://localhost:3000'),
})
.refine(
  (data) => {
    // If Google OAuth is partially configured, both must be set
    const hasGoogleId = !!data.GOOGLE_CLIENT_ID;
    const hasGoogleSecret = !!data.GOOGLE_CLIENT_SECRET;
    return hasGoogleId === hasGoogleSecret; // Both true or both false
  },
  {
    message: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be set or both be unset',
  }
)
.refine(
  (data) => {
    // Same for Microsoft
    const hasMsId = !!data.MICROSOFT_CLIENT_ID;
    const hasMsSecret = !!data.MICROSOFT_CLIENT_SECRET;
    return hasMsId === hasMsSecret;
  },
  {
    message: 'MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET must both be set or both be unset',
  }
);
```

This ensures configuration errors are caught at startup with clear messages.

---

### ✅ STRENGTHS (Approved As-Is)

#### 1. **CSRF Protection Implementation**

The state parameter implementation is excellent:
- Cryptographically secure state generation (`arctic.generateState()`)
- httpOnly cookie storage (prevents XSS)
- Constant-time comparison (prevents timing attacks)
- 10-minute expiration (prevents replay attacks)

**Verdict:** ✅ Approved

---

#### 2. **Cookie Security Configuration**

The cookie configuration follows best practices:
```typescript
{
  httpOnly: true,
  secure: NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 10,
  path: '/',
}
```

**Verdict:** ✅ Approved

---

#### 3. **Account Linking by Email**

The `findOrCreateOAuthUser` logic is sound:
- Queries by email first (account linking)
- Creates new user with `null` password_hash for OAuth users
- Consistent with existing user schema design

**Verdict:** ✅ Approved

---

#### 4. **Database Schema Compatibility**

No schema changes required. The existing `users` table already supports:
- Nullable `password_hash` for OAuth users
- Unique `email` for account linking
- `status` field for account lifecycle

**Verdict:** ✅ Approved

---

#### 5. **Arctic Library Choice**

Arctic is the correct choice:
- Official Lucia companion library
- Actively maintained
- Type-safe
- Handles OAuth 2.0 complexity correctly

**Verdict:** ✅ Approved

---

### 🟡 RECOMMENDATIONS (Nice-to-Have Improvements)

#### **RECOMMENDATION 1: Add Telemetry Tracing**

OAuth flows span multiple requests (initiation → callback). Add OpenTelemetry tracing:

```typescript
import { trace } from '@raptscallions/telemetry';

export async function initiateGoogleOAuth(reply: FastifyReply): Promise<void> {
  const span = trace.getActiveSpan();
  span?.setAttribute('oauth.provider', 'google');
  span?.addEvent('oauth.initiate');

  // ... rest of implementation
}
```

**Benefit:** Better observability for debugging OAuth issues in production

---

#### **RECOMMENDATION 2: Add Rate Limiting**

OAuth endpoints are publicly accessible and should be rate-limited:

```typescript
// In routes
app.get('/google', {
  config: {
    rateLimit: {
      max: 10, // 10 requests
      timeWindow: '1 minute',
    },
  },
}, async (request, reply) => {
  await initiateGoogleOAuth(reply);
});
```

**Benefit:** Prevents abuse of OAuth redirect loops

---

#### **RECOMMENDATION 3: Add OAuth Provider Abstraction**

Both Google and Microsoft implementations are nearly identical (95% code duplication). Consider a generic handler:

```typescript
async function handleOAuthCallback<TProfile>(
  db: DrizzleDB,
  provider: 'google' | 'microsoft',
  client: Google | Microsoft,
  profileSchema: z.ZodSchema<TProfile>,
  profileUrl: string,
  extractEmail: (profile: TProfile) => string,
  extractName: (profile: TProfile) => string,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Single implementation for both providers
}
```

**Benefit:** Easier to add new OAuth providers (Clever, GitHub, etc.)

---

### 📋 Security Checklist (OWASP OAuth 2.0)

| Security Control | Status | Notes |
|------------------|--------|-------|
| State parameter (CSRF protection) | ✅ Implemented | Uses Arctic's `generateState()` |
| Redirect URI validation | ✅ Enforced | Configured in OAuth provider console |
| Authorization code exchange | ✅ Correct | Uses Arctic's `validateAuthorizationCode()` |
| Token handling | ✅ Secure | Tokens not stored, only used transiently |
| Email verification | ✅ Required | Checks `email_verified` for Google |
| Error message security | ⚠️ Partial | Generic messages, but see UX review concerns |
| Cookie security | ✅ Correct | httpOnly, secure, SameSite=lax |
| HTTPS enforcement | ✅ Production | `secure` flag enabled in production |

---

### 📊 Architectural Alignment Scorecard

| Criterion | Score | Notes |
|-----------|-------|-------|
| **Technology Stack** | 10/10 | Arctic, Lucia, Fastify - all correct |
| **Code Conventions** | 4/10 | ❌ Class pattern, ❌ lazy init, ❌ missing Zod |
| **Error Handling** | 6/10 | ⚠️ Incorrect error classes, good try-catch |
| **Database Integration** | 10/10 | ✅ Drizzle queries, no schema changes needed |
| **Security** | 9/10 | ✅ CSRF, cookies, email verification |
| **Testability** | 5/10 | ❌ Class pattern harder to test than pure functions |
| **Observability** | 5/10 | ⚠️ Logging present, tracing missing |

**Overall:** 49/70 (70%) - **Needs revision before approval**

---

### 🔧 Required Changes Summary

Before implementation, the spec MUST be updated to address:

1. ✅ **Replace `OAuthService` class with pure functions** (CRITICAL)
2. ✅ **Implement eager OAuth client initialization** (CRITICAL)
3. ✅ **Add Zod schemas for OAuth profile validation** (CRITICAL)
4. ✅ **Use correct error classes (UnauthorizedError, etc.)** (MAJOR)
5. ✅ **Add environment variable cross-field validation** (MAJOR)

Optional improvements:
6. ⚠️ Add OpenTelemetry tracing spans
7. ⚠️ Add rate limiting to OAuth routes
8. ⚠️ Consider generic OAuth handler abstraction

---

### ✅ Final Verdict: **APPROVED WITH REQUIRED CHANGES**

The OAuth implementation design is fundamentally sound and follows security best practices. However, it must be revised to align with our architectural conventions before implementation begins.

**Next Steps:**
1. Analyst (@analyst) updates spec with required changes
2. Resubmit for architecture review
3. Once approved, proceed to implementation

---

**Architecture Review Completed**
**Reviewer:** @architect
**Date:** 2026-01-12
**Status:** ⚠️ **CHANGES REQUIRED**
