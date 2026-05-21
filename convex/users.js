import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getUserByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .unique();
    },
});

export const getUserByStackId = query({
    args: { stackId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_stackId", (q) => q.eq("stackId", args.stackId))
            .unique();
    },
});

export const createOrUpdateUser = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        stackId: v.string(),
    },
    handler: async (ctx, args) => {
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_stackId", (q) => q.eq("stackId", args.stackId))
            .unique();

        if (existingUser) {
            await ctx.db.patch(existingUser._id, {
                name: args.name,
                email: args.email,
            });
            return existingUser._id;
        }

        return await ctx.db.insert("users", {
            name: args.name,
            email: args.email,
            stackId: args.stackId,
            credits: 50, // Initial credits for Catalyst
        });
    },
});

export const updateUserCredits = mutation({
    args: {
        id: v.id('users'),
        credits: v.number()
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.id);
        if (!user) throw new Error('User not found');

        const newCredits = Math.max(0, Number(args.credits));
        await ctx.db.patch(args.id, { credits: newCredits });
        return { credits: newCredits };
    }
});

export const getUserById = query({
    args: { id: v.id('users') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    }
});

export const deductCredit = mutation({
    args: { userId: v.id('users'), amount: v.number() },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) throw new Error("User not found");
        if (user.credits < args.amount) {
            throw new Error("Insufficient credits");
        }
        const newCredits = Math.max(0, user.credits - args.amount);
        await ctx.db.patch(args.userId, { credits: newCredits });

        // Log in usage table
        await ctx.db.insert("usage", {
            userId: args.userId,
            type: "message",
            amount: args.amount,
            timestamp: Date.now(),
        });

        return { success: true, newCredits };
    }
});