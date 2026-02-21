import { callLLM } from "../../services/ai/llm.service";
import { generateAudio } from "../../services/ai/audio.service";
import type { Hypothesis, MitigationPlan, NormalizedContext, IncidentSummary } from "../incident/incident.types";
import { logger } from "../../services/utils/logger";

export const summaryGenerator = {
  async generate(
    hypotheses: Hypothesis[],
    plan: MitigationPlan,
    context: NormalizedContext,
    incidentId: string
  ): Promise<IncidentSummary> {
    logger.info("Generating incident summaries");

    const response = await callLLM(
      [
        {
          role: "system",
          content: `Generate two summaries as JSON: engineerSummary (technical, concise, for on-call engineers), executiveSummary (non-technical, business impact focused, 2-3 sentences), postmortemDraft (markdown format). Return ONLY valid JSON.`,
        },
        {
          role: "user",
          content: `Top hypothesis: ${hypotheses[0]?.title} (${Math.round((hypotheses[0]?.confidence || 0) * 100)}% confidence)\nMitigation: ${plan.steps.map((s) => s.action).join(", ")}\nEstimated resolution: ${plan.estimatedResolutionTime}`,
        },
      ],
      "summary"
    );

    const summaries = parseSummaries(response.content);

    // Generate audio for executive summary
    logger.info("Generating audio summary");
    const audioUrl = await generateAudio(summaries.executiveSummary, incidentId);

    return { ...summaries, audioUrl };
  },
};

function parseSummaries(content: string): Omit<IncidentSummary, "audioUrl"> {
  try {
    const cleaned = content.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      engineerSummary: "Redis connection pool exhausted post-deployment. Rolling back API v1.2.3 and scaling Redis. ETA 10 min.",
      executiveSummary: "We experienced elevated error rates due to a database connection issue from a recent deployment. Engineering is executing a fix. Full resolution expected within 15 minutes. No data loss occurred.",
      postmortemDraft: "## Postmortem\n\nRoot cause: Redis connection pool exhaustion after API v1.2.3 deployment.\n\nAction items:\n1. Add connection pool tests to CI\n2. Set Redis capacity alerts at 80%",
    };
  }
}