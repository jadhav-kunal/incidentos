import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const incidentId = await ctx.db.insert("incidents", {
      title: args.title,
      status: "pending",
      createdAt: Date.now(),
    });
    return incidentId;
  },
});

export const get = query({
  args: { id: v.id("incidents") },
  handler: async (ctx, args) => {
    const incident = await ctx.db.get(args.id);
    if (!incident) return null;

    const inputs = await ctx.db
      .query("incidentInputs")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.id.toString()))
      .collect();

    const context = await ctx.db
      .query("incidentContext")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.id.toString()))
      .first();

    const hypotheses = await ctx.db
      .query("hypotheses")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.id.toString()))
      .collect();

    const mitigationPlan = await ctx.db
      .query("mitigationPlans")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.id.toString()))
      .first();

    const summary = await ctx.db
      .query("summaries")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.id.toString()))
      .first();

    return {
      ...incident,
      inputs,
      context,
      hypotheses: hypotheses.sort((a, b) => a.rank - b.rank),
      mitigationPlan,
      summary,
    };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("incidents").order("desc").take(20);
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("incidents"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    overallConfidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.status === "completed" && { completedAt: Date.now() }),
      ...(args.overallConfidence && { overallConfidence: args.overallConfidence }),
    });
  },
});