/**
 * Vector Database Integration
 * Phase 2: Full RAG with Vector Search
 * 
 * Uses Pinecone for vector storage and Google's text-embedding-004 for embeddings
 */

import { Pinecone } from '@pinecone-database/pinecone';

// Initialize Pinecone client
let pineconeClient: Pinecone | null = null;

function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY environment variable is required');
    }
    pineconeClient = new Pinecone({ apiKey });
  }
  return pineconeClient;
}

/**
 * Vector search result
 */
export interface VectorSearchResult {
  text: string;
  source: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/**
 * Generate embedding for text using OpenAI's embedding model
 * Note: Using OpenAI embeddings for reliability and compatibility
 * Alternative: Can be replaced with Google's embedding API when available
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for embeddings');
    }

    // Use OpenAI's text-embedding-3-small model (cost-effective and fast)
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error('Invalid embedding response from OpenAI');
    }
    
    return data.data[0].embedding as number[];
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Search for similar documents in the vector database
 * @param query - The search query
 * @param topK - Number of results to return (default: 5)
 * @returns Array of search results with text, source, and score
 */
export async function vectorSearch(
  query: string,
  topK: number = 5
): Promise<VectorSearchResult[]> {
  try {
    const pinecone = getPineconeClient();
    const indexName = process.env.PINECONE_INDEX_NAME || 'agricultural-knowledge';
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Get the index
    const index = pinecone.index(indexName);
    
    // Search for similar vectors
    const searchResults = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });
    
    // Transform results to our format
    const results: VectorSearchResult[] = (searchResults.matches || []).map((match) => ({
      text: (match.metadata?.text as string) || '',
      source: (match.metadata?.source as string) || 'Unknown',
      score: match.score || 0,
      metadata: match.metadata as Record<string, unknown> | undefined,
    }));
    
    return results;
  } catch (error) {
    console.error('Error in vector search:', error);
    // Return empty array on error to allow fallback to direct LLM query
    return [];
  }
}

/**
 * Upsert documents into the vector database
 * @param documents - Array of documents with text, source, and optional metadata
 */
export async function upsertDocuments(
  documents: Array<{
    id: string;
    text: string;
    source: string;
    metadata?: Record<string, unknown>;
  }>
): Promise<void> {
  try {
    const pinecone = getPineconeClient();
    const indexName = process.env.PINECONE_INDEX_NAME || 'agricultural-knowledge';
    const index = pinecone.index(indexName);
    
    // Generate embeddings for all documents
    const vectors = await Promise.all(
      documents.map(async (doc) => {
        const embedding = await generateEmbedding(doc.text);
        return {
          id: doc.id,
          values: embedding,
          metadata: {
            text: doc.text,
            source: doc.source,
            ...doc.metadata,
          },
        };
      })
    );
    
    // Upsert vectors in batches
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
    }
    
    console.log(`Successfully upserted ${vectors.length} documents`);
  } catch (error) {
    console.error('Error upserting documents:', error);
    throw error;
  }
}

/**
 * Get RAG context from vector search results
 * @param query - The user's query
 * @param maxContextLength - Maximum length of context to return (default: 2000 chars)
 * @returns Formatted context string and sources array
 */
export async function getVectorContext(
  query: string,
  maxContextLength: number = 2000
): Promise<{ context: string; sources: string[] }> {
  const searchResults = await vectorSearch(query, 5);
  
  if (searchResults.length === 0) {
    return { context: '', sources: [] };
  }
  
  // Filter results by minimum score threshold (0.7)
  const relevantResults = searchResults.filter((r) => r.score >= 0.7);
  
  if (relevantResults.length === 0) {
    return { context: '', sources: [] };
  }
  
  // Build context string
  let context = 'Relevant information from agricultural knowledge base:\n\n';
  const sources: string[] = [];
  let currentLength = context.length;
  
  for (const result of relevantResults) {
    const chunk = `- ${result.text}\n  (Source: ${result.source})\n\n`;
    
    if (currentLength + chunk.length > maxContextLength) {
      break;
    }
    
    context += chunk;
    currentLength += chunk.length;
    
    if (!sources.includes(result.source)) {
      sources.push(result.source);
    }
  }
  
  return { context, sources };
}

