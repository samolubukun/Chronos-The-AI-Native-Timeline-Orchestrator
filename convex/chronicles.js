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


    return chronicleId;
  },
});

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // 1. Fetch owned chronicles
    const owned = await ctx.db
      .query("chronicles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // 2. Fetch chronicles where user is invited/member
    const memberships = await ctx.db
      .query("chronicleMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const joinedPromises = memberships.map(async (m) => {
      return await ctx.db.get(m.chronicleId);
    });
    const joined = (await Promise.all(joinedPromises)).filter(Boolean);

    // 3. Merge and deduplicate chronicles
    const allChronicles = [...owned];
    const ownedIds = new Set(owned.map(c => c._id));
    for (const c of joined) {
      if (!ownedIds.has(c._id)) {
        allChronicles.push(c);
      }
    }

    // Sort by _creationTime in descending order (newest first)
    allChronicles.sort((a, b) => b._creationTime - a._creationTime);

    const chroniclesWithStats = await Promise.all(
      allChronicles.map(async (chronicle) => {
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

        // Fetch owner details
        const owner = await ctx.db.get(chronicle.userId);

        return {
          ...chronicle,
          taskCount,
          completedCount,
          automationCount,
          isShared: chronicle.userId !== args.userId,
          ownerName: owner?.name || "Unknown",
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
    // Recursively clean up associated tasks, automations, messages, and members
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

    const members = await ctx.db
      .query("chronicleMembers")
      .withIndex("by_chronicle", (q) => q.eq("chronicleId", args.id))
      .collect();
    for (const m of members) {
      await ctx.db.delete(m._id);
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

// Invite member mutation
export const inviteMember = mutation({
  args: {
    chronicleId: v.id("chronicles"),
    email: v.string(),
    role: v.string(), // "editor" | "viewer"
  },
  handler: async (ctx, args) => {
    const targetEmail = args.email.trim().toLowerCase();
    
    // Find target user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", targetEmail))
      .unique();

    if (!user) {
      throw new Error(`User with email "${args.email}" is not registered in Chronos yet.`);
    }

    // Check if user is already a member
    const existing = await ctx.db
      .query("chronicleMembers")
      .withIndex("by_chronicle", (q) => q.eq("chronicleId", args.chronicleId))
      .collect();

    const isAlreadyMember = existing.some(m => m.userId === user._id);
    if (isAlreadyMember) {
      throw new Error("User is already a member of this chronicle.");
    }

    const memberId = await ctx.db.insert("chronicleMembers", {
      chronicleId: args.chronicleId,
      userId: user._id,
      email: targetEmail,
      role: args.role,
    });

    // Fetch chronicle name
    const chronicle = await ctx.db.get(args.chronicleId);
    const chronicleName = chronicle?.name || "Shared Chronicle";

    // Insert automatic notification
    await ctx.db.insert("notifications", {
      userId: user._id,
      type: "invite",
      title: "Workspace Share Invite 👥",
      message: `You have been invited to collaborate on the chronicle: "${chronicleName}" as an ${args.role}`,
      link: `/workspace/${args.chronicleId}`,
      read: false,
      creationTime: Date.now()
    });

    return memberId;
  },
});

// Get members query
export const getMembers = query({
  args: { chronicleId: v.id("chronicles") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("chronicleMembers")
      .withIndex("by_chronicle", (q) => q.eq("chronicleId", args.chronicleId))
      .collect();

    return await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          _id: m._id,
          userId: m.userId,
          email: m.email,
          role: m.role,
          name: user?.name || "Pending User",
        };
      })
    );
  },
});

// Remove member mutation
export const removeMember = mutation({
  args: { id: v.id("chronicleMembers") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Update member role mutation
export const updateMemberRole = mutation({
  args: {
    id: v.id("chronicleMembers"),
    role: v.string(), // "editor" | "viewer" | "admin"
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      role: args.role,
    });
    return { success: true };
  },
});

