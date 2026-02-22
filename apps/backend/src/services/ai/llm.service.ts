import { env, isDemoMode } from "../../config/env";
import { logger } from "../utils/logger";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  demo: boolean;
}

const DEMO_RESPONSES = {
  hypothesis: (context?: any) => JSON.stringify({
    hypotheses: [
      {
        title: "Redis Connection Pool Exhaustion",
        description: "Deployment of API v1.2.3 introduced a connection leak causing Redis pool to saturate under normal load, resulting in cascading 500 errors across all API endpoints.",
        confidence: 0.72,
        category: "infrastructure",
        supportingEvidence: [
          "Redis latency spike from 2ms to 450ms at 10:01:02",
          "API v1.2.3 deployed at 09:56 — 5 minutes before error spike",
          "Slack: 'Redis latency seems high' — corroborates metric anomaly",
          "Connection timeout errors in logs match pool exhaustion pattern",
        ],
        affectedServices: ["api-gateway", "redis-primary", "order-service"],
      },
      {
        title: "Faulty Deployment Configuration",
        description: "API v1.2.3 may contain misconfigured environment variables causing incorrect Redis connection string or pool size settings.",
        confidence: 0.19,
        category: "deployment",
        supportingEvidence: [
          "Deployment timestamp correlates with error onset",
          "No prior Redis issues before this deployment",
          "Slack: 'Did we change connection pool?' suggests config awareness",
        ],
        affectedServices: ["api-gateway", "config-service"],
      },
      {
        title: "Upstream API Timeout Cascade",
        description: "External payment API degradation causing request queuing, which indirectly exhausted Redis connection pool through delayed job processing.",
        confidence: 0.09,
        category: "external-dependency",
        supportingEvidence: [
          "CPU and memory normal — rules out compute resource issue",
          "Error pattern consistent with upstream timeout cascade",
        ],
        affectedServices: ["payment-service", "job-queue"],
      },
    ],
  }),

  mitigation: (context?: any) => JSON.stringify({
    steps: [
      { order: 1, action: "Immediately scale Redis replica count", command: "kubectl scale deployment redis --replicas=3 -n production", expectedOutcome: "Distribute connection load, reduce latency within 2 min", riskLevel: "low" },
      { order: 2, action: "Increase Redis max connections limit", command: "redis-cli CONFIG SET maxclients 1000", expectedOutcome: "Allow more concurrent connections immediately", riskLevel: "low" },
      { order: 3, action: "Rollback API v1.2.3 to v1.2.2", command: "kubectl rollout undo deployment/api-gateway -n production", expectedOutcome: "Restore previous stable connection pool configuration", riskLevel: "medium" },
      { order: 4, action: "Monitor error rate post-rollback", command: "watch -n 5 'kubectl logs -l app=api-gateway | grep ERROR | wc -l'", expectedOutcome: "Error rate should drop below 1% within 5 minutes", riskLevel: "low" },
    ],
    rollbackStrategy: "If scaling Redis does not reduce errors within 5 minutes, proceed with full rollback of API v1.2.3.",
    estimatedResolutionTime: "8-12 minutes",
    verificationSteps: [
      "Confirm Redis latency returns below 10ms",
      "Verify 500 error rate drops below 0.1%",
      "Check all API endpoints return 200 on health check",
    ],
  }),

  summary: (context?: any) => {
    const topHypothesis = context?.topHypothesis || "Redis connection pool exhaustion";
    const eta = context?.eta || "8-12 minutes";
    return JSON.stringify({
      engineerSummary: `Root cause identified as ${topHypothesis}. Immediate mitigation in progress — scaling affected services and initiating rollback. P0 incident — estimated ${eta} resolution.`,
      executiveSummary: `We are experiencing service degradation caused by ${topHypothesis}. Our AI system identified the root cause automatically. Engineering is executing the mitigation plan now. Full resolution expected within ${eta}. No data loss has occurred.`,
      postmortemDraft: `## Incident Postmortem\n\n**Root Cause:** ${topHypothesis}\n**ETA:** ${eta}\n\n### Action Items\n1. Add automated alerts for early detection\n2. Review deployment checklist\n3. Implement canary deployments`,
    });
  },
};

async function callMiniMax(messages: LLMMessage[]): Promise<string> {
  const response = await fetch(
    "https://api.minimax.io/v1/text/chatcompletion_v2",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.MINIMAX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "M2-her",
        messages: messages.map((m) => ({
          role: m.role,
          name: m.role === "assistant" ? "MiniMax AI" : "User",
          content: m.content,
        })),
        temperature: 0.3,
        max_completion_tokens: 2000,
      }),
    }
  );

  const text = await response.text();
  console.log(`[MiniMax] Status: ${response.status} | Preview: ${text.slice(0, 500)}`);

  if (!response.ok) {
    throw new Error(`MiniMax error ${response.status}: ${text}`);
  }

  const data = JSON.parse(text) as {
    choices: Array<{ message: { content: string } }>;
    base_resp?: { status_code: number; status_msg: string };
  };

  if (data.base_resp?.status_code && data.base_resp.status_code !== 0) {
    throw new Error(`MiniMax internal error: ${data.base_resp.status_msg}`);
  }

  return data.choices[0].message.content;
}

export async function callLLM(
  messages: LLMMessage[],
  responseType: keyof typeof DEMO_RESPONSES = "hypothesis",
  context?: any
): Promise<LLMResponse> {
  if (isDemoMode()) {
    logger.demo(`LLM call intercepted — returning demo ${responseType}`);
    await new Promise((r) => setTimeout(r, 800));
    return {
      content: DEMO_RESPONSES[responseType](context),
      model: "demo-mode",
      demo: true,
    };
  }

  try {
    logger.info(`Calling MiniMax LLM for ${responseType}`);
    const content = await callMiniMax(messages);
    return { content, model: "M2-her", demo: false };
  } catch (err) {
    logger.warn("MiniMax failed, falling back to demo mode", err);
    return {
      content: DEMO_RESPONSES[responseType](context),
      model: "fallback-demo",
      demo: true,
    };
  }
}