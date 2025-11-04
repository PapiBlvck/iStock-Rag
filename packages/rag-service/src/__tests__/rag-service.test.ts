/**
 * Unit Tests for RAG Service
 * Milestone 2: RAG Service Tests
 * Target: ≥60% coverage
 */

import { queryGeminiMultimodal } from '../index';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock Google Generative AI
jest.mock('@google/generative-ai', () => {
  const mockGenerateContent = jest.fn();
  const mockModel = {
    generateContent: mockGenerateContent,
  };
  const mockGetGenerativeModel = jest.fn(() => mockModel);

  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    })),
    mockGenerateContent,
    mockGetGenerativeModel,
  };
});

describe('RAG Service - Unit Tests', () => {
  const { mockGenerateContent, mockGetGenerativeModel } = require('@google/generative-ai');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-api-key';
  });

  describe('fileToGenerativePart (tested via queryGeminiMultimodal)', () => {
    it('should format base64 image correctly for multimodal queries', async () => {
      const base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const textQuery = 'What is this plant?';

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'This is a healthy tomato plant.',
        },
      });

      await queryGeminiMultimodal(textQuery, base64Image);

      // Verify gemini-pro-vision model was used for multimodal
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-pro-vision' });

      // Verify the input format
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(Array.isArray(callArgs)).toBe(true);
      expect(callArgs[0]).toEqual({ text: textQuery });
      expect(callArgs[1]).toHaveProperty('inlineData');
      expect(callArgs[1].inlineData.mimeType).toBe('image/jpeg');
      expect(callArgs[1].inlineData.data).toBe('/9j/4AAQSkZJRg=='); // Base64 prefix removed
    });

    it('should remove data URI prefix from base64 string', async () => {
      const base64WithPrefix = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const textQuery = 'Analyze this image';

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Analysis result',
        },
      });

      await queryGeminiMultimodal(textQuery, base64WithPrefix);

      const callArgs = mockGenerateContent.mock.calls[0][0];
      const imagePart = callArgs[1];
      expect(imagePart.inlineData.data).not.toContain('data:image');
      expect(imagePart.inlineData.data).not.toContain('base64,');
    });

    it('should handle base64 without data URI prefix', async () => {
      const base64WithoutPrefix = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const textQuery = 'What is this?';

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Result',
        },
      });

      await queryGeminiMultimodal(textQuery, base64WithoutPrefix);

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs[1].inlineData.data).toBe(base64WithoutPrefix);
    });
  });

  describe('queryGeminiMultimodal - Model Selection', () => {
    it('should use gemini-pro-vision for multimodal queries', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Answer with image',
        },
      });

      await queryGeminiMultimodal('Query', 'base64image');

      expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-pro-vision' });
    });

    it('should use gemini-pro for text-only queries', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Text-only answer',
        },
      });

      await queryGeminiMultimodal('Text query');

      expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-pro' });
    });
  });

  describe('queryGeminiMultimodal - Prompt Formatting', () => {
    it('should format text-only query as string', async () => {
      const textQuery = 'What are the symptoms of blight?';

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Blight symptoms include...',
        },
      });

      await queryGeminiMultimodal(textQuery);

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(typeof callArgs).toBe('string');
      expect(callArgs).toBe(textQuery);
    });

    it('should format multimodal query as array with text and image parts', async () => {
      const textQuery = 'Identify this plant disease';
      const imageBase64 = 'data:image/jpeg;base64,test';

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'This appears to be...',
        },
      });

      await queryGeminiMultimodal(textQuery, imageBase64);

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(Array.isArray(callArgs)).toBe(true);
      expect(callArgs.length).toBe(2);
      expect(callArgs[0]).toEqual({ text: textQuery });
      expect(callArgs[1]).toHaveProperty('inlineData');
    });
  });

  describe('queryGeminiMultimodal - Response Handling', () => {
    it('should return RagResult with answer and confidence', async () => {
      const mockAnswer = 'This is a comprehensive answer about plant health.';
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => mockAnswer,
        },
      });

      const result = await queryGeminiMultimodal('Query');

      expect(result).toBeDefined();
      expect(result?.answer).toBe(mockAnswer);
      expect(result?.confidence).toBe(0.8);
    });

    it('should return null for very short answers (low confidence)', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'OK', // Too short
        },
      });

      const result = await queryGeminiMultimodal('Query');

      expect(result).toBeNull();
    });

    it('should handle errors and re-throw', async () => {
      const error = new Error('API Error');
      mockGenerateContent.mockRejectedValue(error);

      await expect(queryGeminiMultimodal('Query')).rejects.toThrow('API Error');
    });
  });

  describe('queryGeminiMultimodal - Coverage Edge Cases', () => {
    it('should handle empty string answer', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '',
        },
      });

      const result = await queryGeminiMultimodal('Query');

      expect(result).toBeNull();
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('should handle different image MIME types', async () => {
      const pngBase64 = 'data:image/png;base64,test';
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Answer',
        },
      });

      await queryGeminiMultimodal('Query', pngBase64);

      const callArgs = mockGenerateContent.mock.calls[0][0];
      // Should still use image/jpeg as default in the function
      expect(callArgs[1].inlineData.mimeType).toBe('image/jpeg');
    });
  });
});

