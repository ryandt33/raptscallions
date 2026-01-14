import { hash, verify } from "@node-rs/argon2";
import { lucia } from "@raptscallions/auth";
import { ConflictError, UnauthorizedError } from "@raptscallions/core";
import { db } from "@raptscallions/db";
import { users } from "@raptscallions/db/schema";
import { eq } from "drizzle-orm";

import type { RegisterInput, LoginInput } from "@raptscallions/core";
import type { User } from "@raptscallions/db/schema";

/**
 * Argon2id hashing options following OWASP recommendations.
 * - memoryCost: 19456 KiB (~19 MB)
 * - timeCost: 2 iterations
 * - outputLen: 32 bytes
 * - parallelism: 1 thread
 */
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

/**
 * Service handling authentication operations.
 */
export class AuthService {
  /**
   * Register a new user with email and password.
   * Creates user account and initial session.
   */
  async register(input: RegisterInput): Promise<{ user: User; sessionId: string }> {
    // Check if email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (existingUser) {
      throw new ConflictError("Email already registered");
    }

    // Hash password
    const passwordHash = await hash(input.password, ARGON2_OPTIONS);

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        email: input.email,
        name: input.name,
        passwordHash,
        status: "pending_verification",
      })
      .returning();

    if (!user) {
      throw new Error("Failed to create user");
    }

    // Create session
    const session = await lucia.createSession(user.id, {
      context: "unknown",
      last_activity_at: new Date(),
    });

    return { user, sessionId: session.id };
  }

  /**
   * Login user with email and password.
   * Returns user and session on success.
   */
  async login(input: LoginInput): Promise<{ user: User; sessionId: string }> {
    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    // Generic error message for security (timing attack mitigation)
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // Verify password
    const validPassword = await verify(user.passwordHash, input.password, ARGON2_OPTIONS);

    if (!validPassword) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // Create session
    const session = await lucia.createSession(user.id, {
      context: "unknown",
      last_activity_at: new Date(),
    });

    return { user, sessionId: session.id };
  }

  /**
   * Logout user by invalidating session.
   */
  async logout(sessionId: string): Promise<void> {
    await lucia.invalidateSession(sessionId);
  }
}
