import { z } from "zod";

/**
 * Base group schema containing required and optional fields for group validation.
 * Name must be 1-100 characters, parentId must be valid UUID if provided,
 * settings defaults to empty object.
 */
export const groupBaseSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().uuid().optional(),
  settings: z.record(z.string(), z.unknown()).default({}),
});

/**
 * Schema for creating a new group.
 * Currently identical to base schema.
 */
export const createGroupSchema = groupBaseSchema;

/**
 * Schema for updating a group.
 * All fields are optional since updates can be partial.
 */
export const updateGroupSchema = groupBaseSchema.partial();

// Type inference from Zod schemas
export type Group = z.infer<typeof groupBaseSchema>;
export type CreateGroup = z.infer<typeof createGroupSchema>;
export type UpdateGroup = z.infer<typeof updateGroupSchema>;
