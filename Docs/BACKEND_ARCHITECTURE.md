# Backend Architecture Documentation

## Overview
The backend is built as a Firebase Cloud Functions monorepo using TypeScript, tRPC, and a modular package architecture. This document describes the architecture, design decisions, and implementation patterns.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Design Patterns](#design-patterns)
5. [Testing Strategy (TDD)](#testing-strategy-tdd)
6. [API Design](#api-design)
7. [Security Architecture](#security-architecture)
8. [Error Handling](#error-handling)
9. [Logging & Monitoring](#logging--monitoring)
10. [Deployment](#deployment)

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│                    apps/web/                                │
└──────────────────────┬──────────────────────────────────────┘
                       │ tRPC Client
                       │ HTTP/HTTPS
┌──────────────────────▼──────────────────────────────────────┐
│           Firebase Cloud Functions                          │
│           functions/                                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              tRPC Router Layer                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│  │  │  User    │  │   Farm   │  │  Health  │           │  │
│  │  │  Router  │  │  Profile │  │  Router  │           │  │
│  │  └──────────┘  └──────────┘  └──────────┘           │  │
│  │  ┌──────────┐  ┌──────────┐                         │  │
│  │  │Nutrition │  │  ...     │                         │  │
│  │  └──────────┘  └──────────┘                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Service Layer                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│  │  │   RAG    │  │   Feed   │  │  Logger  │           │  │
│  │  │ Service  │  │  Solver  │  │          │           │  │
│  │  └──────────┘  └──────────┘  └──────────┘           │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌────▼──────┐ ┌─────▼──────┐
│  Firestore   │ │  Storage  │ │  External  │
│  (Database)  │ │  (Images)  │ │    APIs    │
│              │ │           │ │  (Gemini)  │
└──────────────┘ └───────────┘ └────────────┘
```

### Monorepo Structure
```
RAG/
├── apps/
│   └── web/                    # Frontend (not in scope)
├── functions/                   # Backend (Firebase Cloud Functions)
│   ├── src/
│   │   ├── routers/            # tRPC route handlers
│   │   ├── lib/                # Utility functions
│   │   ├── trpc/               # tRPC setup
│   │   └── config/             # Configuration
│   └── package.json
└── packages/
    ├── shared/                  # Shared schemas and types
    └── rag-service/            # RAG implementation
```

## Technology Stack

### Core Technologies
- **Runtime**: Node.js 18 (Firebase Functions requirement)
- **Language**: TypeScript 5.3+
- **Framework**: tRPC 10.45+ (type-safe APIs)
- **Database**: Firebase Firestore (NoSQL)
- **Storage**: Firebase Storage (images)
- **Authentication**: Firebase Auth
- **Build**: TypeScript Compiler (tsc)
- **Package Manager**: PNPM (workspace support)

### Supporting Libraries
- **Validation**: Zod 3.22+ (schema validation)
- **AI/ML**: Google Generative AI SDK (Gemini)
- **Logging**: Structured JSON logging (Cloud Logging compatible)

## Project Structure

### Functions Package (`functions/`)
```
functions/
├── src/
│   ├── index.ts                 # Main entry point, HTTP handler
│   ├── config/
│   │   └── firebase.ts          # Firebase Admin SDK initialization
│   ├── trpc/
│   │   ├── context.ts           # Request context creation
│   │   └── trpc.ts              # tRPC setup and procedures
│   ├── routers/
│   │   ├── index.ts             # Main router (combines all routers)
│   │   ├── user.router.ts       # User management
│   │   ├── farm-profile.router.ts # Farm profile CRUD
│   │   ├── health.router.ts      # Health/RAG queries
│   │   └── nutrition.router.ts  # Nutrition/feed optimization
│   └── lib/
│       ├── logger.ts            # Structured logging utilities
│       ├── feed-solver.ts       # Least-cost feed formulation
│       └── __tests__/           # Unit tests
├── dist/                        # Compiled JavaScript
├── package.json
└── tsconfig.json
```

### Shared Package (`packages/shared/`)
```
packages/shared/
├── src/
│   ├── index.ts                 # Re-exports
│   └── schemas/
│       ├── index.ts
│       ├── user.schema.ts
│       ├── farm-profile.schema.ts
│       ├── health.schema.ts
│       └── nutrition.schema.ts
└── dist/                        # Compiled for import by other packages
```

### RAG Service Package (`packages/rag-service/`)
```
packages/rag-service/
├── src/
│   └── index.ts                 # RAG service implementation
└── package.json
```

## Design Patterns

### 1. Layered Architecture
```
┌─────────────────────────┐
│   Presentation Layer     │  (tRPC Routers)
│   - Request handling     │
│   - Input validation     │
│   - Response formatting   │
└───────────┬───────────────┘
            │
┌───────────▼───────────────┐
│   Business Logic Layer    │  (Services)
│   - RAG queries           │
│   - Feed optimization     │
│   - Domain logic          │
└───────────┬───────────────┘
            │
┌───────────▼───────────────┐
│   Data Access Layer       │  (Firebase Admin)
│   - Firestore operations  │
│   - Storage operations    │
│   - External APIs         │
└───────────────────────────┘
```

### 2. Repository Pattern (Implicit)
Firebase operations are abstracted through the Firebase Admin SDK, providing a clean interface for data access.

### 3. Dependency Injection
Context is injected into tRPC procedures via the `ctx` parameter:
```typescript
.mutation(async ({ input, ctx }) => {
  // ctx contains userId, userEmail, etc.
})
```

### 4. Strategy Pattern
- **RAG Service**: Pluggable AI providers (currently Gemini, extensible)
- **Feed Solver**: Pure function, easily testable and replaceable

## Testing Strategy (TDD)

### Test-Driven Development Approach

#### 1. Unit Tests
**Location**: `functions/src/lib/__tests__/`

**Coverage Requirements**:
- **Feed Solver**: ≥80% coverage (functions: 84%, lines: 81.15%)
- All pure functions: ≥80% coverage
- All routers: Integration tests (not unit tests)

**Tools**:
- **Jest**: Test framework
- **ts-jest**: TypeScript support
- Coverage reporting via `jest --coverage`

**Example**:
```typescript
describe('solveLeastCostFeedFormulation', () => {
  it('should solve a simple 2-ingredient problem', () => {
    const input = { /* ... */ };
    const result = solveLeastCostFeedFormulation(input);
    expect(result.totalCost).toBeGreaterThan(0);
  });
});
```

#### 2. Integration Tests (Future)
- Test tRPC procedures end-to-end
- Mock Firebase services
- Test error handling flows

#### 3. Test Categories

**Unit Tests**:
- ✅ Pure functions (feed solver)
- ✅ Utility functions
- ✅ Data transformations
- ✅ Validation logic

**Integration Tests** (Planned):
- Router procedures
- Firebase operations
- External API calls
- Error handling

**Test Structure**:
```
functions/src/lib/__tests__/
└── feed-solver.test.ts
    ├── Basic functionality
    ├── Nutritional requirements
    ├── Cost optimization
    ├── Edge cases
    └── ...
```

### Running Tests
```bash
# All tests
pnpm test

# With coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

## API Design

### tRPC Router Structure
```typescript
export const appRouter = router({
  user: userRouter,
  farmProfile: farmProfileRouter,
  health: healthRouter,
  nutrition: nutritionRouter,
});
```

### Procedure Types
- **Query**: Read operations (GET-like)
- **Mutation**: Write operations (POST/PUT/DELETE-like)

### Authentication
- **Public Procedures**: No authentication required
- **Protected Procedures**: Require valid Firebase Auth token

### Error Handling
All procedures use standardized tRPC error codes:
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource doesn't exist
- `BAD_REQUEST`: Invalid input
- `INTERNAL_SERVER_ERROR`: Unexpected errors

### Example Procedure
```typescript
getById: protectedProcedure
  .input(z.object({ id: z.string() }))
  .output(Schema.nullable())
  .query(async ({ input, ctx }) => {
    // 1. Validate input (automatic via Zod)
    // 2. Check permissions (automatic via protectedProcedure)
    // 3. Business logic
    // 4. Return result
  });
```

## Security Architecture

### Authentication Flow
```
1. Frontend sends Firebase Auth token in Authorization header
2. Context creator verifies token
3. Extracts userId and userEmail
4. Passes to procedure via ctx
```

### Authorization
- **User Isolation**: All queries filtered by `userId`
- **Firestore Rules**: Server-side validation
- **tRPC Procedures**: Additional checks in business logic

### Security Rules (Firestore)
```javascript
// Example: Users can only access their own data
match /ingredients/{ingredientId} {
  allow read: if resource.data.userId == request.auth.uid;
  allow write: if request.resource.data.userId == request.auth.uid;
}
```

### Input Validation
- **Zod Schemas**: All inputs validated
- **Type Safety**: TypeScript + Zod = compile-time + runtime safety
- **Sanitization**: Automatic via Zod parsing

## Error Handling

### Error Hierarchy
```
TRPCError (tRPC standard)
├── UNAUTHORIZED      (401)
├── FORBIDDEN         (403)
├── NOT_FOUND         (404)
├── BAD_REQUEST       (400)
└── INTERNAL_SERVER_ERROR (500)
```

### Error Handling Pattern
```typescript
try {
  // Business logic
} catch (error) {
  if (error instanceof TRPCError) {
    throw error; // Re-throw tRPC errors
  }
  
  // Log unexpected errors
  logError('Operation failed', error, { context });
  
  // Return user-friendly error
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'User-friendly message',
    cause: error,
  });
}
```

### Structured Error Logging
All errors are logged with:
- Severity level
- Error message
- Stack trace
- Context (userId, procedure, etc.)

## Logging & Monitoring

### Structured Logging
All logs are JSON-formatted for Cloud Logging compatibility:

```typescript
logInfo('Operation started', {
  userId: ctx.userId,
  procedure: 'router.procedure',
  metadata: { /* ... */ },
});
```

### Log Levels
- **DEBUG**: Development debugging
- **INFO**: Normal operations
- **WARNING**: Recoverable issues
- **ERROR**: Failures requiring attention
- **CRITICAL**: System-level failures

### Metrics to Track
- Request latency
- Error rates by procedure
- API usage (Gemini calls)
- Storage operations
- User activity patterns

## Deployment

### Build Process
```bash
# 1. Build shared packages
pnpm build --filter=@rag-monorepo/shared

# 2. Build RAG service
pnpm build --filter=@rag-monorepo/rag-service

# 3. Build functions
cd functions && pnpm build
```

### Environment Variables
Required in Firebase Functions:
- `GEMINI_API_KEY`: Google Gemini API key

### Deployment Commands
```bash
# Deploy functions
firebase deploy --only functions

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy all
firebase deploy
```

### CI/CD (Future)
- Automated testing on PR
- Deployment to staging environment
- Production deployment approval

## Performance Considerations

### Optimization Strategies
1. **Lazy Loading**: Packages loaded on demand
2. **Caching**: RAG responses (future)
3. **Batch Operations**: Firebase batch writes
4. **Connection Pooling**: Firebase Admin SDK handles this

### Scalability
- **Horizontal Scaling**: Firebase Functions auto-scale
- **Stateless Design**: All functions are stateless
- **Database**: Firestore scales automatically

## Future Enhancements

### Planned Improvements
1. **Vector Database**: Full RAG implementation (Phase 2)
2. **Caching Layer**: Redis for frequently accessed data
3. **Rate Limiting**: Protect against abuse
4. **API Versioning**: Support multiple API versions
5. **GraphQL Alternative**: Consider GraphQL for complex queries

## References
- [tRPC Documentation](https://trpc.io/)
- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [ADR-001: RAG Architecture](./ADR-001-rag-architecture.md)

