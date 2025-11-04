# ADR-001: RAG Architecture for Agricultural Knowledge Platform

## Status
**Accepted** - 2024-11-04

## Context
The RAG-powered farming knowledge platform needs to provide accurate, context-aware answers to agricultural health questions. The system must support:
- Text-only queries about animal health, crop diseases, and farming practices
- Multimodal queries combining text and images (e.g., diagnosing plant diseases from photos)
- Scalable architecture that can grow from MVP to production
- Integration with existing Firebase-based backend infrastructure

## Decision
We have chosen a **hybrid RAG architecture** that evolves in two phases:

### Phase 1: Direct LLM Integration (Current)
- **Primary LLM**: Google Gemini (gemini-pro for text, gemini-pro-vision for multimodal)
- **Architecture**: Direct API calls to Gemini with prompt engineering
- **Image Handling**: Base64 encoding → Firebase Storage → Gemini API
- **Rationale**: Fast MVP delivery, no infrastructure overhead, immediate multimodal support

### Phase 2: Full RAG with Vector Database (Future)
- **Vector Database**: To be selected (Pinecone, Weaviate, or Firebase Vector Search)
- **Embedding Model**: To be selected (OpenAI, Cohere, or Google embeddings)
- **Retrieval**: Semantic search over agricultural knowledge base
- **Generation**: Gemini with retrieved context augmentation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Chat UI      │  │ Image Upload │  │ Results      │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼───────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                    ┌────────▼─────────┐
                    │  tRPC Router     │
                    │  (Cloud Func)    │
                    │  health.askRag   │
                    └────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
    │  Firebase  │   │  RAG Service │   │   Gemini    │
    │  Storage   │   │   Package    │   │     API     │
    │  (Images)  │   └──────────────┘   └─────────────┘
    └────────────┘
```

### Current Implementation (Phase 1)

```
User Query (text + optional image)
    ↓
Firebase Storage (image upload)
    ↓
RAG Service (packages/rag-service)
    ├─→ Convert image to base64
    ├─→ Format prompt for Gemini
    └─→ Call Gemini API
    ↓
Response Processing
    ├─→ Confidence scoring
    ├─→ Error handling
    └─→ Structured logging
    ↓
Return to Frontend
```

## Technology Choices

### 1. Google Gemini
**Why**: 
- **Multimodal Support**: Native support for text + image in single API call
- **Cost Efficiency**: Competitive pricing for agricultural use cases
- **Performance**: Low latency for real-time queries
- **API Quality**: Well-documented, stable SDK

**Alternatives Considered**:
- **OpenAI GPT-4 Vision**: More expensive, similar capabilities
- **Claude Vision**: Good but less mature API
- **Local Models**: Insufficient multimodal capabilities for MVP

### 2. Firebase Storage for Image Handling
**Why**:
- **Seamless Integration**: Already using Firebase ecosystem
- **Automatic Scaling**: No infrastructure management
- **Security**: Built-in access controls
- **Cost**: Pay-per-use, economical for MVP

**Alternatives Considered**:
- **Cloudinary**: More features but additional vendor dependency
- **AWS S3**: Requires additional AWS setup

### 3. Hybrid Architecture (Phase 1 → Phase 2)
**Why**:
- **Incremental Delivery**: MVP faster, then add vector search
- **Risk Mitigation**: Validate LLM approach before investing in vector infrastructure
- **Flexibility**: Can switch or enhance vector DB later

## Implementation Details

### RAG Service Package (`packages/rag-service`)
```typescript
// Core function: queryGeminiMultimodal
export async function queryGeminiMultimodal(
  textQuery: string,
  imageBase64?: string
): Promise<RagResult | null>
```

**Key Features**:
- Automatic model selection (gemini-pro vs gemini-pro-vision)
- Base64 image formatting for Gemini API
- Error handling and confidence scoring
- Extensible for future vector retrieval integration

### Health Router (`functions/src/routers/health.router.ts`)
**Responsibilities**:
- Image upload to Firebase Storage
- Input validation (Zod schemas)
- Error handling with structured logging
- Low-confidence fallback messaging
- Integration with RAG service

### Current Limitations (Phase 1)
- **No Vector Retrieval**: Direct LLM queries only
- **No Source Citations**: Can't cite specific documents
- **Limited Context**: No domain-specific knowledge base
- **Basic Confidence**: Simple heuristic-based scoring

## Future Enhancements (Phase 2)

### Vector Database Integration
```
Query → Embedding → Vector Search → Retrieve Top-K → Context Augmentation → Gemini
```

**Planned Features**:
- Agricultural knowledge base (research papers, guides, case studies)
- Semantic search over documents
- Source citations in responses
- Improved confidence scoring based on retrieval quality
- Domain-specific fine-tuning

### Vector Database Selection Criteria
1. **Scalability**: Handle 10K+ documents
2. **Cost**: Reasonable for agricultural non-profit use cases
3. **Integration**: Easy Firebase/Google Cloud integration
4. **Performance**: <200ms retrieval latency

**Candidates**:
- **Pinecone**: Managed, good performance, pay-per-use
- **Weaviate**: Open-source, self-hostable, flexible
- **Firebase Vector Search**: Native integration, if available

## Consequences

### Positive
- ✅ **Fast MVP Delivery**: No vector infrastructure needed initially
- ✅ **Multimodal Support**: Image queries work out of the box
- ✅ **Cost Effective**: Pay only for API calls, no infrastructure
- ✅ **Simple Architecture**: Easy to understand and maintain
- ✅ **Scalable Path**: Clear upgrade path to full RAG

### Negative
- ⚠️ **Limited Context**: No domain-specific knowledge base yet
- ⚠️ **No Source Citations**: Can't show where information comes from
- ⚠️ **Generic Responses**: May not be specialized for agriculture
- ⚠️ **API Dependency**: Relies on external Gemini API

### Risks & Mitigations
- **Risk**: Gemini API downtime
  - **Mitigation**: Error handling, fallback messaging, retry logic
  
- **Risk**: High API costs at scale
  - **Mitigation**: Caching, rate limiting, vector DB will reduce API calls
  
- **Risk**: Generic responses don't meet user needs
  - **Mitigation**: Phase 2 vector DB with domain-specific knowledge base

## Testing Strategy

### Current (Phase 1)
- Integration tests for RAG service
- Error handling tests
- Image upload tests
- Confidence scoring validation

### Future (Phase 2)
- Vector retrieval accuracy tests
- End-to-end RAG pipeline tests
- Source citation validation
- Performance benchmarks

## Monitoring & Observability

### Structured Logging
- Query logging (userId, query length, hasImage)
- Performance metrics (response time, API latency)
- Error tracking (API failures, low confidence)
- Usage analytics (query types, success rates)

### Metrics to Track
- Average response time
- Confidence score distribution
- API error rate
- Image upload success rate
- User satisfaction (future)

## References
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [RAG Architecture Patterns](https://www.pinecone.io/learn/retrieval-augmented-generation/)
- [Firebase Storage Documentation](https://firebase.google.com/docs/storage)

## Notes
- Vector database selection will be documented in ADR-002 when Phase 2 begins
- Current implementation prioritizes speed to market over perfect accuracy
- Phase 2 will be triggered when user feedback indicates need for domain-specific knowledge

