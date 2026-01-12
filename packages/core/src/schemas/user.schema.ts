import { z } from "zod";

/**
 * Base user schema containing required fields for user validation.
 * Email must be valid format, name must be 1-100 characters.
 */
export const userBaseSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

/**
 * Schema for creating a new user.
 * Currently identical to base schema.
 */
export const createUserSchema = userBaseSchema;

/**
 * Schema for updating a user.
 * All fields are optional since updates can be partial.
 */
export const updateUserSchema = userBaseSchema.partial();

// Type inference from Zod schemas
export type User = z.infer<typeof userBaseSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
