import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const saveContext = mutation({
  args: {
    incidentId: v.string(),
    normalizedEvents: v.any(),
    anomalySignals: v.any(),
    deploymentEvents: v.any(),
    communicationSummary: v.any(),
    serviceGraph: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("incidentContext")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("incidentContext", args);
    }
  },
});

export const saveHypotheses = mutation({
  args: {
    incidentId: v.string(),
    hypotheses: v.array(
      v.object({
        title: v.string(),
        description: v.string(),
        confidence: v.number(),
        rank: v.number(),
        category: v.string(),
        supportingEvidence: v.array(v.string()),
        affectedServices: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const h of args.hypotheses) {
      const id = await ctx.db.insert("hypotheses", {
        incidentId: args.incidentId,
        ...h,
      });
      ids.push(id);
    }
    return ids;
  },
});

export const saveMitigationPlan = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("mitigationPlans", args);
  },
});

export const saveSummary = mutation({
  args: {
    incidentId: v.string(),
    engineerSummary: v.string(),
    executiveSummary: v.string(),
    audioUrl: v.optional(v.string()),
    postmortemDraft: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("summaries", args);
  },
});