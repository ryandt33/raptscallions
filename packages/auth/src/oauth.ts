import { AppError, config } from "@raptscallions/core";
import { Google, MicrosoftEntraId } from "arctic";

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
export const microsoftOAuthClient: MicrosoftEntraId | null = (() => {
  if (!config.MICROSOFT_CLIENT_ID || !config.MICROSOFT_CLIENT_SECRET) {
    return null;
  }

  return new MicrosoftEntraId(
    "common", // Tenant ID - "common" allows both personal and work/school accounts
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
      "Google OAuth not configured",
      "OAUTH_NOT_CONFIGURED",
      503
    );
  }
  return googleOAuthClient;
}

/**
 * Helper to get Microsoft client or throw if not configured
 */
export function requireMicrosoftOAuth(): MicrosoftEntraId {
  if (!microsoftOAuthClient) {
    throw new AppError(
      "Microsoft OAuth not configured",
      "OAUTH_NOT_CONFIGURED",
      503
    );
  }
  return microsoftOAuthClient;
}
