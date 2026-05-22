import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    chronicleId: v.id("chronicles"),
    name: v.string(),
    status: v.string(), // "todo" | "in_progress" | "done"
    startDate: v.number(),
    endDate: v.number(),
    color: v.string(),
    department: v.string(),
    dependencies: v.array(v.id("tasks")),
    assignee: v.optional(v.string()),
    assigneeIds: v.optional(v.array(v.string())),
    assigneeEmails: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    isMilestone: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tasks", {
      chronicleId: args.chronicleId,
      name: args.name,
      status: args.status,
      startDate: args.startDate,
      endDate: args.endDate,
      color: args.color,
      department: args.department,
      dependencies: args.dependencies,
      assignee: args.assignee,
      assigneeIds: args.assigneeIds,
      assigneeEmails: args.assigneeEmails,
      notes: args.notes,
      isMilestone: args.isMilestone,
    });
  },
});

export const listByChronicle = query({
  args: { chronicleId: v.id("chronicles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_chronicle", (q) => q.eq("chronicleId", args.chronicleId))
      .collect();
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    name: v.optional(v.string()),
    status: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    color: v.optional(v.string()),
    department: v.optional(v.string()),
    dependencies: v.optional(v.array(v.id("tasks"))),
    assignee: v.optional(v.string()),
    assigneeIds: v.optional(v.array(v.string())),
    assigneeEmails: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    isMilestone: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Task not found");

    // Clean up empty optional fields or apply defined updates
    await ctx.db.patch(id, updates);

    // Notify newly assigned members
    if (args.assigneeIds && args.assigneeIds.length > 0) {
      const oldAssignees = new Set(existing.assigneeIds || []);
      const newAssignees = args.assigneeIds.filter(id => !oldAssignees.has(id));
      for (const uid of newAssignees) {
        await ctx.db.insert("notifications", {
          userId: uid,
          type: "assignment",
          title: "New Task Assignment 📌",
          message: `You have been assigned to the task: "${args.name || existing.name}"`,
          link: `/workspace/${existing.chronicleId}`,
          read: false,
          creationTime: Date.now()
        });
      }
    }

    // If status changed to "done", fire completed-trigger automations
    if (args.status === "done" && existing.status !== "done") {
      const automations = await ctx.db
        .query("automations")
        .withIndex("by_chronicle", (q) => q.eq("chronicleId", existing.chronicleId))
        .collect();

      const taskAutomations = automations.filter(a => a.triggerTaskId === id && a.triggerType === "completed");
      
      // Cache all tasks for downstream lookups
      const allTasks = await ctx.db
        .query("tasks")
        .withIndex("by_chronicle", (q) => q.eq("chronicleId", existing.chronicleId))
        .collect();

      for (const auto of taskAutomations) {
        await ctx.db.insert("messages", {
          chronicleId: existing.chronicleId,
          role: "system",
          content: {
            title: `Automation Triggered: ${existing.name} completed!`,
            details: `Action: ${auto.actionType}`,
            config: auto.actionConfig,
          },
          type: "automation_trigger"
        });

        // Cascade Start: auto-transition dependent tasks from "todo" to "in_progress"
        if (auto.actionType === "cascade_start") {
          const dependents = allTasks.filter(
            t => t.dependencies.includes(id) && t.status === "todo"
          );
          for (const dep of dependents) {
            await ctx.db.patch(dep._id, { status: "in_progress" });
          }
        }
      }
    }

    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Task not found");

    // Remove this task from any other tasks' dependency lists
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_chronicle", (q) => q.eq("chronicleId", existing.chronicleId))
      .collect();

    for (const t of allTasks) {
      if (t.dependencies.includes(args.id)) {
        const newDeps = t.dependencies.filter(d => d !== args.id);
        await ctx.db.patch(t._id, { dependencies: newDeps });
      }
    }

    // Clean up any automations bound to this task
    const automations = await ctx.db
      .query("automations")
      .withIndex("by_chronicle", (q) => q.eq("chronicleId", existing.chronicleId))
      .collect();
    const taskAutomations = automations.filter(a => a.triggerTaskId === args.id);
    for (const auto of taskAutomations) {
      await ctx.db.delete(auto._id);
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Bulk updates the start/end dates of multiple tasks.
 * Crucial for fast recursive delay shifting.
 */
export const batchUpdateDates = mutation({
  args: {
    updates: v.array(v.object({
      id: v.id("tasks"),
      startDate: v.number(),
      endDate: v.number(),
    }))
  },
  handler: async (ctx, args) => {
    for (const item of args.updates) {
      const task = await ctx.db.get(item.id);
      if (task) {
        await ctx.db.patch(item.id, {
          startDate: item.startDate,
          endDate: item.endDate,
        });

        // Trigger delay automations if shifted significantly
        const oldStart = task.startDate;
        const diffMs = item.startDate - oldStart;
        const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
        
        if (diffDays >= 1) {
          const automations = await ctx.db
            .query("automations")
            .withIndex("by_chronicle", (q) => q.eq("chronicleId", task.chronicleId))
            .collect();

          const delayAutomations = automations.filter(
            a => a.triggerTaskId === item.id && a.triggerType === "delayed"
          );

          // Cache all tasks for downstream lookups
          const allTasks = await ctx.db
            .query("tasks")
            .withIndex("by_chronicle", (q) => q.eq("chronicleId", task.chronicleId))
            .collect();

          for (const auto of delayAutomations) {
            await ctx.db.insert("messages", {
              chronicleId: task.chronicleId,
              role: "system",
              content: {
                title: `Automation Triggered: ${task.name} delayed by ${diffDays} days!`,
                details: `Action: ${auto.actionType}`,
                config: auto.actionConfig,
              },
              type: "automation_trigger"
            });

            // Downstream Shift: push all dependent tasks' dates forward
            if (auto.actionType === "downstream_shift") {
              const visited = new Set();
              const queue = [item.id];
              while (queue.length > 0) {
                const currentId = queue.shift();
                if (visited.has(currentId)) continue;
                visited.add(currentId);
                const dependents = allTasks.filter(t => t.dependencies.includes(currentId));
                for (const dep of dependents) {
                  if (!visited.has(dep._id)) {
                    await ctx.db.patch(dep._id, {
                      startDate: dep.startDate + diffMs,
                      endDate: dep.endDate + diffMs,
                    });
                    queue.push(dep._id);
                  }
                }
              }
            }

            // Deadline Flag: append escalation note to the task
            if (auto.actionType === "deadline_flag") {
              const label = auto.actionConfig?.escalationLabel || "Deadline Breached";
              const note = auto.actionConfig?.messageTemplate || `Task delayed by ${diffDays} days.`;
              const newNotes = task.notes
                ? `${task.notes}\n\n[${label}] ${note}`
                : `[${label}] ${note}`;
              await ctx.db.patch(item.id, { notes: newNotes });
            }
          }
        }
      }
    }
    return { success: true };
  },
});
