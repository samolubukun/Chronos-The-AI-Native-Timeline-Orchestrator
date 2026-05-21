import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    chronicleId: v.id("chronicles"),
    triggerTaskId: v.id("tasks"),
    triggerType: v.string(), // "completed" | "delayed"
    actionType: v.string(), // "delay_alert"
    actionConfig: v.any(), // Custom notification templates, channels, webhooks
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("automations", {
      chronicleId: args.chronicleId,
      triggerTaskId: args.triggerTaskId,
      triggerType: args.triggerType,
      actionType: args.actionType,
      actionConfig: args.actionConfig,
    });
  },
});

export const listByChronicle = query({
  args: { chronicleId: v.id("chronicles") },
  handler: async (ctx, args) => {
    const automations = await ctx.db
      .query("automations")
      .withIndex("by_chronicle", (q) => q.eq("chronicleId", args.chronicleId))
      .collect();

    // Enrich with trigger task details
    return await Promise.all(
      automations.map(async (auto) => {
        const task = await ctx.db.get(auto.triggerTaskId);
        return {
          ...auto,
          triggerTaskName: task ? task.name : "Unknown Task",
        };
      })
    );
  },
});

export const remove = mutation({
  args: { id: v.id("automations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
