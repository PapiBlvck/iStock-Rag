/**
 * Seeding Script for Agricultural Knowledge Base
 * 
 * This script reads agricultural documents (PDFs, text files, etc.) and
 * indexes them in the Pinecone vector database for RAG retrieval.
 * 
 * Usage:
 *   pnpm seed --input-dir ./knowledge-base --chunk-size 500
 */

import * as fs from 'fs';
import * as path from 'path';
import { upsertDocuments } from './vector';
import { randomUUID } from 'crypto';

interface DocumentChunk {
  id: string;
  text: string;
  source: string;
  chunkIndex: number;
  metadata?: Record<string, unknown>;
}

/**
 * Split text into chunks for embedding
 */
function chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
  const chunks: string[] = [];
  const words = text.split(/\s+/);
  
  let currentChunk: string[] = [];
  let currentLength = 0;
  
  for (const word of words) {
    if (currentLength + word.length + 1 > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
      // Start new chunk with overlap
      const overlapWords = currentChunk.slice(-overlap);
      currentChunk = [...overlapWords, word];
      currentLength = overlapWords.join(' ').length + word.length + 1;
    } else {
      currentChunk.push(word);
      currentLength += word.length + 1;
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }
  
  return chunks;
}

/**
 * Read and parse a text file
 */
function readTextFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return '';
  }
}

/**
 * Process a document file and create chunks
 */
function processDocument(
  filePath: string,
  chunkSize: number = 500
): DocumentChunk[] {
  const text = readTextFile(filePath);
  if (!text) {
    return [];
  }
  
  const fileName = path.basename(filePath);
  const chunks = chunkText(text, chunkSize);
  
  return chunks.map((chunk, index) => ({
    id: randomUUID(),
    text: chunk,
    source: fileName,
    chunkIndex: index,
    metadata: {
      filePath,
      totalChunks: chunks.length,
    },
  }));
}

/**
 * Process all documents in a directory
 */
async function processDirectory(
  inputDir: string,
  chunkSize: number = 500
): Promise<DocumentChunk[]> {
  const allChunks: DocumentChunk[] = [];
  
  if (!fs.existsSync(inputDir)) {
    console.error(`Directory not found: ${inputDir}`);
    return allChunks;
  }
  
  const files = fs.readdirSync(inputDir);
  const supportedExtensions = ['.txt', '.md', '.json'];
  
  for (const file of files) {
    const filePath = path.join(inputDir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Recursively process subdirectories
      const subChunks = await processDirectory(filePath, chunkSize);
      allChunks.push(...subChunks);
    } else if (stat.isFile()) {
      const ext = path.extname(file).toLowerCase();
      if (supportedExtensions.includes(ext)) {
        console.log(`Processing: ${file}`);
        const chunks = processDocument(filePath, chunkSize);
        allChunks.push(...chunks);
        console.log(`  Created ${chunks.length} chunks`);
      }
    }
  }
  
  return allChunks;
}

/**
 * Main seeding function
 */
export async function seedKnowledgeBase(
  inputDir: string,
  chunkSize: number = 500
): Promise<void> {
  console.log('Starting knowledge base seeding...');
  console.log(`Input directory: ${inputDir}`);
  console.log(`Chunk size: ${chunkSize} characters`);
  
  // Process all documents
  const chunks = await processDirectory(inputDir, chunkSize);
  
  if (chunks.length === 0) {
    console.warn('No documents found to process');
    return;
  }
  
  console.log(`\nTotal chunks created: ${chunks.length}`);
  console.log('Uploading to vector database...');
  
  // Prepare documents for upsert
  const documents = chunks.map((chunk) => ({
    id: chunk.id,
    text: chunk.text,
    source: chunk.source,
    metadata: {
      chunkIndex: chunk.chunkIndex,
      ...chunk.metadata,
    },
  }));
  
  // Upsert to Pinecone
  await upsertDocuments(documents);
  
  console.log('✅ Knowledge base seeding completed successfully!');
  console.log(`   Indexed ${chunks.length} chunks from ${new Set(chunks.map(c => c.source)).size} documents`);
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const inputDirIndex = args.indexOf('--input-dir');
  const chunkSizeIndex = args.indexOf('--chunk-size');
  
  const inputDir = inputDirIndex >= 0 && args[inputDirIndex + 1]
    ? args[inputDirIndex + 1]
    : './knowledge-base';
  
  const chunkSize = chunkSizeIndex >= 0 && args[chunkSizeIndex + 1]
    ? parseInt(args[chunkSizeIndex + 1], 10)
    : 500;
  
  seedKnowledgeBase(inputDir, chunkSize)
    .then(() => {
      console.log('Done');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error seeding knowledge base:', error);
      process.exit(1);
    });
}

