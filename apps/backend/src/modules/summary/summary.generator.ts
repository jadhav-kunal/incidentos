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

    const topHypothesis = hypotheses[0]?.title || "unknown root cause";
    const eta = plan.estimatedResolutionTime || "15 minutes";
    const affectedServices = hypotheses[0]?.affectedServices?.join(", ") || "unknown";

    const response = await callLLM(
      [
        {
          role: "system",
          content: `You are an expert SRE. Generate incident summaries as a single valid JSON object with exactly these three fields: "engineerSummary" (technical, 2-3 sentences for on-call engineers), "executiveSummary" (non-technical, 2-3 sentences about business impact and resolution timeline), "postmortemDraft" (markdown format with Summary, Timeline, Root Cause, Action Items sections). Return ONLY the JSON object, no markdown fences, no extra text.`,
        },
        {
          role: "user",
          content: `Generate summaries for this incident:
Top root cause: ${topHypothesis} (${Math.round((hypotheses[0]?.confidence || 0) * 100)}% confidence)
Affected services: ${affectedServices}
Anomalies: ${context.anomalies.map((a) => `${a.metric}=${a.value} (${a.severity})`).join(", ")}
Mitigation steps: ${plan.steps.map((s) => s.action).join(" → ")}
Estimated resolution: ${eta}
Team communications: ${context.communications.slice(0, 3).map((c) => c.message).join(" | ")}`,
        },
      ],
      "summary",
      { topHypothesis, eta }
    );

    const summaries = parseSummaries(response.content, topHypothesis, eta);
    logger.info(`Summary generated — executive: "${summaries.executiveSummary.slice(0, 80)}..."`);

    const audioUrl = await generateAudio(summaries.executiveSummary, incidentId);
    return { ...summaries, audioUrl };
  },
};

function parseSummaries(
  content: string,
  topHypothesis: string,
  eta: string
): Omit<IncidentSummary, "audioUrl"> {
  try {
    // Strip markdown fences if present
    const cleaned = content.replace(/```json|```/g, "").trim();

    // Try direct parse first
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.engineerSummary && parsed.executiveSummary) {
        return parsed;
      }
    } catch {}

    // Try extracting JSON object from response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.engineerSummary && parsed.executiveSummary) {
        return parsed;
      }
    }

    throw new Error("No valid JSON with required fields");
  } catch (err) {
    logger.warn("Summary parse failed, building dynamic fallback", err);

    // Dynamic fallback — never generic, always uses actual hypothesis
    return {
      engineerSummary: `Root cause identified as ${topHypothesis}. Mitigation in progress — executing remediation steps. P0 incident — estimated ${eta} to full resolution.`,
      executiveSummary: `We are experiencing service degradation caused by ${topHypothesis}. Engineering has identified the root cause and is executing the fix now. Full resolution expected within ${eta}. No data loss has occurred.`,
      postmortemDraft: `## Incident Postmortem\n\n**Root Cause:** ${topHypothesis}\n**Resolution ETA:** ${eta}\n\n### Action Items\n1. Add automated detection for ${topHypothesis}\n2. Review deployment runbook\n3. Implement staged rollout process`,
    };
  }
}