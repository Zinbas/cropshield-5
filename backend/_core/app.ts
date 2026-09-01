import "dotenv/config";
import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/backend/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./static";

export function createBaseApp(options: { development?: boolean } = {}): Express {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  if (!options.development) serveStatic(app);

  app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(error);
    const message = error instanceof Error ? error.message : "Unexpected server error";
    console.error("[API] Unhandled request error:", error);
    if (req.path.startsWith("/api/")) {
      return res.status(500).json({ error: { message: "The request could not be completed.", code: "INTERNAL_SERVER_ERROR", detail: process.env.NODE_ENV === "development" ? message : undefined } });
    }
    return next(error);
  });
  return app;
}
