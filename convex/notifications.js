import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByUser = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    let targetUserId = args.userId;

    if (!targetUserId) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return [];

      const user = await ctx.db
        .query("users")
        .withIndex("by_stackId", (q) => q.eq("stackId", identity.subject))
        .unique();
      if (!user) return [];
      targetUserId = user._id;
    }

    const list = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .collect();
      
    return list.sort((a, b) => b.creationTime - a.creationTime);
  },
});



export const markAsRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { read: true });
    return { success: true };
  },
});

export const markAllAsRead = mutation({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    let targetUserId = args.userId;

    if (!targetUserId) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Unauthenticated request");

      const user = await ctx.db
        .query("users")
        .withIndex("by_stackId", (q) => q.eq("stackId", identity.subject))
        .unique();
      if (!user) throw new Error("User not found");
      targetUserId = user._id;
    }

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .filter((q) => q.eq(q.field("read"), false))
      .collect();

    for (const item of unread) {
      await ctx.db.patch(item._id, { read: true });
    }

    return { success: true };
  },
});
