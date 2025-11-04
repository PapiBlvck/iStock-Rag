import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  UserSchema,
  CreateUserInputSchema,
  UpdateUserInputSchema,
} from '@rag-monorepo/shared';
import { db } from '../config/firebase';
import { protectedProcedure, publicProcedure, router } from '../trpc/trpc';

/**
 * User Router
 * Handles user creation, retrieval, and updates
 */
export const userRouter = router({
  /**
   * Create a new user profile
   */
  create: publicProcedure
    .input(CreateUserInputSchema)
    .output(UserSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User must be authenticated',
        });
      }

      const now = new Date();
      const newUser = {
        uid: ctx.userId,
        email: input.email,
        displayName: input.displayName ?? undefined,
        photoURL: undefined,
        createdAt: now,
        updatedAt: now,
      };

      try {
        await db.collection('users').doc(ctx.userId).set(newUser);
        return newUser;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create user',
          cause: error as Error,
        });
      }
    }),

  /**
   * Get the current user's profile
   */
  getMe: protectedProcedure.output(UserSchema.nullable()).query(async ({ ctx }) => {
    try {
      const userDoc = await db.collection('users').doc(ctx.userId).get();

      if (!userDoc.exists) {
        return null;
      }

      const userData = userDoc.data();
      return {
        uid: userDoc.id,
        email: userData?.email || '',
        displayName: userData?.displayName ?? undefined,
        photoURL: userData?.photoURL ?? undefined,
        createdAt: userData?.createdAt?.toDate() || new Date(),
        updatedAt: userData?.updatedAt?.toDate() || new Date(),
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch user',
        cause: error as Error,
      });
    }
  }),

  /**
   * Get a user by ID (restricted to own profile for security)
   */
  getById: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .output(UserSchema.nullable())
    .query(async ({ input, ctx }) => {
      // Security: Users can only fetch their own profile
      if (input.userId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only access your own profile',
        });
      }

      try {
        const userDoc = await db.collection('users').doc(input.userId).get();

        if (!userDoc.exists) {
          return null;
        }

        const userData = userDoc.data();
        return {
          uid: userDoc.id,
          email: userData?.email || '',
          displayName: userData?.displayName ?? undefined,
          photoURL: userData?.photoURL ?? undefined,
          createdAt: userData?.createdAt?.toDate() || new Date(),
          updatedAt: userData?.updatedAt?.toDate() || new Date(),
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch user',
          cause: error as Error,
        });
      }
    }),

  /**
   * Update the current user's profile
   */
  update: protectedProcedure
    .input(UpdateUserInputSchema)
    .output(UserSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const userRef = db.collection('users').doc(ctx.userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        const updateData = {
          ...input,
          updatedAt: new Date(),
        };

        await userRef.update(updateData);

        const updatedDoc = await userRef.get();
        const updatedData = updatedDoc.data();

        return {
          uid: updatedDoc.id,
          email: updatedData?.email || '',
          displayName: updatedData?.displayName ?? undefined,
          photoURL: updatedData?.photoURL ?? undefined,
          createdAt: updatedData?.createdAt?.toDate() || new Date(),
          updatedAt: updatedData?.updatedAt?.toDate() || new Date(),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update user',
          cause: error as Error,
        });
      }
    }),
});
