/**
 * RAG Service Package
 * This package contains the RAG (Retrieval-Augmented Generation) logic
 * for providing agricultural insights and recommendations using Google Gemini
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

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

    if (imageBase64) {
      // Multimodal: array of parts
      const imagePart = fileToGenerativePart(imageBase64, 'image/jpeg');
      input = [
        { text: textQuery },
        imagePart,
      ];

      // TODO: Add RAG context from vector database
      // const context = await getVectorContext(textQuery);
      // if (context) {
      //   input.push({ text: `\n\nContext from knowledge base:\n${context}` });
      // }
    } else {
      // Text-only: use string directly (simpler and more efficient)
      input = textQuery;

      // TODO: Add RAG context from vector database
      // const context = await getVectorContext(textQuery);
      // if (context) {
      //   input = `${input}\n\nContext from knowledge base:\n${context}`;
      // }
    }

    const result = await model.generateContent(input);

    const response = result.response;
    const answer = response.text();

    // TODO: Implement confidence scoring based on vector search results
    // For now, return a default confidence if we have a response
    const confidence = answer.length > 0 ? 0.8 : 0;

    // TODO: Extract sources from vector search results
    // const sources = vectorResults.map(r => r.source);

    // If the answer is too short or seems like an error, return null (low confidence)
    if (answer.length < 10) {
      return null;
    }

    return {
      answer,
      confidence,
      // sources: sources.length > 0 ? sources : undefined,
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
    console.log('RAG Service initialized');
  },
  query: queryGeminiMultimodal,
};
