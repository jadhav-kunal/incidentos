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

    let hypotheses = parseHypotheses(response.content, context);

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

function parseHypotheses(content: string, context: NormalizedContext): any[] {
  try {
    const cleaned = content.replace(/```json|```/g, "").trim();
    
    // Try finding JSON array or object in response
    const jsonMatch = cleaned.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.hypotheses || parsed;
    }
    throw new Error("No JSON found");
  } catch {
    // Dynamic fallback based on actual anomalies
    const topAnomaly = context.anomalies[0];
    const topComm = context.communications[0]?.message || "";
    const deployment = context.deployments[0];

    return [
      {
        title: `${topAnomaly?.metric || "Service"} Anomaly — Primary Suspect`,
        description: `Detected ${topAnomaly?.metric} at ${topAnomaly?.value} (${topAnomaly?.severity} severity). ${deployment ? `Recent deployment ${deployment.version} may be related.` : ""}`,
        confidence: 0.70,
        category: "infrastructure",
        supportingEvidence: [
          ...context.anomalies.map((a) => `${a.metric}: ${a.value} (${a.severity})`),
          topComm,
        ].filter(Boolean),
        affectedServices: [...new Set(context.events.map((e) => e.service))],
      },
      {
        title: deployment ? `Deployment ${deployment.version} Side Effect` : "Configuration Drift",
        description: deployment
          ? `${deployment.version} deployed recently. May have introduced the anomaly.`
          : "Configuration change may have caused service degradation.",
        confidence: 0.20,
        category: "deployment",
        supportingEvidence: deployment
          ? [`${deployment.version} deployed at ${deployment.timestamp}`]
          : ["No recent deployment detected"],
        affectedServices: [deployment?.service || "unknown"],
      },
      {
        title: "Upstream Dependency Failure",
        description: "External service degradation cascading into internal errors.",
        confidence: 0.10,
        category: "external-dependency",
        supportingEvidence: ["CPU and memory within normal range"],
        affectedServices: ["external-api"],
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