import { TRPCError } from '@trpc/server';
import { askRagSchema, ragResponseSchema } from '@rag-monorepo/shared';
import { queryGeminiMultimodal } from '@rag-monorepo/rag-service';
import { storage } from '../config/firebase';
import { logInfo, logError, logWarning } from '../lib/logger';
import { publicProcedure, router } from '../trpc/trpc';
import { randomUUID } from 'crypto';

/**
 * Health Router
 * Handles health-related queries using RAG (Retrieval-Augmented Generation)
 * Supports both text and multimodal (text + image) queries
 */
export const healthRouter = router({
  /**
   * Ask RAG - Query the knowledge base with optional image
   * Supports multimodal queries for agricultural health questions
   */
  askRag: publicProcedure
    .input(askRagSchema)
    .output(ragResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const { textQuery, imageBase64 } = input;
      const userId = ctx.userId || 'anonymous';

      // Structured logging - Start of procedure
      logInfo('Starting health.askRag procedure', {
        userId,
        procedure: 'health.askRag',
        hasImage: !!imageBase64,
        queryLength: textQuery.length,
      });

      let imageUrl: string | null = null;

      try {
        // 1. Handle image upload if provided
        if (imageBase64) {
          try {
            logInfo('Processing image upload', {
              userId,
              procedure: 'health.askRag',
            });

            const bucket = storage.bucket();
            
            // Create a unique filename
            const fileName = `uploads/${randomUUID()}.jpg`;
            const file = bucket.file(fileName);

            // Create a buffer from the base64 string
            // Remove the data URI prefix (e.g., "data:image/jpeg;base64,")
            const buffer = Buffer.from(
              imageBase64.replace(/^data:image\/\w+;base64,/, ''),
              'base64'
            );

            // Upload the image
            await file.save(buffer, {
              metadata: {
                contentType: 'image/jpeg',
                metadata: {
                  userId,
                  uploadedAt: new Date().toISOString(),
                },
              },
            });

            // Make the file publicly accessible (or use signed URLs for production)
            await file.makePublic();
            imageUrl = file.publicUrl();

            logInfo('Image uploaded successfully', {
              userId,
              procedure: 'health.askRag',
              imageUrl,
            });
          } catch (imageError) {
            logError('Failed to upload image', imageError as Error, {
              userId,
              procedure: 'health.askRag',
            });
            
            // Continue without image if upload fails
            logWarning('Continuing with text-only query', {
              userId,
              procedure: 'health.askRag',
            });
          }
        }

        // 2. Query RAG service
        logInfo('Querying RAG service', {
          userId,
          procedure: 'health.askRag',
          hasImage: !!imageBase64,
        });

        const ragResult = await queryGeminiMultimodal(
          textQuery,
          imageBase64 || undefined
        );

        // 3. Handle low-confidence or null results
        if (!ragResult || (ragResult.confidence && ragResult.confidence < 0.5)) {
          logInfo('Low confidence result from RAG service', {
            userId,
            procedure: 'health.askRag',
            confidence: ragResult?.confidence || 0,
          });

          return {
            answer:
              'I cannot find a confident answer in my knowledge base. It is best to consult a certified veterinarian.',
            sources: [],
            confidence: ragResult?.confidence || 0,
          };
        }

        // 4. Return successful result
        logInfo('RAG query completed successfully', {
          userId,
          procedure: 'health.askRag',
          confidence: ragResult.confidence,
          answerLength: ragResult.answer.length,
        });

        return {
          answer: ragResult.answer,
          sources: ragResult.sources || [],
          confidence: ragResult.confidence,
        };
      } catch (error) {
        // Structured error logging
        logError('Failed in health.askRag', error as Error, {
          userId,
          procedure: 'health.askRag',
          hasImage: !!imageBase64,
        });

        // Re-throw as a tRPC error with standard error code
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while processing your query. Please try again.',
          cause: error as Error,
        });
      }
    }),
});

