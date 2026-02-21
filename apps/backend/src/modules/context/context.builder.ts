import type { NormalizedContext } from "../incident/incident.types";
import { logger } from "../../services/utils/logger";

export interface ContextGraph {
  errorSpike: { startTime: string; errorCount: number; services: string[] };
  deploymentProximity: { minutesBefore: number; version: string; service: string } | null;
  resourceAnomalies: Array<{ metric: string; severity: string }>;
  communicationSignals: string[];
  serviceGraph: Record<string, string[]>;
  riskScore: number;
}

export const contextBuilder = {
  async build(context: NormalizedContext): Promise<ContextGraph> {
    logger.info("Building context graph");

    const errors = context.events.filter((e) => e.level === "ERROR");
    const deployment = context.deployments[0] || null;

    // Calculate temporal proximity score (deployment before error spike)
    let deploymentProximity = null;
    if (deployment) {
      deploymentProximity = {
        minutesBefore: 5, // In real system, calculate from timestamps
        version: deployment.version || "unknown",
        service: deployment.service || "unknown",
      };
    }

    const riskScore = Math.min(
      context.anomalies.filter((a) => a.severity === "high").length * 30 +
        context.anomalies.filter((a) => a.severity === "medium").length * 15 +
        errors.length * 5 +
        (deploymentProximity ? 25 : 0),
      100
    );

    return {
      errorSpike: {
        startTime: errors[0]?.timestamp || "unknown",
        errorCount: errors.length,
        services: [...new Set(errors.map((e) => e.service))],
      },
      deploymentProximity,
      resourceAnomalies: context.anomalies,
      communicationSignals: context.communications.map((c) => c.message),
      serviceGraph: {
        "api-gateway": ["redis-primary", "order-service", "payment-service"],
        "redis-primary": ["redis-replica"],
        "order-service": ["redis-primary", "postgres-primary"],
      },
      riskScore,
    };
  },
};