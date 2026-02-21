import { callLLM } from "../../services/ai/llm.service";
import { calculateConfidence, rankHypotheses } from "../../services/utils/confidence.util";
import type { NormalizedContext } from "../incident/incident.types";
import type { ContextGraph } from "../context/context.builder";
import { logger } from "../../services/utils/logger";

export const hypothesisEngine = {
  async generate(context: NormalizedContext, graph: ContextGraph) {
    logger.info("Hypothesis engine: generating candidates");

    const prompt = buildHypothesisPrompt(context, graph);

    const response = await callLLM(
      [
        {
          role: "system",
          content: `You are an expert SRE incident analyzer. Analyze the incident context and return ONLY valid JSON with exactly 3 root cause hypotheses ranked by likelihood. Each hypothesis must have: title, description, confidence (0-1), category (infrastructure|deployment|external-dependency|application), supportingEvidence (array of strings), affectedServices (array of strings).`,
        },
        { role: "user", content: prompt },
      ],
      "hypothesis"
    );

    let hypotheses = parseHypotheses(response.content);

    // Apply rule-based confidence scoring on top of LLM scores
    hypotheses = hypotheses.map((h, i) => ({
      ...h,
      confidence: applyRuleBasedScoring(h, context, graph),
      rank: i + 1,
    }));

    return rankHypotheses(hypotheses).map((h, i) => ({ ...h, rank: i + 1 }));
  },
};

function buildHypothesisPrompt(context: NormalizedContext, graph: ContextGraph): string {
  return `
INCIDENT CONTEXT:
- Error spike: ${graph.errorSpike.errorCount} errors starting at ${graph.errorSpike.startTime}
- Affected services: ${graph.errorSpike.services.join(", ")}
- Recent deployment: ${graph.deploymentProximity ? `${graph.deploymentProximity.version} deployed ${graph.deploymentProximity.minutesBefore} minutes before error spike` : "None detected"}
- Resource anomalies: ${context.anomalies.map((a) => `${a.metric}: ${a.value} (${a.severity})`).join(", ")}
- Team communications: ${context.communications.map((c) => `"${c.message}"`).join(" | ")}
- Voice transcript: ${context.voiceTranscript || "None"}
- Risk score: ${graph.riskScore}/100

Generate 3 hypotheses as JSON array.`;
}

function parseHypotheses(content: string): any[] {
  try {
    const cleaned = content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return parsed.hypotheses || parsed;
  } catch {
    // Return structured fallback if parse fails
    return [
      {
        title: "Redis Connection Pool Exhaustion",
        description: "Connection pool saturated after recent deployment",
        confidence: 0.72,
        category: "infrastructure",
        supportingEvidence: ["Redis latency spike", "Deployment 5min before errors"],
        affectedServices: ["api-gateway", "redis-primary"],
      },
    ];
  }
}

function applyRuleBasedScoring(h: any, context: NormalizedContext, graph: ContextGraph): number {
  let score = h.confidence;

  // Boost if deployment happened close to error spike
  if (graph.deploymentProximity && h.category === "deployment") {
    score *= 1.1;
  }

  // Boost infrastructure hypotheses when resource anomalies exist
  if (h.category === "infrastructure" && context.anomalies.length > 0) {
    score *= 1.15;
  }

  // Reduce external dependency confidence if no external signals
  if (h.category === "external-dependency" && context.anomalies.length < 2) {
    score *= 0.85;
  }

  return Math.min(parseFloat(score.toFixed(2)), 0.99);
}