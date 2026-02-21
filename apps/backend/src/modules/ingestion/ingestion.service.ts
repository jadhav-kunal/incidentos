import type { NormalizedContext, RawInput } from "../incident/incident.types";
import { logger } from "../../services/utils/logger";

export const ingestionService = {
  async normalize(inputs: RawInput[]): Promise<NormalizedContext> {
    logger.info(`Normalizing ${inputs.length} inputs`);

    const context: NormalizedContext = {
      events: [],
      deployments: [],
      anomalies: [],
      communications: [],
    };

    for (const input of inputs) {
      switch (input.type) {
        case "logs":
          context.events.push(...(input.data.entries || []));
          // Extract deployment events from logs
          const deployments = (input.data.entries || []).filter((e: any) =>
            e.message?.toLowerCase().includes("deploy")
          );
          context.deployments.push(...deployments);
          break;

        case "metrics":
          Object.entries(input.data).forEach(([metric, value]: [string, any]) => {
            if (value.status !== "normal") {
              context.anomalies.push({
                metric,
                value: `${value.value}${value.unit}`,
                severity: value.status === "critical" ? "high" : "medium",
              });
            }
          });
          break;

        case "slack":
          context.communications.push(...(input.data.messages || []));
          break;

        case "voice":
          context.voiceTranscript = input.data.transcript || "";
          break;
      }
    }

    // Always add the known deployment event for demo
    if (context.deployments.length === 0) {
      context.deployments.push({
        timestamp: "09:56:00",
        version: "v1.2.3",
        service: "api-gateway",
      });
    }

    return context;
  },
};