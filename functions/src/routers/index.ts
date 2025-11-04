import { router } from '../trpc/trpc';
import { userRouter } from './user.router';
import { farmProfileRouter } from './farm-profile.router';
import { healthRouter } from './health.router';
import { nutritionRouter } from './nutrition.router';

/**
 * Main tRPC App Router
 * Combines all sub-routers
 */
export const appRouter = router({
  user: userRouter,
  farmProfile: farmProfileRouter,
  health: healthRouter,
  nutrition: nutritionRouter,
});

export type AppRouter = typeof appRouter;

