import { z } from "zod";

/**
 * Environment variable schema for database configuration.
 * Validates required variables at startup.
 */
export const dbEnvSchema = z.object({
  DATABASE_URL: z.string().url({
    message: "DATABASE_URL must be a valid PostgreSQL connection URL",
  }),
  DATABASE_POOL_MIN: z.coerce.number().min(1).default(2),
  DATABASE_POOL_MAX: z.coerce.number().min(1).default(10),
});

export type DbEnv = z.infer<typeof dbEnvSchema>;

/**
 * Validates database environment variables.
 * Call this at application startup to fail fast.
 *
 * @throws Error if DATABASE_URL is missing or invalid
 * @returns Validated database environment configuration
 *
 * @example
 * import { validateDbEnv } from "@raptscallions/db";
 *
 * // At application startup
 * const dbEnv = validateDbEnv();
 * console.log(`Connected to: ${dbEnv.DATABASE_URL}`);
 */
export function validateDbEnv(): DbEnv {
  const result = dbEnvSchema.safeParse(process.env);
  if (!result.success) {
    // eslint-disable-next-line no-console -- Required for CLI feedback
    console.error("Invalid database environment configuration:");
    // eslint-disable-next-line no-console -- Required for CLI feedback
    console.error(result.error.format());
    throw new Error("Database environment validation failed");
  }
  return result.data;
}
