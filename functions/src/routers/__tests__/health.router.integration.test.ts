/**
 * Integration Tests for Health Router
 * Milestone 2: RAG Service & Health Router Tests
 * Milestone 4: Multimodal & Error Handling Tests
 */

import { TRPCError } from '@trpc/server';
import { healthRouter } from '../health.router';
import { createMockContext } from '../../__tests__/utils/test-helpers';
import { storage } from '../../config/firebase';
import { queryGeminiMultimodal } from '@rag-monorepo/rag-service';
import { logInfo, logError } from '../../lib/logger';

// Mock dependencies
jest.mock('../../config/firebase', () => ({
  storage: {
    bucket: jest.fn(),
  },
}));

jest.mock('@rag-monorepo/rag-service', () => ({
  queryGeminiMultimodal: jest.fn(),
}));

jest.mock('../../lib/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-123'),
}));

describe('Health Router - Integration Tests', () => {
  const mockContext = createMockContext();
  const mockFile = {
    save: jest.fn().mockResolvedValue(undefined),
    makePublic: jest.fn().mockResolvedValue(undefined),
    publicUrl: jest.fn(() => 'https://storage.googleapis.com/bucket/uploads/test-uuid-123.jpg'),
  };

  const mockBucket = {
    file: jest.fn(() => mockFile),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (storage.bucket as jest.Mock) = jest.fn(() => mockBucket);
    (logInfo as jest.Mock).mockClear();
    (logError as jest.Mock).mockClear();
  });

  describe('askRag - Text-only queries', () => {
    it('should process text query and return RAG result', async () => {
      const mockRagResult = {
        answer: 'This is a helpful answer about plant health.',
        confidence: 0.85,
        sources: ['source1', 'source2'],
      };

      (queryGeminiMultimodal as jest.Mock).mockResolvedValue(mockRagResult);

      const caller = healthRouter.createCaller(mockContext);
      const result = await caller.askRag({
        textQuery: 'What are the symptoms of blight?',
      });

      expect(result).toBeDefined();
      expect(result.answer).toBe(mockRagResult.answer);
      expect(result.confidence).toBe(0.85);
      expect(result.sources).toEqual(['source1', 'source2']);

      // Verify RAG service was called correctly
      expect(queryGeminiMultimodal).toHaveBeenCalledWith(
        'What are the symptoms of blight?',
        undefined
      );

      // Verify logging
      expect(logInfo).toHaveBeenCalledWith(
        'Starting health.askRag procedure',
        expect.objectContaining({
          userId: 'test-user-id',
          procedure: 'health.askRag',
          hasImage: false,
        })
      );
    });

    it('should log response using Cloud Logging format', async () => {
      const mockRagResult = {
        answer: 'Answer',
        confidence: 0.9,
      };

      (queryGeminiMultimodal as jest.Mock).mockResolvedValue(mockRagResult);

      const caller = healthRouter.createCaller(mockContext);
      await caller.askRag({ textQuery: 'Query' });

      // Verify structured logging
      expect(logInfo).toHaveBeenCalledWith(
        'RAG query completed successfully',
        expect.objectContaining({
          userId: 'test-user-id',
          procedure: 'health.askRag',
          confidence: 0.9,
          answerLength: expect.any(Number),
        })
      );
    });
  });

  describe('askRag - Multimodal queries (Milestone 4)', () => {
    it('should handle image upload and process multimodal query', async () => {
      const base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const mockRagResult = {
        answer: 'This appears to be a fungal infection.',
        confidence: 0.88,
      };

      (queryGeminiMultimodal as jest.Mock).mockResolvedValue(mockRagResult);

      const caller = healthRouter.createCaller(mockContext);
      const result = await caller.askRag({
        textQuery: 'What disease is this?',
        imageBase64: base64Image,
      });

      expect(result).toBeDefined();
      expect(result.answer).toBe(mockRagResult.answer);

      // Verify Firebase Storage integration
      expect(storage.bucket).toHaveBeenCalled();
      expect(mockBucket.file).toHaveBeenCalledWith('uploads/test-uuid-123.jpg');
      expect(mockFile.save).toHaveBeenCalled();
      expect(mockFile.makePublic).toHaveBeenCalled();

      // Verify RAG service called with image
      expect(queryGeminiMultimodal).toHaveBeenCalledWith(
        'What disease is this?',
        base64Image
      );

      // Verify logging includes image info
      expect(logInfo).toHaveBeenCalledWith(
        'Starting health.askRag procedure',
        expect.objectContaining({
          hasImage: true,
        })
      );
    });

    it('should continue with text-only query if image upload fails', async () => {
      const base64Image = 'data:image/jpeg;base64,invalid';
      mockFile.save.mockRejectedValue(new Error('Upload failed'));

      const mockRagResult = {
        answer: 'Answer without image',
        confidence: 0.8,
      };

      (queryGeminiMultimodal as jest.Mock).mockResolvedValue(mockRagResult);

      const caller = healthRouter.createCaller(mockContext);
      const result = await caller.askRag({
        textQuery: 'Query',
        imageBase64: base64Image,
      });

      // Should still process query without image
      expect(result).toBeDefined();
      expect(queryGeminiMultimodal).toHaveBeenCalledWith(
        'Query',
        base64Image // Still passes image, but upload failed
      );

      // Verify error was logged
      expect(logError).toHaveBeenCalledWith(
        'Failed to upload image',
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('askRag - Error Handling (Milestone 4)', () => {
    it('should return graceful failure message for low-confidence results', async () => {
      const lowConfidenceResult = {
        answer: 'Short',
        confidence: 0.3, // Below threshold
      };

      (queryGeminiMultimodal as jest.Mock).mockResolvedValue(lowConfidenceResult);

      const caller = healthRouter.createCaller(mockContext);
      const result = await caller.askRag({
        textQuery: 'Query',
      });

      expect(result.answer).toContain('cannot find a confident answer');
      expect(result.answer).toContain('consult a certified veterinarian');
      expect(result.confidence).toBe(0.3);
      expect(result.sources).toEqual([]);
    });

    it('should return graceful failure message for null result', async () => {
      (queryGeminiMultimodal as jest.Mock).mockResolvedValue(null);

      const caller = healthRouter.createCaller(mockContext);
      const result = await caller.askRag({
        textQuery: 'Query',
      });

      expect(result.answer).toContain('cannot find a confident answer');
      expect(result.confidence).toBe(0);
    });

    it('should throw INTERNAL_SERVER_ERROR for unexpected errors', async () => {
      const error = new Error('API Error');
      (queryGeminiMultimodal as jest.Mock).mockRejectedValue(error);

      const caller = healthRouter.createCaller(mockContext);

      await expect(
        caller.askRag({ textQuery: 'Query' })
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.askRag({ textQuery: 'Query' })
      ).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: expect.stringContaining('unexpected error'),
      });

      // Verify error logging
      expect(logError).toHaveBeenCalledWith(
        'Failed in health.askRag',
        error,
        expect.any(Object)
      );
    });
  });

  describe('askRag - Standard tRPC Errors (Milestone 4)', () => {
    it('should handle AUTH_ERROR when authentication is required (if changed to protected)', async () => {
      // Note: Currently askRag is publicProcedure, but this tests the pattern
      // If changed to protectedProcedure, it would throw UNAUTHORIZED
      const unauthenticatedContext = { userId: null, userEmail: null };
      const caller = healthRouter.createCaller(unauthenticatedContext);

      // Currently public, so should work
      const mockRagResult = { answer: 'Answer', confidence: 0.8 };
      (queryGeminiMultimodal as jest.Mock).mockResolvedValue(mockRagResult);

      const result = await caller.askRag({ textQuery: 'Query' });
      expect(result).toBeDefined();
    });

    it('should handle BAD_REQUEST for invalid input', async () => {
      const caller = healthRouter.createCaller(mockContext);

      // Test with invalid input (empty query - should be caught by Zod)
      await expect(
        caller.askRag({ textQuery: '' } as any)
      ).rejects.toThrow(); // Zod validation error
    });
  });
});

