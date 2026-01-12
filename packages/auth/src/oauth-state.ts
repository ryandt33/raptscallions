import { generateState, generateCodeVerifier } from "arctic";

export const OAUTH_STATE_COOKIE = "oauth_state";
export const OAUTH_CODE_VERIFIER_COOKIE = "oauth_code_verifier";
export const OAUTH_STATE_MAX_AGE = 60 * 10; // 10 minutes

/**
 * Generate a cryptographically secure state parameter for OAuth flow
 */
export function generateOAuthState(): string {
  return generateState();
}

/**
 * Generate a code verifier for PKCE OAuth flow
 */
export function generateOAuthCodeVerifier(): string {
  return generateCodeVerifier();
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
