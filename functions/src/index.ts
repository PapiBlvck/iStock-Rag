import * as functions from 'firebase-functions';
// TODO: Implement proper tRPC HTTP adapter
// import { createContext } from './trpc/context';
// import { appRouter } from './routers';
import { TRPCError } from '@trpc/server';
import { getHTTPStatusCodeFromError } from '@trpc/server/http';

/**
 * Main tRPC HTTP handler
 */
export const trpc = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    // TODO: Implement proper tRPC HTTP adapter
    // const ctx = await createContext({ req, res });

    // Parse the request path to get the procedure name
    const path = req.path.replace(/^\/+/, ''); // Remove leading slashes
    // TODO: Implement proper tRPC HTTP adapter
    // const caller = appRouter.createCaller(ctx);

    // For now, we'll handle this as a simple HTTP endpoint
    // In production, you'd use @trpc/server adapters
    if (req.method === 'POST') {
      // TODO: Process request body and route to tRPC procedures
      // const body = req.body;

      // Basic routing based on path
      const [router, procedure] = path.split('.');

      res.status(200).json({
        message: 'tRPC endpoint ready',
        path,
        router,
        procedure,
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling request:', error);

    const statusCode =
      error instanceof TRPCError
        ? getHTTPStatusCodeFromError(error)
        : 500;

    res.status(statusCode).json({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
      },
    });
  }
});
