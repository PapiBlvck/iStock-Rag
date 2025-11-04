import { TRPCError } from '@trpc/server';
import {
  CreateFarmProfileInputSchema,
  FarmProfileSchema,
  UpdateFarmProfileInputSchema,
} from '@rag-monorepo/shared';
import { db } from '../config/firebase';
import { protectedProcedure, router } from '../trpc/trpc';
import { z } from 'zod';

/**
 * Farm Profile Router
 * Handles farm profile creation, retrieval, and updates
 * Security: Users can only access their own farm profiles
 */
export const farmProfileRouter = router({
  /**
   * Create a new farm profile
   */
  create: protectedProcedure
    .input(CreateFarmProfileInputSchema)
    .output(FarmProfileSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const farmRef = db.collection('farmProfiles').doc();
        const now = new Date();

        const newFarmProfile = {
          id: farmRef.id,
          userId: ctx.userId,
          ...input,
          createdAt: now,
          updatedAt: now,
        };

        await farmRef.set(newFarmProfile);

        return newFarmProfile;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create farm profile',
          cause: error as Error,
        });
      }
    }),

  /**
   * Get the current user's farm profiles
   */
  getMyProfiles: protectedProcedure
    .output(z.array(FarmProfileSchema))
    .query(async ({ ctx }) => {
      try {
        const snapshot = await db
          .collection('farmProfiles')
          .where('userId', '==', ctx.userId)
          .get();

        const profiles = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            farmName: data.farmName,
            location: data.location,
            farmSize: data.farmSize,
            farmingType: data.farmingType,
            crops: data.crops || [],
            livestock: data.livestock || [],
            experience: data.experience,
            challenges: data.challenges || [],
            goals: data.goals || [],
            certifications: data.certifications || [],
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          };
        });

        return profiles;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch farm profiles',
          cause: error as Error,
        });
      }
    }),

  /**
   * Get a specific farm profile by ID
   */
  getById: protectedProcedure
    .input(z.object({ farmId: z.string() }))
    .output(FarmProfileSchema.nullable())
    .query(async ({ input, ctx }) => {
      try {
        const farmDoc = await db
          .collection('farmProfiles')
          .doc(input.farmId)
          .get();

        if (!farmDoc.exists) {
          return null;
        }

        const data = farmDoc.data();

        // Security: Verify the profile belongs to the requesting user
        if (data?.userId !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only access your own farm profiles',
          });
        }

        return {
          id: farmDoc.id,
          userId: data.userId,
          farmName: data.farmName,
          location: data.location,
          farmSize: data.farmSize,
          farmingType: data.farmingType,
          crops: data.crops || [],
          livestock: data.livestock || [],
          experience: data.experience,
          challenges: data.challenges || [],
          goals: data.goals || [],
          certifications: data.certifications || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch farm profile',
          cause: error as Error,
        });
      }
    }),

  /**
   * Update a farm profile
   */
  update: protectedProcedure
    .input(
      z.object({
        farmId: z.string(),
        data: UpdateFarmProfileInputSchema,
      })
    )
    .output(FarmProfileSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const farmRef = db.collection('farmProfiles').doc(input.farmId);
        const farmDoc = await farmRef.get();

        if (!farmDoc.exists) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Farm profile not found',
          });
        }

        const existingData = farmDoc.data();

        // Security: Verify the profile belongs to the requesting user
        if (existingData?.userId !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only update your own farm profiles',
          });
        }

        // Safely spread the update data (input.data is validated by Zod)
        const updateData = {
          ...(input.data as Record<string, unknown>),
          updatedAt: new Date(),
        };

        await farmRef.update(updateData);

        const updatedDoc = await farmRef.get();
        const data = updatedDoc.data();

        if (!data) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Failed to retrieve updated farm profile',
          });
        }

        return {
          id: updatedDoc.id,
          userId: data.userId as string,
          farmName: data.farmName as string,
          location: data.location,
          farmSize: data.farmSize,
          farmingType: data.farmingType,
          crops: data.crops || [],
          livestock: data.livestock || [],
          experience: data.experience,
          challenges: data.challenges || [],
          goals: data.goals || [],
          certifications: data.certifications || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update farm profile',
          cause: error as Error,
        });
      }
    }),

  /**
   * Delete a farm profile
   */
  delete: protectedProcedure
    .input(z.object({ farmId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const farmRef = db.collection('farmProfiles').doc(input.farmId);
        const farmDoc = await farmRef.get();

        if (!farmDoc.exists) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Farm profile not found',
          });
        }

        const data = farmDoc.data();

        // Security: Verify the profile belongs to the requesting user
        if (data?.userId !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only delete your own farm profiles',
          });
        }

        await farmRef.delete();

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete farm profile',
          cause: error as Error,
        });
      }
    }),
});

