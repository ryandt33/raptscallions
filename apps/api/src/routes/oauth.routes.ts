import { db } from "@raptscallions/db";

import {
  initiateGoogleOAuth,
  handleGoogleCallback,
  initiateMicrosoftOAuth,
  handleMicrosoftCallback,
} from "../services/oauth.service.js";

import type { FastifyPluginAsync } from "fastify";

export const oauthRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /auth/google
   * Initiate Google OAuth flow
   */
  app.get("/google", async (request, reply) => {
    await initiateGoogleOAuth(reply);
  });

  /**
   * GET /auth/google/callback
   * Handle Google OAuth callback
   */
  app.get<{
    Querystring: { code?: string; state?: string; error?: string };
  }>("/google/callback", async (request, reply) => {
    await handleGoogleCallback(db, request, reply);
  });

  /**
   * GET /auth/microsoft
   * Initiate Microsoft OAuth flow
   */
  app.get("/microsoft", async (request, reply) => {
    await initiateMicrosoftOAuth(reply);
  });

  /**
   * GET /auth/microsoft/callback
   * Handle Microsoft OAuth callback
   */
  app.get<{
    Querystring: { code?: string; state?: string; error?: string };
  }>("/microsoft/callback", async (request, reply) => {
    await handleMicrosoftCallback(db, request, reply);
  });
};
