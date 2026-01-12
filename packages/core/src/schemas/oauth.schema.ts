import { z } from "zod";

/**
 * Google OAuth user profile schema
 * Based on Google's userinfo endpoint response
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
 * Based on Microsoft Graph API /me endpoint response
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
 * Received from OAuth provider after user grants/denies consent
 */
export const oauthCallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

export type OAuthCallbackQuery = z.infer<typeof oauthCallbackQuerySchema>;
