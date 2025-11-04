/**
 * Integration Tests for Farm Profile Router
 * Milestone 1: User & Auth Tests - updateProfile procedure
 */

import { TRPCError } from '@trpc/server';
import { farmProfileRouter } from '../farm-profile.router';
import { createMockContext, createUnauthenticatedContext } from '../../__tests__/utils/test-helpers';
import { db } from '../../config/firebase';
import type { UpdateFarmProfileInput } from '@rag-monorepo/shared';

// Mock Firebase
jest.mock('../../config/firebase', () => ({
  db: {
    collection: jest.fn(),
  },
}));

describe('Farm Profile Router - Integration Tests', () => {
  const mockContext = createMockContext();
  const mockDocRef = {
    id: 'farm-123',
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
  };

  const mockCollection = jest.fn(() => ({
    doc: jest.fn(() => mockDocRef),
    where: jest.fn(),
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    (db.collection as jest.Mock) = mockCollection;
  });

  describe('update', () => {
    const mockFarmProfilePayload: UpdateFarmProfileInput = {
      farmName: 'Updated Farm Name',
      location: {
        country: 'USA',
        region: 'California',
        city: 'Fresno',
      },
      farmSize: {
        value: 100,
        unit: 'acres',
        category: 'medium',
      },
      farmingType: ['crops'],
      experience: {
        years: 5,
        level: 'intermediate',
      },
    };

    it('should update farm profile successfully when user is owner', async () => {
      const existingFarmData = {
        id: 'farm-123',
        userId: 'test-user-id',
        farmName: 'Old Farm Name',
        location: {
          country: 'USA',
          region: 'Texas',
        },
        farmSize: {
          value: 50,
          unit: 'acres',
          category: 'small',
        },
        farmingType: ['livestock'],
        experience: {
          years: 3,
          level: 'beginner',
        },
        crops: [],
        livestock: [],
        challenges: [],
        goals: [],
        certifications: [],
        createdAt: { toDate: () => new Date('2024-01-01') },
        updatedAt: { toDate: () => new Date('2024-01-01') },
      };

      const updatedFarmData = {
        ...existingFarmData,
        ...mockFarmProfilePayload,
        crops: [],
        livestock: [],
        challenges: [],
        goals: [],
        certifications: [],
        updatedAt: { toDate: () => new Date('2024-01-02') },
      };

      mockDocRef.get
        .mockResolvedValueOnce({
          exists: true,
          id: 'farm-123',
          data: () => existingFarmData,
        })
        .mockResolvedValueOnce({
          exists: true,
          id: 'farm-123',
          data: () => updatedFarmData,
        });

      mockDocRef.update.mockResolvedValue(undefined);

      const caller = farmProfileRouter.createCaller(mockContext);
      const result = await caller.update({
        farmId: 'farm-123',
        data: mockFarmProfilePayload,
      });

      expect(result).toBeDefined();
      expect(result.farmName).toBe('Updated Farm Name');
      expect(result.location.city).toBe('Fresno');
      expect(mockDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          farmName: 'Updated Farm Name',
          updatedAt: expect.any(Date),
        })
      );
    });

    it('should throw FORBIDDEN when user tries to update another user farm profile', async () => {
      const otherUserFarmData = {
        id: 'farm-123',
        userId: 'other-user-id', // Different user
        farmName: 'Other Farm',
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      };

      mockDocRef.get.mockResolvedValue({
        exists: true,
        id: 'farm-123',
        data: () => otherUserFarmData,
      });

      const caller = farmProfileRouter.createCaller(mockContext);

      await expect(
        caller.update({
          farmId: 'farm-123',
          data: mockFarmProfilePayload,
        })
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.update({
          farmId: 'farm-123',
          data: mockFarmProfilePayload,
        })
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'You can only update your own farm profiles',
      });

      expect(mockDocRef.update).not.toHaveBeenCalled();
    });

    it('should throw NOT_FOUND when farm profile does not exist', async () => {
      mockDocRef.get.mockResolvedValue({
        exists: false,
        id: 'farm-123',
        data: () => null,
      });

      const caller = farmProfileRouter.createCaller(mockContext);

      await expect(
        caller.update({
          farmId: 'farm-123',
          data: mockFarmProfilePayload,
        })
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.update({
          farmId: 'farm-123',
          data: mockFarmProfilePayload,
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Farm profile not found',
      });
    });

    it('should throw UNAUTHORIZED when called without authentication', async () => {
      const unauthenticatedContext = createUnauthenticatedContext();
      const caller = farmProfileRouter.createCaller(unauthenticatedContext);

      await expect(
        caller.update({
          farmId: 'farm-123',
          data: mockFarmProfilePayload,
        })
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.update({
          farmId: 'farm-123',
          data: mockFarmProfilePayload,
        })
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('should verify Firestore Security Rules - user ownership enforcement', async () => {
      // This test verifies that the business logic correctly enforces user ownership
      // The actual Firestore rules would prevent unauthorized access at the database level
      const caller = farmProfileRouter.createCaller(mockContext);

      // Setup: User owns the farm profile
      const existingData = {
        userId: 'test-user-id',
        farmName: 'My Farm',
        location: {
          country: 'USA',
          region: 'California',
        },
        farmSize: {
          value: 100,
          unit: 'acres',
          category: 'medium',
        },
        farmingType: ['crops'],
        experience: {
          years: 5,
          level: 'intermediate',
        },
        crops: [],
        livestock: [],
        challenges: [],
        goals: [],
        certifications: [],
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      };

      const updatedData = {
        ...existingData,
        farmName: 'Updated',
      };

      mockDocRef.get
        .mockResolvedValueOnce({
          exists: true,
          id: 'farm-123',
          data: () => existingData,
        })
        .mockResolvedValueOnce({
          exists: true,
          id: 'farm-123',
          data: () => updatedData,
        });

      await caller.update({
        farmId: 'farm-123',
        data: {
          farmName: 'Updated',
          location: existingData.location,
          farmSize: existingData.farmSize,
          farmingType: existingData.farmingType,
          experience: existingData.experience,
        },
      });

      // Verify update was called (user owns the profile)
      expect(mockDocRef.update).toHaveBeenCalled();
    });
  });
});

