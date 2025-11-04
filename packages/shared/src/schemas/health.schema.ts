import { z } from 'zod';

/**
 * Ask RAG Input Schema
 * Supports both text queries and optional image uploads
 */
export const askRagSchema = z.object({
  textQuery: z.string().min(1, 'Query cannot be empty'),
  imageBase64: z.string().optional(),
});

export type AskRagInput = z.infer<typeof askRagSchema>;

/**
 * RAG Response Schema
 */
export const ragResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(z.string()).optional(),
  confidence: z.number().optional(),
});

export type RagResponse = z.infer<typeof ragResponseSchema>;

