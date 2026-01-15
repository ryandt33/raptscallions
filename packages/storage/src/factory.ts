/**
 * Storage backend factory with lazy instantiation and caching.
 * Provides singleton instances per backend type.
 */

import { getBackendFactory, resetRegistry } from "./registry.js";

import type { IStorageBackend } from "./types.js";

/**
 * Cache for backend instances (singleton per identifier).
 */
const instanceCache = new Map<string, IStorageBackend>();

/**
 * Get a storage backend instance by identifier.
 *
 * This function provides lazy instantiation with singleton caching:
 * - First call: invokes the factory and caches the result
 * - Subsequent calls: returns the cached instance
 *
 * @param identifier The backend identifier (e.g., "local", "s3")
 * @returns The backend instance
 * @throws BackendNotRegisteredError if identifier is not registered
 *
 * @example
 * ```typescript
 * // Get the configured storage backend
 * const storage = getBackend("s3");
 *
 * // Upload a file
 * await storage.upload({
 *   key: "uploads/file.pdf",
 *   body: fileBuffer,
 *   contentType: "application/pdf",
 * });
 * ```
 */
export function getBackend(identifier: string): IStorageBackend {
  // Check cache first
  const cached = instanceCache.get(identifier);
  if (cached) {
    return cached;
  }

  // Get factory (throws if not registered)
  const factory = getBackendFactory(identifier);

  // Create instance and cache it
  const instance = factory();
  instanceCache.set(identifier, instance);

  return instance;
}

/**
 * Check if a backend instance is cached.
 *
 * @param identifier The backend identifier to check
 * @returns true if an instance is cached, false otherwise
 */
export function isBackendCached(identifier: string): boolean {
  return instanceCache.has(identifier);
}

/**
 * Clear all cached backend instances.
 * Used for testing to reset state between test cases.
 *
 * Note: This does not unregister backends from the registry.
 * Use resetRegistry() to clear registrations.
 */
export function resetFactory(): void {
  instanceCache.clear();
}

/**
 * Clear both the instance cache and the backend registry.
 * Convenience function for test cleanup.
 *
 * @example
 * ```typescript
 * // In test teardown
 * afterEach(() => {
 *   resetAll();
 * });
 * ```
 */
export function resetAll(): void {
  instanceCache.clear();
  resetRegistry();
}
