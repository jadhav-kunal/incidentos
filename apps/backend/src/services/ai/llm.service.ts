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

// Demo responses for offline mode
const DEMO_RESPONSES: Record<string, string> = {
  hypothesis: JSON.stringify({
    hypotheses: [
      {
        title: "Redis Connection Pool Exhaustion",
        description:
          "Deployment of API v1.2.3 introduced a connection leak causing Redis pool to saturate under normal load, resulting in cascading 500 errors across all API endpoints.",
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
        description:
          "API v1.2.3 may contain misconfigured environment variables causing incorrect Redis connection string or pool size settings.",
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
        description:
          "External payment API degradation causing request queuing, which indirectly exhausted Redis connection pool through delayed job processing.",
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

  mitigation: JSON.stringify({
    steps: [
      {
        order: 1,
        action: "Immediately scale Redis replica count",
        command: "kubectl scale deployment redis --replicas=3 -n production",
        expectedOutcome: "Distribute connection load, reduce latency within 2 min",
        riskLevel: "low",
      },
      {
        order: 2,
        action: "Increase Redis max connections limit",
        command: "redis-cli CONFIG SET maxclients 1000",
        expectedOutcome: "Allow more concurrent connections immediately",
        riskLevel: "low",
      },
      {
        order: 3,
        action: "Rollback API v1.2.3 to v1.2.2",
        command: "kubectl rollout undo deployment/api-gateway -n production",
        expectedOutcome: "Restore previous stable connection pool configuration",
        riskLevel: "medium",
      },
      {
        order: 4,
        action: "Monitor error rate post-rollback",
        command: "watch -n 5 'kubectl logs -l app=api-gateway | grep ERROR | wc -l'",
        expectedOutcome: "Error rate should drop below 1% within 5 minutes",
        riskLevel: "low",
      },
    ],
    rollbackStrategy:
      "If scaling Redis does not reduce errors within 5 minutes, proceed with full rollback of API v1.2.3. Rollback command: kubectl rollout undo deployment/api-gateway",
    estimatedResolutionTime: "8-12 minutes",
    verificationSteps: [
      "Confirm Redis latency returns below 10ms",
      "Verify 500 error rate drops below 0.1%",
      "Check all API endpoints return 200 on health check",
      "Confirm Slack incident channel reports resolution",
    ],
  }),

  summary: JSON.stringify({
    engineerSummary:
      "Root cause identified as Redis connection pool exhaustion triggered by API v1.2.3 deployment at 09:56. The new deployment introduced a connection leak causing pool saturation under normal traffic load. Immediate mitigation: scale Redis replicas and roll back API deployment. P0 incident — estimated 8-12 min resolution.",
    executiveSummary:
      "We experienced elevated error rates starting at 10:01 AM due to a database connection issue triggered by a recent software deployment. Our systems detected the root cause automatically. The engineering team is executing a rollback and scaling fix. Estimated full resolution in under 15 minutes. No data loss occurred.",
    postmortemDraft:
      "## Incident Postmortem — API 500 Spike\n\n**Date:** Today\n**Severity:** P0\n**Duration:** ~15 minutes\n\n### Summary\nAPI v1.2.3 deployment introduced a Redis connection leak causing pool exhaustion and cascading 500 errors.\n\n### Timeline\n- 09:56 — API v1.2.3 deployed\n- 10:01 — Error spike detected (500 errors)\n- 10:01 — Redis latency anomaly confirmed\n- 10:03 — IncidentOS identified root cause\n- 10:10 — Rollback initiated\n- 10:15 — Systems restored\n\n### Root Cause\nConnection pool size was not increased to match new concurrency requirements in v1.2.3.\n\n### Action Items\n1. Add connection pool validation to CI/CD pipeline\n2. Set Redis connection alerts at 80% capacity\n3. Require load testing for all database-touching deployments",
  }),
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
  console.log(`[MiniMax] Status: ${response.status} | Preview: ${text.slice(0, 400)}`);

  if (!response.ok) {
    throw new Error(`MiniMax error ${response.status}: ${text}`);
  }

  const data = JSON.parse(text) as {
    choices: Array<{ message: { content: string } }>;
    base_resp?: { status_code: number; status_msg: string };
  };

  // Check MiniMax internal error codes
  if (data.base_resp?.status_code && data.base_resp.status_code !== 0) {
    throw new Error(`MiniMax internal error: ${data.base_resp.status_msg}`);
  }

  return data.choices[0].message.content;
}

export async function callLLM(
  messages: LLMMessage[],
  responseType: keyof typeof DEMO_RESPONSES = "hypothesis"
): Promise<LLMResponse> {
  if (isDemoMode()) {
    logger.demo(`LLM call intercepted — returning demo ${responseType}`);
    await new Promise((r) => setTimeout(r, 800)); // realistic delay
    return {
      content: DEMO_RESPONSES[responseType] || DEMO_RESPONSES.hypothesis,
      model: "demo-mode",
      demo: true,
    };
  }

  try {
    logger.info(`Calling MiniMax LLM for ${responseType}`);
    const content = await callMiniMax(messages);
    return { content, model: "MiniMax-M1-80k", demo: false };
  } catch (err) {
    logger.warn("MiniMax failed, falling back to demo mode", err);
    return {
      content: DEMO_RESPONSES[responseType] || DEMO_RESPONSES.hypothesis,
      model: "fallback-demo",
      demo: true,
    };
  }
}