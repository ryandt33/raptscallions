import { lucia } from "@raptscallions/auth";
import { registerSchema, loginSchema, type RegisterInput, type LoginInput } from "@raptscallions/core";

import { AuthService } from "../services/auth.service.js";

import { oauthRoutes } from "./oauth.routes.js";

import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";



const authService = new AuthService();

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Register OAuth routes
  await app.register(oauthRoutes, { prefix: "" });

  // Use Zod type provider for this scope
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  /**
   * POST /auth/register
   * Register a new user with email and password.
   */
  typedApp.post(
    "/register",
    {
      schema: {
        body: registerSchema,
      },
    },
    async (request, reply) => {
      const body = request.body as RegisterInput;
      const { user, sessionId } = await authService.register(body);

      // Set session cookie
      const sessionCookie = lucia.createSessionCookie(sessionId);
      reply.setCookie(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );

      return reply.status(201).send({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    }
  );

  /**
   * POST /auth/login
   * Login with email and password.
   */
  typedApp.post(
    "/login",
    {
      schema: {
        body: loginSchema,
      },
    },
    async (request, reply) => {
      const body = request.body as LoginInput;
      const { user, sessionId } = await authService.login(body);

      // Set session cookie
      const sessionCookie = lucia.createSessionCookie(sessionId);
      reply.setCookie(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );

      return reply.send({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    }
  );

  /**
   * POST /auth/logout
   * Logout current user.
   *
   * This endpoint does NOT require authentication. This is intentional because:
   * 1. If a session expires while user is interacting, they should still be able to logout
   * 2. Race conditions (session invalidated elsewhere) shouldn't prevent logout
   * 3. The end result is the same - no session, cookie cleared
   *
   * If the session is valid, it will be invalidated. If invalid/expired, we just clear the cookie.
   */
  app.post("/logout", async (request, reply) => {
    // Attempt to invalidate session if one exists
    // This is safe even if the session is already invalid
    if (request.session) {
      await authService.logout(request.session.id);
    }

    // Always clear the session cookie, regardless of session validity
    const blankCookie = lucia.createBlankSessionCookie();
    reply.setCookie(
      blankCookie.name,
      blankCookie.value,
      blankCookie.attributes
    );

    return reply.status(204).send();
  });
};
