/**
 * RAG Service Package
 * This package contains the RAG (Retrieval-Augmented Generation) logic
 * for providing agricultural insights and recommendations using Google Gemini
 * 
 * Phase 2: Now includes vector database integration for context-aware responses
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getVectorContext } from './vector';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Convert base64 string to Gemini's format
 */
function fileToGenerativePart(base64: string, mimeType: string) {
  // Remove data URI prefix if present
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  
  return {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };
}

/**
 * RAG Service interface
 */
export interface RagResult {
  answer: string;
  sources?: string[];
  confidence?: number;
}

/**
 * Query Gemini multimodal model with RAG context
 * @param textQuery - The user's text question
 * @param imageBase64 - Optional base64 encoded image
 * @returns RAG result with answer and optional sources
 */
export async function queryGeminiMultimodal(
  textQuery: string,
  imageBase64?: string
): Promise<RagResult | null> {
  try {
    // Use gemini-pro-vision for multimodal, or gemini-pro for text-only
    const modelName = imageBase64 ? 'gemini-pro-vision' : 'gemini-pro';
    const model = genAI.getGenerativeModel({ model: modelName });

    // Build the prompt parts
    // For text-only queries, use string directly
    // For multimodal, use array with text and image parts
    let input: string | Array<{ text: string } | { inlineData: { data: string; mimeType: string } }>;

    // Phase 2: Get vector context for RAG
    let vectorContext = '';
    let sources: string[] = [];
    
    try {
      const contextResult = await getVectorContext(textQuery);
      vectorContext = contextResult.context;
      sources = contextResult.sources;
    } catch (error) {
      console.warn('Vector search failed, continuing without context:', error);
      // Continue without vector context if search fails
    }

    if (imageBase64) {
      // Multimodal: array of parts
      const imagePart = fileToGenerativePart(imageBase64, 'image/jpeg');
      const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
        { text: textQuery },
        imagePart,
      ];

      // Add RAG context if available
      if (vectorContext) {
        parts.push({ text: `\n\n${vectorContext}` });
      }
      
      input = parts;
    } else {
      // Text-only: build prompt with context
      let prompt = textQuery;
      
      if (vectorContext) {
        prompt = `${textQuery}\n\n${vectorContext}`;
      }
      
      input = prompt;
    }

    const result = await model.generateContent(input);

    const response = result.response;
    const answer = response.text();

    // Phase 2: Confidence scoring based on vector search results
    // Higher confidence if we have relevant context from vector search
    let confidence = 0.8;
    if (sources.length > 0) {
      // Boost confidence if we have sources from vector search
      confidence = 0.9;
    } else if (answer.length < 50) {
      // Lower confidence for very short answers
      confidence = 0.6;
    }

    // If the answer is too short or seems like an error, return null (low confidence)
    if (answer.length < 10) {
      return null;
    }

    return {
      answer,
      confidence,
      sources: sources.length > 0 ? sources : undefined,
    };
  } catch (error) {
    console.error('Error querying Gemini:', error);
    throw error;
  }
}

/**
 * RAG Service object for backward compatibility
 */
export const RAGService = {
  initialize: () => {
    console.log('RAG Service initialized with vector database support');
  },
  query: queryGeminiMultimodal,
};

// Export vector functions for seeding scripts
export { vectorSearch, upsertDocuments, generateEmbedding } from './vector';
export type { VectorSearchResult } from './vector';
