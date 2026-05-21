import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULT_DEPARTMENTS = [
  "Engineering", 
  "Design", 
  "Marketing", 
  "Product", 
  "Legal", 
  "Operations", 
  "Sales", 
  "Security"
];

export const create = mutation({
  args: {
    name: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const chronicleId = await ctx.db.insert("chronicles", {
      userId: args.userId,
      name: args.name,
      status: "active",
      departments: DEFAULT_DEPARTMENTS,
    });

    // Seed a couple of default tasks so the timeline isn't completely blank
    const startOfToday = new Date().setHours(9, 0, 0, 0);
    const endOfToday = new Date().setHours(17, 0, 0, 0);
    const tomorrow = startOfToday + 24 * 60 * 60 * 1000;
    const endOfTomorrow = endOfToday + 24 * 60 * 60 * 1000;

    await ctx.db.insert("tasks", {
      chronicleId,
      name: "Welcome to Chronos",
      status: "in_progress",
      startDate: startOfToday,
      endDate: endOfToday,
      color: "violet",
      department: "Product",
      dependencies: [],
      notes: "This is a seed task. You can drag it, edit it, or delete it! Feel free to ask the Chronos AI to structure a complete launch plan for you.",
    });

    await ctx.db.insert("tasks", {
      chronicleId,
      name: "Brainstorm Design Aesthetics",
      status: "todo",
      startDate: tomorrow,
      endDate: endOfTomorrow,
      color: "emerald",
      department: "Design",
      dependencies: [],
      notes: "Map out custom colors, glassmorphic layout preferences, and timing frameworks.",
    });

    return chronicleId;
  },
});

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const chronicles = await ctx.db
      .query("chronicles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    const chroniclesWithStats = await Promise.all(
      chronicles.map(async (chronicle) => {
        const tasks = await ctx.db
          .query("tasks")
          .withIndex("by_chronicle", (q) => q.eq("chronicleId", chronicle._id))
          .collect();

        const automations = await ctx.db
          .query("automations")
          .withIndex("by_chronicle", (q) => q.eq("chronicleId", chronicle._id))
          .collect();

        const taskCount = tasks.length;
        const completedCount = tasks.filter(t => t.status === "done").length;
        const automationCount = automations.length;

        return {
          ...chronicle,
          taskCount,
          completedCount,
          automationCount,
        };
      })
    );

    return chroniclesWithStats;
  },
});

export const getById = query({
  args: { id: v.id("chronicles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const remove = mutation({
  args: { id: v.id("chronicles") },
  handler: async (ctx, args) => {
    // Recursively clean up associated tasks, automations, and messages
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_chronicle", (q) => q.eq("chronicleId", args.id))
      .collect();
    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    const automations = await ctx.db
      .query("automations")
      .withIndex("by_chronicle", (q) => q.eq("chronicleId", args.id))
      .collect();
    for (const automation of automations) {
      await ctx.db.delete(automation._id);
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chronicle", (q) => q.eq("chronicleId", args.id))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const updateDepartments = mutation({
  args: {
    id: v.id("chronicles"),
    departments: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      departments: args.departments,
    });
    return { success: true };
  },
});
