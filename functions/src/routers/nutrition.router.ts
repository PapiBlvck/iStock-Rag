import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  IngredientSchema,
  CreateIngredientInputSchema,
  UpdateIngredientInputSchema,
  FeedRationSchema,
  FeedOptimizationInputSchema,
} from '@rag-monorepo/shared';
import { db } from '../config/firebase';
import { logInfo, logError } from '../lib/logger';
import { protectedProcedure, router } from '../trpc/trpc';
import { solveLeastCostFeedFormulation } from '../lib/feed-solver';

/**
 * Nutrition Router
 * Handles ingredient management and feed ration optimization
 */
export const nutritionRouter = router({
  /**
   * Create a new ingredient
   */
  createIngredient: protectedProcedure
    .input(CreateIngredientInputSchema)
    .output(IngredientSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        logInfo('Creating ingredient', {
          userId: ctx.userId,
          procedure: 'nutrition.createIngredient',
          ingredientName: input.name,
        });

        const ingredientRef = db.collection('ingredients').doc();
        const now = new Date();

        const newIngredient = {
          id: ingredientRef.id,
          userId: ctx.userId,
          ...input,
          createdAt: now,
          updatedAt: now,
        };

        await ingredientRef.set(newIngredient);

        logInfo('Ingredient created successfully', {
          userId: ctx.userId,
          procedure: 'nutrition.createIngredient',
          ingredientId: ingredientRef.id,
        });

        return newIngredient;
      } catch (error) {
        logError('Failed to create ingredient', error as Error, {
          userId: ctx.userId,
          procedure: 'nutrition.createIngredient',
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create ingredient',
          cause: error as Error,
        });
      }
    }),

  /**
   * Get all ingredients for the current user
   */
  getMyIngredients: protectedProcedure
    .output(z.array(IngredientSchema))
    .query(async ({ ctx }) => {
      try {
        logInfo('Fetching user ingredients', {
          userId: ctx.userId,
          procedure: 'nutrition.getMyIngredients',
        });

        const snapshot = await db
          .collection('ingredients')
          .where('userId', '==', ctx.userId)
          .get();

        const ingredients = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            name: data.name,
            description: data.description,
            unitPrice: data.unitPrice,
            unit: data.unit || 'kg',
            nutritionalValues: data.nutritionalValues || {},
            constraints: data.constraints,
            available: data.available !== false,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          };
        });

        return ingredients;
      } catch (error) {
        logError('Failed to fetch ingredients', error as Error, {
          userId: ctx.userId,
          procedure: 'nutrition.getMyIngredients',
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch ingredients',
          cause: error as Error,
        });
      }
    }),

  /**
   * Get a specific ingredient by ID
   */
  getIngredientById: protectedProcedure
    .input(z.object({ ingredientId: z.string() }))
    .output(IngredientSchema.nullable())
    .query(async ({ input, ctx }) => {
      try {
        const ingredientDoc = await db
          .collection('ingredients')
          .doc(input.ingredientId)
          .get();

        if (!ingredientDoc.exists) {
          return null;
        }

        const data = ingredientDoc.data();

        // Security: Verify the ingredient belongs to the requesting user
        if (data?.userId !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only access your own ingredients',
          });
        }

        return {
          id: ingredientDoc.id,
          userId: data.userId,
          name: data.name,
          description: data.description,
          unitPrice: data.unitPrice,
          unit: data.unit || 'kg',
          nutritionalValues: data.nutritionalValues || {},
          constraints: data.constraints,
          available: data.available !== false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        logError('Failed to fetch ingredient', error as Error, {
          userId: ctx.userId,
          procedure: 'nutrition.getIngredientById',
          ingredientId: input.ingredientId,
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch ingredient',
          cause: error as Error,
        });
      }
    }),

  /**
   * Update an ingredient
   */
  updateIngredient: protectedProcedure
    .input(UpdateIngredientInputSchema)
    .output(IngredientSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { id, ...updateData } = input;
        const ingredientRef = db.collection('ingredients').doc(id);
        const ingredientDoc = await ingredientRef.get();

        if (!ingredientDoc.exists) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Ingredient not found',
          });
        }

        const existingData = ingredientDoc.data();

        // Security: Verify the ingredient belongs to the requesting user
        if (existingData?.userId !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only update your own ingredients',
          });
        }

        const finalUpdateData = {
          ...updateData,
          updatedAt: new Date(),
        };

        await ingredientRef.update(finalUpdateData);

        const updatedDoc = await ingredientRef.get();
        const data = updatedDoc.data();

        if (!data) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Failed to retrieve updated ingredient',
          });
        }

        return {
          id: updatedDoc.id,
          userId: data.userId,
          name: data.name,
          description: data.description,
          unitPrice: data.unitPrice,
          unit: data.unit || 'kg',
          nutritionalValues: data.nutritionalValues || {},
          constraints: data.constraints,
          available: data.available !== false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        logError('Failed to update ingredient', error as Error, {
          userId: ctx.userId,
          procedure: 'nutrition.updateIngredient',
          ingredientId: input.id,
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update ingredient',
          cause: error as Error,
        });
      }
    }),

  /**
   * Delete an ingredient
   */
  deleteIngredient: protectedProcedure
    .input(z.object({ ingredientId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const ingredientRef = db.collection('ingredients').doc(input.ingredientId);
        const ingredientDoc = await ingredientRef.get();

        if (!ingredientDoc.exists) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Ingredient not found',
          });
        }

        const data = ingredientDoc.data();

        // Security: Verify the ingredient belongs to the requesting user
        if (data?.userId !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only delete your own ingredients',
          });
        }

        await ingredientRef.delete();

        logInfo('Ingredient deleted successfully', {
          userId: ctx.userId,
          procedure: 'nutrition.deleteIngredient',
          ingredientId: input.ingredientId,
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        logError('Failed to delete ingredient', error as Error, {
          userId: ctx.userId,
          procedure: 'nutrition.deleteIngredient',
          ingredientId: input.ingredientId,
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete ingredient',
          cause: error as Error,
        });
      }
    }),

  /**
   * Optimize feed ration using least-cost linear programming
   */
  optimizeFeed: protectedProcedure
    .input(FeedOptimizationInputSchema)
    .output(FeedRationSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        logInfo('Starting feed optimization', {
          userId: ctx.userId,
          procedure: 'nutrition.optimizeFeed',
          targetAnimal: input.targetAnimal,
          ingredientCount: input.ingredients.length,
          totalAmount: input.totalAmount,
        });

        // Validate that all ingredient IDs belong to the user
        const ingredientIds = input.ingredients.map((ing) => ing.id);
        const ingredientSnapshot = await db
          .collection('ingredients')
          .where('userId', '==', ctx.userId)
          .where('__name__', 'in', ingredientIds)
          .get();

        if (ingredientSnapshot.size !== ingredientIds.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Some ingredients do not belong to you or do not exist',
          });
        }

        // Solve the feed formulation problem
        const solution = solveLeastCostFeedFormulation(input);

        // Set the userId for the solution
        solution.userId = ctx.userId;

        // Optionally save the optimized ration to Firestore
        const rationRef = db.collection('feedRations').doc();
        const now = new Date();

        const savedRation = {
          ...solution,
          id: rationRef.id,
          createdAt: now,
          updatedAt: now,
        };

        await rationRef.set(savedRation);

        logInfo('Feed optimization completed successfully', {
          userId: ctx.userId,
          procedure: 'nutrition.optimizeFeed',
          rationId: rationRef.id,
          totalCost: solution.totalCost,
        });

        return savedRation;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        logError('Failed to optimize feed', error as Error, {
          userId: ctx.userId,
          procedure: 'nutrition.optimizeFeed',
          targetAnimal: input.targetAnimal,
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to optimize feed ration',
          cause: error as Error,
        });
      }
    }),

  /**
   * Get all feed rations for the current user
   */
  getMyFeedRations: protectedProcedure
    .output(z.array(FeedRationSchema))
    .query(async ({ ctx }) => {
      try {
        const snapshot = await db
          .collection('feedRations')
          .where('userId', '==', ctx.userId)
          .orderBy('optimizedAt', 'desc')
          .get();

        const rations = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            targetAnimal: data.targetAnimal,
            totalAmount: data.totalAmount,
            unit: data.unit || 'kg',
            components: data.components || [],
            totalCost: data.totalCost,
            nutritionalValues: data.nutritionalValues || {},
            optimizedAt: data.optimizedAt?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          };
        });

        return rations;
      } catch (error) {
        logError('Failed to fetch feed rations', error as Error, {
          userId: ctx.userId,
          procedure: 'nutrition.getMyFeedRations',
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch feed rations',
          cause: error as Error,
        });
      }
    }),

  /**
   * Get a specific feed ration by ID
   */
  getFeedRationById: protectedProcedure
    .input(z.object({ rationId: z.string() }))
    .output(FeedRationSchema.nullable())
    .query(async ({ input, ctx }) => {
      try {
        const rationDoc = await db.collection('feedRations').doc(input.rationId).get();

        if (!rationDoc.exists) {
          return null;
        }

        const data = rationDoc.data();

        // Security: Verify the ration belongs to the requesting user
        if (data?.userId !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only access your own feed rations',
          });
        }

        return {
          id: rationDoc.id,
          userId: data.userId,
          targetAnimal: data.targetAnimal,
          totalAmount: data.totalAmount,
          unit: data.unit || 'kg',
          components: data.components || [],
          totalCost: data.totalCost,
          nutritionalValues: data.nutritionalValues || {},
          optimizedAt: data.optimizedAt?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        logError('Failed to fetch feed ration', error as Error, {
          userId: ctx.userId,
          procedure: 'nutrition.getFeedRationById',
          rationId: input.rationId,
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch feed ration',
          cause: error as Error,
        });
      }
    }),
});

