import { z } from 'zod';

/**
 * User Schema
 * Represents the authenticated user information
 */
export const UserSchema = z.object({
  uid: z.string().min(1, 'User ID is required'),
  email: z.string().email('Invalid email address'),
  displayName: z.string().optional(),
  photoURL: z.string().url().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * User creation input schema (for new user registration)
 */
export const CreateUserInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

/**
 * User update input schema
 */
export const UpdateUserInputSchema = z.object({
  displayName: z.string().optional(),
  photoURL: z.string().url().optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;

