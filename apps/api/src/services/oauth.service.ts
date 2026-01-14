import {
  lucia,
  sessionService,
  requireGoogleOAuth,
  requireMicrosoftOAuth,
  generateOAuthState,
  generateOAuthCodeVerifier,
  validateOAuthState,
  OAUTH_STATE_COOKIE,
  OAUTH_CODE_VERIFIER_COOKIE,
  OAUTH_STATE_MAX_AGE,
} from "@raptscallions/auth";
import {
  googleUserProfileSchema,
  microsoftUserProfileSchema,
 UnauthorizedError, AppError } from "@raptscallions/core";
import { users } from "@raptscallions/db/schema";
import { logger } from "@raptscallions/telemetry";
import { eq } from "drizzle-orm";

import type {
  GoogleUserProfile,
  MicrosoftUserProfile,
} from "@raptscallions/core";
import type { Database } from "@raptscallions/db";
import type { User } from "@raptscallions/db/schema";
import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Initiate Google OAuth flow with PKCE
 */
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

/**
 * Handle Google OAuth callback
 */
export async function handleGoogleCallback(
  db: Database,
  request: FastifyRequest<{
    Querystring: { code?: string; state?: string; error?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { code, state, error } = request.query;
  const storedState = request.cookies[OAUTH_STATE_COOKIE];
  const storedCodeVerifier = request.cookies[OAUTH_CODE_VERIFIER_COOKIE];

  // Handle OAuth provider errors
  if (error) {
    logger.warn({ error }, "Google OAuth error");
    throw new UnauthorizedError("Google authentication failed");
  }

  // Validate state parameter (CSRF protection)
  if (!validateOAuthState(state, storedState)) {
    logger.warn(
      { receivedState: state, hasStoredState: !!storedState },
      "Invalid OAuth state"
    );
    throw new UnauthorizedError("Invalid OAuth state");
  }

  // Validate code parameter
  if (!code) {
    throw new UnauthorizedError("Missing authorization code");
  }

  // Validate code verifier
  if (!storedCodeVerifier) {
    throw new UnauthorizedError("Missing code verifier");
  }

  try {
    const google = requireGoogleOAuth();

    // Exchange code for access token (with PKCE)
    const tokens = await google.validateAuthorizationCode(
      code,
      storedCodeVerifier
    );

    // Fetch user profile from Google
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken()}`,
        },
      }
    );

    if (!response.ok) {
      throw new AppError(
        "Failed to fetch Google user profile",
        "OAUTH_PROFILE_FETCH_FAILED",
        502
      );
    }

    const rawProfile: unknown = await response.json();
    const googleUser: GoogleUserProfile =
      googleUserProfileSchema.parse(rawProfile);

    // Verify email is verified
    if (!googleUser.email_verified) {
      throw new UnauthorizedError("Email not verified with Google");
    }

    // Find or create user
    const user = await findOrCreateOAuthUser(
      db,
      googleUser.email,
      googleUser.name
    );

    // Create session
    const session = await lucia.createSession(user.id, {
      context: "oauth_google",
      last_activity_at: new Date(),
    });

    reply.setCookie("rapt_session", session.id, {
      ...sessionService.sessionCookieAttributes,
    });

    // Clear OAuth cookies
    reply.setCookie(OAUTH_STATE_COOKIE, "", { maxAge: 0 });
    reply.setCookie(OAUTH_CODE_VERIFIER_COOKIE, "", { maxAge: 0 });

    logger.info(
      { userId: user.id, provider: "google" },
      "OAuth login successful"
    );

    reply.redirect("/dashboard");
  } catch (error) {
    logger.error({ error }, "Google OAuth callback error");

    if (error instanceof UnauthorizedError || error instanceof AppError) {
      throw error;
    }

    throw new UnauthorizedError("Google authentication failed");
  }
}

/**
 * Initiate Microsoft OAuth flow with PKCE
 */
export async function initiateMicrosoftOAuth(
  reply: FastifyReply
): Promise<void> {
  const microsoft = requireMicrosoftOAuth();
  const state = generateOAuthState();
  const codeVerifier = generateOAuthCodeVerifier();

  const url = await microsoft.createAuthorizationURL(state, codeVerifier, [
    "User.Read",
    "email",
    "profile",
    "openid",
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

/**
 * Handle Microsoft OAuth callback
 */
export async function handleMicrosoftCallback(
  db: Database,
  request: FastifyRequest<{
    Querystring: { code?: string; state?: string; error?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { code, state, error } = request.query;
  const storedState = request.cookies[OAUTH_STATE_COOKIE];
  const storedCodeVerifier = request.cookies[OAUTH_CODE_VERIFIER_COOKIE];

  // Handle OAuth provider errors
  if (error) {
    logger.warn({ error }, "Microsoft OAuth error");
    throw new UnauthorizedError("Microsoft authentication failed");
  }

  // Validate state parameter (CSRF protection)
  if (!validateOAuthState(state, storedState)) {
    logger.warn(
      { receivedState: state, hasStoredState: !!storedState },
      "Invalid OAuth state"
    );
    throw new UnauthorizedError("Invalid OAuth state");
  }

  // Validate code parameter
  if (!code) {
    throw new UnauthorizedError("Missing authorization code");
  }

  // Validate code verifier
  if (!storedCodeVerifier) {
    throw new UnauthorizedError("Missing code verifier");
  }

  try {
    const microsoft = requireMicrosoftOAuth();

    // Exchange code for access token (with PKCE)
    const tokens = await microsoft.validateAuthorizationCode(
      code,
      storedCodeVerifier
    );

    // Fetch user profile from Microsoft Graph
    const response = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${tokens.accessToken()}`,
      },
    });

    if (!response.ok) {
      throw new AppError(
        "Failed to fetch Microsoft user profile",
        "OAUTH_PROFILE_FETCH_FAILED",
        502
      );
    }

    const rawProfile: unknown = await response.json();
    const microsoftUser: MicrosoftUserProfile =
      microsoftUserProfileSchema.parse(rawProfile);

    // Use mail or userPrincipalName as email
    const email = microsoftUser.mail || microsoftUser.userPrincipalName;

    if (!email) {
      throw new UnauthorizedError(
        "No email address found in Microsoft account"
      );
    }

    // Find or create user
    const user = await findOrCreateOAuthUser(
      db,
      email,
      microsoftUser.displayName
    );

    // Create session
    const session = await lucia.createSession(user.id, {
      context: "oauth_microsoft",
      last_activity_at: new Date(),
    });

    reply.setCookie("rapt_session", session.id, {
      ...sessionService.sessionCookieAttributes,
    });

    // Clear OAuth cookies
    reply.setCookie(OAUTH_STATE_COOKIE, "", { maxAge: 0 });
    reply.setCookie(OAUTH_CODE_VERIFIER_COOKIE, "", { maxAge: 0 });

    logger.info(
      { userId: user.id, provider: "microsoft" },
      "OAuth login successful"
    );

    reply.redirect("/dashboard");
  } catch (error) {
    logger.error({ error }, "Microsoft OAuth callback error");

    if (error instanceof UnauthorizedError || error instanceof AppError) {
      throw error;
    }

    throw new UnauthorizedError("Microsoft authentication failed");
  }
}

/**
 * Find existing user by email or create new OAuth user
 */
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
    logger.info(
      { userId: existingUser.id, email },
      "OAuth user found, linking account"
    );
    return existingUser;
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

  if (!newUser) {
    throw new AppError("Failed to create user", "USER_CREATE_FAILED", 500);
  }

  logger.info({ userId: newUser.id, email }, "New OAuth user created");

  return newUser;
}
