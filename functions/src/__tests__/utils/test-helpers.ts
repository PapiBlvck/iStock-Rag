/**
 * Test utilities for Firebase and tRPC testing
 */

import type { Context } from '../../trpc/context';
import type { Mock } from 'jest-mock';

/**
 * Create a mock tRPC context
 */
export function createMockContext(overrides?: Partial<Context>): Context {
  return {
    userId: 'test-user-id',
    userEmail: 'test@example.com',
    ...overrides,
  };
}

/**
 * Create a mock context with no user (unauthenticated)
 */
export function createUnauthenticatedContext(): Context {
  return {
    userId: null,
    userEmail: null,
  };
}

/**
 * Create a mock Firestore document
 */
export function createMockFirestoreDoc(data: Record<string, unknown>, exists = true) {
  return {
    exists: exists,
    id: data.id as string || 'mock-doc-id',
    data: () => data,
    get: jest.fn().mockResolvedValue({
      exists: exists,
      data: () => data,
      id: data.id as string || 'mock-doc-id',
    }),
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    ref: {
      id: data.id as string || 'mock-doc-id',
    },
  };
}

/**
 * Create a mock Firestore collection
 */
export function createMockFirestoreCollection(docs: Array<Record<string, unknown>>) {
  const mockDocs = docs.map((data, index) => ({
    id: data.id as string || `doc-${index}`,
    data: () => data,
    exists: true,
  }));

  return {
    docs: mockDocs,
    empty: mockDocs.length === 0,
    size: mockDocs.length,
    forEach: jest.fn((callback) => {
      mockDocs.forEach(callback);
    }),
    get: jest.fn().mockResolvedValue({
      docs: mockDocs,
      empty: mockDocs.length === 0,
      size: mockDocs.length,
    }),
  };
}

/**
 * Create a mock Firebase Storage file
 */
export function createMockStorageFile(fileName: string) {
  const mockFile = {
    name: fileName,
    save: jest.fn().mockResolvedValue(undefined),
    makePublic: jest.fn().mockResolvedValue(undefined),
    publicUrl: () => `https://storage.googleapis.com/bucket/${fileName}`,
    delete: jest.fn().mockResolvedValue(undefined),
    getMetadata: jest.fn().mockResolvedValue({
      name: fileName,
      contentType: 'image/jpeg',
    }),
  };

  return mockFile;
}

/**
 * Create a mock Firebase Storage bucket
 */
export function createMockStorageBucket() {
  const files = new Map<string, ReturnType<typeof createMockStorageFile>>();

  return {
    file: jest.fn((fileName: string) => {
      if (!files.has(fileName)) {
        files.set(fileName, createMockStorageFile(fileName));
      }
      return files.get(fileName)!;
    }),
    getFiles: jest.fn().mockResolvedValue([]),
  };
}

/**
 * Mock Firebase Admin SDK
 */
export function setupFirebaseMocks() {
  const mockDocs = new Map<string, any>();
  const mockCollections = new Map<string, any[]>();

  const mockDoc = (docId: string) => {
    if (!mockDocs.has(docId)) {
      mockDocs.set(docId, createMockFirestoreDoc({ id: docId }, false));
    }
    return mockDocs.get(docId)!;
  };

  const mockCollection = (collectionName: string) => {
    return {
      doc: jest.fn((docId?: string) => {
        const id = docId || `doc-${Date.now()}`;
        const doc = mockDoc(id);
        return {
          ...doc,
          id,
          set: jest.fn().mockImplementation(async (data) => {
            mockDocs.set(id, createMockFirestoreDoc({ ...data, id }, true));
            return undefined;
          }),
          update: jest.fn().mockImplementation(async (data) => {
            const existing = mockDocs.get(id);
            if (existing) {
              mockDocs.set(id, createMockFirestoreDoc({ ...existing.data(), ...data, id }, true));
            }
            return undefined;
          }),
          get: jest.fn().mockResolvedValue(mockDocs.get(id) || createMockFirestoreDoc({ id }, false)),
          delete: jest.fn().mockImplementation(async () => {
            mockDocs.delete(id);
            return undefined;
          }),
        };
      }),
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: Array.from(mockDocs.values()).filter((doc) => doc.exists),
          empty: mockDocs.size === 0,
          size: mockDocs.size,
        }),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
      }),
      add: jest.fn().mockImplementation(async (data) => {
        const id = `doc-${Date.now()}`;
        mockDocs.set(id, createMockFirestoreDoc({ ...data, id }, true));
        return { id };
      }),
    };
  };

  return {
    db: {
      collection: jest.fn(mockCollection),
      doc: jest.fn(),
    },
    auth: {
      verifyIdToken: jest.fn().mockResolvedValue({
        uid: 'test-user-id',
        email: 'test@example.com',
      }),
    },
    storage: {
      bucket: jest.fn().mockReturnValue(createMockStorageBucket()),
    },
    mockDocs,
    mockCollections,
    reset: () => {
      mockDocs.clear();
      mockCollections.clear();
    },
  };
}

