import { inferAsyncReturnType } from '@trpc/server';
import { auth } from '../config/firebase';

/**
 * Creates context for tRPC requests
 * Extracts and validates the Firebase Auth token from the request
 */
export async function createContext(opts: {
  req: any;
  res: any;
}): Promise<{ userId: string | null; userEmail: string | null }> {
  const authHeader = opts.req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { userId: null, userEmail: null };
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await auth.verifyIdToken(token);
    return {
      userId: decodedToken.uid,
      userEmail: decodedToken.email || null,
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return { userId: null, userEmail: null };
  }
}

export type Context = inferAsyncReturnType<typeof createContext>;

