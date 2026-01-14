import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema/index.js";

/**
 * Gets the database connection string, throwing if not set.
 *
 * @throws Error if DATABASE_URL is not set in environment
 * @returns The DATABASE_URL environment variable value
 */
function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is required. " +
        "Please set it in your environment or .env file."
    );
  }
  return connectionString;
}

/**
 * Raw postgres client for direct database access.
 *
 * Connection pool settings:
 * - max: 10 - Maximum connections, follows (cpu_cores * 2) + spindle rule
 * - idle_timeout: 30 - Close idle connections after 30 seconds
 * - connect_timeout: 2 - Connection timeout in seconds
 * - prepare: false - Disable prepared statements for connection pooler compatibility (e.g., PgBouncer)
 *
 * @example
 * import { queryClient } from "@raptscallions/db";
 *
 * // For raw SQL queries when needed
 * const result = await queryClient`SELECT NOW()`;
 */
export const queryClient = postgres(getConnectionString(), {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 2,
  prepare: false,
});

/**
 * Drizzle ORM database client.
 * Use this for all database operations.
 *
 * @example
 * import { db } from "@raptscallions/db";
 * import { users } from "@raptscallions/db/schema";
 *
 * const allUsers = await db.select().from(users);
 *
 * const user = await db.query.users.findFirst({
 *   where: eq(users.id, userId),
 *   with: { groups: true },
 * });
 */
export const db = drizzle(queryClient, { schema });

/**
 * Type definition for the database client.
 * Useful for typing function parameters that accept the db instance.
 */
export type Database = typeof db;
