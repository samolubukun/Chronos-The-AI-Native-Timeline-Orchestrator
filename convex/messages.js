import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const send = mutation({
  args: {
    chronicleId: v.id("chronicles"),
    role: v.string(),
    content: v.any(),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      chronicleId: args.chronicleId,
      role: args.role,
      content: args.content,
      type: args.type || "text",
    });
    return messageId;
  },
});

export const list = query({
  args: { chronicleId: v.id("chronicles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_chronicle", (q) => q.eq("chronicleId", args.chronicleId))
      .collect();
  },
});

export const clear = mutation({
  args: { chronicleId: v.id("chronicles") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chronicle", (q) => q.eq("chronicleId", args.chronicleId))
      .collect();
    
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
  },
});

export const updateResult = mutation({
  args: {
    id: v.id("messages"),
    result: v.any(),
  },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.id);
    if (!msg) return;
    
    const content = typeof msg.content === 'object' 
      ? { ...msg.content, result: args.result } 
      : { content: msg.content, result: args.result };
      
    await ctx.db.patch(args.id, { content });
  },
});
