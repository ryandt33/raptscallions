// @raptscallions/db - Drizzle schema and database client

// Export database client and types
export { db, queryClient, type Database } from "./client.js";

// Export all schema definitions and types
export * from "./schema/index.js";

// Export environment validation utilities
export { validateDbEnv, dbEnvSchema, type DbEnv } from "./env.js";
