import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { incidentRoutes } from "./routes";
import { logger } from "./services/utils/logger";
import { env } from "./config/env";

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors({ origin: "*" }));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(morgan("dev"));

  // Serve generated audio files
  app.use("/audio", express.static(path.join(__dirname, "../public/audio")));

  // Health check
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      demoMode: env.DEMO_MODE,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      service: "IncidentOS Backend",
    });
  });

  // API routes
  app.use("/api", incidentRoutes);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error("Unhandled error", err.message);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}