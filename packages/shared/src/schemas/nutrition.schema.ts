import { z } from 'zod';

/**
 * Nutritional Values Schema
 * Represents the nutritional composition of an ingredient or feed ration
 * All values are per unit (typically per kg or per 100g)
 */
export const NutritionalValuesSchema = z.object({
  // Protein content (percentage)
  protein: z.number().min(0).max(100).optional(),
  
  // Energy content (Mcal/kg or MJ/kg)
  energy: z.number().min(0).optional(),
  
  // Crude fiber (percentage)
  fiber: z.number().min(0).max(100).optional(),
  
  // Fat content (percentage)
  fat: z.number().min(0).max(100).optional(),
  
  // Calcium (percentage)
  calcium: z.number().min(0).max(100).optional(),
  
  // Phosphorus (percentage)
  phosphorus: z.number().min(0).max(100).optional(),
  
  // Dry matter (percentage)
  dryMatter: z.number().min(0).max(100).optional(),
  
  // Ash content (percentage)
  ash: z.number().min(0).max(100).optional(),
});

export type NutritionalValues = z.infer<typeof NutritionalValuesSchema>;

/**
 * Ingredient Constraints Schema
 * Defines min/max usage limits for an ingredient in a feed formulation
 */
export const IngredientConstraintsSchema = z.object({
  minPercentage: z.number().min(0).max(100).optional(),
  maxPercentage: z.number().min(0).max(100).optional(),
  minAmount: z.number().min(0).optional(), // in kg or units
  maxAmount: z.number().min(0).optional(), // in kg or units
});

export type IngredientConstraints = z.infer<typeof IngredientConstraintsSchema>;

/**
 * Ingredient Schema
 * Represents a feed ingredient that can be used in feed formulation
 */
export const IngredientSchema = z.object({
  id: z.string().min(1, 'Ingredient ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  name: z.string().min(1, 'Ingredient name is required'),
  description: z.string().optional(),
  
  // Pricing
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  unit: z.enum(['kg', 'ton', 'lb', 'pound']).default('kg'),
  
  // Nutritional composition
  nutritionalValues: NutritionalValuesSchema,
  
  // Constraints for feed formulation
  constraints: IngredientConstraintsSchema.optional(),
  
  // Availability/stock status
  available: z.boolean().default(true),
  
  // Metadata
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Ingredient = z.infer<typeof IngredientSchema>;

/**
 * Create Ingredient Input Schema
 * For creating new ingredients (without id, timestamps)
 */
export const CreateIngredientInputSchema = IngredientSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateIngredientInput = z.infer<typeof CreateIngredientInputSchema>;

/**
 * Update Ingredient Input Schema
 * For updating existing ingredients (all fields optional except id)
 */
export const UpdateIngredientInputSchema = IngredientSchema.partial().required({
  id: true,
}).omit({
  userId: true,
  createdAt: true,
});

export type UpdateIngredientInput = z.infer<typeof UpdateIngredientInputSchema>;

/**
 * Feed Ration Component Schema
 * Represents a single ingredient in an optimized feed ration
 */
export const FeedRationComponentSchema = z.object({
  ingredientId: z.string().min(1),
  ingredientName: z.string().min(1),
  percentage: z.number().min(0).max(100),
  amount: z.number().min(0).optional(), // in kg or units
  cost: z.number().min(0),
});

export type FeedRationComponent = z.infer<typeof FeedRationComponentSchema>;

/**
 * Feed Ration Schema
 * Represents an optimized feed ration with cost and nutritional composition
 */
export const FeedRationSchema = z.object({
  id: z.string().optional(),
  userId: z.string().min(1, 'User ID is required'),
  
  // Optimization parameters
  targetAnimal: z.enum(['Dairy Cattle', 'Beef Cattle', 'Calf', 'Pig', 'Chicken', 'Sheep', 'Goat']),
  totalAmount: z.number().positive('Total amount must be positive'), // Total feed amount in kg
  unit: z.enum(['kg', 'ton', 'lb', 'pound']).default('kg'),
  
  // Ration composition
  components: z.array(FeedRationComponentSchema).min(1, 'At least one component is required'),
  
  // Total cost
  totalCost: z.number().min(0, 'Total cost must be non-negative'),
  
  // Nutritional composition of the final ration
  nutritionalValues: NutritionalValuesSchema,
  
  // Optimization metadata
  optimizedAt: z.date(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type FeedRation = z.infer<typeof FeedRationSchema>;

/**
 * Feed Optimization Input Schema
 * Input for the least-cost feed optimization solver
 */
export const FeedOptimizationInputSchema = z.object({
  targetAnimal: z.enum(['Dairy Cattle', 'Beef Cattle', 'Calf', 'Pig', 'Chicken', 'Sheep', 'Goat']),
  totalAmount: z.number().positive('Total amount must be positive'),
  unit: z.enum(['kg', 'ton', 'lb', 'pound']).default('kg'),
  
  // Available ingredients with their data
  ingredients: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      unitPrice: z.number().min(0),
      nutritionalValues: NutritionalValuesSchema,
      constraints: IngredientConstraintsSchema.optional(),
    })
  ).min(1, 'At least one ingredient is required'),
  
  // Target nutritional requirements (optional - will use defaults if not provided)
  targetNutrition: NutritionalValuesSchema.optional(),
  
  // Constraints
  maxIngredients: z.number().int().positive().optional(), // Max number of ingredients to use
});

export type FeedOptimizationInput = z.infer<typeof FeedOptimizationInputSchema>;

