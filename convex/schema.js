import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    credits: v.number(),
    stackId: v.string(), // ID from Stack Auth
  }).index("by_email", ["email"]).index("by_stackId", ["stackId"]),

  chronicles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    status: v.string(), // "active", "archived"
    departments: v.optional(v.array(v.string())), // Dynamic department tracks
  }).index("by_user", ["userId"]),

  tasks: defineTable({
    chronicleId: v.id("chronicles"),
    name: v.string(),
    status: v.string(), // "todo", "in_progress", "done"
    startDate: v.number(), // Timestamp in ms
    endDate: v.number(), // Timestamp in ms
    color: v.string(), // Theme color, e.g., "violet", "emerald", "amber", "blue", "rose", "pink"
    department: v.string(), // Department/track, e.g., "Engineering", "Design", "Marketing", "Product", "Legal"
    dependencies: v.array(v.id("tasks")), // Array of task IDs blocking this task
    assignee: v.optional(v.string()),
    notes: v.optional(v.string()),
    isMilestone: v.optional(v.boolean()), // True if it's a milestone (0-duration flag)
  }).index("by_chronicle", ["chronicleId"]),

  automations: defineTable({
    chronicleId: v.id("chronicles"),
    triggerTaskId: v.id("tasks"),
    triggerType: v.string(), // "completed", "delayed"
    actionType: v.string(), // "cascade_start" | "downstream_shift" | "deadline_flag"
    actionConfig: v.any(), // trigger templates, webhook URLs, draft subject/content
  }).index("by_chronicle", ["chronicleId"]),

  messages: defineTable({
    chronicleId: v.id("chronicles"),
    role: v.string(), // "user", "assistant", "system"
    content: v.any(), // Rich conversational records / JSON timeline structures
    type: v.optional(v.string()), // "text", "timeline_update", "reschedule_summary"
  }).index("by_chronicle", ["chronicleId"]),

  presence: defineTable({
    chronicleId: v.id("chronicles"),
    userId: v.id("users"),
    cursor: v.optional(v.any()), // Spatial coordinate { taskId, x, y }
    lastActive: v.number(),
  }).index("by_chronicle", ["chronicleId"]),

  usage: defineTable({
    userId: v.id("users"),
    type: v.string(), // message, search, automation
    amount: v.number(),
    timestamp: v.number(),
  }).index("by_user", ["userId"]),
});