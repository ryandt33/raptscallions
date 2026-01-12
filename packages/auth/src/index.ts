// packages/auth/src/index.ts

// Export Lucia instance
export { lucia } from "./lucia.js";

// Export session service
export { SessionService, sessionService } from "./session.service.js";

// Export OAuth clients and helpers
export {
  googleOAuthClient,
  microsoftOAuthClient,
  requireGoogleOAuth,
  requireMicrosoftOAuth,
} from "./oauth.js";

// Export OAuth state management
export {
  generateOAuthState,
  generateOAuthCodeVerifier,
  validateOAuthState,
  OAUTH_STATE_COOKIE,
  OAUTH_CODE_VERIFIER_COOKIE,
  OAUTH_STATE_MAX_AGE,
} from "./oauth-state.js";

// Export ability builder and helpers
export { buildAbility, canManageGroupHierarchy } from "./abilities.js";

// Export permission middleware
export { permissionMiddleware } from "./permissions.js";

// Export types
export type {
  SessionUser,
  Session,
  SessionValidationResult,
  SessionCookieAttributes,
  Actions,
  Subjects,
  AppAbility,
  BuildAbilityContext,
  GroupPath,
} from "./types.js";
