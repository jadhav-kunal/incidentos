import { v4 as uuidv4 } from "uuid";
import { logger } from "../../services/utils/logger";
import { contextBuilder } from "../context/context.builder";
import { hypothesisEngine } from "../hypothesis/hypothesis.engine";
import { mitigationPlanner } from "../mitigation/mitigation.planner";
import { summaryGenerator } from "../summary/summary.generator";
import { ingestionService } from "../ingestion/ingestion.service";
import type { NormalizedContext, RawInput } from "./incident.types";

// In-memory store (acts as cache layer on top of Convex for the demo)
const store = new Map<string, any>();

export const incidentService = {
  async createIncident(title: string) {
    const id = uuidv4();
    const incident = {
      id,
      title,
      status: "pending",
      createdAt: new Date().toISOString(),
      inputs: [],
    };
    store.set(id, incident);
    logger.success(`Incident created: ${id}`);
    return incident;
  },

  async listIncidents() {
    return Array.from(store.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async getIncident(id: string) {
    return store.get(id) || null;
  },

  async addInput(id: string, type: string, data: any) {
    const incident = store.get(id);
    if (!incident) throw new Error(`Incident ${id} not found`);

    if (!incident.inputs) incident.inputs = [];
    incident.inputs.push({ type, data, createdAt: new Date().toISOString() });
    store.set(id, incident);
    logger.info(`Input added to incident ${id}: ${type}`);
  },

  async runAnalysisPipeline(id: string, forceDemo = false) {
    const incident = store.get(id);
    if (!incident) throw new Error(`Incident ${id} not found`);
  
    // Temporarily override demo mode for simulation
    const originalDemoMode = process.env.DEMO_MODE;
    if (forceDemo) process.env.DEMO_MODE = "true";
  
    try {
      logger.info(`[Pipeline] Starting for incident ${id} ${forceDemo ? "(DEMO)" : "(LIVE)"}`);
      incident.status = "processing";
      store.set(id, incident);
  
      const inputs = incident.inputs || [];
      const context = await ingestionService.normalize(inputs);
      incident.context = context;
  
      const graph = await contextBuilder.build(context);
      incident.graph = graph;
  
      const hypotheses = await hypothesisEngine.generate(context, graph);
      incident.hypotheses = hypotheses;
  
      const plan = await mitigationPlanner.plan(hypotheses[0], context);
      incident.mitigationPlan = plan;
  
      const summary = await summaryGenerator.generate(hypotheses, plan, context, id);
      incident.summary = summary;
  
      incident.status = "completed";
      incident.completedAt = new Date().toISOString();
      incident.overallConfidence = hypotheses[0]?.confidence || 0;
      store.set(id, incident);
  
      logger.success(`[Pipeline] Completed for incident ${id}`);
    } catch (err) {
      logger.error(`[Pipeline] Failed for incident ${id}`, err);
      incident.status = "failed";
      store.set(id, incident);
      throw err;
    } finally {
      // Always restore original demo mode
      if (forceDemo) process.env.DEMO_MODE = originalDemoMode || "false";
    }
  },

  async runSimulation(id: string) {
    logger.demo(`Loading simulation dataset for incident ${id}`);

    process.env.FORCE_DEMO_MODE = "true";

    // Preload demo dataset
    await this.addInput(id, "logs", {
      entries: [
        { timestamp: "10:01:02", level: "ERROR", message: "API 500 error", service: "api-gateway" },
        { timestamp: "10:01:03", level: "ERROR", message: "Redis connection timeout", service: "redis-client" },
        { timestamp: "10:01:05", level: "ERROR", message: "API 500 error", service: "api-gateway" },
        { timestamp: "10:01:08", level: "WARN", message: "Connection pool at 95% capacity", service: "redis-client" },
        { timestamp: "10:01:12", level: "ERROR", message: "API 500 error — upstream timeout", service: "api-gateway" },
      ],
    });

    await this.addInput(id, "metrics", {
      redis_latency: { value: 450, unit: "ms", baseline: 2, status: "spike" },
      cpu_usage: { value: 42, unit: "%", status: "normal" },
      memory_usage: { value: 58, unit: "%", status: "normal" },
      error_rate: { value: 34, unit: "%", status: "critical" },
      request_rate: { value: 1200, unit: "rpm", status: "normal" },
    });

    await this.addInput(id, "slack", {
      messages: [
        { author: "alice", message: "Seeing 500s in production — anyone else?", timestamp: "10:01:15" },
        { author: "bob", message: "Redis latency seems high, checking metrics", timestamp: "10:01:45" },
        { author: "charlie", message: "Did we change connection pool settings in v1.2.3?", timestamp: "10:02:10" },
        { author: "alice", message: "Deployment was 5 mins ago — could be related", timestamp: "10:02:30" },
        { author: "bob", message: "Rolling back now, will monitor", timestamp: "10:03:00" },
      ],
    });

    await this.addInput(id, "voice", {
      transcript:
        "Traffic looks stable on frontend but Redis seems saturated. We deployed API v1.2.3 about five minutes ago. Error rate is spiking. Did anyone change the connection pool? Let's roll back while we investigate.",
    });

    await this.runAnalysisPipeline(id);

    delete process.env.FORCE_DEMO_MODE;
  },
};