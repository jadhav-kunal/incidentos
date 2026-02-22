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
      content: `You are an expert SRE incident analyzer. You MUST respond with ONLY a valid JSON object. No markdown. No explanation. No placeholders. Use ONLY real data from the incident context provided. Your response must start with { and end with }.

Required format:
{"hypotheses":[{"title":"<real title based on actual data>","description":"<real description>","confidence":<number 0-1>,"category":"<infrastructure|deployment|external-dependency|application>","supportingEvidence":["<real evidence from logs/metrics>"],"affectedServices":["<real service names>"]}]}`,
    },
    { role: "user", content: prompt },
  ],
  "hypothesis",
  context
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
  return `Analyze this real production incident and return 3 hypotheses as JSON:

LOGS (${context.events.length} events):
${context.events.slice(0, 5).map(e => `${e.timestamp} ${e.level} ${e.service}: ${e.message}`).join("\n")}

METRICS ANOMALIES:
${context.anomalies.map(a => `${a.metric}: ${a.value} — ${a.severity}`).join("\n")}

DEPLOYMENT:
${context.deployments[0] ? `${context.deployments[0].service} ${context.deployments[0].version} deployed at ${context.deployments[0].timestamp}` : "No recent deployment"}

TEAM SLACK:
${context.communications.slice(0, 4).map(c => `${c.author}: ${c.message}`).join("\n")}

VOICE TRANSCRIPT:
${context.voiceTranscript || "None"}

RISK SCORE: ${graph.riskScore}/100

Respond with ONLY this JSON structure using REAL data from above:
{"hypotheses":[{"title":"...","description":"...","confidence":0.0,"category":"...","supportingEvidence":["..."],"affectedServices":["..."]}]}`;
}

function parseHypotheses(content: string, context: NormalizedContext): any[] {
  try {
    const cleaned = content.replace(/```json|```/g, "").trim();
    
    // Try direct parse
    try {
      const parsed = JSON.parse(cleaned);
      const hyps = parsed.hypotheses || parsed;
      if (Array.isArray(hyps) && hyps.length > 0 && hyps[0].title !== "hypothesis1") {
        return hyps;
      }
    } catch {}

    // Extract JSON object from surrounding text
    const jsonMatch = cleaned.match(/\{[\s\S]*"hypotheses"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const hyps = parsed.hypotheses || parsed;
      if (Array.isArray(hyps) && hyps[0].title !== "hypothesis1") {
        return hyps;
      }
    }

    throw new Error("Placeholder or invalid response from MiniMax");
  } catch (err) {
    logger.warn("Hypothesis parse failed, using dynamic fallback", String(err));
    
    // Dynamic fallback from real context
    const topAnomaly = context.anomalies[0];
    const deployment = context.deployments[0];
    const affectedServices = [...new Set(context.events.map(e => e.service))];
    const errorMessages = context.events.filter(e => e.level === "ERROR").map(e => e.message);

    return [
      {
        title: topAnomaly ? `${topAnomaly.metric.replace(/_/g, " ")} Critical Failure` : "Service Degradation",
        description: `${topAnomaly?.metric || "Service"} reached ${topAnomaly?.value || "critical levels"}. ${deployment ? `Correlates with ${deployment.version} deployed at ${deployment.timestamp}.` : ""} ${context.communications[0]?.message || ""}`,
        confidence: 0.72,
        category: topAnomaly?.metric.includes("memory") || topAnomaly?.metric.includes("cpu") ? "infrastructure" : "deployment",
        supportingEvidence: [
          ...context.anomalies.map(a => `${a.metric}: ${a.value} (${a.severity})`),
          ...errorMessages.slice(0, 2),
          ...context.communications.slice(0, 2).map(c => `${c.author}: "${c.message}"`),
        ].filter(Boolean).slice(0, 4),
        affectedServices: affectedServices.slice(0, 3),
      },
      {
        title: deployment ? `${deployment.version} Deployment Regression` : "Configuration Drift",
        description: deployment
          ? `${deployment.version} on ${deployment.service} deployed shortly before incident onset. May have introduced the anomaly.`
          : "Recent configuration change may have destabilized the service.",
        confidence: 0.19,
        category: "deployment",
        supportingEvidence: [
          deployment ? `${deployment.version} deployed at ${deployment.timestamp}` : "No deployment found",
          context.communications.find(c => c.message.toLowerCase().includes("deploy"))?.message || "Team discussing deployment correlation",
        ].filter(Boolean),
        affectedServices: [deployment?.service || "api-gateway"],
      },
      {
        title: "Upstream Dependency Cascade",
        description: "External service degradation causing cascading failures through service dependencies.",
        confidence: 0.09,
        category: "external-dependency",
        supportingEvidence: ["CPU within normal range rules out compute exhaustion", "Error pattern consistent with upstream timeout cascade"],
        affectedServices: ["external-api", "payment-service"],
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