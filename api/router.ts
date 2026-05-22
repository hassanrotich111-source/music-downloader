import { createRouter, publicQuery } from "./middleware";
import { videoRouter } from "./routes/video";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  video: videoRouter,
});

export type AppRouter = typeof appRouter;
