import { callLLM } from "../../services/ai/llm.service";
import type { Hypothesis, MitigationPlan, NormalizedContext } from "../incident/incident.types";
import { logger } from "../../services/utils/logger";

export const mitigationPlanner = {
  async plan(hypothesis: Hypothesis, context: NormalizedContext): Promise<MitigationPlan> {
    logger.info(`Mitigation planner: planning for "${hypothesis.title}"`);

    const response = await callLLM(
      [
        {
          role: "system",
          content: `You are a senior SRE. Generate a step-by-step mitigation plan for the given root cause hypothesis. Return ONLY valid JSON with: steps (array), rollbackStrategy (string), estimatedResolutionTime (string), verificationSteps (array of strings).`,
        },
        {
          role: "user",
          content: `Root cause: ${hypothesis.title}\nDescription: ${hypothesis.description}\nAffected services: ${hypothesis.affectedServices.join(", ")}\nAnomaly context: ${context.anomalies.map((a) => `${a.metric}=${a.value}`).join(", ")}`,
        },
      ],
      "mitigation"
    );

    return parseMitigationPlan(response.content);
  },
};

function parseMitigationPlan(content: string): MitigationPlan {
  try {
    const cleaned = content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return parsed.steps ? parsed : { steps: [], rollbackStrategy: "", estimatedResolutionTime: "unknown", verificationSteps: [] };
  } catch {
    return {
      steps: [
        { order: 1, action: "Scale Redis replica count", command: "kubectl scale deployment redis --replicas=3", expectedOutcome: "Reduce connection pressure", riskLevel: "low" },
        { order: 2, action: "Increase Redis max connections", command: "redis-cli CONFIG SET maxclients 1000", expectedOutcome: "Allow more concurrent connections", riskLevel: "low" },
        { order: 3, action: "Rollback API v1.2.3", command: "kubectl rollout undo deployment/api-gateway", expectedOutcome: "Restore stable configuration", riskLevel: "medium" },
      ],
      rollbackStrategy: "Revert to v1.2.2 if errors persist after 5 minutes",
      estimatedResolutionTime: "8-12 minutes",
      verificationSteps: ["Confirm Redis latency < 10ms", "Verify error rate < 0.1%", "Health check all endpoints"],
    };
  }
}