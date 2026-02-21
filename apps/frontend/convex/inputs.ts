import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const addInput = mutation({
  args: {
    incidentId: v.id("incidents"),
    type: v.union(
      v.literal("logs"),
      v.literal("metrics"),
      v.literal("slack"),
      v.literal("voice")
    ),
    rawData: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("incidentInputs", {
      incidentId: args.incidentId,
      type: args.type,
      rawData: args.rawData,
      createdAt: Date.now(),
    });
  },
});