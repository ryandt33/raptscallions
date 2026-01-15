/**
 * Storage backend config registry
 *
 * Registry for backend-specific configuration schemas.
 * Backends register their config schemas to enable validation
 * when that backend is selected via STORAGE_BACKEND.
 */

import type { ZodSchema } from "zod";

/**
 * Internal map of backend identifiers to their config schemas.
 */
const backendConfigSchemas = new Map<string, ZodSchema>();

/**
 * Register a configuration schema for a storage backend.
 *
 * When STORAGE_BACKEND matches the identifier, the corresponding
 * schema is used to validate backend-specific environment variables.
 *
 * Registration is idempotent - re-registering overwrites previous schema.
 *
 * @param identifier Backend identifier (e.g., "local", "s3", "azure")
 * @param schema Zod schema for validating backend-specific config
 *
 * @example
 * ```typescript
 * import { z } from "zod";
 * import { registerBackendConfig } from "@raptscallions/storage";
 *
 * const myBackendConfigSchema = z.object({
 *   STORAGE_MY_BACKEND_URL: z.string().url(),
 *   STORAGE_MY_BACKEND_API_KEY: z.string().min(1),
 * });
 *
 * registerBackendConfig("my-backend", myBackendConfigSchema);
 * ```
 */
export function registerBackendConfig(
  identifier: string,
  schema: ZodSchema
): void {
  backendConfigSchemas.set(identifier, schema);
}

/**
 * Get the configuration schema for a backend.
 *
 * @param identifier Backend identifier
 * @returns The registered schema, or undefined if not registered
 */
export function getBackendConfigSchema(
  identifier: string
): ZodSchema | undefined {
  return backendConfigSchemas.get(identifier);
}

/**
 * Check if a backend has a registered configuration schema.
 *
 * @param identifier Backend identifier
 * @returns true if schema is registered, false otherwise
 */
export function isBackendConfigRegistered(identifier: string): boolean {
  return backendConfigSchemas.has(identifier);
}

/**
 * Get list of all backends with registered config schemas.
 *
 * @returns Array of backend identifiers
 */
export function getRegisteredBackendConfigs(): string[] {
  return Array.from(backendConfigSchemas.keys());
}

/**
 * Clear all registered config schemas.
 * Used for testing to reset state between test cases.
 */
export function resetConfigRegistry(): void {
  backendConfigSchemas.clear();
}
