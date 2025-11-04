/**
 * Integration Tests for Nutrition Router
 * Milestone 3: Nutrition Module Tests
 */

import { TRPCError } from '@trpc/server';
import { nutritionRouter } from '../nutrition.router';
import { createMockContext, createUnauthenticatedContext } from '../../__tests__/utils/test-helpers';
import { db } from '../../config/firebase';
import { solveLeastCostFeedFormulation } from '../../lib/feed-solver';
import { logInfo, logError } from '../../lib/logger';

// Mock dependencies
jest.mock('../../config/firebase', () => ({
  db: {
    collection: jest.fn(),
  },
}));

jest.mock('../../lib/feed-solver', () => ({
  solveLeastCostFeedFormulation: jest.fn(),
}));

jest.mock('../../lib/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
}));

describe('Nutrition Router - Integration Tests', () => {
  const mockContext = createMockContext();
  const mockDocRef = {
    id: 'ingredient-123',
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockCollection = jest.fn(() => ({
    doc: jest.fn((docId?: string) => {
      if (docId) {
        mockDocRef.id = docId;
      }
      return mockDocRef;
    }),
    where: jest.fn(() => ({
      get: jest.fn(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
    })),
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    (db.collection as jest.Mock) = mockCollection;
  });

  describe('createIngredient', () => {
    const mockIngredientInput = {
      name: 'Corn',
      unitPrice: 0.2,
      unit: 'kg' as const,
      nutritionalValues: {
        protein: 8,
        energy: 3.5,
        fiber: 2,
      },
      available: true,
    };

    it('should create ingredient successfully', async () => {
      mockDocRef.set.mockResolvedValue(undefined);

      const caller = nutritionRouter.createCaller(mockContext);
      const result = await caller.createIngredient(mockIngredientInput);

      expect(result).toBeDefined();
      expect(result.name).toBe('Corn');
      expect(result.userId).toBe('test-user-id');
      expect(result.id).toBe(mockDocRef.id);
      expect(mockCollection).toHaveBeenCalledWith('ingredients');
      expect(mockDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Corn',
          userId: 'test-user-id',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        })
      );

      // Verify logging
      expect(logInfo).toHaveBeenCalledWith(
        'Creating ingredient',
        expect.objectContaining({
          userId: 'test-user-id',
          procedure: 'nutrition.createIngredient',
        })
      );
    });

    it('should throw UNAUTHORIZED when called without authentication', async () => {
      const unauthenticatedContext = createUnauthenticatedContext();
      const caller = nutritionRouter.createCaller(unauthenticatedContext);

      await expect(
        caller.createIngredient(mockIngredientInput)
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.createIngredient(mockIngredientInput)
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('should verify Firestore Security Rules - user-specific creation', async () => {
      // This test verifies that userId is set correctly (Firestore rules will enforce ownership)
      const caller = nutritionRouter.createCaller(mockContext);
      await caller.createIngredient(mockIngredientInput);

      expect(mockDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-id', // User can only create ingredients with their own userId
        })
      );
    });
  });

  describe('updateIngredient', () => {
    const mockUpdateInput = {
      id: 'ingredient-123',
      name: 'Updated Corn',
      unitPrice: 0.25,
    };

    it('should update ingredient successfully when user is owner', async () => {
      const existingData = {
        id: 'ingredient-123',
        userId: 'test-user-id',
        name: 'Corn',
        unitPrice: 0.2,
        createdAt: { toDate: () => new Date('2024-01-01') },
        updatedAt: { toDate: () => new Date('2024-01-01') },
      };

      const updatedData = {
        ...existingData,
        name: 'Updated Corn',
        unitPrice: 0.25,
        updatedAt: { toDate: () => new Date('2024-01-02') },
      };

      mockDocRef.get
        .mockResolvedValueOnce({
          exists: true,
          id: 'ingredient-123',
          data: () => existingData,
        })
        .mockResolvedValueOnce({
          exists: true,
          id: 'ingredient-123',
          data: () => updatedData,
        });

      mockDocRef.update.mockResolvedValue(undefined);

      const caller = nutritionRouter.createCaller(mockContext);
      const result = await caller.updateIngredient(mockUpdateInput);

      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Corn');
      expect(result.unitPrice).toBe(0.25);
      expect(mockDocRef.update).toHaveBeenCalled();
    });

    it('should throw FORBIDDEN when user tries to update another user ingredient', async () => {
      const otherUserData = {
        id: 'ingredient-123',
        userId: 'other-user-id', // Different user
        name: 'Corn',
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      };

      mockDocRef.get.mockResolvedValue({
        exists: true,
        id: 'ingredient-123',
        data: () => otherUserData,
      });

      const caller = nutritionRouter.createCaller(mockContext);

      await expect(
        caller.updateIngredient(mockUpdateInput)
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.updateIngredient(mockUpdateInput)
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'You can only update your own ingredients',
      });

      expect(mockDocRef.update).not.toHaveBeenCalled();
    });

    it('should verify Firestore Security Rules - user-specific editing', async () => {
      // This test verifies that the business logic enforces user ownership
      const caller = nutritionRouter.createCaller(mockContext);

      const existingData = {
        userId: 'test-user-id',
        name: 'Corn',
        unitPrice: 0.2,
        unit: 'kg',
        nutritionalValues: { protein: 8 },
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      };

      const updatedData = {
        ...existingData,
        name: 'Updated Corn',
        unitPrice: 0.25,
      };

      mockDocRef.get
        .mockResolvedValueOnce({
          exists: true,
          id: 'ingredient-123',
          data: () => existingData,
        })
        .mockResolvedValueOnce({
          exists: true,
          id: 'ingredient-123',
          data: () => updatedData,
        });

      await caller.updateIngredient({
        id: 'ingredient-123',
        name: 'Updated Corn',
        unitPrice: 0.25,
      });

      // Verify update was called (user owns the ingredient)
      expect(mockDocRef.update).toHaveBeenCalled();
    });
  });

  describe('optimizeFeed', () => {
    const mockOptimizationInput = {
      targetAnimal: 'Dairy Cattle' as const,
      totalAmount: 100,
      unit: 'kg' as const,
      ingredients: [
        {
          id: 'ingredient-1',
          name: 'Corn',
          unitPrice: 0.2,
          nutritionalValues: {
            protein: 8,
            energy: 3.5,
          },
        },
        {
          id: 'ingredient-2',
          name: 'Soybean Meal',
          unitPrice: 0.5,
          nutritionalValues: {
            protein: 44,
            energy: 3.2,
          },
        },
      ],
    };

    it('should optimize feed ration successfully', async () => {
      const mockSolution = {
        userId: 'test-user-id',
        targetAnimal: 'Dairy Cattle',
        totalAmount: 100,
        unit: 'kg',
        components: [
          {
            ingredientId: 'ingredient-1',
            ingredientName: 'Corn',
            percentage: 60,
            amount: 60,
            cost: 12,
          },
          {
            ingredientId: 'ingredient-2',
            ingredientName: 'Soybean Meal',
            percentage: 40,
            amount: 40,
            cost: 20,
          },
        ],
        totalCost: 32,
        nutritionalValues: {
          protein: 20,
          energy: 3.3,
        },
        optimizedAt: new Date(),
      };

      (solveLeastCostFeedFormulation as jest.Mock).mockReturnValue(mockSolution);

      // Mock ingredient validation query
      const mockWhereChain = {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [
            { id: 'ingredient-1', data: () => ({ userId: 'test-user-id' }) },
            { id: 'ingredient-2', data: () => ({ userId: 'test-user-id' }) },
          ],
          size: 2,
        }),
      };

      mockCollection.mockReturnValue({
        where: jest.fn(() => mockWhereChain),
        doc: jest.fn(() => mockDocRef),
      });

      mockDocRef.set.mockResolvedValue(undefined);

      const caller = nutritionRouter.createCaller(mockContext);
      const result = await caller.optimizeFeed(mockOptimizationInput);

      expect(result).toBeDefined();
      expect(result.targetAnimal).toBe('Dairy Cattle');
      expect(result.totalCost).toBe(32);
      expect(solveLeastCostFeedFormulation).toHaveBeenCalledWith(mockOptimizationInput);
      expect(mockDocRef.set).toHaveBeenCalled(); // Ration saved to Firestore
    });

    it('should throw BAD_REQUEST when ingredients do not belong to user', async () => {
      const mockWhereChain = {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [{ id: 'ingredient-1', data: () => ({ userId: 'other-user' }) }],
          size: 1, // Only 1 ingredient found, but 2 were requested
        }),
      };

      mockCollection.mockReturnValue({
        where: jest.fn(() => mockWhereChain),
        doc: jest.fn(() => mockDocRef),
      });

      const caller = nutritionRouter.createCaller(mockContext);

      await expect(
        caller.optimizeFeed(mockOptimizationInput)
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.optimizeFeed(mockOptimizationInput)
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: expect.stringContaining('do not belong to you'),
      });
    });
  });
});

