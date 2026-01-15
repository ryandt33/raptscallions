import { z } from "zod";

/**
 * Schema for individual storage limit values.
 * All values must be non-negative integers.
 */
export const storageLimitValuesSchema = z.object({
  /** Maximum file size in bytes (e.g., 10485760 for 10MB) */
  maxFileSizeBytes: z.number().int().nonnegative().optional(),
  /** Total storage quota in bytes (e.g., 1073741824 for 1GB) */
  storageQuotaBytes: z.number().int().nonnegative().optional(),
});

/**
 * Schema for role-based storage limits within a group's settings.
 * Keys are role names (teacher, student, etc.), values are limit configs.
 *
 * Example:
 * ```json
 * {
 *   "teacher": { "maxFileSizeBytes": 52428800, "storageQuotaBytes": 5368709120 },
 *   "student": { "maxFileSizeBytes": 10485760, "storageQuotaBytes": 1073741824 }
 * }
 * ```
 */
export const roleStorageLimitsSchema = z.record(
  z.string(),
  storageLimitValuesSchema
);

/**
 * Schema for storage-related fields within groups.settings JSONB.
 * Used to validate and type-check group settings related to file storage.
 */
export const groupStorageSettingsSchema = z.object({
  /** Role-based storage limits for this group */
  storageLimits: roleStorageLimitsSchema.optional(),
});

/**
 * Schema for file metadata during upload validation.
 * Used by upload API routes to validate incoming file metadata.
 */
export const fileUploadMetadataSchema = z.object({
  /** Original filename from client */
  originalName: z.string().min(1).max(255),
  /** MIME type from client (will be validated server-side) */
  mimeType: z.string().min(1).max(100),
  /** File size in bytes */
  sizeBytes: z.number().int().positive(),
  /** Purpose/category for the file */
  purpose: z.string().min(1).max(50).default("general"),
  /** Optional group to associate file with */
  groupId: z.string().uuid().optional(),
});

/**
 * Schema for user storage limit override input.
 * Used when admins set user-specific limits.
 */
export const setUserStorageLimitSchema = z.object({
  /** User to set limits for */
  userId: z.string().uuid(),
  /** Maximum file size override (null to inherit) */
  maxFileSizeBytes: z.number().int().nonnegative().nullable().optional(),
  /** Storage quota override (null to inherit) */
  storageQuotaBytes: z.number().int().nonnegative().nullable().optional(),
  /** Reason for the override (audit trail) */
  reason: z.string().max(500).optional(),
});

// Type exports
export type StorageLimitValues = z.infer<typeof storageLimitValuesSchema>;
export type RoleStorageLimits = z.infer<typeof roleStorageLimitsSchema>;
export type GroupStorageSettings = z.infer<typeof groupStorageSettingsSchema>;
export type FileUploadMetadata = z.infer<typeof fileUploadMetadataSchema>;
export type SetUserStorageLimit = z.infer<typeof setUserStorageLimitSchema>;
