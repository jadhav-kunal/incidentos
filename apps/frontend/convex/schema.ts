import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  incidents: defineTable({
    title: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    overallConfidence: v.optional(v.number()),
  }),

  incidentInputs: defineTable({
    incidentId: v.string(),
    type: v.union(
      v.literal("logs"),
      v.literal("metrics"),
      v.literal("slack"),
      v.literal("voice")
    ),
    rawData: v.any(),
    createdAt: v.number(),
  }).index("by_incident", ["incidentId"]),

  incidentContext: defineTable({
    incidentId: v.string(),
    normalizedEvents: v.any(),
    anomalySignals: v.any(),
    deploymentEvents: v.any(),
    communicationSummary: v.any(),
    serviceGraph: v.any(),
  }).index("by_incident", ["incidentId"]),

  hypotheses: defineTable({
    incidentId: v.string(),
    title: v.string(),
    description: v.string(),
    confidence: v.number(),
    rank: v.number(),
    category: v.string(),
    supportingEvidence: v.array(v.string()),
    affectedServices: v.array(v.string()),
  }).index("by_incident", ["incidentId"]),

  mitigationPlans: defineTable({
    incidentId: v.string(),
    hypothesisId: v.string(),
    steps: v.array(
      v.object({
        order: v.number(),
        action: v.string(),
        command: v.optional(v.string()),
        expectedOutcome: v.string(),
        riskLevel: v.union(
          v.literal("low"),
          v.literal("medium"),
          v.literal("high")
        ),
      })
    ),
    rollbackStrategy: v.string(),
    estimatedResolutionTime: v.string(),
    verificationSteps: v.array(v.string()),
  }).index("by_incident", ["incidentId"]),

  summaries: defineTable({
    incidentId: v.string(),
    engineerSummary: v.string(),
    executiveSummary: v.string(),
    audioUrl: v.optional(v.string()),
    postmortemDraft: v.optional(v.string()),
  }).index("by_incident", ["incidentId"]),
});