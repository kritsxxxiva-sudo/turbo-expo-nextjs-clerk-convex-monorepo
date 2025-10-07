/**
 * Subscription Management Functions
 * Handles Stripe subscription management with multi-currency support
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import {
  validateSubscriptionStatus,
  validatePeriodDates,
  validateActiveSubscriptionLimit,
} from "../lib/validation";

// Create Subscription
export const createSubscription = mutation({
  args: {
    userId: v.id("users"),
    customerId: v.id("customers"),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
      v.literal("past_due"),
      v.literal("trialing"),
      v.literal("unpaid"),
    ),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    canceledAt: v.optional(v.number()),
    trialStart: v.optional(v.number()),
    trialEnd: v.optional(v.number()),
    quantity: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Validate status
    if (!validateSubscriptionStatus(args.status)) {
      throw new Error("Invalid subscription status");
    }

    // Validate period dates
    if (!validatePeriodDates(args.currentPeriodStart, args.currentPeriodEnd)) {
      throw new Error("Invalid period dates");
    }

    // Check if user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if customer exists
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }

    // Check for unique Stripe subscription ID
    const existingSubscription = await ctx.db
      .query("subscriptions")
      .filter((q) =>
        q.eq(q.field("stripeSubscriptionId"), args.stripeSubscriptionId),
      )
      .first();

    if (existingSubscription) {
      throw new Error("Subscription with this Stripe ID already exists");
    }

    // Validate active subscription limit for the same price
    if (args.status === "active") {
      const canCreateActive = await validateActiveSubscriptionLimit(
        ctx,
        args.userId,
        args.stripePriceId,
      );
      if (!canCreateActive) {
        throw new Error(
          "User already has an active subscription for this price",
        );
      }
    }

    const now = Date.now();
    const subscriptionId = await ctx.db.insert("subscriptions", {
      userId: args.userId,
      customerId: args.customerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripePriceId: args.stripePriceId,
      status: args.status,
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd || false,
      canceledAt: args.canceledAt,
      trialStart: args.trialStart,
      trialEnd: args.trialEnd,
      quantity: args.quantity || 1,
      metadata: args.metadata || {},
      createdAt: now,
      updatedAt: now,
    });

    return subscriptionId;
  },
});

// Get User Subscriptions
export const getUserSubscriptions = query({
  args: {
    userId: v.id("users"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId));

    if (args.status) {
      query = ctx.db
        .query("subscriptions")
        .withIndex("by_user_subscription_status", (q) =>
          q.eq("userId", args.userId).eq("status", args.status),
        );
    }

    const subscriptions = await query.take(args.limit || 50);
    return subscriptions;
  },
});

// Get Subscription by Stripe ID
export const getSubscriptionByStripeId = query({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .filter((q) =>
        q.eq(q.field("stripeSubscriptionId"), args.stripeSubscriptionId),
      )
      .first();

    return subscription;
  },
});

// Update Subscription
export const updateSubscription = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("canceled"),
        v.literal("incomplete"),
        v.literal("incomplete_expired"),
        v.literal("past_due"),
        v.literal("trialing"),
        v.literal("unpaid"),
      ),
    ),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    canceledAt: v.optional(v.number()),
    trialStart: v.optional(v.number()),
    trialEnd: v.optional(v.number()),
    quantity: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { subscriptionId, ...updates } = args;

    const existingSubscription = await ctx.db.get(subscriptionId);
    if (!existingSubscription) {
      throw new Error("Subscription not found");
    }

    // Validate status if provided
    if (updates.status && !validateSubscriptionStatus(updates.status)) {
      throw new Error("Invalid subscription status");
    }

    // Validate period dates if provided
    if (updates.currentPeriodStart && updates.currentPeriodEnd) {
      if (
        !validatePeriodDates(
          updates.currentPeriodStart,
          updates.currentPeriodEnd,
        )
      ) {
        throw new Error("Invalid period dates");
      }
    }

    await ctx.db.patch(subscriptionId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return subscriptionId;
  },
});

// Update Subscription from Stripe Webhook
export const updateSubscriptionFromStripe = mutation({
  args: {
    stripeSubscriptionId: v.string(),
    status: v.optional(v.string()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    canceledAt: v.optional(v.number()),
    trialStart: v.optional(v.number()),
    trialEnd: v.optional(v.number()),
    quantity: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { stripeSubscriptionId, ...updates } = args;

    const existingSubscription = await ctx.db
      .query("subscriptions")
      .filter((q) =>
        q.eq(q.field("stripeSubscriptionId"), stripeSubscriptionId),
      )
      .first();

    if (!existingSubscription) {
      throw new Error("Subscription not found");
    }

    await ctx.db.patch(existingSubscription._id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return existingSubscription._id;
  },
});

// Cancel Subscription
export const cancelSubscription = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    cancelAtPeriodEnd: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existingSubscription = await ctx.db.get(args.subscriptionId);
    if (!existingSubscription) {
      throw new Error("Subscription not found");
    }

    const updates: any = {
      cancelAtPeriodEnd: args.cancelAtPeriodEnd || false,
      updatedAt: Date.now(),
    };

    if (!args.cancelAtPeriodEnd) {
      updates.status = "canceled";
      updates.canceledAt = Date.now();
    }

    await ctx.db.patch(args.subscriptionId, updates);
    return args.subscriptionId;
  },
});

// Get Expiring Subscriptions
export const getExpiringSubscriptions = query({
  args: { daysAhead: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const days = args.daysAhead || 7;
    const expirationThreshold = Date.now() + days * 24 * 60 * 60 * 1000;

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_current_period_end")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.lt(q.field("currentPeriodEnd"), expirationThreshold),
          q.gt(q.field("currentPeriodEnd"), Date.now()),
        ),
      )
      .collect();

    return subscriptions;
  },
});

// Get Subscriptions by Status
export const getSubscriptionsByStatus = query({
  args: {
    status: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .take(args.limit || 50);

    return subscriptions;
  },
});

// Get Subscription with Customer and User Details
export const getSubscriptionWithDetails = query({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      return null;
    }

    const customer = await ctx.db.get(subscription.customerId);
    const user = await ctx.db.get(subscription.userId);

    return {
      ...subscription,
      customer: customer
        ? {
            _id: customer._id,
            stripeCustomerId: customer.stripeCustomerId,
            email: customer.email,
            name: customer.name,
            currency: customer.currency,
          }
        : null,
      user: user
        ? {
            _id: user._id,
            clerkId: user.clerkId,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          }
        : null,
    };
  },
});

// Get Subscription Statistics
export const getSubscriptionStatistics = query({
  args: {},
  handler: async (ctx) => {
    const allSubscriptions = await ctx.db.query("subscriptions").collect();

    const statusCounts: Record<string, number> = {};
    const priceCounts: Record<string, number> = {};

    allSubscriptions.forEach((subscription) => {
      statusCounts[subscription.status] =
        (statusCounts[subscription.status] || 0) + 1;
      priceCounts[subscription.stripePriceId] =
        (priceCounts[subscription.stripePriceId] || 0) + 1;
    });

    const now = Date.now();
    const stats = {
      total: allSubscriptions.length,
      statusCounts,
      priceCounts,
      active: allSubscriptions.filter((s) => s.status === "active").length,
      trialing: allSubscriptions.filter((s) => s.status === "trialing").length,
      canceled: allSubscriptions.filter((s) => s.status === "canceled").length,
      pastDue: allSubscriptions.filter((s) => s.status === "past_due").length,
      expiringThisWeek: allSubscriptions.filter(
        (s) =>
          s.status === "active" &&
          s.currentPeriodEnd > now &&
          s.currentPeriodEnd < now + 7 * 24 * 60 * 60 * 1000,
      ).length,
      recentSubscriptions: allSubscriptions.filter(
        (s) => s.createdAt > now - 7 * 24 * 60 * 60 * 1000,
      ).length,
    };

    return stats;
  },
});

// Bulk Update Subscriptions
export const bulkUpdateSubscriptions = mutation({
  args: {
    subscriptionIds: v.array(v.id("subscriptions")),
    updates: v.object({
      status: v.optional(v.string()),
      cancelAtPeriodEnd: v.optional(v.boolean()),
      metadata: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const subscriptionId of args.subscriptionIds) {
      try {
        const subscription = await ctx.db.get(subscriptionId);
        if (subscription) {
          await ctx.db.patch(subscriptionId, {
            ...args.updates,
            updatedAt: Date.now(),
          });
          results.push({ subscriptionId, success: true });
        } else {
          results.push({
            subscriptionId,
            success: false,
            error: "Subscription not found",
          });
        }
      } catch (error) {
        results.push({
          subscriptionId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  },
});
