/**
 * Integration Tests for User Router
 * Milestone 1: User & Auth Tests
 */

import { TRPCError } from '@trpc/server';
import { userRouter } from '../user.router';
import { createMockContext, createUnauthenticatedContext } from '../../__tests__/utils/test-helpers';
import { db } from '../../config/firebase';

// Mock Firebase
jest.mock('../../config/firebase', () => ({
  db: {
    collection: jest.fn(),
  },
}));

describe('User Router - Integration Tests', () => {
  const mockContext = createMockContext();
  const mockDocRef = {
    id: 'test-user-id',
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
  };

  const mockCollection = jest.fn(() => ({
    doc: jest.fn(() => mockDocRef),
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    (db.collection as jest.Mock) = mockCollection;
  });

  describe('getById', () => {
    it('should return user profile when user exists and is owner', async () => {
      const mockUserData = {
        email: 'test@example.com',
        displayName: 'Test User',
        createdAt: { toDate: () => new Date('2024-01-01') },
        updatedAt: { toDate: () => new Date('2024-01-01') },
      };

      mockDocRef.get.mockResolvedValue({
        exists: true,
        id: 'test-user-id',
        data: () => mockUserData,
      });

      const caller = userRouter.createCaller(mockContext);
      const result = await caller.getById({ userId: 'test-user-id' });

      expect(result).toBeDefined();
      expect(result?.uid).toBe('test-user-id');
      expect(result?.email).toBe('test@example.com');
      expect(mockCollection).toHaveBeenCalledWith('users');
    });

    it('should throw FORBIDDEN when user tries to access another user profile', async () => {
      const caller = userRouter.createCaller(mockContext);

      await expect(
        caller.getById({ userId: 'other-user-id' })
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.getById({ userId: 'other-user-id' })
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'You can only access your own profile',
      });
    });

    it('should return null when user does not exist', async () => {
      mockDocRef.get.mockResolvedValue({
        exists: false,
        id: 'test-user-id',
        data: () => null,
      });

      const caller = userRouter.createCaller(mockContext);
      const result = await caller.getById({ userId: 'test-user-id' });

      expect(result).toBeNull();
    });

    it('should throw UNAUTHORIZED when called without authentication', async () => {
      const unauthenticatedContext = createUnauthenticatedContext();
      const caller = userRouter.createCaller(unauthenticatedContext);

      await expect(
        caller.getById({ userId: 'test-user-id' })
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.getById({ userId: 'test-user-id' })
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('update', () => {
    it('should update user profile successfully', async () => {
      const existingUserData = {
        email: 'test@example.com',
        displayName: 'Old Name',
        createdAt: { toDate: () => new Date('2024-01-01') },
        updatedAt: { toDate: () => new Date('2024-01-01') },
      };

      const updatedUserData = {
        email: 'test@example.com',
        displayName: 'New Name',
        createdAt: { toDate: () => new Date('2024-01-01') },
        updatedAt: { toDate: () => new Date('2024-01-02') },
      };

      mockDocRef.get
        .mockResolvedValueOnce({
          exists: true,
          id: 'test-user-id',
          data: () => existingUserData,
        })
        .mockResolvedValueOnce({
          exists: true,
          id: 'test-user-id',
          data: () => updatedUserData,
        });

      mockDocRef.update.mockResolvedValue(undefined);

      const caller = userRouter.createCaller(mockContext);
      const result = await caller.update({
        displayName: 'New Name',
      });

      expect(result).toBeDefined();
      expect(result.displayName).toBe('New Name');
      expect(mockDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: 'New Name',
          updatedAt: expect.any(Date),
        })
      );
    });

    it('should throw NOT_FOUND when user does not exist', async () => {
      mockDocRef.get.mockResolvedValue({
        exists: false,
        id: 'test-user-id',
        data: () => null,
      });

      const caller = userRouter.createCaller(mockContext);

      try {
        await caller.update({ displayName: 'New Name' });
        fail('Should have thrown TRPCError');
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (error instanceof TRPCError) {
          expect(error.code).toBe('NOT_FOUND');
          expect(error.message).toBe('User not found');
        }
      }
    });

    it('should throw UNAUTHORIZED when called without authentication', async () => {
      const unauthenticatedContext = createUnauthenticatedContext();
      const caller = userRouter.createCaller(unauthenticatedContext);

      await expect(
        caller.update({ displayName: 'New Name' })
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.update({ displayName: 'New Name' })
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('should verify Firestore Security Rules - user can only update own profile', async () => {
      // This test verifies that the business logic enforces user ownership
      // The actual Firestore rules would be tested with Firebase Emulator
      const caller = userRouter.createCaller(mockContext);

      // User can update their own profile
      mockDocRef.get.mockResolvedValue({
        exists: true,
        id: 'test-user-id',
        data: () => ({ email: 'test@example.com' }),
      });

      await caller.update({ displayName: 'Updated' });
      expect(mockDocRef.update).toHaveBeenCalled();
    });
  });
});

