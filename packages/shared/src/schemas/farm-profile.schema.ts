import { z } from 'zod';

/**
 * Farm Size Category
 */
export const FarmSizeCategory = z.enum([
  'small',
  'medium',
  'large',
  'enterprise',
]);

export type FarmSizeCategory = z.infer<typeof FarmSizeCategory>;

/**
 * Farming Type
 */
export const FarmingType = z.enum([
  'crops',
  'livestock',
  'mixed',
  'aquaculture',
  'horticulture',
  'organic',
  'other',
]);

export type FarmingType = z.infer<typeof FarmingType>;

/**
 * Farm Profile Schema
 * Contains all information about a user's farm
 */
export const FarmProfileSchema = z.object({
  id: z.string().min(1, 'Farm profile ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  farmName: z.string().min(2, 'Farm name must be at least 2 characters'),
  location: z.object({
    country: z.string().min(2, 'Country is required'),
    region: z.string().min(2, 'Region/State is required'),
    city: z.string().optional(),
    coordinates: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      })
      .optional(),
  }),
  farmSize: z.object({
    value: z.number().positive('Farm size must be positive'),
    unit: z.enum(['acres', 'hectares', 'sqft', 'sqm']),
    category: FarmSizeCategory,
  }),
  farmingType: z.array(FarmingType).min(1, 'Select at least one farming type'),
  crops: z.array(z.string()).optional(),
  livestock: z.array(z.string()).optional(),
  experience: z.object({
    years: z.number().min(0, 'Years of experience cannot be negative'),
    level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  }),
  challenges: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type FarmProfile = z.infer<typeof FarmProfileSchema>;

/**
 * Create Farm Profile Input Schema
 */
export const CreateFarmProfileInputSchema = FarmProfileSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateFarmProfileInput = z.infer<
  typeof CreateFarmProfileInputSchema
>;

/**
 * Update Farm Profile Input Schema
 */
export const UpdateFarmProfileInputSchema =
  CreateFarmProfileInputSchema.partial();

export type UpdateFarmProfileInput = z.infer<
  typeof UpdateFarmProfileInputSchema
>;

/**
 * Get Farm Profile Input Schema
 */
export const GetFarmProfileInputSchema = z.object({
  userId: z.string().optional(), // Optional for getting own profile
  farmId: z.string().optional(), // Or get by farm ID
});

export type GetFarmProfileInput = z.infer<typeof GetFarmProfileInputSchema>;

