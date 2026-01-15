/**
 * Storage backend plugin registry.
 * Allows registration and retrieval of storage backend factories.
 */

import { BackendNotRegisteredError } from "./errors.js";

import type { IStorageBackend, BackendFactory } from "./types.js";

/**
 * Internal registry storage for backend factories.
 * Using Map for O(1) lookup and clear semantics.
 */
const backendRegistry = new Map<string, BackendFactory>();

/**
 * Register a storage backend factory.
 *
 * The generic constraint ensures type-safety: only factories that produce
 * IStorageBackend implementations can be registered.
 *
 * Registration is idempotent - re-registering with the same identifier
 * overwrites the previous factory.
 *
 * @param identifier Unique string identifier for the backend (e.g., "local", "s3")
 * @param factory Factory function that creates backend instances
 *
 * @example
 * ```typescript
 * // Register a local filesystem backend
 * registerBackend("local", () => new LocalStorageBackend("/uploads"));
 *
 * // Register an S3-compatible backend
 * registerBackend("s3", () => new S3StorageBackend({
 *   bucket: "my-bucket",
 *   region: "us-east-1",
 * }));
 * ```
 */
export function registerBackend<T extends IStorageBackend>(
  identifier: string,
  factory: BackendFactory<T>
): void {
  backendRegistry.set(identifier, factory as BackendFactory);
}

/**
 * Get a registered backend factory by identifier.
 *
 * @param identifier The backend identifier to look up
 * @returns The factory function for creating backend instances
 * @throws BackendNotRegisteredError if identifier is not registered
 *
 * @example
 * ```typescript
 * const factory = getBackendFactory("s3");
 * const backend = factory();
 * ```
 */
export function getBackendFactory(identifier: string): BackendFactory {
  const factory = backendRegistry.get(identifier);

  if (!factory) {
    throw new BackendNotRegisteredError(identifier, getRegisteredBackends());
  }

  return factory;
}

/**
 * Check if a backend is registered.
 *
 * @param identifier The backend identifier to check
 * @returns true if the backend is registered, false otherwise
 */
export function isBackendRegistered(identifier: string): boolean {
  return backendRegistry.has(identifier);
}

/**
 * Get list of all registered backend identifiers.
 *
 * @returns Array of registered backend identifiers
 */
export function getRegisteredBackends(): string[] {
  return Array.from(backendRegistry.keys());
}

/**
 * Clear all registered backends.
 * Used for testing to reset state between test cases.
 */
export function resetRegistry(): void {
  backendRegistry.clear();
}
