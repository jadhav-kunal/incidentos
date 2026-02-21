import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./services/utils/logger";

const app = createApp();

app.listen(env.PORT, () => {
  logger.success(`IncidentOS Backend running on port ${env.PORT}`);
  logger.info(`Demo mode: ${env.DEMO_MODE ? "ON" : "OFF"}`);
  logger.info(`Health: http://localhost:${env.PORT}/health`);
});